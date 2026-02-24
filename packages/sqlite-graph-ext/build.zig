const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const lib = if (@hasDecl(std.Build, "addSharedLibrary")) blk: {
        const legacyLib = b.*.addSharedLibrary(.{
            .name = "sqlite3_graph_ext",
            .root_source_file = b.path("src/extension.zig"),
            .target = target,
            .optimize = optimize,
            .link_libc = true,
        });
        legacyLib.linker_allow_shlib_undefined = true;
        break :blk legacyLib;
    } else blk: {
        const module = b.createModule(.{
            .root_source_file = b.path("src/extension.zig"),
            .target = target,
            .optimize = optimize,
            .link_libc = true,
        });

        const sharedLib = b.addLibrary(.{
            .name = "sqlite3_graph_ext",
            .root_module = module,
            .linkage = .dynamic,
        });
        sharedLib.linker_allow_shlib_undefined = true;
        break :blk sharedLib;
    };

    const install = b.addInstallArtifact(lib, .{});
    b.getInstallStep().dependOn(&install.step);
}
