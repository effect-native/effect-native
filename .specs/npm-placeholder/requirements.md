# @effect-native/npm-placeholder Requirements

## Architectural Requirements

### AR-1: CLI Framework

**AR-1.1** (Ubiquitous)
The CLI shall be built using `@effect/cli` Command, Args, and Options APIs.

**AR-1.2** (Ubiquitous)
The CLI shall provide `--help` and `--version` flags automatically via @effect/cli built-ins.

**AR-1.3** (Ubiquitous)
The CLI entry point shall use `CliApp.run` with proper layer composition.

### AR-2: Service Architecture

**AR-2.1** (Ubiquitous)
All external dependencies (npm CLI, credential storage, filesystem) shall be abstracted as Effect services.

**AR-2.2** (Ubiquitous)
The main command handler shall be testable by providing mock service layers.

**AR-2.3** (Ubiquitous)
Credential storage shall use the `@effect-native/persistence-secrets` BackingPersistence layer.

### AR-3: Error Model

**AR-3.1** (Ubiquitous)
All errors shall be tagged Effect errors with discriminated `_tag` field.

**AR-3.2** (Ubiquitous)
Error messages shall be actionable and include context (package name, npm error output, etc.).

**AR-3.3** (Ubiquitous)
The CLI shall exit with code 0 on success, code 1 on failure.

---

## Functional Requirements

### FR-1: CLI Interface

#### FR-1.1: Package Name Argument

**FR-1.1.1** (Ubiquitous)
The CLI shall accept a required positional argument for the package name.

**FR-1.1.2** (Event-Driven)
When the package name matches `^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$`,
the System shall accept it as valid.

**FR-1.1.3** (Unwanted Behavior)
If the package name does not match the validation pattern,
the System shall fail with `InvalidPackageNameError` explaining valid formats.

#### FR-1.2: Version Option

**FR-1.2.1** (Ubiquitous)
The CLI shall accept an optional `--version` / `-v` option for the placeholder version.

**FR-1.2.2** (Ubiquitous)
The default version shall be `0.0.1-placeholder`.

### FR-2: Prerequisites Check

#### FR-2.1: npm Installation

**FR-2.1.1** (Event-Driven)
When the CLI starts,
the System shall verify npm is installed by running `npm --version`.

**FR-2.1.2** (Unwanted Behavior)
If `npm --version` fails,
the System shall fail with `NpmNotInstalledError` with message: "npm is not installed. Install Node.js or run: brew install node".

#### FR-2.2: npm Login Status

**FR-2.2.1** (Event-Driven)
When npm is verified installed,
the System shall check login status by running `npm whoami`.

**FR-2.2.2** (Unwanted Behavior)
If `npm whoami` fails,
the System shall fail with `NpmNotLoggedInError` with message: "Not logged in to npm. Run: npm login".

**FR-2.2.3** (Event-Driven)
When `npm whoami` succeeds,
the System shall display "Logged in as: {username}".

### FR-3: Package Availability Check

**FR-3.1** (Event-Driven)
When prerequisites pass,
the System shall check package availability by running `npm view {package} --json`.

**FR-3.2** (Event-Driven)
When `npm view` returns exit code 0 (package exists),
the System shall succeed with message: "Package {name} already exists on npm" and display the package URL.

**FR-3.3** (Event-Driven)
When `npm view` returns 404 (package not found),
the System shall proceed to publish flow.

**FR-3.4** (Unwanted Behavior)
If `npm view` fails with other errors,
the System shall fail with `NpmRegistryError` containing the npm output.

### FR-4: Publish Flow

#### FR-4.1: Token Loading

**FR-4.1.1** (Event-Driven)
When proceeding to publish,
the System shall attempt to load a cached token from persistence using service `com.npmjs.registry` and key `token`.

**FR-4.1.2** (Event-Driven)
When a cached token exists,
the System shall configure it in npmrc via `npm config set //registry.npmjs.org/:_authToken {token}`.

#### FR-4.2: Temporary Package Creation

**FR-4.2.1** (Event-Driven)
When ready to publish,
the System shall create a temporary directory with a minimal package.json containing:
- name: the target package name
- version: the specified or default version
- description: "Placeholder"

**FR-4.2.2** (Ubiquitous)
The temporary directory shall be cleaned up on success, failure, or interruption.

#### FR-4.3: Publish Attempt

**FR-4.3.1** (Event-Driven)
When the temporary package is created,
the System shall run `npm publish {tmpdir} --access public --tag placeholder`.

**FR-4.3.2** (Event-Driven)
When publish succeeds,
the System shall display success message with package URL and access URL.

**FR-4.3.3** (Event-Driven)
When publish fails with "EOTP" or "one-time password" in output,
the System shall proceed to Token Creation Flow.

**FR-4.3.4** (Event-Driven)
When publish fails with "expired or revoked" in output,
the System shall delete cached token and proceed to Token Creation Flow.

**FR-4.3.5** (Unwanted Behavior)
If publish fails with 403 Forbidden,
the System shall fail with `NpmForbiddenError` explaining possible causes (name similarity, no scope access, recent unpublish).

