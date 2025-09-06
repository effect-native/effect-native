# Effect Native Windows DevContainer

This directory contains a complete VS Code DevContainer configuration specifically designed for **Windows containers**, allowing you to test the Effect Native project in a native Windows environment.

## 🎯 Purpose

This Windows DevContainer allows you to:
- Test Windows compatibility directly
- Verify that all Windows-specific fixes work correctly
- Develop and debug Windows-specific issues
- Ensure cross-platform compatibility

## 🚀 Quick Start

### Prerequisites
1. **Windows 10/11** with Hyper-V enabled
2. **Docker Desktop** with Windows containers enabled
3. **VS Code** with Dev Containers extension

### Important: Enable Windows Containers
Before using this DevContainer, you must switch Docker Desktop to Windows containers:

1. Right-click on Docker Desktop system tray icon
2. Select "Switch to Windows containers..."
3. Wait for Docker to restart

### Using the Windows DevContainer

#### Method 1: VS Code
1. Open project in VS Code
2. Press `Ctrl+Shift+P`
3. Type "Dev Containers: Reopen in Container"
4. **Select the Windows container option** when prompted
5. Wait for container to build (first time takes longer)

#### Method 2: Manual Selection
1. In VS Code, open the Command Palette
2. Type "Dev Containers: Open Folder in Container"
3. Navigate to `.devcontainer-windows` folder
4. Select it to use this Windows configuration

## 📁 Files Overview

### Windows-Specific Configuration
- **`devcontainer.json`** - Windows DevContainer configuration
- **`docker-compose.yml`** - Windows service definitions
- **`Dockerfile`** - Windows Server Core based image
- **`scripts/post-create.ps1`** - PowerShell setup script
- **`scripts/post-start.ps1`** - PowerShell startup script

## 🛠️ Container Features

### Base Environment
- **OS**: Windows Server Core 2022
- **Shell**: PowerShell 5.1 + PowerShell Core 7
- **Package Manager**: Chocolatey
- **User**: ContainerUser

### Development Tools
- **Node.js**: v22.13.1 LTS
- **Package Managers**: pnpm, npm
- **NVM**: NVM for Windows
- **Build Tools**: Visual Studio Build Tools 2022
- **Version Control**: Git
- **Editors**: Notepad++, vim

### Windows-Specific Tools
- **Chocolatey**: Package manager for Windows
- **PowerShell Core**: Modern PowerShell
- **Windows Build Tools**: For native module compilation
- **SQLite**: For database operations
- **7-Zip**: Archive utility

### VS Code Extensions (Auto-installed)
- PowerShell extension
- TypeScript/JavaScript tools
- Effect language service
- ESLint & Prettier
- SQLite viewers
- Git tools
- And more...

## 🔧 Environment Variables

Windows-specific environment variables:
- `PNPM_HOME=C:/Users/ContainerUser/AppData/Local/pnpm`
- `NODE_ENV=development`
- `EFFECT_NATIVE_DEV=true`

## 📊 Resource Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **Memory**: 6GB (Windows containers need more RAM)
- **Storage**: 40GB free space

### Recommended
- **CPU**: 4+ cores
- **Memory**: 8GB+
- **Storage**: 60GB+ free space

## 🎯 Development Workflow

After opening in the Windows DevContainer:

1. **Verify Node.js**:
   ```powershell
   node --version
   ```

2. **Install dependencies**:
   ```powershell
   pnpm install
   ```

3. **Run tests** (should skip unsupported platform tests):
   ```powershell
   pnpm test
   ```

4. **Run all checks**:
   ```powershell
   pnpm ok
   ```

## ✅ What to Test

Use this Windows container to verify:

### ✅ Platform Detection
- Tests should skip automatically for libsqlite
- No hard failures on unsupported platforms

### ✅ Cross-Platform Scripts
- `pnpm ok` should work without Nix
- Build scripts should complete successfully

### ✅ Node.js Compatibility
- Node.js v22.13.1 should work correctly
- pnpm should install dependencies without issues
- better-sqlite3 should use prebuilt binaries

### ✅ ESLint and Formatting
- All linting should pass
- Code formatting should work correctly

## 🐛 Troubleshooting

### Container Won't Start
1. Verify Docker Desktop is in Windows containers mode
2. Ensure Hyper-V is enabled in Windows features
3. Check Docker has enough memory (6GB minimum)

### Performance Issues
1. Allocate more memory to Docker Desktop
2. Enable hardware virtualization in BIOS
3. Close unnecessary Windows applications

### PowerShell Execution Policy
If scripts fail to run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Node.js/pnpm Issues
If Node.js or pnpm aren't found:
```powershell
refreshenv
# Or restart PowerShell session
```

## 📱 Platform Differences

### Compared to Linux DevContainer
- Uses PowerShell instead of bash/zsh
- Windows-style paths (`C:/` vs `/`)
- Different package manager (Chocolatey vs apt)
- Different file permissions model
- Windows-specific build tools

### Line Endings
- Git is configured for LF line endings
- VS Code settings enforce LF endings
- This matches the project's cross-platform requirements

## 🔌 Additional Services

### SQL Server (Optional)
Start SQL Server for Windows testing:
```powershell
docker-compose --profile with-sqlserver up sqlserver
```

Connection details:
- **Server**: localhost,1433
- **Username**: sa
- **Password**: YourStrong@Password123

## 🚀 Advanced Usage

### Multiple Containers
You can run both Linux and Windows containers simultaneously:
1. Use the Linux container for main development
2. Use the Windows container for compatibility testing

### Custom PowerShell Profile
The container creates a custom PowerShell profile with:
- Useful aliases (gs, ga, gc for Git)
- pnpm shortcuts (pi, pt, pb, po)
- Welcome message with environment info

### Build Tools
The container includes Visual Studio Build Tools for compiling native modules on Windows.

## ⚠️ Limitations

### Windows Container Limitations
- Larger image size (Windows Server Core)
- Higher memory usage
- No Nix package manager support
- Different shell environment (PowerShell vs bash)

### Known Issues
- Windows containers require more resources
- Some VS Code extensions may behave differently
- File watching may be slower than Linux containers

## 📚 Further Reading

- [Windows Containers Documentation](https://docs.microsoft.com/en-us/virtualization/windowscontainers/)
- [Docker Windows Containers](https://docs.docker.com/desktop/windows/)
- [PowerShell in Containers](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-core-on-windows)

## 🎉 Testing Windows Compatibility

This container is perfect for:

✅ **Verifying Cross-Platform Code**: Test that the same code works on Windows  
✅ **Platform Detection**: Verify tests skip correctly on unsupported platforms  
✅ **Build Processes**: Ensure build scripts work on Windows  
✅ **Package Management**: Test pnpm and npm work correctly  
✅ **Development Experience**: Verify VS Code setup works on Windows  

Happy Windows development! 🪟🚀