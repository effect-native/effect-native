{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };
  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems =
        function:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system: function nixpkgs.legacyPackages.${system}
        );
      
      # Create sqlite-cr package (placeholder for actual sqlite-cr when available)
      makeSqliteCr = pkgs: pkgs.writeShellScriptBin "sqlite-cr" ''
        # Placeholder sqlite-cr implementation using sqlite3
        # In a real implementation, this would be replaced with the actual sqlite-cr binary
        
        # Basic argument parsing
        case "$1" in
          --version)
            echo "sqlite-cr 1.0.0 (placeholder implementation using sqlite3 $(sqlite3 --version | cut -d' ' -f1))"
            ;;
          --json)
            # For JSON output, use sqlite3 with .mode json
            shift
            DB_FILE="$1"
            shift
            SQL_QUERY="$*"
            sqlite3 "$DB_FILE" <<EOF
.mode json
$SQL_QUERY
EOF
            ;;
          *)
            # Default mode: pass through to sqlite3
            exec sqlite3 "$@"
            ;;
        esac
      '';
    in
    {
      formatter = forAllSystems (pkgs: pkgs.alejandra);
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            corepack
            deno
            nodejs-slim_23
            python3
            yq-go
            sqlite  # Add sqlite as a dependency for sqlite-cr
            (makeSqliteCr pkgs)
          ];
        };
      });
    };
}
