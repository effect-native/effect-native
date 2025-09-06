# Multi-stage Dockerfile for effect-native development container
# Stage 1: Base image with system dependencies
FROM ubuntu:22.04 AS base

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install system dependencies and development tools
RUN apt-get update && apt-get install -y \
    # Basic utilities
    curl \
    wget \
    git \
    vim \
    nano \
    sudo \
    locales \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    # Build essentials for native modules
    build-essential \
    python3 \
    python3-pip \
    make \
    g++ \
    gcc \
    libc6-dev \
    # SQLite development files
    sqlite3 \
    libsqlite3-dev \
    # Network tools for debugging
    netcat \
    dnsutils \
    iputils-ping \
    # Process management
    htop \
    procps \
    # Shell and terminal
    zsh \
    tmux \
    # Required for VS Code
    openssh-client \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up locale
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Stage 2: Nix installation
FROM base AS nix-installer

# Install Nix in single-user mode for container
RUN sh -c "$(curl -L https://nixos.org/nix/install)" -- --daemon-installer false --no-daemon

# Set up Nix environment variables
ENV PATH="/root/.nix-profile/bin:${PATH}"
ENV NIX_PATH="/root/.nix-defexpr/channels"

# Enable experimental features for flakes
RUN mkdir -p /root/.config/nix && \
    echo "experimental-features = nix-command flakes" >> /root/.config/nix/nix.conf

# Stage 3: Development environment
FROM nix-installer AS development

# Create non-root user for development
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME -s /bin/zsh \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Copy Nix store and profiles to user
RUN cp -r /root/.nix-profile /home/$USERNAME/.nix-profile && \
    cp -r /root/.nix-defexpr /home/$USERNAME/.nix-defexpr && \
    cp -r /root/.config/nix /home/$USERNAME/.config/ && \
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.nix-profile && \
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.nix-defexpr && \
    chown -R $USERNAME:$USERNAME /home/$USERNAME/.config

# Switch to non-root user
USER $USERNAME
WORKDIR /home/$USERNAME

# Set up Nix environment for user
ENV PATH="/home/$USERNAME/.nix-profile/bin:${PATH}"
ENV NIX_PATH="/home/$USERNAME/.nix-defexpr/channels"

# Install Node.js and pnpm via Nix
RUN nix-env -iA nixpkgs.nodejs_22 nixpkgs.nodePackages.pnpm

# Install global Node.js tools
RUN npm install -g node-gyp

# Set up shell configuration
RUN sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended && \
    echo 'export PATH="/home/'$USERNAME'/.nix-profile/bin:$PATH"' >> ~/.zshrc && \
    echo 'export NIX_PATH="/home/'$USERNAME'/.nix-defexpr/channels"' >> ~/.zshrc && \
    echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# Install additional development tools via Nix
RUN nix-env -iA \
    nixpkgs.direnv \
    nixpkgs.ripgrep \
    nixpkgs.fd \
    nixpkgs.bat \
    nixpkgs.eza \
    nixpkgs.gh \
    nixpkgs.jq \
    nixpkgs.yq-go

# Create workspace directory
RUN mkdir -p /workspace
WORKDIR /workspace

# Set up Git configuration (will be overridden by mount)
RUN git config --global core.autocrlf false && \
    git config --global core.eol lf && \
    git config --global init.defaultBranch main && \
    git config --global safe.directory /workspace

# Expose common development ports
EXPOSE 3000 3001 4000 5000 5173 5174 8000 8080 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version && pnpm --version && nix --version || exit 1

# Default command
CMD ["/bin/zsh"]