const c = @cImport({
  @cInclude("sqlite3.h");
});

const std = @import("std");

const cInt = @TypeOf(c.SQLITE_UTF8);
const SQLITE_TRANSIENT: c.sqlite3_destructor_type = null;
const cLongLong = c.sqlite3_int64;

const GRAPH_EXT_VERSION = "0.1.0";

const Set = std.array_list.AlignedManaged([]const u8, null);
const ByteList = std.array_list.AlignedManaged(u8, null);

fn valueBlob(value: ?*c.sqlite3_value) []const u8 {
  if (value == null) return "";
  if (c.sqlite3_value_type(value) == c.SQLITE_NULL) return "";
  const bytes = c.sqlite3_value_blob(value);
  if (bytes == null) return "";
  const len = c.sqlite3_value_bytes(value);
  if (len <= 0) return "";
  return @as([*]const u8, @ptrCast(bytes))[0..@intCast(len)];
}

fn valueToIdText(allocator: std.mem.Allocator, value: ?*c.sqlite3_value) ![]const u8 {
  if (value == null) return error.InvalidArgument;

  const valueType = c.sqlite3_value_type(value);
  if (valueType == c.SQLITE_NULL) return "";

  return switch (valueType) {
    c.SQLITE_INTEGER => blk: {
      const v = c.sqlite3_value_int64(value);
      break :blk try std.fmt.allocPrint(allocator, "{d}", .{v});
    },
    c.SQLITE_FLOAT => blk: {
      const v = c.sqlite3_value_double(value);
      break :blk try std.fmt.allocPrint(allocator, "{d}", .{v});
    },
    c.SQLITE_TEXT => blk: {
      const ptr = c.sqlite3_value_text(value);
      if (ptr == null) return "";
      const len = c.sqlite3_value_bytes(value);
      break :blk try allocator.dupe(u8, @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)]);
    },
    c.SQLITE_BLOB => blk: {
      const bytes = c.sqlite3_value_blob(value);
      if (bytes == null) return "";
      const len = c.sqlite3_value_bytes(value);
      break :blk try allocator.dupe(u8, @as([*]const u8, @ptrCast(bytes))[0..@intCast(len)]);
    },
    else => error.InvalidArgument,
  };
}

