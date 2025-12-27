# @effect-native/npm-placeholder Design

## Overview

This document specifies the technical architecture for a CLI tool that claims npm package names by publishing placeholder packages. The tool operates in dry-run mode by default and requires explicit opt-in for actual publishing.

---

## Data Models

### NpmPlaceholderConfig

Configuration for a publish operation:
- packageName: The target npm package name (scoped or unscoped)
- version: The version string to publish (default: "0.0.1-placeholder")
- dryRun: Boolean indicating dry-run mode (default: true)

### PackageScope

Extracted scope information from a package name:
- type: Either "scoped" or "unscoped"
- scope: The scope without @ prefix (for scoped packages) or the username (for unscoped)
- name: The package name without scope

### NpmCredentials

Credential data stored via persistence-secrets:
- password: Redacted npm password for token creation
- token: Redacted granular access token for publishing

### PublishResult

Outcome of a publish operation:
- status: One of "published", "already-exists", "dry-run-success"
- packageUrl: URL to the package on npmjs.com
- accessUrl: URL to the package access settings
- commandToPublish: For dry-run, the exact command to run for real publish

---

## API Signatures

### CLI Commands

| Command | Arguments | Options | Description |
|---------|-----------|---------|-------------|
| npm-placeholder | packageName (required) | --version, --publish, --help | Main command |

| Option | Short | Type | Default | Description |
|--------|-------|------|---------|-------------|
| --version | -v | string | "0.0.1-placeholder" | Package version to publish |
| --publish | -p | boolean | false | Actually publish (disables dry-run) |
| --help | -h | flag | - | Show help |

### Services

| Service | Purpose | Dependencies |
|---------|---------|--------------|
| NpmCli | Execute npm commands | Terminal |
| CredentialStore | Manage cached credentials | BackingPersistence from persistence-secrets |
| PackagePublisher | Orchestrate publish flow | NpmCli, CredentialStore |
| Terminal | Handle user I/O | Platform |

### Service Operations

**NpmCli**

| Operation | Inputs | Output | Description |
|-----------|--------|--------|-------------|
| checkInstalled | none | Effect yielding version string | Verify npm is installed |
| whoami | none | Effect yielding username | Get logged-in user |
| viewPackage | packageName | Effect yielding package info or "not-found" | Check package existence |
| publish | directory, options | Effect yielding success or error code | Publish a package |
| publishDryRun | directory, options | Effect yielding success or error code | Dry-run publish |
| tokenCreate | scope, password | Effect yielding Redacted token | Create granular token via PTY |
| configSetToken | token | Effect yielding void | Save token to npmrc |

**CredentialStore**

| Operation | Inputs | Output | Description |
|-----------|--------|--------|-------------|
| getPassword | none | Effect yielding Option of Redacted password | Load cached password |
| setPassword | Redacted password | Effect yielding void | Cache password |
| clearPassword | none | Effect yielding void | Remove cached password |
| getToken | none | Effect yielding Option of Redacted token | Load cached token |
| setToken | Redacted token | Effect yielding void | Cache token |
| clearToken | none | Effect yielding void | Remove cached token |

CredentialStore is implemented using SecretsPersistence from @effect-native/persistence-secrets, which provides automatic Redacted wrapping/unwrapping.

**Terminal**

| Operation | Inputs | Output | Description |
|-----------|--------|--------|-------------|
| promptPassword | message | Effect yielding Redacted string | Secure password input |
| print | message, style | Effect yielding void | Output styled message |
| runInteractive | command, args | Effect yielding output and exit code | Run PTY command |

---

## Module Architecture

### Package Structure

The package lives at packages/npm-placeholder with the following organization:

- src/index.ts: CLI entry point and command definition
- src/internal/NpmCli.ts: npm command execution service
- src/internal/CredentialStore.ts: Credential management service
- src/internal/PackagePublisher.ts: Publish orchestration logic
- src/internal/Terminal.ts: Terminal I/O service
- src/internal/errors.ts: Error type definitions
- src/internal/validation.ts: Package name validation

