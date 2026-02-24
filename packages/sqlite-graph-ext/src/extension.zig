const c = @cImport({
  @cInclude("sqlite3.h")
})
const std = @import("std")

const GRAPH_EXT_VERSION = "0.1.0"

const Set = std.ArrayList([]const u8)

fn valueBlob(value: ?*c.sqlite3_value) []const u8 {
  if (value == null) return ""
  if (c.sqlite3_value_type(value) == c.SQLITE_NULL) return ""
  const bytes = c.sqlite3_value_blob(value)
  if (bytes == null) return ""
  const len = c.sqlite3_value_bytes(value)
  if (len <= 0) return ""
  return @as([*]const u8, @ptrCast(bytes))[0..@intCast(usize, len)]
}

fn valueToIdText(allocator: std.mem.Allocator, value: ?*c.sqlite3_value) ![]const u8 {
  if (value == null) return error.InvalidArgument

  const valueType = c.sqlite3_value_type(value)
  if (valueType == c.SQLITE_NULL) return ""

  return switch (valueType) {
    c.SQLITE_INTEGER => blk: {
      const v = c.sqlite3_value_int64(value)
      break :blk try std.fmt.allocPrint(allocator, "{d}", .{v})
    },
    c.SQLITE_FLOAT => blk: {
      const v = c.sqlite3_value_double(value)
      break :blk try std.fmt.allocPrint(allocator, "{d}", .{v})
    },
    c.SQLITE_TEXT => blk: {
      const ptr = c.sqlite3_value_text(value)
      if (ptr == null) return ""
      const len = c.sqlite3_value_bytes(value)
      break :blk try allocator.dupe(u8, @as([*]const u8, @ptrCast(ptr))[0..@intCast(usize, len)])
    },
    c.SQLITE_BLOB => blk: {
      const bytes = c.sqlite3_value_blob(value)
      if (bytes == null) return ""
      const len = c.sqlite3_value_bytes(value)
      break :blk try allocator.dupe(u8, @as([*]const u8, @ptrCast(bytes))[0..@intCast(usize, len)])
    },
    else => return error.InvalidArgument,
  }
}