fn containsId(set: *const Set, value: []const u8) bool {
  var lo: usize = 0;
  var hi: usize = set.items.len;
  while (lo < hi) {
    const mid = (lo + hi) / 2;
    const entry = set.items[mid];
    if (std.mem.eql(u8, entry, value)) return true;
    if (std.mem.lessThan(u8, entry, value)) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return false;
}

fn lessLexicographic(context: void, a: []const u8, b: []const u8) bool {
  _ = context;
  return std.mem.lessThan(u8, a, b);
}

fn parseSet(allocator: std.mem.Allocator, blob: []const u8) !Set {
  var parsed = Set.init(allocator);
  if (blob.len == 0) return parsed;

  var iter = std.mem.splitScalar(u8, blob, '\n');
  while (iter.next()) |item| {
    if (item.len > 0) {
      try parsed.append(try allocator.dupe(u8, item));
    }
  }

  if (parsed.items.len > 1) {
    std.mem.sort([]const u8, parsed.items, {}, lessLexicographic);
  }

  if (parsed.items.len <= 1) return parsed;

  var write: usize = 1;
  var read: usize = 1;
  while (read < parsed.items.len) : (read += 1) {
    if (!std.mem.eql(u8, parsed.items[read - 1], parsed.items[read])) {
      parsed.items[write] = parsed.items[read];
      write += 1;
    } else {
      allocator.free(parsed.items[read]);
    }
  }
  parsed.shrinkRetainingCapacity(write);
  return parsed;
}

fn emitSet(context: ?*c.sqlite3_context, allocator: std.mem.Allocator, set: []const []const u8) void {
  if (set.len == 0) {
    contextResultText(context, "");
    return;
  }

  var output = ByteList.init(allocator);
  for (set, 0..) |item, idx| {
    if (idx > 0) output.append('\n') catch {
      c.sqlite3_result_error(context, "unable to build idset output", -1);
      return;
    };
    output.appendSlice(item) catch {
      c.sqlite3_result_error(context, "unable to build idset output", -1);
      return;
    };
  }

  contextResultText(context, output.items);
}

fn emitError(context: ?*c.sqlite3_context, message: []const u8) void {
  c.sqlite3_result_error(context, message.ptr, @intCast(message.len));
}

fn isSafeIdentifier(value: []const u8) bool {
  if (value.len == 0) return false;
  for (value) |byte| {
    if (byte == '.') continue;
    if (byte == '_') continue;
    if (byte >= '0' and byte <= '9') continue;
    if (byte >= 'A' and byte <= 'Z') continue;
    if (byte >= 'a' and byte <= 'z') continue;
    return false;
  }
  return true;
}

fn appendSqlLiteral(output: *ByteList, value: []const u8) !void {
  try output.append('\'');
  for (value) |byte| {
    if (byte == '\'') {
      try output.appendSlice("''");
    } else {
      try output.append(byte);
    }
  }
  try output.append('\'');
}

fn buildInClauseFromSet(allocator: std.mem.Allocator, values: []const []const u8) ![]const u8 {
  var out = ByteList.init(allocator);
  if (values.len == 0) {
    try out.appendSlice("''");
    return out.toOwnedSlice();
  }

  for (values, 0..) |value, idx| {
    if (idx > 0) try out.append(',');
    try appendSqlLiteral(&out, value);
  }
  return out.toOwnedSlice();
}

fn appendSetText(output: *ByteList, values: []const []const u8) !void {
  for (values, 0..) |value, idx| {
    if (idx > 0) try output.append('\n');
    try output.appendSlice(value);
  }
}

fn appendNullableIntText(output: *ByteList, value: ?c.sqlite3_int64) !void {
  if (value) |v| {
    const text = try std.fmt.allocPrint(output.allocator, "{d}", .{v});
    try output.appendSlice(text);
  }
}

fn columnText(statement: *c.sqlite3_stmt, idx: cInt) []const u8 {
  const ptr = c.sqlite3_column_text(statement, idx);
  if (ptr == null) return "";
  const len = c.sqlite3_column_bytes(statement, idx);
  return @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
}

fn contextResultError(context: ?*c.sqlite3_context, message: []const u8) void {
  emitError(context, message);
}

fn contextResultText(context: ?*c.sqlite3_context, value: []const u8) void {
  resultText(context, value);
}

fn contextResultBlob(context: ?*c.sqlite3_context, value: []const u8) void {
  resultBlob(context, value);
}

fn resultText(context: ?*c.sqlite3_context, value: []const u8) void {
  if (value.len == 0) {
    c.sqlite3_result_text(context, "", 0, c.SQLITE_STATIC);
    return;
  }

  const nullTerminated = value.len + 1;
  const sqliteText = c.sqlite3_malloc(@intCast(nullTerminated)) orelse {
    emitError(context, "unable to allocate sqlite result");
    return;
  };
  const output = @as([*]u8, @ptrCast(sqliteText));
  @memcpy(output[0..value.len], value);
  output[value.len] = 0;
  c.sqlite3_result_text(context, output, @intCast(value.len), c.sqlite3_free);
}

fn resultBlob(context: ?*c.sqlite3_context, value: []const u8) void {
  if (value.len == 0) {
    c.sqlite3_result_blob(context, "", 0, c.SQLITE_STATIC);
    return;
  }

  const sqliteBlob = c.sqlite3_malloc(@intCast(value.len)) orelse {
    emitError(context, "unable to allocate sqlite result");
    return;
  };
  const output = @as([*]u8, @ptrCast(sqliteBlob));
  @memcpy(output[0..value.len], value);
  c.sqlite3_result_blob(context, output, @intCast(value.len), c.sqlite3_free);
}

export fn graph_ext_version(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  _ = argc;
  _ = argv;
  contextResultText(context, GRAPH_EXT_VERSION);
}

export fn idset_empty(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  _ = argc;
  _ = argv;
  contextResultBlob(context, "");
}

export fn idset_add(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 2) {
    emitError(context, "idset_add expects (idset, value)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const setInput = valueBlob(argv[0]);
  const idInput = valueToIdText(allocator, argv[1]) catch |err| {
    emitError(context, if (err == error.InvalidArgument) "idset_add requires a text or numeric value" else "idset_add failed");
    return;
  };

  var values = parseSet(allocator, setInput) catch {
    emitError(context, "idset_add failed to parse set");
    return;
  };

  values.append(idInput) catch {
    emitError(context, "idset_add failed");
    return;
  };

  if (values.items.len > 1) {
    std.mem.sort([]const u8, values.items, {}, lessLexicographic);
  }

  if (values.items.len > 1) {
    var write: usize = 1;
    var read: usize = 1;
    while (read < values.items.len) : (read += 1) {
      if (!std.mem.eql(u8, values.items[read - 1], values.items[read])) {
        values.items[write] = values.items[read];
        write += 1;
      }
    }
    values.shrinkRetainingCapacity(write);
  }

  emitSet(context, allocator, values.items);
}

export fn idset_union(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 2) {
    emitError(context, "idset_union expects (left, right)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const left = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_union failed to parse first set");
    return;
  };
  var right = parseSet(allocator, valueBlob(argv[1])) catch {
    emitError(context, "idset_union failed to parse second set");
    return;
  };

  right.appendSlice(left.items) catch {
    emitError(context, "idset_union failed");
    return;
  };

  if (right.items.len == 0) {
    emitSet(context, allocator, &[_][]const u8{});
    return;
  }

  if (right.items.len > 1) {
    std.mem.sort([]const u8, right.items, {}, lessLexicographic);
  }

  if (right.items.len > 1) {
    var write: usize = 1;
    var read: usize = 1;
    while (read < right.items.len) : (read += 1) {
      if (!std.mem.eql(u8, right.items[read - 1], right.items[read])) {
        right.items[write] = right.items[read];
        write += 1;
      }
    }
    right.shrinkRetainingCapacity(write);
  }

  emitSet(context, allocator, right.items);
}

export fn idset_intersect(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 2) {
    emitError(context, "idset_intersect expects (left, right)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const left = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_intersect failed to parse first set");
    return;
  };
  const right = parseSet(allocator, valueBlob(argv[1])) catch {
    emitError(context, "idset_intersect failed to parse second set");
    return;
  };

  var i: usize = 0;
  var j: usize = 0;
  var out = Set.init(allocator);
  while (i < left.items.len and j < right.items.len) {
    if (std.mem.eql(u8, left.items[i], right.items[j])) {
      out.append(left.items[i]) catch {
        emitError(context, "idset_intersect failed");
        return;
      };
      i += 1;
      j += 1;
    } else if (std.mem.lessThan(u8, left.items[i], right.items[j])) {
      i += 1;
    } else {
      j += 1;
    }
  }

  emitSet(context, allocator, out.items);
}

export fn idset_diff(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 2) {
    emitError(context, "idset_diff expects (left, right)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const left = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_diff failed to parse first set");
    return;
  };
  const right = parseSet(allocator, valueBlob(argv[1])) catch {
    emitError(context, "idset_diff failed to parse second set");
    return;
  };

  var i: usize = 0;
  var j: usize = 0;
  var out = Set.init(allocator);

  while (i < left.items.len) {
    if (j >= right.items.len) {
      out.append(left.items[i]) catch {
        emitError(context, "idset_diff failed");
        return;
      };
      i += 1;
      continue;
    }

    if (std.mem.eql(u8, left.items[i], right.items[j])) {
      i += 1;
      j += 1;
      continue;
    }

    if (std.mem.lessThan(u8, left.items[i], right.items[j])) {
      out.append(left.items[i]) catch {
        emitError(context, "idset_diff failed");
        return;
      };
      i += 1;
      continue;
    }

    j += 1;
  }

  emitSet(context, allocator, out.items);
}

export fn idset_count(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 1) {
    emitError(context, "idset_count expects (idset)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const set = parseSet(arena.allocator(), valueBlob(argv[0])) catch {
    emitError(context, "idset_count failed to parse set");
    return;
  };
  c.sqlite3_result_int64(context, @intCast(set.items.len));
}

export fn idset_contains(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 2) {
    emitError(context, "idset_contains expects (idset, value)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const set = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_contains failed to parse set");
    return;
  };
  const needle = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "idset_contains expects text or numeric value");
    return;
  };
  c.sqlite3_result_int(context, @intFromBool(containsId(&set, needle)));
}

