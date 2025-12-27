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

### FR-4: Publishing

**FR-4.1** (Event-Driven)
When publishing,
the System shall create and publish a minimal placeholder package.

**FR-4.2** (Event-Driven)
When publish succeeds,
the System shall display success with the package URL.

**FR-4.3** (Unwanted Behavior)
If publish fails due to permission issues,
the System shall fail with a clear error explaining possible causes (name too similar to existing package, no scope access, etc.).

### FR-5: Two-Factor Authentication

**FR-5.1** (Event-Driven)
When publish fails due to 2FA requirement,
the System shall automatically handle token creation with 2FA.

**FR-5.2** (Event-Driven)
When 2FA is browser-based (e.g., YubiKey),
the System shall support the interactive browser flow.

**FR-5.3** (Event-Driven)
When token creation succeeds,
the System shall retry the publish automatically.

### FR-6: Credential Management

**FR-6.1** (Event-Driven)
When credentials are needed,
the System shall check for cached credentials first.

**FR-6.2** (Event-Driven)
When no cached credentials exist,
the System shall prompt the user securely.

**FR-6.3** (Event-Driven)
When credentials are obtained,
the System shall cache them securely in the OS keychain.

**FR-6.4** (Unwanted Behavior)
If cached credentials are invalid or expired,
the System shall clear them and prompt for new credentials.

### FR-7: Output

**FR-7.1** (Ubiquitous)
The System shall display progress messages during operation.

**FR-7.2** (Ubiquitous)
Success messages shall be visually distinct (e.g., colored).

**FR-7.3** (Ubiquitous)
Error messages shall be visually distinct and include actionable guidance.

**FR-7.4** (Ubiquitous)
The CLI shall exit with code 0 on success, non-zero on failure.

---

## Non-Functional Requirements

### NFR-1: Security

**NFR-1.1**
Passwords shall never be displayed or logged.

**NFR-1.2**
Password input shall be hidden (no terminal echo).

**NFR-1.3**
Tokens shall never be displayed or logged.

**NFR-1.4**
Credentials shall be stored using OS-native secure storage.

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
