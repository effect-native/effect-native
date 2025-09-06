{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    sqlite-cr.url = "github:subtleGradient/sqlite-cr";
  };
  outputs =
    { nixpkgs, sqlite-cr, ... }:
    let
      forAllSystems =
        function:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system: function nixpkgs.legacyPackages.${system} system
        );
    in
    {
      formatter = forAllSystems (pkgs: system: pkgs.alejandra);
      packages = forAllSystems (pkgs: system: {
        libsqlite3 = import ./nix/libsqlite3.nix { inherit pkgs; enableLoadExtension = true; };
        
        # DevContainer image built with Nix
        devcontainer = pkgs.dockerTools.buildLayeredImage {
          name = "effect-native-devcontainer";
          tag = "latest";
          
          # Include all development dependencies from our devShell
          contents = pkgs.buildEnv {
            name = "effect-native-dev-env";
            paths = with pkgs; [
              # Development shell packages
              bun
              corepack
              deno
              nodejs-slim_23
              python3
              yq-go
              
              # Additional DevContainer essentials
              bash
              zsh
              git
              curl
              wget
              vim
              nano
              sudo
              shadow
              which
              findutils
              gnugrep
              gnused
              gawk
              gzip
              tar
              coreutils
              
              # Development tools
              ripgrep
              fd
              bat
              eza
              jq
              gh
              
              # Build tools
              gcc
              gnumake
              pkg-config
              
              # SQLite for local development
              sqlite
            ] ++ [
              sqlite-cr.packages.${system}.default 
              sqlite-cr.packages.${system}.crsqlite
            ];
          };
          
          config = {
            Env = [
              "PATH=/usr/bin:/bin"
              "SHELL=/bin/bash"
              "CRSQLITE_PATH=${sqlite-cr.packages.${system}.crsqlite}/lib/libcrsqlite${if pkgs.stdenv.isDarwin then ".dylib" else ".so"}"
              "NIX_PATH=nixpkgs=${nixpkgs}"
            ];
            
            WorkingDir = "/workspace";
            
            User = "developer";
            
            Cmd = [ "/bin/bash" ];
          };
          
          # Create developer user in the image
          extraCommands = ''
            mkdir -p etc/sudoers.d
            echo "developer ALL=(ALL) NOPASSWD:ALL" > etc/sudoers.d/developer
            
            mkdir -p home/developer
            echo "developer:x:1000:1000:Developer:/home/developer:/bin/bash" >> etc/passwd
            echo "developer:x:1000:" >> etc/group
            
            chown -R 1000:1000 home/developer
            
            mkdir -p workspace
            chown 1000:1000 workspace
          '';
          
          maxLayers = 125; # Use max layers for better caching
        };
      });
      checks = forAllSystems (pkgs: system: {
        sqliteLoadableExtensions = pkgs.runCommand "check-sqlite-ext" { } ''
          ${pkgs.sqlite}/bin/sqlite3 :memory: \
            'select 1 where not exists (
               select 1 from pragma_compile_options()
               where compile_options like "%OMIT_LOAD_EXTENSION%"
             );' >/dev/null
          touch $out
        '';
      });
      devShells = forAllSystems (pkgs: system: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            corepack
            deno
            nodejs-slim_23
            python3
            yq-go
          ] ++ [ 
            sqlite-cr.packages.${system}.default 
            sqlite-cr.packages.${system}.crsqlite
          ];
          
          shellHook = ''
            export CRSQLITE_PATH="${sqlite-cr.packages.${system}.crsqlite}/lib/libcrsqlite${if pkgs.stdenv.isDarwin then ".dylib" else ".so"}"
            echo "CR-SQLite extension available at: $CRSQLITE_PATH"
          '';
        };
      });
    };
}