export fn idset_hash(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 1) {
    emitError(context, "idset_hash expects (idset)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const set = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_hash failed to parse set");
    return;
  };

  var hasher = std.hash.Wyhash.init(0);
  for (set.items) |entry| {
    hasher.update(entry);
  }
  const digest = hasher.final();
  const digestText = std.fmt.allocPrint(allocator, "{x}", .{digest}) catch {
    emitError(context, "idset_hash failed");
    return;
  };

  contextResultText(context, digestText);
}

export fn idset_each(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 1) {
    emitError(context, "idset_each expects (idset)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const set = parseSet(allocator, valueBlob(argv[0])) catch {
    emitError(context, "idset_each failed to parse set");
    return;
  };

  var output = ByteList.init(allocator);
  for (set.items, 0..) |id, ord| {
    if (ord > 0) {
      output.append('\n') catch {
        emitError(context, "idset_each failed");
        return;
      };
    }

    const ordText = std.fmt.allocPrint(allocator, "{d}", .{ord + 1}) catch {
      emitError(context, "idset_each failed");
      return;
    };

    output.appendSlice(id) catch {
      emitError(context, "idset_each failed");
      return;
    };
    output.append('\t') catch {
      emitError(context, "idset_each failed");
      return;
    };
    output.appendSlice(ordText) catch {
      emitError(context, "idset_each failed");
      return;
    };
  }

  contextResultText(context, output.items);
}

export fn graph_out_many(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 4) {
    emitError(context, "graph_out_many expects (edge_table, edge_type, src_set, where_sql)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const edgeTable = valueToIdText(allocator, argv[0]) catch {
    emitError(context, "graph_out_many requires a valid edge table");
    return;
  };
  if (!isSafeIdentifier(edgeTable)) {
    emitError(context, "graph_out_many requires a safe table identifier");
    return;
  }

  const edgeType = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "graph_out_many requires a valid edge_type value");
    return;
  };
  const set = parseSet(allocator, valueBlob(argv[2])) catch {
    emitError(context, "graph_out_many failed to parse src_set");
    return;
  };
  const whereSql = valueToIdText(allocator, argv[3]) catch {
    emitError(context, "graph_out_many where_sql must be text");
    return;
  };

  if (set.items.len == 0) {
    contextResultText(context, "");
    return;
  }

  const db = c.sqlite3_context_db_handle(context);

  var sql = ByteList.init(allocator);
  sql.appendSlice("SELECT src, dst FROM ") catch {
    emitError(context, "graph_out_many failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_out_many failed");
    return;
  };
  sql.appendSlice(" WHERE ") catch {
    emitError(context, "graph_out_many failed");
    return;
  };

  if (edgeType.len > 0) {
    sql.appendSlice("edge_type = ") catch {
      emitError(context, "graph_out_many failed");
      return;
    };
    appendSqlLiteral(&sql, edgeType) catch {
      emitError(context, "graph_out_many failed");
      return;
    };
    sql.appendSlice(" AND ") catch {
      emitError(context, "graph_out_many failed");
      return;
    };
  }
  sql.appendSlice("src IN (") catch {
    emitError(context, "graph_out_many failed");
    return;
  };
  const inClause = buildInClauseFromSet(allocator, set.items) catch {
    emitError(context, "graph_out_many failed");
    return;
  };
  sql.appendSlice(inClause) catch {
    emitError(context, "graph_out_many failed");
    return;
  };
  sql.appendSlice(")") catch {
    emitError(context, "graph_out_many failed");
    return;
  };
  if (whereSql.len > 0) {
    sql.appendSlice(" AND (") catch {
      emitError(context, "graph_out_many failed");
      return;
    };
    sql.appendSlice(whereSql) catch {
      emitError(context, "graph_out_many failed");
      return;
    };
    sql.appendSlice(")") catch {
      emitError(context, "graph_out_many failed");
      return;
    };
  }
  sql.appendSlice(" ORDER BY src, dst") catch {
    emitError(context, "graph_out_many failed");
    return;
  };

  const sqlText = sql.items;
  const sqlZ = allocator.dupeZ(u8, sqlText) catch {
    emitError(context, "graph_out_many failed to build SQL");
    return;
  };

  var statement: ?*c.sqlite3_stmt = null;
  if (c.sqlite3_prepare_v2(db, sqlZ, -1, &statement, null) != c.SQLITE_OK) {
    emitError(context, "graph_out_many failed to prepare query");
    return;
  }
  defer _ = c.sqlite3_finalize(statement.?);

  var output = ByteList.init(allocator);
  while (true) {
    const step = c.sqlite3_step(statement.?);
    if (step == c.SQLITE_ROW) {
      const src = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 0);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 0);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };
      const dst = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 1);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 1);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };

      if (output.items.len > 0) {
        output.append('\n') catch {
          emitError(context, "graph_out_many failed");
          return;
        };
      }
      output.appendSlice(src) catch {
        emitError(context, "graph_out_many failed");
        return;
      };
      output.append('\t') catch {
        emitError(context, "graph_out_many failed");
        return;
      };
      output.appendSlice(dst) catch {
        emitError(context, "graph_out_many failed");
        return;
      };
      continue;
    }

    if (step == c.SQLITE_DONE) break;
    emitError(context, "graph_out_many query execution failed");
    return;
  }

  contextResultText(context, output.items);
}

