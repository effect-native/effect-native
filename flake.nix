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
          system: function nixpkgs.legacyPackages.${system}
        );
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
            sqlite-cr.packages.${pkgs.system}.default
          ];
        };
      });
    };
}
