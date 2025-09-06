## Minimal Dev Container based on a Nix image, using the repo flake

FROM nixos/nix:2.20.5

# Enable flakes and modern Nix features
ENV NIX_CONFIG="experimental-features = nix-command flakes"

# Create the non-root user expected by devcontainer.json
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=1000
RUN nix profile install --impure nixpkgs#shadow \
 && groupadd --gid ${USER_GID} ${USERNAME} \
 && useradd --uid ${USER_UID} --gid ${USER_GID} --create-home --shell /bin/sh ${USERNAME}

# Basic layout
RUN mkdir -p /workspace && chown -R ${USER_UID}:${USER_GID} /workspace
WORKDIR /workspace

# Install a minimal interactive shell (zsh) for VS Code terminal
# Keep it lean; use the flake devShell for all other tooling
RUN nix profile install --impure nixpkgs#zsh nixpkgs#git \
 && ln -sf "$(readlink -f /root/.nix-profile/bin/zsh)" /bin/zsh

# Warm the Nix store using the repo flake to speed up first attach
# (No environment changes; safe to skip if flake is absent in build context)
COPY flake.nix flake.lock ./
RUN nix flake metadata . >/dev/null 2>&1 || true

# Use the non-root user
USER ${USERNAME}

# Default to zsh; dev shell is entered explicitly by commands like
# `nix develop --command <tool>` or an updated postCreateCommand.
CMD ["/bin/zsh"]
