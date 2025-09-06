# DevContainer for effect-native using Nix flake
FROM ubuntu:22.04

# Configurable user name for the dev container
ARG USERNAME=developer

ENV DEBIAN_FRONTEND=noninteractive

# Install basic packages (no Node here; use flake.nix instead)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    sudo \
    zsh \
    xz-utils \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create developer user
RUN groupadd --gid 1000 ${USERNAME} \
 && useradd --uid 1000 --gid 1000 --create-home --shell /bin/zsh ${USERNAME} \
 && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME}

# Install Nix (single-user) for the developer
USER ${USERNAME}
ENV USER=${USERNAME} HOME=/home/${USERNAME}
WORKDIR /home/${USERNAME}

# Enable flakes and nix-command by default for this user
RUN mkdir -p "$HOME/.config/nix" \
 && echo "experimental-features = nix-command flakes" > "$HOME/.config/nix/nix.conf"

# Install Nix without the daemon (container-friendly)
RUN curl -fsSL https://nixos.org/nix/install -o /tmp/install-nix.sh \
 && sh /tmp/install-nix.sh --no-daemon \
 && rm /tmp/install-nix.sh

# Make Nix available in all shells and sessions
ENV PATH=/home/${USERNAME}/.nix-profile/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN echo '. "$HOME/.nix-profile/etc/profile.d/nix.sh"' >> "$HOME/.zshrc" \
 && echo '. "$HOME/.nix-profile/etc/profile.d/nix.sh"' >> "$HOME/.bashrc"

# Workspace
WORKDIR /workspace

# Default shell
CMD ["/bin/zsh"]
