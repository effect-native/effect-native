# @effect-native/npm-placeholder Requirements

## Functional Requirements

### FR-1: CLI Interface

**FR-1.1** (Ubiquitous)
The CLI shall accept a package name as a required argument.

**FR-1.2** (Ubiquitous)
The CLI shall accept an optional version string (default: "0.0.1-placeholder").

**FR-1.3** (Ubiquitous)
The CLI shall provide help and version flags.

**FR-1.4** (Event-Driven)
When the package name is invalid (not a valid npm package name format),
the System shall fail with a clear error explaining valid package name formats.

**FR-1.5** (Ubiquitous)
The CLI shall operate in dry-run mode by default.

**FR-1.6** (Ubiquitous)
The CLI shall accept an explicit flag to perform the actual publish operation.

### FR-2: Prerequisites Verification

**FR-2.1** (Event-Driven)
When the CLI starts,
the System shall verify that npm is installed.

**FR-2.2** (Unwanted Behavior)
If npm is not installed,
the System shall fail with an error explaining how to install npm.

**FR-2.3** (Event-Driven)
When npm is installed,
the System shall verify the user is logged in to npm.

**FR-2.4** (Unwanted Behavior)
If not logged in,
the System shall fail with an error explaining how to log in.

**FR-2.5** (Event-Driven)
When login is verified,
the System shall display the logged-in username.

### FR-3: Package Availability

**FR-3.1** (Event-Driven)
When prerequisites pass,
the System shall check if the package name is available on npm.

**FR-3.2** (Event-Driven)
When the package already exists,
the System shall succeed with a message indicating the package exists and display its URL.

**FR-3.3** (Event-Driven)
When the package is available,
the System shall proceed to publish.

### FR-4: Dry-Run Mode (Default)

**FR-4.1** (Ubiquitous)
By default, the System shall operate in dry-run mode.

**FR-4.2** (Event-Driven)
When in dry-run mode,
the System shall verify all prerequisites (npm installed, logged in, credentials working).

**FR-4.3** (Event-Driven)
When in dry-run mode and package is available,
the System shall perform a dry-run of the publish operation to verify it would succeed.

**FR-4.4** (Event-Driven)
When dry-run completes successfully,
the System shall print the exact command the user can run to perform the actual publish.

**FR-4.5** (Ubiquitous)
The dry-run output shall clearly indicate that no actual publish occurred.

### FR-5: Actual Publish Mode

**FR-5.1** (Event-Driven)
When the explicit publish flag is provided,
the System shall create and publish a minimal placeholder package.

**FR-5.2** (Event-Driven)
When publish succeeds,
the System shall display success with the package URL.

**FR-5.3** (Unwanted Behavior)
If publish fails due to permission issues,
the System shall fail with a clear error explaining possible causes (name too similar to existing package, no scope access, etc.).

### FR-6: Two-Factor Authentication

**FR-6.1** (Event-Driven)
When publish fails due to 2FA requirement,
the System shall automatically handle token creation with 2FA.

**FR-6.2** (Event-Driven)
When 2FA is browser-based (e.g., YubiKey),
the System shall support the interactive browser flow.

**FR-6.3** (Event-Driven)
When token creation succeeds,
the System shall retry the publish automatically.

### FR-7: Credential Management

**FR-7.1** (Event-Driven)
When credentials are needed,
the System shall check for cached credentials first.

**FR-7.2** (Event-Driven)
When no cached credentials exist,
the System shall prompt the user securely.

**FR-7.3** (Event-Driven)
When credentials are obtained,
the System shall cache them securely in the OS keychain.

**FR-7.4** (Unwanted Behavior)
If cached credentials are invalid or expired,
the System shall clear them and prompt for new credentials.

### FR-8: Output

**FR-8.1** (Ubiquitous)
The System shall display progress messages during operation.

**FR-8.2** (Ubiquitous)
Success messages shall be visually distinct (e.g., colored).

**FR-8.3** (Ubiquitous)
Error messages shall be visually distinct and include actionable guidance.

**FR-8.4** (Ubiquitous)
The CLI shall exit with code 0 on success, non-zero on failure.

---

## Non-Functional Requirements

### NFR-1: Security

**NFR-1.1**
Passwords shall never be displayed, logged, or included in error messages.

**NFR-1.2**
Password input shall be hidden (no terminal echo).

**NFR-1.3**
Tokens shall never be displayed, logged, or included in error messages.

**NFR-1.4**
Credentials shall be stored using OS-native secure storage.

**NFR-1.5**
Subprocess output that may contain secrets shall be sanitized before logging or displaying.

**NFR-1.6**
Error stack traces shall not contain secret values.

**NFR-1.7** (Ubiquitous)
The System shall be a security pit of success: the default behavior shall always be the secure behavior.

**NFR-1.8** (Ubiquitous)
The System shall fail closed: when in doubt, deny the operation rather than proceed insecurely.

**NFR-1.9** (Ubiquitous)
The System shall fail secure: failures shall not leak secrets, leave credentials exposed, or leave the system in an insecure state.

**NFR-1.10** (Unwanted Behavior)
If any operation fails, the System shall provide a clear call-to-action explaining what went wrong and how to resolve it.

### NFR-2: Reliability

**NFR-2.1**
Temporary files shall be cleaned up on exit (success, failure, or interruption).

**NFR-2.2**
Terminal state shall be restored on exit even if interrupted.

### NFR-3: Testability

**NFR-3.1**
The core logic shall be testable without making actual npm registry calls.

**NFR-3.2**
The core logic shall be testable without requiring actual keychain access.

---

## Constraints

### C-1: Platform

**C-1.1**
The tool shall support macOS, Linux, and Windows.

### C-2: Dependencies

**C-2.1**
The tool shall require npm to be installed separately.

**C-2.2**
The tool shall require secure credential storage capability.
