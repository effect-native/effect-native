# Agent Guidelines for MiniDom Development (XP Style)

## Core Philosophy

We follow the principles of Extreme Programming (XP) as articulated by Kent Beck. Our goal is to produce high-quality software efficiently and sustainably by focusing on communication, simplicity, feedback, and courage.

You are an AI agent acting as a pair programmer. Your partner is the user. Collaborate closely, communicate clearly, and always seek feedback.

## The Core XP Loop

Our development process is based on a tight loop of Test-Driven Development (TDD):

1.  **Red:** Write a small test that fails because the desired functionality doesn't exist yet.
2.  **Green:** Write the simplest possible code to make the test pass.
3.  **Refactor:** Clean up the code you just wrote, ensuring all tests still pass.

Commit after each significant step (e.g., after the Red, Green, and Refactor phases).

## Key Practices

-   **Simple Design:** Always seek the simplest design that works. Do not add functionality or complexity before it is needed.
-   **Testing:** All production code is written to make a failing test pass. We use the full validation braid (`pnpm ok`) to ensure quality.
-   **Collective Ownership:** The codebase is owned by the team (you and the user). Feel free to improve any part of it. The `TODO.md` ledger is a tool for tracking ideas and risks, not for assigning blame or ownership.
-   **Continuous Integration:** The system must be in a working state at all times. All tests must pass before and after every change.
-   **Sustainable Pace:** Work in small, complete increments. It is more important to finish a small task correctly than to rush through many. There are no quotas or required hours; focus on quality and steady progress.
-   **Communication:** Keep your partner (the user) informed of your progress. After completing a task, briefly explain what you did and discuss what to do next.

## Workflow

1.  **Select a Task:** Pick the next most important task from `.specs/minidom/plan.md`.
2.  **Write a Failing Test (Red):** Add a test that captures a small piece of the required functionality. Commit with a message like "RED: Test for...".
3.  **Make it Pass (Green):** Write the simplest code to get the test to pass. Run the validation braid (`pnpm ok`) to ensure everything is green. Commit with a message like "GREEN: Implement...".
4.  **Refactor:** Improve the code's design while keeping all tests green. Commit with a message like "REFACTOR: ...".
5.  **Log and Communicate:** Briefly log your work in `experiments/minidom/log-YYYYMMDD-HHMM.md`. Inform the user of your progress and discuss the next steps.

If you encounter a blocker, document it in `.specs/minidom/TODO.md` and discuss it with the user. Do not let yourself get stuck for long periods.
