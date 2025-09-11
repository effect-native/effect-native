{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      forAllSystems =
        function:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system: function nixpkgs.legacyPackages.${system} system
        );
    in {
      formatter = forAllSystems (pkgs: system: pkgs.alejandra);

      devShells = forAllSystems (pkgs: system: {
        default = pkgs.mkShellNoCC {
          packages = with pkgs; [
            nodejs_22
            jdk17
            pnpm
            watchman
          ] ++ pkgs.lib.optionals pkgs.stdenv.isDarwin [
            cocoapods
          ];

          shellHook = ''
            # Ensure Java 17 for Android/Gradle (use Nix JDK root)
            export JAVA_HOME=${pkgs.jdk17}
            export PATH="$JAVA_HOME/bin:$PATH"
            echo "Node: $(node -v 2>/dev/null || echo n/a)  pnpm: $(pnpm -v 2>/dev/null || echo n/a)"
            if [ ! -d node_modules ] || [ ! -d translations ]; then
              echo "Bootstrapping: running 'pnpm install && pnpm dev:setup'..."
              if command -v pnpm >/dev/null 2>&1; then
                pnpm install && pnpm dev:setup \
                  || echo "Bootstrap failed. Please run: pnpm install && pnpm dev:setup"
              else
                echo "pnpm not found; ensure pnpm is available in PATH."
              fi
            fi

            # Ensure fbtee translations exist under src/translations/*.json
            set -- src/translations/*.json
            [ -e "$1" ] || { echo "Generating translations (pnpm fbtee:all)..."; command -v pnpm >/dev/null 2>&1 && pnpm fbtee:all || echo "pnpm not found; cannot generate translations."; }
            # Generate native projects if iOS project is missing
            if [ ! -d ios ]; then
              if [ "$(uname -s)" = "Darwin" ]; then
                echo "iOS project not found. Running 'pnpm prebuild'..."
                if command -v pnpm >/dev/null 2>&1; then
                  pnpm prebuild || echo "Prebuild failed. You can retry: pnpm prebuild"
                else
                  echo "pnpm not found; cannot run prebuild."
                fi
              else
                echo "Skipping iOS prebuild (not macOS)."
              fi
            fi
            # show all available scripts
            pnpm run
          '';
        };
      });
    };
}