export fn graph_in_many(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 4) {
    emitError(context, "graph_in_many expects (edge_table, edge_type, dst_set, where_sql)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const edgeTable = valueToIdText(allocator, argv[0]) catch {
    emitError(context, "graph_in_many requires a valid edge table");
    return;
  };
  if (!isSafeIdentifier(edgeTable)) {
    emitError(context, "graph_in_many requires a safe table identifier");
    return;
  }

  const edgeType = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "graph_in_many requires a valid edge_type value");
    return;
  };
  const set = parseSet(allocator, valueBlob(argv[2])) catch {
    emitError(context, "graph_in_many failed to parse dst_set");
    return;
  };
  const whereSql = valueToIdText(allocator, argv[3]) catch {
    emitError(context, "graph_in_many where_sql must be text");
    return;
  };

  if (set.items.len == 0) {
    contextResultText(context, "");
    return;
  }

  const db = c.sqlite3_context_db_handle(context);

  var sql = ByteList.init(allocator);
  sql.appendSlice("SELECT dst, src FROM ") catch {
    emitError(context, "graph_in_many failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_in_many failed");
    return;
  };
  sql.appendSlice(" WHERE ") catch {
    emitError(context, "graph_in_many failed");
    return;
  };
  if (edgeType.len > 0) {
    sql.appendSlice("edge_type = ") catch {
      emitError(context, "graph_in_many failed");
      return;
    };
    appendSqlLiteral(&sql, edgeType) catch {
      emitError(context, "graph_in_many failed");
      return;
    };
    sql.appendSlice(" AND ") catch {
      emitError(context, "graph_in_many failed");
      return;
    };
  }
  sql.appendSlice("dst IN (") catch {
    emitError(context, "graph_in_many failed");
    return;
  };
  const inClause = buildInClauseFromSet(allocator, set.items) catch {
    emitError(context, "graph_in_many failed");
    return;
  };
  sql.appendSlice(inClause) catch {
    emitError(context, "graph_in_many failed");
    return;
  };
  sql.appendSlice(")") catch {
    emitError(context, "graph_in_many failed");
    return;
  };
  if (whereSql.len > 0) {
    sql.appendSlice(" AND (") catch {
      emitError(context, "graph_in_many failed");
      return;
    };
    sql.appendSlice(whereSql) catch {
      emitError(context, "graph_in_many failed");
      return;
    };
    sql.appendSlice(")") catch {
      emitError(context, "graph_in_many failed");
      return;
    };
  }
  sql.appendSlice(" ORDER BY dst, src") catch {
    emitError(context, "graph_in_many failed");
    return;
  };

  const sqlText = sql.items;
  const sqlZ = allocator.dupeZ(u8, sqlText) catch {
    emitError(context, "graph_in_many failed to build SQL");
    return;
  };

  var statement: ?*c.sqlite3_stmt = null;
  if (c.sqlite3_prepare_v2(db, sqlZ, -1, &statement, null) != c.SQLITE_OK) {
    emitError(context, "graph_in_many failed to prepare query");
    return;
  }
  defer _ = c.sqlite3_finalize(statement.?);

  var output = ByteList.init(allocator);
  while (true) {
    const step = c.sqlite3_step(statement.?);
    if (step == c.SQLITE_ROW) {
      const dst = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 0);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 0);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };
      const src = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 1);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 1);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };

      if (output.items.len > 0) {
        output.append('\n') catch {
          emitError(context, "graph_in_many failed");
          return;
        };
      }
      output.appendSlice(dst) catch {
        emitError(context, "graph_in_many failed");
        return;
      };
      output.append('\t') catch {
        emitError(context, "graph_in_many failed");
        return;
      };
      output.appendSlice(src) catch {
        emitError(context, "graph_in_many failed");
        return;
      };
      continue;
    }

    if (step == c.SQLITE_DONE) break;
    emitError(context, "graph_in_many query execution failed");
    return;
  }

  contextResultText(context, output.items);
}

export fn graph_out_idset(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 3) {
    emitError(context, "graph_out_idset expects (edge_table, edge_type, src_set)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const edgeTable = valueToIdText(allocator, argv[0]) catch {
    emitError(context, "graph_out_idset requires a valid edge table");
    return;
  };
  if (!isSafeIdentifier(edgeTable)) {
    emitError(context, "graph_out_idset requires a safe table identifier");
    return;
  }

  const edgeType = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "graph_out_idset requires a valid edge_type");
    return;
  };
  const set = parseSet(allocator, valueBlob(argv[2])) catch {
    emitError(context, "graph_out_idset failed to parse src_set");
    return;
  };

  if (set.items.len == 0) {
    contextResultText(context, "");
    return;
  }

  const db = c.sqlite3_context_db_handle(context);

  var sql = ByteList.init(allocator);
  sql.appendSlice("SELECT src, dst FROM ") catch {
    emitError(context, "graph_out_idset failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_out_idset failed");
    return;
  };
  sql.appendSlice(" WHERE ") catch {
    emitError(context, "graph_out_idset failed");
    return;
  };
  if (edgeType.len > 0) {
    sql.appendSlice("edge_type = ") catch {
      emitError(context, "graph_out_idset failed");
      return;
    };
    appendSqlLiteral(&sql, edgeType) catch {
      emitError(context, "graph_out_idset failed");
      return;
    };
    sql.appendSlice(" AND ") catch {
      emitError(context, "graph_out_idset failed");
      return;
    };
  }
  sql.appendSlice("src IN (") catch {
    emitError(context, "graph_out_idset failed");
    return;
  };
  const inClause = buildInClauseFromSet(allocator, set.items) catch {
    emitError(context, "graph_out_idset failed");
    return;
  };
  sql.appendSlice(inClause) catch {
    emitError(context, "graph_out_idset failed");
    return;
  };
  sql.appendSlice(") ORDER BY src, dst") catch {
    emitError(context, "graph_out_idset failed");
    return;
  };

  const sqlText = sql.items;
  const sqlZ = allocator.dupeZ(u8, sqlText) catch {
    emitError(context, "graph_out_idset failed to build SQL");
    return;
  };

  var statement: ?*c.sqlite3_stmt = null;
  if (c.sqlite3_prepare_v2(db, sqlZ, -1, &statement, null) != c.SQLITE_OK) {
    emitError(context, "graph_out_idset failed to prepare query");
    return;
  }
  defer _ = c.sqlite3_finalize(statement.?);

  var output = ByteList.init(allocator);
  var currentSrc: ?[]const u8 = null;
  var currentValues = Set.init(allocator);
  var lastDst: ?[]const u8 = null;

  while (true) {
    const step = c.sqlite3_step(statement.?);
    if (step == c.SQLITE_ROW) {
      const src = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 0);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 0);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };
      const dst = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 1);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 1);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };

      if (currentSrc == null or !std.mem.eql(u8, currentSrc.?, src)) {
        if (currentSrc != null) {
          if (output.items.len > 0) output.append('\n') catch {};
          output.appendSlice(currentSrc.?) catch {
            emitError(context, "graph_out_idset failed");
            return;
          };
          output.append('\t') catch {
            emitError(context, "graph_out_idset failed");
            return;
          };
          appendSetText(&output, currentValues.items) catch {
            emitError(context, "graph_out_idset failed");
            return;
          };
        }
        const duplicatedSrc = allocator.dupe(u8, src) catch {
          emitError(context, "graph_out_idset failed");
          return;
        };
        currentSrc = duplicatedSrc;
        currentValues.deinit();
        currentValues = Set.init(allocator);
        currentValues.append(allocator.dupe(u8, dst) catch {
          emitError(context, "graph_out_idset failed");
          return;
        }) catch {
          emitError(context, "graph_out_idset failed");
          return;
        };
        lastDst = allocator.dupe(u8, dst) catch {
          emitError(context, "graph_out_idset failed");
          return;
        };
        continue;
      }

      if (lastDst == null or !std.mem.eql(u8, lastDst.?, dst)) {
        currentValues.append(allocator.dupe(u8, dst) catch {
          emitError(context, "graph_out_idset failed");
          return;
        }) catch {
          emitError(context, "graph_out_idset failed");
          return;
        };
        lastDst = allocator.dupe(u8, dst) catch {
          emitError(context, "graph_out_idset failed");
          return;
        };
      }
      continue;
    }

    if (step == c.SQLITE_DONE) break;
    emitError(context, "graph_out_idset query execution failed");
    return;
  }

  if (currentSrc != null) {
    if (output.items.len > 0) {
      output.append('\n') catch {
        emitError(context, "graph_out_idset failed");
        return;
      };
    }
    output.appendSlice(currentSrc.?) catch {
      emitError(context, "graph_out_idset failed");
      return;
    };
    output.append('\t') catch {
      emitError(context, "graph_out_idset failed");
      return;
    };
    appendSetText(&output, currentValues.items) catch {
      emitError(context, "graph_out_idset failed");
      return;
    };
  }

  contextResultText(context, output.items);
}

