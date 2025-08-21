/**
 * @since 1.0.0
 */
import * as PlatformError from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import { Effect, Layer, Option, Stream } from "effect"
import { none, some } from "effect/Option"
import * as ExpoFS from "expo-file-system"
import { Directory, File, Paths } from "expo-file-system/build/next"

/**
 * @since 1.0.0
 * @category models
 */
export interface Config {
  readonly base?: "document" | "cache"
  readonly restrictToBase?: boolean
}

const getErrorReason = (cause: unknown): PlatformError.SystemErrorReason => {
  const message = String((cause as any)?.message ?? cause)

  if (message.includes("NotFound") || message.includes("does not exist")) {
    return "NotFound"
  } else if (message.includes("AlreadyExists") || message.includes("already exists")) {
    return "AlreadyExists"
  } else if (message.includes("PermissionDenied") || message.includes("permission")) {
    return "PermissionDenied"
  } else if (message.includes("Invalid") || message.includes("invalid")) {
    return "InvalidData"
  } else if (message.includes("Busy") || message.includes("in use")) {
    return "Busy"
  }
  return "Unknown"
}

/**
 * Generate a cryptographically secure random string for temp file/directory names
 */
const generateSecureRandom = (): string => {
  // Use crypto.getRandomValues if available, fallback to Math.random for RN compatibility
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }
  // Fallback: multiple Math.random calls for better entropy
  return Array.from({ length: 4 }, () => Math.random().toString(16).slice(2)).join("")
}

