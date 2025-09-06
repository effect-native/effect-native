# Windows DevContainer for effect-native
# Uses Windows Server Core as base for native Windows development

# Use Windows Server Core 2022 as base image
FROM mcr.microsoft.com/windows/servercore:ltsc2022

# Set shell to PowerShell
SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# Install Chocolatey package manager
RUN Set-ExecutionPolicy Bypass -Scope Process -Force; \
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; \
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install essential development tools via Chocolatey
RUN choco install -y --no-progress --ignore-checksums \
    git \
    nodejs-lts --version=22.13.1 \
    python3 \
    visualstudio2022buildtools --add Microsoft.VisualStudio.Workload.VCTools \
    7zip \
    vim \
    curl \
    wget \
    sqlite

# Install additional Windows tools
RUN choco install -y --no-progress --ignore-checksums \
    powershell-core \
    gitextensions \
    notepadplusplus \
    sysinternals

# Set environment variables
ENV NODE_ENV=development
ENV EFFECT_NATIVE_DEV=true
ENV PNPM_HOME="C:\\Users\\ContainerUser\\AppData\\Local\\pnpm"

# Add tools to PATH
RUN $env:PATH += ';C:\\tools\\nodejs;C:\\tools\\python3;C:\\tools\\git\\bin;C:\\Users\\ContainerUser\\AppData\\Local\\pnpm'; \
    [Environment]::SetEnvironmentVariable('PATH', $env:PATH, [EnvironmentVariableTarget]::Machine)

# Install pnpm globally
RUN npm install -g pnpm node-gyp windows-build-tools

# Install NVM for Windows
RUN Invoke-WebRequest -Uri 'https://github.com/coreybutler/nvm-windows/releases/latest/download/nvm-setup.exe' -OutFile 'nvm-setup.exe'; \
    Start-Process -FilePath '.\nvm-setup.exe' -ArgumentList '/S' -Wait -NoNewWindow; \
    Remove-Item 'nvm-setup.exe'

# Configure NVM and install Node.js
ENV NVM_HOME="C:\\Users\\ContainerUser\\AppData\\Roaming\\nvm"
ENV NVM_SYMLINK="C:\\Program Files\\nodejs"
RUN $env:PATH += ';' + $env:NVM_HOME + ';' + $env:NVM_SYMLINK; \
    [Environment]::SetEnvironmentVariable('PATH', $env:PATH, [EnvironmentVariableTarget]::Machine)

# Install global npm packages
RUN npm install -g --force \
    typescript \
    ts-node \
    tsx \
    @changesets/cli \
    npm-check-updates \
    depcheck \
    concurrently \
    cross-env \
    serve

# Create development user
RUN net user developer Password123! /add; \
    net localgroup "Administrators" developer /add

# Switch to development user
USER ContainerUser

# Set working directory
WORKDIR C:\\workspace

# Configure Git (will be overridden by host mounts)
RUN git config --global core.autocrlf false; \
    git config --global core.eol lf; \
    git config --global init.defaultBranch main; \
    git config --global user.name 'Developer'; \
    git config --global user.email 'developer@localhost'

# Configure PowerShell profile
RUN New-Item -Path $PROFILE -ItemType File -Force; \
    Add-Content -Path $PROFILE -Value 'Set-Location C:\\workspace'; \
    Add-Content -Path $PROFILE -Value 'Write-Host \"Welcome to Effect Native Windows DevContainer!\" -ForegroundColor Green'; \
    Add-Content -Path $PROFILE -Value 'Write-Host \"Node.js: $(node --version)\" -ForegroundColor Yellow'; \
    Add-Content -Path $PROFILE -Value 'Write-Host \"pnpm: $(pnpm --version)\" -ForegroundColor Yellow'

# Expose common development ports
EXPOSE 3000 3001 4000 5000 5173 5174 8000 8080 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD powershell -Command "node --version; if ($LASTEXITCODE -ne 0) { exit 1 }"

# Default command
CMD ["powershell"]