**FR-4.3.6** (Unwanted Behavior)
If publish fails with 404 Not Found,
the System shall fail with `NpmScopeNotFoundError` explaining the user needs scope access.

**FR-4.3.7** (Unwanted Behavior)
If publish fails with other errors,
the System shall fail with `NpmPublishError` containing the npm output.

### FR-5: Token Creation Flow

#### FR-5.1: Password Retrieval

**FR-5.1.1** (Event-Driven)
When token creation is needed,
the System shall attempt to load password from persistence using service `com.npmjs.registry` and key `password`.

**FR-5.1.2** (Event-Driven)
When no cached password exists,
the System shall prompt: "Enter your npmjs.com password (will be saved to keychain):" with echo disabled.

**FR-5.1.3** (Event-Driven)
When password is entered,
the System shall save it to persistence.

#### FR-5.2: Token Creation Command

**FR-5.2.1** (Event-Driven)
When password is available and package is scoped (e.g., `@scope/name`),
the System shall run `npm token create` with:
- `--name "npm-placeholder-{timestamp}"`
- `--password "{password}"`
- `--scopes "{scope}"`
- `--packages-and-scopes-permission read-write`

**FR-5.2.2** (Event-Driven)
When password is available and package is unscoped,
the System shall run `npm token create` with:
- `--name "npm-placeholder-{timestamp}"`
- `--password "{password}"`
- `--orgs "{username}"`
- `--orgs-permission read-write`

**FR-5.2.3** (Ubiquitous)
The `npm token create` command shall be run with PTY (pseudo-terminal) to support interactive browser-based 2FA.

**FR-5.2.4** (Event-Driven)
When `npm token create` outputs "Created token npm_{token}",
the System shall extract and save the token to persistence and npmrc.

#### FR-5.3: Authentication Errors

**FR-5.3.1** (Unwanted Behavior)
If `npm token create` fails with "unauthorized", "401", or "Incorrect password",
the System shall delete cached password and fail with `InvalidPasswordError` with message: "Password incorrect. Please run npm-placeholder again to re-enter your password."

**FR-5.3.2** (Unwanted Behavior)
If `npm token create` fails for other reasons,
the System shall fail with `TokenCreationError` containing the npm output.

#### FR-5.4: Retry After Token Creation

**FR-5.4.1** (Event-Driven)
When token is successfully created,
the System shall retry the publish command.

**FR-5.4.2** (Unwanted Behavior)
If retry fails,
the System shall fail with the appropriate error from FR-4.3.

### FR-6: Output Messages

#### FR-6.1: Progress Messages

**FR-6.1.1** (Ubiquitous)
Progress messages shall use cyan color.

**FR-6.1.2** (Ubiquitous)
The System shall display progress at each step:
- "Logged in as: {username}"
- "Checking if {package} is available..."
- "Package name is available!"
- "Publishing {package}@{version}..."
- "2FA required - creating publish token..."
- "Creating publish token (browser will open for YubiKey tap)..."
- "Token created and saved!"

#### FR-6.2: Success Output

**FR-6.2.1** (Event-Driven)
When publish succeeds,
the System shall display in green:
- "Published {package}@{version}"
- "Package: https://www.npmjs.com/package/{package}"
- "Access: https://www.npmjs.com/package/{package}/access"

#### FR-6.3: Error Output

**FR-6.3.1** (Ubiquitous)
Error messages shall use red bold color.

**FR-6.3.2** (Ubiquitous)
Error messages shall be actionable with clear next steps.

---

## Non-Functional Requirements

### NFR-1: Runtime

**NFR-1.1**
The CLI shall require Bun runtime for Bun.secrets and Bun.spawn PTY support.

**NFR-1.2**
The CLI shall require npm CLI to be installed separately.

### NFR-2: Security

**NFR-2.1**
Passwords shall never be logged or displayed.

**NFR-2.2**
Tokens shall never be logged or displayed.

**NFR-2.3**
Password input shall have terminal echo disabled.

### NFR-3: Cleanup

**NFR-3.1**
Temporary directories shall be removed on process exit (success, failure, or SIGINT).

**NFR-3.2**
Terminal echo shall be restored on process exit even if interrupted.

### NFR-4: Documentation

**NFR-4.1**
All public exports shall have JSDoc with `@since` and `@category` tags.

**NFR-4.2**
README shall include usage examples and error message explanations.

---

## Constraints

### C-1: Dependencies

**C-1.1**
The package shall depend on `@effect/cli` for CLI framework.

**C-1.2**
The package shall depend on `@effect-native/persistence-secrets` for credential storage.

**C-1.3**
Effect packages shall be peer dependencies.

**C-1.4**
No external npm packages beyond Effect ecosystem and @actions/* shall be used.

### C-2: Package Structure

**C-2.1**
The package shall be located at `packages-native/npm-placeholder/`.

**C-2.2**
The package shall follow effect-native monorepo conventions.

### C-3: Effect Patterns

**C-3.1**
All services shall use TypeId + Context.GenericTag pattern.

**C-3.2**
Error types shall use Data.TaggedError or Schema.TaggedError.

**C-3.3**
Command handlers shall return `Effect<void, E, R>`.
