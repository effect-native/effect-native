import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const DATA_URL_REGEX = /data:([^;]+);base64,([A-Za-z0-9+/=]+)/g

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpeg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "audio/wav": ".wav",
  "audio/mp3": ".mp3",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "application/pdf": ".pdf"
}

function getExtensionForMime(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] ?? ".bin"
}

export function extractDataUrls(
  content: string,
  assetsDir: string
): {
  content: string
  extractedFiles: Array<string>
} {
  const extractedFiles: Array<string> = []
  let fileIndex = 0

  const modifiedContent = content.replace(DATA_URL_REGEX, (_match, mimeType: string, base64Data: string) => {
    fileIndex++
    const paddedIndex = String(fileIndex).padStart(4, "0")
    const extension = getExtensionForMime(mimeType)
    const filename = `${paddedIndex}${extension}`
    const filePath = join(assetsDir, filename)

    if (!existsSync(assetsDir)) {
      mkdirSync(assetsDir, {
        recursive: true
      })
    }

    const buffer = Buffer.from(base64Data, "base64")
    writeFileSync(filePath, buffer)
    extractedFiles.push(filename)

    return `data:${mimeType};base64,__sidecar:${filename}__`
  })

  return {
    content: modifiedContent,
    extractedFiles
  }
}

export function restoreDataUrls(content: string, assetsDir: string): string {
  const sidecarRegex = /data:([^;]+);base64,__sidecar:([\w.]+)__/g

  return content.replace(sidecarRegex, (match, mimeType: string, filename: string) => {
    const filePath = join(assetsDir, filename)
    if (!existsSync(filePath)) {
      return match
    }
    const buffer = readFileSync(filePath)
    const base64Data = buffer.toString("base64")
    return `data:${mimeType};base64,${base64Data}`
  })
}

export function isBinaryContentType(contentType: string): boolean {
  const binaryTypes = [
    "application/octet-stream",
    "image/",
    "audio/",
    "video/",
    "application/pdf",
    "application/zip",
    "application/gzip"
  ]
  return binaryTypes.some((type) => contentType.startsWith(type))
}

export function writeBinaryFile(filePath: string, data: Uint8Array): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, {
      recursive: true
    })
  }
  writeFileSync(filePath, data)
}

export function readBinaryFile(filePath: string): Buffer | null {
  if (!existsSync(filePath)) {
    return null
  }
  return readFileSync(filePath)
}