const makeFs = (cfg: Config): FileSystem.FileSystem => {
  const baseDir = cfg.base === "cache" ? Paths.cache : Paths.document

  const rel = (p: string) => {
    let s = p.replace(/^file:\/\//, "").replace(/\\/g, "/")
    s = s.startsWith("/") ? s.slice(1) : s
    const out: Array<string> = []
    let upCount = 0

    for (const part of s.split("/")) {
      if (!part || part === ".") continue
      if (part === "..") {
        if (cfg.restrictToBase) {
          if (out.length > 0) out.pop()
        } else {
          if (out.length > 0) {
            out.pop()
          } else {
            upCount++
          }
        }
      } else {
        out.push(part)
      }
    }

    if (!cfg.restrictToBase && upCount > 0) {
      return "../".repeat(upCount) + out.join("/")
    }
    return out.join("/")
  }

  const asFile = (p: string) => new File(baseDir, rel(p))
  const asDir = (p: string) => new Directory(baseDir, rel(p))
  const parentDir = (p: string) => new Directory(baseDir, Paths.dirname(rel(p)))

  const ensureParent = (p: string) => {
    const dir = parentDir(p)
    dir.create({ intermediates: true })
  }

  const infoToStat = (i: ExpoFS.FileInfo): FileSystem.File.Info =>
    !i.exists
      ? {
        type: i.isDirectory ? "Directory" : "File",
        mtime: none(),
        atime: none(),
        birthtime: none(),
        dev: 0,
        ino: none(),
        mode: 0,
        nlink: none(),
        uid: none(),
        gid: none(),
        rdev: none(),
        size: FileSystem.Size(0),
        blksize: none(),
        blocks: none()
      }
      : {
        type: i.isDirectory ? "Directory" : "File",
        mtime: i.modificationTime != null ? some(new Date(i.modificationTime * 1000)) : none(),
        atime: none(),
        birthtime: none(),
        dev: 0,
        ino: none(),
        mode: 0,
        nlink: none(),
        uid: none(),
        gid: none(),
        rdev: none(),
        size: FileSystem.Size(i.size ?? 0),
        blksize: none(),
        blocks: none()
      }

  let fdCounter = 3
  const nextFd = () => {
    const current = fdCounter
    fdCounter = current + 1
    return current
  }

  const unsupported = <A = never>(op: string, path: string): Effect.Effect<A, PlatformError.PlatformError> =>
    Effect.fail(
      new PlatformError.BadArgument({
        module: "FileSystem",
        method: op,
        description: `Operation not supported on React Native/Expo`,
        cause: { path }
      })
    )

  const access: FileSystem.FileSystem["access"] = (path, _opts) =>
    Effect.tryPromise({
      try: async () => {
        const f = asFile(path)
        const i = await ExpoFS.getInfoAsync(f.uri)
        if (!i.exists) throw new Error("NotFound")
      },
      catch: (cause) =>
        new PlatformError.SystemError({
          module: "FileSystem",
          method: "access",
          reason: getErrorReason(cause),
          pathOrDescriptor: path,
          cause: cause instanceof Error ? cause : undefined
        })
    })

  const copy: FileSystem.FileSystem["copy"] = (from, to) =>
    Effect.tryPromise({
      try: async () => {
        ensureParent(to)
        await ExpoFS.copyAsync({ from: asFile(from).uri, to: asFile(to).uri })
      },
      catch: (cause) =>
        new PlatformError.SystemError({
          module: "FileSystem",
          method: "copy",
          reason: getErrorReason(cause),
          pathOrDescriptor: `${from} → ${to}`,
          cause: cause instanceof Error ? cause : undefined
        })
    })

  const copyFile: FileSystem.FileSystem["copyFile"] = (from, to) => copy(from, to)

  const chmod: FileSystem.FileSystem["chmod"] = (path, _mode) => unsupported("chmod", path)
  const chown: FileSystem.FileSystem["chown"] = (path, _uid, _gid) => unsupported("chown", path)
  const link: FileSystem.FileSystem["link"] = (from, to) => unsupported("link", `${from} → ${to}`)

  const makeDirectory: FileSystem.FileSystem["makeDirectory"] = (path, options) =>
    Effect.tryPromise({
      try: () => ExpoFS.makeDirectoryAsync(asDir(path).uri, { intermediates: !!options?.recursive }),
      catch: (cause) =>
        new PlatformError.SystemError({
          module: "FileSystem",
          method: "makeDirectory",
          reason: getErrorReason(cause),
          pathOrDescriptor: path,
          cause: cause instanceof Error ? cause : undefined
        })
    })

  const makeTempDirectory: FileSystem.FileSystem["makeTempDirectory"] = (options) =>
    Effect.try(() => {
      const prefix = options?.prefix ?? "rn-tmp-"
      const baseDir = options?.directory ?? "/tmp"
      const d = asDir(baseDir)
      d.create({ intermediates: true })
      const name = `${prefix}${Date.now()}-${generateSecureRandom()}`
      const dirPath = `${baseDir.replace(/\/$/, "")}/${name}`
      const tempDir = asDir(dirPath)
      tempDir.create({ intermediates: false })
      return dirPath
    }).pipe(
      Effect.mapError(
        (error) =>
          new PlatformError.SystemError({
            module: "FileSystem",
            method: "makeTempDirectory",
            reason: getErrorReason(error),
            pathOrDescriptor: options?.directory ?? "/tmp",
            cause: error instanceof Error ? error : undefined
          })
      )
    )

  const makeTempDirectoryScoped: FileSystem.FileSystem["makeTempDirectoryScoped"] = (options) =>
    Effect.acquireRelease(makeTempDirectory(options), (path) =>
      Effect.ignore(
        Effect.tryPromise({
          try: () => ExpoFS.deleteAsync(asDir(path).uri, { idempotent: true }),
          catch: (cause) =>
            new PlatformError.SystemError({
              module: "FileSystem",
              method: "makeTempDirectoryScoped:cleanup",
              reason: getErrorReason(cause),
              pathOrDescriptor: path,
              cause: cause instanceof Error ? cause : undefined
            })
        })
      ))

  const makeTempFile: FileSystem.FileSystem["makeTempFile"] = (options) =>
    Effect.try(() => {
      const dir = options?.directory ?? "/tmp"
      const prefix = options?.prefix ?? "rn-"
      const d = asDir(dir)
      d.create({ intermediates: true })
      const name = `${prefix}${Date.now()}-${generateSecureRandom()}.tmp`
      const p = `${dir.replace(/\/$/, "")}/${name}`
      const f = asFile(p)
      f.create()
      return p
    }).pipe(
      Effect.mapError(
        (error) =>
          new PlatformError.SystemError({
            module: "FileSystem",
            method: "makeTempFile",
            reason: getErrorReason(error),
            pathOrDescriptor: options?.directory ?? "/tmp",
            cause: error instanceof Error ? error : undefined
          })
      )
    )

  const makeTempFileScoped: FileSystem.FileSystem["makeTempFileScoped"] = (options) => {
    const dir = options?.directory ?? "/tmp"
    const prefix = options?.prefix ?? "rn-"
    return Effect.acquireRelease(
      Effect.try(() => {
        const d = asDir(dir)
        d.create({ intermediates: true })
        const name = `${prefix}${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`
        const p = `${dir.replace(/\/$/, "")}/${name}`
        const f = asFile(p)
        ensureParent(p)
        if (!f.exists) f.create()
        return p
      }).pipe(
        Effect.mapError(
          (error) =>
            new PlatformError.SystemError({
              module: "FileSystem",
              method: "makeTempFileScoped:create",
              reason: getErrorReason(error),
              pathOrDescriptor: dir,
              cause: error instanceof Error ? error : undefined
            })
        )
      ),
      (p) =>
        Effect.try(() => {
          const f = asFile(p)
          if (f.exists) f.delete()
        }).pipe(Effect.ignore)
    )
  }

  const open: FileSystem.FileSystem["open"] = (path, options) =>
    Effect.acquireRelease(
      Effect.try(() => {
        const f = asFile(path)
        ensureParent(path)
        const flag = options?.flag ?? "r"
        if (flag.startsWith("w")) {
          f.write(new Uint8Array(0))
        } else if (flag.startsWith("a")) {
          if (!f.exists) f.write(new Uint8Array(0))
        } else {
          if (!f.exists) throw new Error("NotFound")
        }
        const handle = f.open()
        if (flag.startsWith("a")) handle.offset = handle.size ?? 0
        const fd = nextFd()

        const file: FileSystem.File = {
          [FileSystem.FileTypeId]: FileSystem.FileTypeId,
          fd: fd as unknown as FileSystem.File.Descriptor,
          stat: Effect.tryPromise({
            try: () => ExpoFS.getInfoAsync(f.uri).then(infoToStat),
            catch: (cause) =>
              new PlatformError.SystemError({
                module: "FileSystem",
                method: "stat",
                reason: getErrorReason(cause),
                pathOrDescriptor: path,
                cause: cause instanceof Error ? cause : undefined
              })
          }),
          seek: (offset, from) =>
            Effect.sync(() => {
              const off = typeof offset === "bigint" ? Number(offset) : (offset as any)
              handle.offset = from === "start" ? off : (handle.offset ?? 0) + off
            }),
          sync: Effect.void,
          read: (buffer) =>
            Effect.try(() => {
              const bytes = handle.readBytes(buffer.byteLength)
              buffer.set(bytes)
              return FileSystem.Size(bytes.length)
            }).pipe(
              Effect.mapError(
                (error) =>
                  new PlatformError.SystemError({
                    module: "FileSystem",
                    method: "read",
                    reason: getErrorReason(error),
                    pathOrDescriptor: path,
                    cause: error instanceof Error ? error : undefined
                  })
              )
            ),
          readAlloc: (size) =>
            Effect.try(() => {
              const n = typeof size === "bigint" ? Number(size) : (size as any)
              const bytes = handle.readBytes(n)
              return bytes.length === 0 ? Option.none<Uint8Array>() : some(bytes)
            }).pipe(
              Effect.mapError(
                (error) =>
                  new PlatformError.SystemError({
                    module: "FileSystem",
                    method: "readAlloc",
                    reason: getErrorReason(error),
                    pathOrDescriptor: path,
                    cause: error instanceof Error ? error : undefined
                  })
              )
            ),
          truncate: (length) =>
            Effect.try(() => {
              const cur = f.bytes()
              const n = length == null ? 0 : typeof length === "bigint" ? Number(length) : (length as any)
              if (n <= 0) {
                f.write(new Uint8Array(0))
                handle.offset = 0
                return
              }
              const next = new Uint8Array(n)
              next.set(cur.subarray(0, Math.min(n, cur.length)))
              f.write(next)
              handle.offset = Math.min(handle.offset ?? 0, n)
            }).pipe(
              Effect.mapError(
                (error) =>
                  new PlatformError.SystemError({
                    module: "FileSystem",
                    method: "truncate",
                    reason: getErrorReason(error),
                    pathOrDescriptor: path,
                    cause: error instanceof Error ? error : undefined
                  })
              )
            ),
          write: (buffer) =>
            Effect.try(() => {
              const before = handle.offset ?? 0
              handle.writeBytes(buffer)
              const written = (handle.offset ?? 0) - before
              return FileSystem.Size(written)
            }).pipe(
              Effect.mapError(
                (error) =>
                  new PlatformError.SystemError({
                    module: "FileSystem",
                    method: "write",
                    reason: getErrorReason(error),
                    pathOrDescriptor: path,
                    cause: error instanceof Error ? error : undefined
                  })
              )
            ),
          writeAll: (buffer) =>
            Effect.try(() => {
              handle.writeBytes(buffer)
            }).pipe(
              Effect.mapError(
                (error) =>
                  new PlatformError.SystemError({
                    module: "FileSystem",
                    method: "writeAll",
                    reason: getErrorReason(error),
                    pathOrDescriptor: path,
                    cause: error instanceof Error ? error : undefined
                  })
              )
            )
        }
        return { file, handle }
      }).pipe(
        Effect.mapError(
          (error) =>
            new PlatformError.SystemError({
              module: "FileSystem",
              method: "open",
              reason: getErrorReason(error),
              pathOrDescriptor: path,
              cause: error instanceof Error ? error : undefined
            })
        )
      ),
      ({ handle }) => Effect.try(() => handle.close()).pipe(Effect.ignore)
    ).pipe(
      Effect.map(({ file }) => file)
    )

  const readDirectory: FileSystem.FileSystem["readDirectory"] = (path, opts) =>
    Effect.tryPromise({
      try: async () => {
        if (opts?.recursive) {
          const out: Array<string> = []
          const root = asDir(path)
          const walk = (d: Directory, prefix = "") => {
            for (const item of d.list()) {
              if (item instanceof Directory) walk(item, `${prefix}${item.name}/`)
              else out.push(`${prefix}${item.name}`)
            }
          }
          walk(root)
          return out
        }
        return ExpoFS.readDirectoryAsync(asDir(path).uri)
      },
      catch: (cause) =>
        new PlatformError.SystemError({
          module: "FileSystem",
          method: "readDirectory",
          reason: getErrorReason(cause),
          pathOrDescriptor: path,
          cause: cause instanceof Error ? cause : undefined
        })
    })

  const readFile: FileSystem.FileSystem["readFile"] = (path) =>
    Effect.try(() => asFile(path).bytes()).pipe(
      Effect.mapError(
        (error) =>
          new PlatformError.SystemError({
            module: "FileSystem",
            method: "readFile",
            reason: getErrorReason(error),
            pathOrDescriptor: path,
            cause: error instanceof Error ? error : undefined
          })
      )
    )

  const readLink: FileSystem.FileSystem["readLink"] = (path) => unsupported("readLink", path)

  const realPath: FileSystem.FileSystem["realPath"] = (path) => Effect.succeed(`/${rel(path)}`)

  const remove: FileSystem.FileSystem["remove"] = (path, options) =>
    Effect.tryPromise({
      try: () => ExpoFS.deleteAsync(asFile(path).uri, { idempotent: !!options?.force }),
      catch: (cause) =>
        new PlatformError.SystemError({
          module: "FileSystem",
          method: "remove",
          reason: getErrorReason(cause),
          pathOrDescriptor: path,
          cause: cause instanceof Error ? cause : undefined
        })
    })

  const rename: FileSystem.FileSystem["rename"] = (oldPath, newPath) =>
    Effect.tryPromise({
      try: async () => {
        ensureParent(newPath)
        await ExpoFS.moveAsync({ from: asFile(oldPath).uri, to: asFile(newPath).uri })
      },
      catch: (cause) =>
        new PlatformError.SystemError({
          module: "FileSystem",
          method: "rename",
          reason: getErrorReason(cause),
          pathOrDescriptor: `${oldPath} → ${newPath}`,
          cause: cause instanceof Error ? cause : undefined
        })
    })

  const stat: FileSystem.FileSystem["stat"] = (path) =>
    Effect.tryPromise({
      try: () =>
        ExpoFS.getInfoAsync(asFile(path).uri).then((i) => {
          if (!i.exists) throw new Error("NotFound")
          return infoToStat(i)
        }),
      catch: (cause) =>
        new PlatformError.SystemError({
          module: "FileSystem",
          method: "stat",
          reason: getErrorReason(cause),
          pathOrDescriptor: path,
          cause: cause instanceof Error ? cause : undefined
        })
    })

  const symlink: FileSystem.FileSystem["symlink"] = (from, to) => unsupported("symlink", `${from} → ${to}`)

  const truncate: FileSystem.FileSystem["truncate"] = (path, length) =>
    Effect.scoped(open(path, { flag: "r+" }).pipe(Effect.flatMap((f) => f.truncate(length))))

  const utimes: FileSystem.FileSystem["utimes"] = (path, _a, _m) => unsupported("utimes", path)

  const watch: FileSystem.FileSystem["watch"] = (path, _opts) => Stream.fromEffect(unsupported("watch", path))

  const writeFile: FileSystem.FileSystem["writeFile"] = (path, data, _opts) =>
    Effect.try(() => {
      ensureParent(path)
      asFile(path).write(data)
    }).pipe(
      Effect.mapError(
        (error) =>
          new PlatformError.SystemError({
            module: "FileSystem",
            method: "writeFile",
            reason: getErrorReason(error),
            pathOrDescriptor: path,
            cause: error instanceof Error ? error : undefined
          })
      )
    )

  return FileSystem.make({
    access,
    copy,
    copyFile,
    chmod,
    chown,
    link,
    makeDirectory,
    makeTempDirectory,
    makeTempDirectoryScoped,
    makeTempFile,
    makeTempFileScoped,
    open,
    readDirectory,
    readFile,
    readLink,
    realPath,
    remove,
    rename,
    stat,
    symlink,
    truncate,
    utimes,
    watch,
    writeFile
  })
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (config?: Config) => Layer.Layer<FileSystem.FileSystem> = (cfg = {}) =>
  Layer.succeed(FileSystem.FileSystem, makeFs(cfg))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerDocument: Layer.Layer<FileSystem.FileSystem> = layer({ base: "document" })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerCache: Layer.Layer<FileSystem.FileSystem> = layer({ base: "cache" })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerRestricted: Layer.Layer<FileSystem.FileSystem> = layer({
  base: "document",
  restrictToBase: true
})
