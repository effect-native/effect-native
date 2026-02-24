const c = @cImport({
  @cInclude("sqlite3.h")
})

const GRAPH_EXT_VERSION = "0.1.0"

fn contextResultText(context: ?*c.sqlite3_context, value: []const u8) callconv(.C) void {
  c.sqlite3_result_text(context, value.ptr, @intCast(c_int, value.len), c.SQLITE_TRANSIENT)
}

export fn graph_ext_version(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argv
  _ = argc
  contextResultText(context, GRAPH_EXT_VERSION)
}

export fn idset_empty(context: ?*c.sqlite3_context, argc: c_int, argv: [*]?*c.sqlite3_value) callconv(.C) void {
  _ = argc
  _ = argv
  // TODO: populate actual Roaring-like compressed blob.
  c.sqlite3_result_null(context)
}

export fn graph_two_hop_counts(
  context: ?*c.sqlite3_context,
  argc: c_int,
  argv: [*]?*c.sqlite3_value
) callconv(.C) void {
  _ = context
  _ = argc
  _ = argv

  c.sqlite3_result_error(context, "graph_two_hop_counts not yet implemented", -1)
}

export fn sqlite3_graph_ext_init(db: ?*c.sqlite3, pzErrMsg: ?*anyopaque, pApi: ?*anyopaque) callconv(.C) c_int {
  _ = pzErrMsg
  _ = pApi
  if (c.sqlite3_create_function_v2(db, "graph_ext_version", 0, c.SQLITE_UTF8, null, graph_ext_version, null, null, null) !=
    c.SQLITE_OK)
  {
    return c.SQLITE_ERROR
  }
  if (c.sqlite3_create_function_v2(db, "idset_empty", 0, c.SQLITE_UTF8, null, idset_empty, null, null, null) !=
    c.SQLITE_OK)
  {
    return c.SQLITE_ERROR
  }
  _ = graph_two_hop_counts
  return c.SQLITE_OK
}
