# Git Repository Migration & Restoration Tool

A comprehensive Node.js utility designed to migrate multiple Git repositories from one machine to another while **preserving the exact folder structure**.

It includes a **Smart Checkout** feature that can automatically switch repositories to your development branches (`dev` or `dev_branch`) immediately after cloning.

## Features
*   **Structure Preservation:** Mirrors your exact folder hierarchy (e.g., `src/backend/microservices/auth`).
*   **Smart Branch Checkout:** Optionally attempts to check out `dev` or `dev_branch` automatically.
*   **Deep Scanning:** Recursively finds Git repositories, even in hidden folders.
*   **Secure Authentication:** Uses your system's **Git Credential Manager** (no hardcoded passwords).
*   **Zero Dependencies:** Runs on standard Node.js without `npm install`.

---

## Prerequisites

1.  **Node.js**: (Version 12+ recommended). [Download here](https://nodejs.org/).
2.  **Git**: Ensure `git` is installed and available in your terminal.
3.  **Git Credential Manager**: (Recommended) Installed with Git for Windows/Mac to handle Azure DevOps/GitHub logins automatically.

---

## Usage Guide

Save the script code into a file named **`git-migration-tool.js`**.

### Step 1: Export (On the Old Laptop)
*This scans your workspace and creates a map of your repositories.*

1.  Open a terminal in the folder where you saved the script.
2.  Run:
    ```bash
    node git-migration-tool.js
    ```
3.  Select **Option 1 (IMPORT)**.
4.  Paste the **Absolute Path** of your source directory (e.g., `C:\Users\John\Source\Repos`).
5.  The tool creates a file named **`git-repos-snapshot.json`**.

### Step 2: Transfer
Copy the following two files to your **New Laptop**:
1.  `git-migration-tool.js`
2.  `git-repos-snapshot.json`

### Step 3: Restore (On the New Laptop)
*This reads the snapshot, clones repos, and sets up branches.*

1.  Open a terminal on the new machine.
2.  Run:
    ```bash
    node git-migration-tool.js
    ```
3.  Select **Option 2 (RESTORE)**.
4.  Paste the **Absolute Path** where you want the repositories to go (e.g., `D:\Work\Source`).
5.  **Branch Strategy Prompt:** The tool will ask:
    > *Do you want to attempt this checkout strategy? (y/n)*
    
    *   **Type `y` (Yes):** The tool will clone the repo and immediately try to switch branches (see logic below).
    *   **Type `n` (No):** The tool will just clone the repositories and leave them on the default branch (usually `main` or `master`).

---

## Smart Branch Logic

If you select **Yes** during the Restore phase, the tool follows this priority order for **every single repository**:

1.  **Priority 1:** Check if a remote branch named **`origin/dev`** exists.
    *   *If found:* Run `git checkout dev`.
2.  **Priority 2:** If `dev` is missing, check for **`origin/dev_branch`**.
    *   *If found:* Run `git checkout dev_branch`.
3.  **Fallback:** If neither exists, stay on the **default branch** (e.g., `main` or `master`).

*This allows you to immediately start working on the development version of your code without manually switching branches for dozens of repositories.*

---

## Authentication

**How do I log in?**
The script executes standard `git clone` commands.
1.  When the script tries to clone the first private repository, your operating system will open the standard **Git Login Popup**.
2.  Log in once.
3.  Git Credential Manager stores your token, and the remaining repositories will clone automatically without asking again.

---

## Troubleshooting

*   **"Directory not empty"**: If a target folder exists and is empty, the script will delete it to allow cloning. If it contains files, the script skips it to prevent data loss.
*   **Branch Switching Failed**: If the script cannot switch to `dev`, it simply logs a message and moves to the next repo. It will not stop the entire process.
*   **Path Errors**: You can paste paths with or without quotes. The script automatically cleans them up.