### Dependency Relationships

External dependencies:
- effect: Core library (including Redacted for secret values)
- @effect/cli: Command, Args, Options, CliApp
- @effect/platform: Terminal, Command, FileSystem, Path
- @effect/platform-bun: BunContext, BunRuntime for Bun-specific platform layer
- @effect-native/persistence-secrets: BackingPersistence for credential storage

The CLI entry point composes all services into layers and runs via CliApp with BunRuntime.

### Layer Composition

The main program requires these layers:
1. Platform layer (@effect/platform-bun for Bun runtime)
2. Terminal layer (from @effect/platform)
3. NpmCli layer (depends on Terminal, Command from @effect/platform)
4. CredentialStore layer (depends on persistence-secrets BackingPersistence)
5. PackagePublisher layer (depends on NpmCli, CredentialStore, Terminal)

For testing, each layer can be replaced with a mock implementation.

---

## Algorithms

### Main Flow

1. Parse CLI arguments (packageName, version, publish flag)
2. Validate package name format
3. Run prerequisite checks (npm installed, logged in)
4. Check package availability
5. If package exists, report success and exit
6. If dry-run mode, run dry-run flow
7. If publish mode, run publish flow

### Dry-Run Flow

1. Verify all prerequisites pass
2. Load or create credentials (same as publish flow)
3. Create temporary package directory
4. Run npm publish with --dry-run flag
5. If dry-run succeeds, print success message
6. Print the exact command to run for actual publish
7. Clean up temporary directory

### Publish Flow

1. Check for cached token
2. If token exists, configure it in npmrc
3. Create temporary package directory with minimal package.json
4. Attempt npm publish with --access public --tag placeholder
5. If success, report and exit
6. If 2FA required, enter token creation flow
7. If token expired, clear token and enter token creation flow
8. If other error, report with CTA and exit
9. Clean up temporary directory (always, via finalizer)

### Token Creation Flow

1. Load cached password from credential store
2. If no password, prompt user securely
3. Save password to credential store
4. Determine scope from package name
5. Run npm token create via PTY (interactive)
6. Parse token from output
7. Save token to credential store and npmrc
8. Retry publish

### Package Name Validation

1. Check against valid npm package name pattern
2. For scoped packages, extract scope and name
3. For unscoped packages, mark as unscoped
4. Return validation result with parsed components

### Subprocess Output Sanitization

Before logging or displaying npm command output:
1. Scan for patterns that may contain secrets (auth tokens, passwords)
2. Replace any matches with "[REDACTED]"
3. Only then pass to logging or display

---

## Error Handling Strategy

### Error Types

| Error | Cause | CTA |
|-------|-------|-----|
| NpmNotInstalled | npm command not found | "Install npm: https://nodejs.org or via your package manager" |
| NpmNotLoggedIn | npm whoami failed | "Run: npm login" |
| InvalidPackageName | Name doesn't match valid pattern | "Package names must be lowercase, may contain hyphens, dots, underscores. Scoped: @scope/name" |
| PackageNameTaken | Package exists but user expected available | "Package already exists at: <url>" (this is actually success) |
| PublishForbidden | 403 from npm | "Possible causes: name too similar to existing package, no scope access, or recent unpublish (24hr cooldown)" |
| ScopeNotFound | 404 for scoped package | "The scope does not exist or you don't have access. Create the org at npmjs.com first" |
| InvalidPassword | Token creation failed with auth error | "Password incorrect. Run again to re-enter password" |
| TokenCreationFailed | npm token create failed for other reason | "Token creation failed: <sanitized output>" |
| PublishFailed | Generic publish failure | "Publish failed: <sanitized output>" |
| KeychainAccessDenied | Cannot access credential store | "Grant keychain access in System Settings > Privacy & Security" |

### Error Construction

All errors are tagged Effect errors with:
- _tag: Discriminator for pattern matching
- message: Human-readable description
- cause: Underlying error (sanitized of secrets)
- cta: Call-to-action string for user

### Recovery Strategy