export fn graph_in_idset(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 3) {
    emitError(context, "graph_in_idset expects (edge_table, edge_type, dst_set)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const edgeTable = valueToIdText(allocator, argv[0]) catch {
    emitError(context, "graph_in_idset requires a valid edge table");
    return;
  };
  if (!isSafeIdentifier(edgeTable)) {
    emitError(context, "graph_in_idset requires a safe table identifier");
    return;
  }

  const edgeType = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "graph_in_idset requires a valid edge_type");
    return;
  };
  const set = parseSet(allocator, valueBlob(argv[2])) catch {
    emitError(context, "graph_in_idset failed to parse dst_set");
    return;
  };

  if (set.items.len == 0) {
    contextResultText(context, "");
    return;
  }

  const db = c.sqlite3_context_db_handle(context);

  var sql = ByteList.init(allocator);
  sql.appendSlice("SELECT dst, src FROM ") catch {
    emitError(context, "graph_in_idset failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_in_idset failed");
    return;
  };
  sql.appendSlice(" WHERE ") catch {
    emitError(context, "graph_in_idset failed");
    return;
  };
  if (edgeType.len > 0) {
    sql.appendSlice("edge_type = ") catch {
      emitError(context, "graph_in_idset failed");
      return;
    };
    appendSqlLiteral(&sql, edgeType) catch {
      emitError(context, "graph_in_idset failed");
      return;
    };
    sql.appendSlice(" AND ") catch {
      emitError(context, "graph_in_idset failed");
      return;
    };
  }
  sql.appendSlice("dst IN (") catch {
    emitError(context, "graph_in_idset failed");
    return;
  };
  const inClause = buildInClauseFromSet(allocator, set.items) catch {
    emitError(context, "graph_in_idset failed");
    return;
  };
  sql.appendSlice(inClause) catch {
    emitError(context, "graph_in_idset failed");
    return;
  };
  sql.appendSlice(") ORDER BY dst, src") catch {
    emitError(context, "graph_in_idset failed");
    return;
  };

  const sqlText = sql.items;
  const sqlZ = allocator.dupeZ(u8, sqlText) catch {
    emitError(context, "graph_in_idset failed to build SQL");
    return;
  };

  var statement: ?*c.sqlite3_stmt = null;
  if (c.sqlite3_prepare_v2(db, sqlZ, -1, &statement, null) != c.SQLITE_OK) {
    emitError(context, "graph_in_idset failed to prepare query");
    return;
  }
  defer _ = c.sqlite3_finalize(statement.?);

  var output = ByteList.init(allocator);
  var currentDst: ?[]const u8 = null;
  var currentValues = Set.init(allocator);
  var lastSrc: ?[]const u8 = null;

  while (true) {
    const step = c.sqlite3_step(statement.?);
    if (step == c.SQLITE_ROW) {
      const dst = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 0);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 0);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };
      const src = blk: {
        const ptr = c.sqlite3_column_text(statement.?, 1);
        if (ptr == null) break :blk "";
        const len = c.sqlite3_column_bytes(statement.?, 1);
        break :blk @as([*]const u8, @ptrCast(ptr))[0..@intCast(len)];
      };

      if (currentDst == null or !std.mem.eql(u8, currentDst.?, dst)) {
        if (currentDst != null) {
          if (output.items.len > 0) output.append('\n') catch {};
          output.appendSlice(currentDst.?) catch {
            emitError(context, "graph_in_idset failed");
            return;
          };
          output.append('\t') catch {
            emitError(context, "graph_in_idset failed");
            return;
          };
          appendSetText(&output, currentValues.items) catch {
            emitError(context, "graph_in_idset failed");
            return;
          };
        }
        const duplicatedDst = allocator.dupe(u8, dst) catch {
          emitError(context, "graph_in_idset failed");
          return;
        };
        currentDst = duplicatedDst;
        currentValues.deinit();
        currentValues = Set.init(allocator);
        currentValues.append(allocator.dupe(u8, src) catch {
          emitError(context, "graph_in_idset failed");
          return;
        }) catch {
          emitError(context, "graph_in_idset failed");
          return;
        };
        lastSrc = allocator.dupe(u8, src) catch {
          emitError(context, "graph_in_idset failed");
          return;
        };
        continue;
      }

      if (lastSrc == null or !std.mem.eql(u8, lastSrc.?, src)) {
        currentValues.append(allocator.dupe(u8, src) catch {
          emitError(context, "graph_in_idset failed");
          return;
        }) catch {
          emitError(context, "graph_in_idset failed");
          return;
        };
        lastSrc = allocator.dupe(u8, src) catch {
          emitError(context, "graph_in_idset failed");
          return;
        };
      }
      continue;
    }

    if (step == c.SQLITE_DONE) break;
    emitError(context, "graph_in_idset query execution failed");
    return;
  }

  if (currentDst != null) {
    if (output.items.len > 0) {
      output.append('\n') catch {
        emitError(context, "graph_in_idset failed");
        return;
      };
    }
    output.appendSlice(currentDst.?) catch {
      emitError(context, "graph_in_idset failed");
      return;
    };
    output.append('\t') catch {
      emitError(context, "graph_in_idset failed");
      return;
    };
    appendSetText(&output, currentValues.items) catch {
      emitError(context, "graph_in_idset failed");
      return;
    };
  }

  contextResultText(context, output.items);
}