fn containsId(set: *const Set, value: []const u8) bool {
  var lo: usize = 0
  var hi: usize = set.items.len
  while (lo < hi) {
    const mid = (lo + hi) / 2
    const entry = set.items[mid]
    if (std.mem.eql(u8, entry, value)) return true
    if (std.mem.lessThan(u8, entry, value)) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return false
}

fn lessLexicographic(context: void, a: []const u8, b: []const u8) bool {
  _ = context
  return std.mem.lessThan(u8, a, b)
}

fn parseSet(allocator: std.mem.Allocator, blob: []const u8) !Set {
  var parsed = Set.init(allocator)
  if (blob.len == 0) return parsed

  var iter = std.mem.splitScalar(u8, blob, '\n')
  while (iter.next()) |item| {
    if (item.len > 0) {
      try parsed.append(try allocator.dupe(u8, item))
    }
  }

  if (parsed.items.len > 1) {
    std.mem.sort([]const u8, parsed.items, {}, lessLexicographic)
  }

  if (parsed.items.len <= 1) return parsed

  var write: usize = 1
  var read: usize = 1
  while (read < parsed.items.len) : (read += 1) {
    if (!std.mem.eql(u8, parsed.items[read - 1], parsed.items[read])) {
      parsed.items[write] = parsed.items[read]
      write += 1
    } else {
      allocator.free(parsed.items[read])
    }
  }
  parsed.shrinkRetainingCapacity(write)
  return parsed
}

fn emitSet(context: ?*c.sqlite3_context, allocator: std.mem.Allocator, set: []const []const u8) void {
  if (set.len == 0) {
    c.sqlite3_result_blob(context, "", 0, c.SQLITE_TRANSIENT)
    return
  }

  var output = std.ArrayList(u8).init(allocator)
  for (set, 0..) |item, idx| {
    if (idx > 0) output.append('\n') catch {
      c.sqlite3_result_error(context, "unable to build idset output", -1)
      return
    }
    output.appendSlice(item) catch {
      c.sqlite3_result_error(context, "unable to build idset output", -1)
      return
    }
  }

  c.sqlite3_result_blob(context, output.items.ptr, @intCast(c_int, output.items.len), c.SQLITE_TRANSIENT)
}

fn emitError(context: ?*c.sqlite3_context, message: []const u8) void {
  c.sqlite3_result_error(context, message.ptr, @intCast(c_int, message.len))
}

fn contextResultError(context: ?*c.sqlite3_context, message: []const u8) callconv(.C) void {
  emitError(context, message)
}

fn contextResultText(context: ?*c.sqlite3_context, value: []const u8) callconv(.C) void {
  c.sqlite3_result_text(context, value.ptr, @intCast(c_int, value.len), c.SQLITE_TRANSIENT)
}

fn contextResultBlob(context: ?*c.sqlite3_context, value: []const u8) callconv(.C) void {
  c.sqlite3_result_blob(context, value.ptr, @intCast(c_int, value.len), c.SQLITE_TRANSIENT)
}

export fn graph_ext_version(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultText(context, GRAPH_EXT_VERSION)
}

export fn idset_empty(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultBlob(context, "")
}

export fn idset_add(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  if (argc != 2) {
    emitError(context, "idset_add expects (idset, value)")
    return
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator)
  defer arena.deinit()
  const allocator = arena.allocator()

  const setInput = valueBlob(argv[0])
  const idInput = valueToIdText(allocator, argv[1]) catch |err| {
    emitError(context, if (err == error.InvalidArgument) "idset_add requires a text or numeric value" else "idset_add failed")
    return
  }

  var values = parseSet(allocator, setInput) catch {
    emitError(context, "idset_add failed to parse set")
    return
  }

  try {
    try values.append(idInput)
    if (values.items.len > 1) {
      std.mem.sort([]const u8, values.items, {}, lessLexicographic)
    }

    if (values.items.len > 1) {
      var write: usize = 1
      var read: usize = 1
      while (read < values.items.len) : (read += 1) {
        if (!std.mem.eql(u8, values.items[read - 1], values.items[read])) {
          values.items[write] = values.items[read]
          write += 1
        }
      }
      values.shrinkRetainingCapacity(write)
    }

    emitSet(context, allocator, values.items)
  } catch {
    emitError(context, "idset_add failed")
  }
}

export fn idset_union(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  if (argc != 2) {
    emitError(context, "idset_union expects (left, right)")
    return
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator)
  defer arena.deinit()
  const allocator = arena.allocator()

  var left = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_union failed to parse first set")
    return
  }
  var right = parseSet(allocator, valueBlob(argv[1])) catch {
    emitError(context, "idset_union failed to parse second set")
    return
  }

  right.appendSlice(left.items) catch {
    emitError(context, "idset_union failed")
    return
  }

  if (right.items.len == 0) {
    emitSet(context, allocator, &[_][]const u8{})
    return
  }

  if (right.items.len > 1) {
    std.mem.sort([]const u8, right.items, {}, lessLexicographic)
  }

  if (right.items.len > 1) {
    var write: usize = 1
    var read: usize = 1
    while (read < right.items.len) : (read += 1) {
      if (!std.mem.eql(u8, right.items[read - 1], right.items[read])) {
        right.items[write] = right.items[read]
        write += 1
      }
    }
    right.shrinkRetainingCapacity(write)
  }

  emitSet(context, allocator, right.items)
}

export fn idset_intersect(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  if (argc != 2) {
    emitError(context, "idset_intersect expects (left, right)")
    return
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator)
  defer arena.deinit()
  const allocator = arena.allocator()

  const left = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_intersect failed to parse first set")
    return
  }
  const right = parseSet(allocator, valueBlob(argv[1])) catch {
    emitError(context, "idset_intersect failed to parse second set")
    return
  }

  var i: usize = 0
  var j: usize = 0
  var out = Set.init(allocator)
  while (i < left.items.len and j < right.items.len) {
    if (std.mem.eql(u8, left.items[i], right.items[j])) {
      out.append(left.items[i]) catch {
        emitError(context, "idset_intersect failed")
        return
      }
      i += 1
      j += 1
    } else if (std.mem.lessThan(u8, left.items[i], right.items[j])) {
      i += 1
    } else {
      j += 1
    }
  }

  emitSet(context, allocator, out.items)
}

export fn idset_diff(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  if (argc != 2) {
    emitError(context, "idset_diff expects (left, right)")
    return
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator)
  defer arena.deinit()
  const allocator = arena.allocator()

  const left = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_diff failed to parse first set")
    return
  }
  const right = parseSet(allocator, valueBlob(argv[1])) catch {
    emitError(context, "idset_diff failed to parse second set")
    return
  }

  var i: usize = 0
  var j: usize = 0
  var out = Set.init(allocator)

  while (i < left.items.len) {
    if (j >= right.items.len) {
      out.append(left.items[i]) catch {
        emitError(context, "idset_diff failed")
        return
      }
      i += 1
      continue
    }

    if (std.mem.eql(u8, left.items[i], right.items[j])) {
      i += 1
      j += 1
      continue
    }

    if (std.mem.lessThan(u8, left.items[i], right.items[j])) {
      out.append(left.items[i]) catch {
        emitError(context, "idset_diff failed")
        return
      }
      i += 1
      continue
    }

    j += 1
  }

  emitSet(context, allocator, out.items)
}

