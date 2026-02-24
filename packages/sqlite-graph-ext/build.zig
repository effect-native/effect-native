const std = @import("std")

pub fn build(b: *std.Build) void {
  const target = b.standardTargetOptions(.{})
  const optimize = b.standardOptimizeOption(.{})

  const lib = b.addSharedLibrary(.{
    .name = "sqlite3_graph_ext",
    .root_source_file = b.path("src/extension.zig"),
    .target = target,
    .optimize = optimize
  })

  b.installArtifact(lib)
  const install = b.addInstallArtifact(lib, .{})
  b.getInstallStep().dependOn(&install.step)
}