export fn graph_two_hop_counts(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 4) {
    emitError(context, "graph_two_hop_counts expects (edge_table, hop1_edge_type, hop2_edge_type, start_set)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const edgeTable = valueToIdText(allocator, argv[0]) catch {
    emitError(context, "graph_two_hop_counts requires a valid edge table");
    return;
  };
  if (!isSafeIdentifier(edgeTable)) {
    emitError(context, "graph_two_hop_counts requires a safe table identifier");
    return;
  }

  const hop1EdgeType = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "graph_two_hop_counts requires a valid hop1 edge_type");
    return;
  };
  const hop2EdgeType = valueToIdText(allocator, argv[2]) catch {
    emitError(context, "graph_two_hop_counts requires a valid hop2 edge_type");
    return;
  };
  const startSet = parseSet(allocator, valueBlob(argv[3])) catch {
    emitError(context, "graph_two_hop_counts failed to parse start_set");
    return;
  };

  if (startSet.items.len == 0) {
    contextResultText(context, "");
    return;
  }

  const db = c.sqlite3_context_db_handle(context);

  var sql = ByteList.init(allocator);
  sql.appendSlice("SELECT e2.dst, COUNT(DISTINCT e1.src) AS support_count FROM ") catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(" AS e1 JOIN ") catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(" AS e2 ON e2.src = e1.dst WHERE e1.edge_type = ") catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
    appendSqlLiteral(&sql, hop1EdgeType) catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(" AND e2.edge_type = ") catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
    appendSqlLiteral(&sql, hop2EdgeType) catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(" AND e1.src IN (") catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  const inClause = buildInClauseFromSet(allocator, startSet.items) catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(inClause) catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };
  sql.appendSlice(") GROUP BY e2.dst ORDER BY e2.dst") catch {
    emitError(context, "graph_two_hop_counts failed");
    return;
  };

  const sqlText = sql.items;
  const sqlZ = allocator.dupeZ(u8, sqlText) catch {
    emitError(context, "graph_two_hop_counts failed to build SQL");
    return;
  };

  var statement: ?*c.sqlite3_stmt = null;
  if (c.sqlite3_prepare_v2(db, sqlZ, -1, &statement, null) != c.SQLITE_OK) {
    emitError(context, "graph_two_hop_counts failed to prepare query");
    return;
  }
  defer _ = c.sqlite3_finalize(statement.?);

  var output = ByteList.init(allocator);
  while (true) {
    const step = c.sqlite3_step(statement.?);
    if (step == c.SQLITE_ROW) {
      const dst = columnText(statement.?, 0);
      const support = c.sqlite3_column_int64(statement.?, 1);

      if (output.items.len > 0) {
        output.append('\n') catch {
          emitError(context, "graph_two_hop_counts failed");
          return;
        };
      }
      output.appendSlice(dst) catch {
        emitError(context, "graph_two_hop_counts failed");
        return;
      };
      output.append('\t') catch {
        emitError(context, "graph_two_hop_counts failed");
        return;
      };
      const supportText = std.fmt.allocPrint(allocator, "{d}", .{support}) catch {
        emitError(context, "graph_two_hop_counts failed");
        return;
      };
      output.appendSlice(supportText) catch {
        emitError(context, "graph_two_hop_counts failed");
        return;
      };
      continue;
    }

    if (step == c.SQLITE_DONE) break;
    emitError(context, "graph_two_hop_counts query execution failed");
    return;
  }

  contextResultText(context, output.items);
}