export fn idset_count(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  if (argc != 1) {
    emitError(context, "idset_count expects (idset)")
    return
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator)
  defer arena.deinit()
  const set = parseSet(arena.allocator(), valueBlob(argv[0])) catch {
    emitError(context, "idset_count failed to parse set")
    return
  }
  c.sqlite3_result_int64(context, @intCast(c_longlong, set.items.len))
}

export fn idset_contains(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  if (argc != 2) {
    emitError(context, "idset_contains expects (idset, value)")
    return
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator)
  defer arena.deinit()
  const allocator = arena.allocator()

  const set = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_contains failed to parse set")
    return
  }
  const needle = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "idset_contains expects text or numeric value")
    return
  }
  c.sqlite3_result_int(context, @intFromBool(containsId(&set, needle)))
}

export fn idset_hash(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  if (argc != 1) {
    emitError(context, "idset_hash expects (idset)")
    return
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator)
  defer arena.deinit()
  const allocator = arena.allocator()

  const set = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_hash failed to parse set")
    return
  }

  var hasher = std.hash.Wyhash.init(0)
  for (set.items) |entry| {
    hasher.update(entry)
  }
  const digest = hasher.final()
  const digestText = std.fmt.allocPrint(allocator, "{x}", .{digest}) catch {
    emitError(context, "idset_hash failed")
    return
  }

  contextResultText(context, digestText)
}

export fn idset_each(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "idset_each is not implemented yet")
}

export fn graph_out_many(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "graph_out_many is not implemented yet")
}

export fn graph_in_many(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "graph_in_many is not implemented yet")
}

export fn graph_out_idset(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "graph_out_idset is not implemented yet")
}

export fn graph_in_idset(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "graph_in_idset is not implemented yet")
}

export fn graph_two_hop_counts(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "graph_two_hop_counts is not implemented yet")
}

export fn graph_two_hop_supporters(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "graph_two_hop_supporters is not implemented yet")
}

export fn ranked_diff(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "ranked_diff is not implemented yet")
}

export fn vec_knn(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "vec_knn is optional and is not implemented yet")
}

export fn vec_knn_idset(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  contextResultError(context, "vec_knn_idset is optional and is not implemented yet")
}

pub fn sqlite3_graph_ext_init(db: ?*c.sqlite3, pzErrMsg: ?*anyopaque, pApi: ?*anyopaque) callconv(.C) c_int {
  _ = pzErrMsg
  _ = pApi

  if (c.sqlite3_create_function_v2(db, "graph_ext_version", 0, c.SQLITE_UTF8, null, graph_ext_version, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_empty", 0, c.SQLITE_UTF8, null, idset_empty, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_add", 2, c.SQLITE_UTF8, null, idset_add, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_union", 2, c.SQLITE_UTF8, null, idset_union, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_intersect", 2, c.SQLITE_UTF8, null, idset_intersect, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_diff", 2, c.SQLITE_UTF8, null, idset_diff, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_count", 1, c.SQLITE_UTF8, null, idset_count, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_contains", 2, c.SQLITE_UTF8, null, idset_contains, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "idset_hash", 1, c.SQLITE_UTF8, null, idset_hash, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR

  if (c.sqlite3_create_function_v2(db, "idset_each", 1, c.SQLITE_UTF8, null, idset_each, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR

  if (c.sqlite3_create_function_v2(db, "graph_out_many", 4, c.SQLITE_UTF8, null, graph_out_many, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "graph_in_many", 4, c.SQLITE_UTF8, null, graph_in_many, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "graph_out_idset", 3, c.SQLITE_UTF8, null, graph_out_idset, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "graph_in_idset", 3, c.SQLITE_UTF8, null, graph_in_idset, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR

  if (c.sqlite3_create_function_v2(db, "graph_two_hop_counts", 4, c.SQLITE_UTF8, null, graph_two_hop_counts, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "graph_two_hop_supporters", 4, c.SQLITE_UTF8, null, graph_two_hop_supporters, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR

  if (c.sqlite3_create_function_v2(db, "ranked_diff", 3, c.SQLITE_UTF8, null, ranked_diff, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR

  if (c.sqlite3_create_function_v2(db, "vec_knn", 3, c.SQLITE_UTF8, null, vec_knn, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR
  if (c.sqlite3_create_function_v2(db, "vec_knn_idset", 4, c.SQLITE_UTF8, null, vec_knn_idset, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR

  return c.SQLITE_OK
}
