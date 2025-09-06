# Simple working DevContainer for effect-native
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install basic packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    sudo \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 directly
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Install pnpm
RUN npm install -g pnpm

# Create developer user
RUN groupadd --gid 1000 developer \
 && useradd --uid 1000 --gid 1000 --create-home --shell /bin/bash developer \
 && echo "developer ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/developer

USER developer
WORKDIR /workspace

CMD ["/bin/bash"]