export fn graph_two_hop_supporters(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 4) {
    emitError(context, "graph_two_hop_supporters expects (edge_table, hop1_edge_type, hop2_edge_type, start_set)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const edgeTable = valueToIdText(allocator, argv[0]) catch {
    emitError(context, "graph_two_hop_supporters requires a valid edge table");
    return;
  };
  if (!isSafeIdentifier(edgeTable)) {
    emitError(context, "graph_two_hop_supporters requires a safe table identifier");
    return;
  }

  const hop1EdgeType = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "graph_two_hop_supporters requires a valid hop1 edge_type");
    return;
  };
  const hop2EdgeType = valueToIdText(allocator, argv[2]) catch {
    emitError(context, "graph_two_hop_supporters requires a valid hop2 edge_type");
    return;
  };
  const startSet = parseSet(allocator, valueBlob(argv[3])) catch {
    emitError(context, "graph_two_hop_supporters failed to parse start_set");
    return;
  };

  if (startSet.items.len == 0) {
    contextResultText(context, "");
    return;
  }

  const db = c.sqlite3_context_db_handle(context);

  var sql = ByteList.init(allocator);
  sql.appendSlice("SELECT e1.src AS supporter, e2.dst AS dst") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(" FROM ") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(" AS e1 JOIN ") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(edgeTable) catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(" AS e2 ON e2.src = e1.dst") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(" WHERE e1.edge_type = ") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
    appendSqlLiteral(&sql, hop1EdgeType) catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(" AND e2.edge_type = ") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
    appendSqlLiteral(&sql, hop2EdgeType) catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(" AND e1.src IN (") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  const inClause = buildInClauseFromSet(allocator, startSet.items) catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(inClause) catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };
  sql.appendSlice(") GROUP BY supporter, dst ORDER BY dst, supporter") catch {
    emitError(context, "graph_two_hop_supporters failed");
    return;
  };

  const sqlText = sql.items;
  const sqlZ = allocator.dupeZ(u8, sqlText) catch {
    emitError(context, "graph_two_hop_supporters failed to build SQL");
    return;
  };

  var statement: ?*c.sqlite3_stmt = null;
  if (c.sqlite3_prepare_v2(db, sqlZ, -1, &statement, null) != c.SQLITE_OK) {
    emitError(context, "graph_two_hop_supporters failed to prepare query");
    return;
  }
  defer _ = c.sqlite3_finalize(statement.?);

  var output = ByteList.init(allocator);
  var currentDst: ?[]const u8 = null;
  var currentSupporters = Set.init(allocator);

  while (true) {
    const step = c.sqlite3_step(statement.?);
    if (step == c.SQLITE_ROW) {
      const supporter = columnText(statement.?, 0);
      const dst = columnText(statement.?, 1);

      if (currentDst == null or !std.mem.eql(u8, currentDst.?, dst)) {
        if (currentDst != null) {
          if (output.items.len > 0) {
            output.append('\n') catch {
              emitError(context, "graph_two_hop_supporters failed");
              return;
            };
          }
          output.appendSlice(currentDst.?) catch {
            emitError(context, "graph_two_hop_supporters failed");
            return;
          };
          output.append('\t') catch {
            emitError(context, "graph_two_hop_supporters failed");
            return;
          };
          appendSetText(&output, currentSupporters.items) catch {
            emitError(context, "graph_two_hop_supporters failed");
            return;
          };
        }

        currentDst = allocator.dupe(u8, dst) catch {
          emitError(context, "graph_two_hop_supporters failed");
          return;
        };
        currentSupporters.deinit();
        currentSupporters = Set.init(allocator);
      }

      currentSupporters.append(allocator.dupe(u8, supporter) catch {
        emitError(context, "graph_two_hop_supporters failed");
        return;
      }) catch {
        emitError(context, "graph_two_hop_supporters failed");
        return;
      };
      continue;
    }

    if (step == c.SQLITE_DONE) break;
    emitError(context, "graph_two_hop_supporters query execution failed");
    return;
  }

  if (currentDst != null) {
    if (output.items.len > 0) output.append('\n') catch {
      emitError(context, "graph_two_hop_supporters failed");
      return;
    };
    output.appendSlice(currentDst.?) catch {
      emitError(context, "graph_two_hop_supporters failed");
      return;
    };
    output.append('\t') catch {
      emitError(context, "graph_two_hop_supporters failed");
      return;
    };
    appendSetText(&output, currentSupporters.items) catch {
      emitError(context, "graph_two_hop_supporters failed");
      return;
    };
  }

  contextResultText(context, output.items);
}