| Error | Recovery |
|-------|----------|
| Token expired during publish | Clear cached token, enter token creation flow |
| Password incorrect | Clear cached password, exit with CTA to run again |
| Publish requires 2FA | Enter token creation flow |
| Other errors | Exit with descriptive error and CTA |

---

## Security Considerations

### Redacted Values

All credentials use Effect's Redacted type:
- Passwords from prompt are immediately wrapped in Redacted
- Tokens parsed from output are immediately wrapped in Redacted
- Values from CredentialStore are already Redacted (from persistence-secrets)
- Explicit Redacted.value() call required to use credentials

### Subprocess Output Handling

When running npm commands:
1. Capture output to buffer (not direct pass-through for commands that may contain secrets)
2. Scan for secret patterns before any logging
3. Replace secrets with "[REDACTED]"
4. Only display sanitized output

For interactive PTY commands (token create):
1. Output passes through to terminal directly (user needs to see prompts)
2. Internal buffer for parsing token also sanitizes before any logging
3. Token extraction uses regex on raw buffer, then immediately wraps in Redacted

### Password Prompt

1. Disable terminal echo before reading
2. Read password character by character or line
3. Immediately wrap in Redacted.make
4. Re-enable terminal echo in finally block (handles Ctrl+C)

### Temporary Directory

1. Create in system temp directory with random suffix
2. Write minimal package.json (no secrets)
3. Delete in finally block (handles all exit paths)

### Pit of Success

- Dry-run is default (--publish required for real operation)
- All credentials return Redacted
- Output sanitization is automatic, not opt-in
- Cleanup uses finalizers, not manual calls

---

## Test Strategy

### Unit Tests

| Test Area | What to Verify |
|-----------|----------------|
| Package name validation | Valid names accepted, invalid rejected with correct error |
| Scope extraction | Scoped and unscoped names parsed correctly |
| Output sanitization | Secrets in subprocess output are redacted |
| Error CTA messages | Each error type produces actionable CTA |
| Dry-run command output | Correct command printed for actual publish |

Unit tests use mock layers for all services (no real npm calls, no real keychain).

### Integration Tests (Mock npm)

| Test Area | What to Verify |
|-----------|----------------|
| Full dry-run flow | All steps execute, command printed, no side effects |
| Full publish flow | Happy path from start to success |
| 2FA flow | Token creation triggered and retry succeeds |
| Expired token flow | Token cleared and recreated |
| Invalid password flow | Password cleared, exits with CTA |
| Package exists flow | Reports success without publishing |

Integration tests use mock NpmCli that simulates npm responses.

### Manual Tests (Real npm)

| Test Area | What to Verify |
|-----------|----------------|
| Actual publish | Package appears on npmjs.com |
| Actual 2FA | Browser opens, YubiKey works |
| Credential caching | Second run uses cached creds |

Manual tests require real npm account and cannot be automated.

---

## Output Format

### Dry-Run Success

```
Logged in as: <username>
Checking if <package> is available...
Package name is available!
Verifying publish would succeed (dry-run)...

DRY RUN SUCCESSFUL - No package was published

To actually publish, run:
  npm-placeholder <package> --publish
```

### Publish Success

```
Logged in as: <username>
Checking if <package> is available...
Package name is available!
Publishing <package>@<version>...

Published <package>@<version>

  Package: https://www.npmjs.com/package/<package>
  Access:  https://www.npmjs.com/package/<package>/access
```

### Package Already Exists

```
Logged in as: <username>
Checking if <package> is available...

Package <package> already exists on npm

  Package: https://www.npmjs.com/package/<package>
```

### Error Output

```
Error: <error message>

<call-to-action>
```

---

## Package Configuration

The package.json will specify:
- Name: @effect-native/npm-placeholder
- Bin: npm-placeholder pointing to CLI entry
- Dependencies: @effect/cli, @effect/platform
- Peer dependencies: effect
- Internal dependencies: @effect-native/persistence-secrets

The tsconfig extends the monorepo base configuration.
