# Effect Native DevContainer Setup

This directory contains a complete VS Code DevContainer configuration for the Effect Native project, providing a consistent development environment across all platforms.

## 🚀 Quick Start

### Prerequisites
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install [VS Code](https://code.visualstudio.com/)
3. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Using the DevContainer

#### Method 1: VS Code Command Palette
1. Open the project in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Dev Containers: Reopen in Container"
4. Select the command and wait for the container to build

#### Method 2: Docker Compose
```bash
cd .devcontainer
docker-compose up -d
docker exec -it effect-native-dev /bin/zsh
```

## 📁 Files Overview

### Core Configuration
- **`devcontainer.json`** - Main VS Code DevContainer configuration
- **`docker-compose.yml`** - Service definitions and volumes
- **`Dockerfile`** - Container image definition with Nix, Node.js, and tools
- **`scripts/post-create.sh`** - Runs once after container creation
- **`scripts/post-start.sh`** - Runs every time container starts

## 🛠️ Container Features

### Base Environment
- **OS**: Ubuntu 22.04 LTS
- **Shell**: zsh with Oh My Zsh
- **User**: `developer` (non-root)
- **Package Manager**: Nix with flakes support

### Development Tools
- **Node.js**: v22.x (installed via Nix)
- **Package Managers**: pnpm, npm
- **TypeScript**: Latest via npm
- **Build Tools**: gcc, g++, python3, make
- **Database**: SQLite with development headers
- **CLI Tools**: ripgrep, fd, bat, eza, jq, yq

### VS Code Extensions (Auto-installed)
- Effect language service
- TypeScript/JavaScript tools
- ESLint & Prettier
- Nix IDE support
- SQLite viewers
- Git tools (GitLens, Git Graph)
- Testing (Vitest explorer)
- Docker support
- And many more...

### Persistent Volumes
The following data persists between container rebuilds:
- Nix store (`/nix`)
- pnpm store (`~/.pnpm-store`)
- Shell history
- VS Code extensions
- Git credentials

## 🔧 Environment Variables

The container sets up these environment variables:
- `NODE_ENV=development`
- `EFFECT_NATIVE_DEV=true`
- `SHELL=/bin/zsh`
- `EDITOR=code --wait`

## 📊 Resource Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **Memory**: 4GB
- **Storage**: 32GB free space

### Recommended
- **CPU**: 4+ cores
- **Memory**: 8GB+
- **Storage**: 50GB+ free space

## 🎯 Development Workflow

After opening in the DevContainer:

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run tests**:
   ```bash
   pnpm test
   ```

3. **Run all checks**:
   ```bash
   pnpm ok
   ```

4. **Enter Nix shell** (if needed):
   ```bash
   nix develop
   ```

## 🐛 Troubleshooting

### Container Won't Start
1. Ensure Docker Desktop is running
2. Check Docker has enough memory allocated (4GB minimum)
3. Try rebuilding: `Docker: Rebuild Container` from VS Code

### Slow Performance
1. Increase Docker memory allocation
2. Use Docker Desktop with WSL2 backend on Windows
3. Close unnecessary applications

### Permission Issues
1. The container runs as user `developer` (UID 1000)
2. Files are mounted with correct permissions
3. Use `sudo` if you need root access

### Nix Issues
1. Nix is configured with experimental features enabled
2. Flakes are supported out of the box
3. Try `nix develop --refresh` if dependencies seem stale

## 📱 Platform Support

### Fully Supported
- **Linux** (native Docker)
- **macOS** (Docker Desktop)
- **Windows** (Docker Desktop + WSL2 recommended)

### Notes for Windows Users
- Install WSL2 for better performance
- Use Docker Desktop with WSL2 backend
- The container provides Linux environment regardless of host OS

## 🔌 Additional Services

The `docker-compose.yml` includes optional services:

### SQLite Service
```bash
docker-compose --profile with-db up sqlite-db
```

### Redis Service
```bash
docker-compose --profile with-cache up redis
```

## 🚀 Advanced Usage

### Custom Configuration
Edit `devcontainer.json` to:
- Add more VS Code extensions
- Modify environment variables
- Change resource limits
- Add port forwards

### Multiple Containers
The setup supports connecting to multiple containers:
- Main development container
- Database containers
- Cache services

### Remote Development
The DevContainer works with:
- GitHub Codespaces
- Remote SSH development
- Cloud development environments

## 📚 Further Reading

- [VS Code Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nix Flakes Tutorial](https://nixos.wiki/wiki/Flakes)
- [Effect Documentation](https://effect.website/)

## 🎉 What's Included

After the container starts, you'll have:

✅ **Consistent Environment**: Same tools and versions across all platforms  
✅ **Fast Setup**: Pre-configured with all necessary dependencies  
✅ **VS Code Integration**: Optimized editor experience with extensions  
✅ **Nix Support**: Reproducible builds and dependency management  
✅ **Testing Ready**: All testing frameworks pre-installed  
✅ **Git Configured**: Proper line endings and aliases  
✅ **Performance Optimized**: Persistent volumes for fast rebuilds  

Happy coding! 🚀