export fn ranked_diff(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  if (argc != 3) {
    emitError(context, "ranked_diff expects (old_serp_id, new_serp_id, table)");
    return;
  }

  var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const oldSerpId = valueToIdText(allocator, argv[0]) catch {
    emitError(context, "ranked_diff requires a valid old_serp_id");
    return;
  };
  const newSerpId = valueToIdText(allocator, argv[1]) catch {
    emitError(context, "ranked_diff requires a valid new_serp_id");
    return;
  };
  const table = valueToIdText(allocator, argv[2]) catch {
    emitError(context, "ranked_diff requires a valid table");
    return;
  };
  if (!isSafeIdentifier(table)) {
    emitError(context, "ranked_diff requires a safe table identifier");
    return;
  }

  const db = c.sqlite3_context_db_handle(context);
  var sql = ByteList.init(allocator);

  sql.appendSlice("WITH old_snapshot(item, old_rank) AS (\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  SELECT url_or_entity_id, rank FROM ") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice(table) catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice(" WHERE serp_id = ") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
    appendSqlLiteral(&sql, oldSerpId) catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("), new_snapshot(item, new_rank) AS (\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  SELECT url_or_entity_id, rank FROM ") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice(table) catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice(" WHERE serp_id = ") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
    appendSqlLiteral(&sql, newSerpId) catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice(")\n, unified AS (\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  SELECT o.item, o.old_rank, n.new_rank\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  FROM old_snapshot o LEFT JOIN new_snapshot n ON o.item = n.item\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  UNION ALL\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  SELECT n.item, o.old_rank, n.new_rank\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  FROM new_snapshot n LEFT JOIN old_snapshot o ON n.item = o.item\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  WHERE o.item IS NULL\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice(")\nSELECT item,\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  old_rank,\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  new_rank,\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  CASE WHEN old_rank IS NULL OR new_rank IS NULL THEN NULL ELSE new_rank - old_rank END AS delta_rank,\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  CASE\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("    WHEN old_rank IS NULL THEN 'entered'\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("    WHEN new_rank IS NULL THEN 'exited'\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("    WHEN old_rank != new_rank THEN 'moved'\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("    ELSE 'unchanged'\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("  END AS status\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("FROM unified\n") catch {
    emitError(context, "ranked_diff failed");
    return;
  };
  sql.appendSlice("ORDER BY COALESCE(old_rank, new_rank, 2147483647), item") catch {
    emitError(context, "ranked_diff failed");
    return;
  };

  const sqlText = sql.items;
  const sqlZ = allocator.dupeZ(u8, sqlText) catch {
    emitError(context, "ranked_diff failed to build SQL");
    return;
  };

  var statement: ?*c.sqlite3_stmt = null;
  if (c.sqlite3_prepare_v2(db, sqlZ, -1, &statement, null) != c.SQLITE_OK) {
    emitError(context, "ranked_diff failed to prepare query");
    return;
  }
  defer _ = c.sqlite3_finalize(statement.?);

  var output = ByteList.init(allocator);
  while (true) {
    const step = c.sqlite3_step(statement.?);
    if (step == c.SQLITE_ROW) {
      const item = columnText(statement.?, 0);
      const oldRank: ?c.sqlite3_int64 = blk: {
        if (c.sqlite3_column_type(statement.?, 1) == c.SQLITE_NULL) break :blk null;
        break :blk c.sqlite3_column_int64(statement.?, 1);
      };
      const newRank: ?c.sqlite3_int64 = blk: {
        if (c.sqlite3_column_type(statement.?, 2) == c.SQLITE_NULL) break :blk null;
        break :blk c.sqlite3_column_int64(statement.?, 2);
      };
      const deltaRank: ?c.sqlite3_int64 = blk: {
        if (c.sqlite3_column_type(statement.?, 3) == c.SQLITE_NULL) break :blk null;
        break :blk c.sqlite3_column_int64(statement.?, 3);
      };
      const status = columnText(statement.?, 4);

      if (output.items.len > 0) {
        output.append('\n') catch {
          emitError(context, "ranked_diff failed");
          return;
        };
      }
      output.appendSlice(item) catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      output.append('\t') catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      appendNullableIntText(&output, oldRank) catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      output.append('\t') catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      appendNullableIntText(&output, newRank) catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      output.append('\t') catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      appendNullableIntText(&output, deltaRank) catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      output.append('\t') catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      output.appendSlice(status) catch {
        emitError(context, "ranked_diff failed");
        return;
      };
      continue;
    }

    if (step == c.SQLITE_DONE) break;
    emitError(context, "ranked_diff query execution failed");
    return;
  }

  contextResultText(context, output.items);
}

export fn vec_knn(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  _ = argc;
  _ = argv;
  contextResultError(context, "vec_knn is optional and is not implemented yet");
}

export fn vec_knn_idset(context: ?*c.sqlite3_context, argc: cInt, argv: [*c]?*c.sqlite3_value) callconv(.c) void {
  _ = argc;
  _ = argv;
  contextResultError(context, "vec_knn_idset is optional and is not implemented yet");
}

export fn sqlite3_graph_ext_init(db: ?*c.sqlite3, pzErrMsg: ?*anyopaque, pApi: ?*anyopaque) callconv(.c) cInt {
  _ = pzErrMsg;
  _ = pApi;

  if (c.sqlite3_create_function_v2(db, "graph_ext_version", 0, c.SQLITE_UTF8, null, graph_ext_version, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_empty", 0, c.SQLITE_UTF8, null, idset_empty, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_add", 2, c.SQLITE_UTF8, null, idset_add, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_union", 2, c.SQLITE_UTF8, null, idset_union, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_intersect", 2, c.SQLITE_UTF8, null, idset_intersect, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_diff", 2, c.SQLITE_UTF8, null, idset_diff, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_count", 1, c.SQLITE_UTF8, null, idset_count, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_contains", 2, c.SQLITE_UTF8, null, idset_contains, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "idset_hash", 1, c.SQLITE_UTF8, null, idset_hash, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;

  if (c.sqlite3_create_function_v2(db, "idset_each", 1, c.SQLITE_UTF8, null, idset_each, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;

  if (c.sqlite3_create_function_v2(db, "graph_out_many", 4, c.SQLITE_UTF8, null, graph_out_many, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "graph_in_many", 4, c.SQLITE_UTF8, null, graph_in_many, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "graph_out_idset", 3, c.SQLITE_UTF8, null, graph_out_idset, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "graph_in_idset", 3, c.SQLITE_UTF8, null, graph_in_idset, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;

  if (c.sqlite3_create_function_v2(db, "graph_two_hop_counts", 4, c.SQLITE_UTF8, null, graph_two_hop_counts, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "graph_two_hop_supporters", 4, c.SQLITE_UTF8, null, graph_two_hop_supporters, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;

  if (c.sqlite3_create_function_v2(db, "ranked_diff", 3, c.SQLITE_UTF8, null, ranked_diff, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;

  if (c.sqlite3_create_function_v2(db, "vec_knn", 3, c.SQLITE_UTF8, null, vec_knn, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;
  if (c.sqlite3_create_function_v2(db, "vec_knn_idset", 4, c.SQLITE_UTF8, null, vec_knn_idset, null, null, null) != c.SQLITE_OK)
    return c.SQLITE_ERROR;

  return c.SQLITE_OK;
}

test "parseSet sorts and deduplicates ids" {
  var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  var parsed = try parseSet(allocator, "z\na\nz\nm\na\n");
  defer parsed.deinit();

  try std.testing.expectEqual(@as(usize, 3), parsed.items.len);
  try std.testing.expectEqualStrings("a", parsed.items[0]);
  try std.testing.expectEqualStrings("m", parsed.items[1]);
  try std.testing.expectEqualStrings("z", parsed.items[2]);
}

test "parseSet ignores empty lines" {
  var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  var parsed = try parseSet(allocator, "\n\na\n\n");
  defer parsed.deinit();

  try std.testing.expectEqual(@as(usize, 1), parsed.items.len);
  try std.testing.expectEqualStrings("a", parsed.items[0]);
}

test "containsId checks membership from parsed set" {
  var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  var parsed = try parseSet(allocator, "k\na\nd");
  defer parsed.deinit();

  try std.testing.expect(containsId(&parsed, "a"));
  try std.testing.expect(containsId(&parsed, "d"));
  try std.testing.expect(!containsId(&parsed, "x"));
}

test "isSafeIdentifier accepts alphanumeric underscore and dot" {
  try std.testing.expect(isSafeIdentifier("edge_table"));
  try std.testing.expect(isSafeIdentifier("main.edge_table_v2"));
  try std.testing.expect(!isSafeIdentifier(""));
  try std.testing.expect(!isSafeIdentifier("edge-table"));
  try std.testing.expect(!isSafeIdentifier("edge table"));
  try std.testing.expect(!isSafeIdentifier("edge;drop"));
}

test "appendSqlLiteral escapes single quotes" {
  var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  var output = ByteList.init(allocator);
  defer output.deinit();

  try appendSqlLiteral(&output, "o'neil");
  try std.testing.expectEqualStrings("'o''neil'", output.items);
}

test "buildInClauseFromSet emits quoted list" {
  var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const values = [_][]const u8{ "alpha", "o'neil" };
  const clause = try buildInClauseFromSet(allocator, values[0..]);
  try std.testing.expectEqualStrings("'alpha','o''neil'", clause);
}

test "buildInClauseFromSet emits empty sentinel" {
  var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  const values = [_][]const u8{};
  const clause = try buildInClauseFromSet(allocator, values[0..]);
  try std.testing.expectEqualStrings("''", clause);
}

test "appendSetText joins entries with newline" {
  var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
  defer arena.deinit();
  const allocator = arena.allocator();

  var output = ByteList.init(allocator);
  defer output.deinit();

  const values = [_][]const u8{ "a", "b", "c" };
  try appendSetText(&output, values[0..]);
  try std.testing.expectEqualStrings("a\nb\nc", output.items);
}

test "graph extension version constant is not empty" {
  try std.testing.expect(GRAPH_EXT_VERSION.len > 0);
}
