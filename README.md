# Git Repository Migration Tool

A lightweight Node.js utility designed to migrate multiple Git repositories from one machine to another while **preserving the exact folder structure**.

This tool is perfect for developers moving to a new laptop who have dozens of repositories organized in nested directories (e.g., Microservices, Frontends, Shared Libraries) and don't want to clone them manually one by one.

## Features
*   **Zero Dependencies:** Uses standard Node.js libraries (`fs`, `path`, `child_process`). No `npm install` required.
*   **Smart Scanning:** Recursively finds Git repositories by detecting hidden `.git` folders.
*   **Structure Preservation:** Remembers exactly where a repo was nested (e.g., `src/backend/api/service-a`) and recreates that folder on the new machine.
*   **Performance:** Skips `node_modules` during scanning to ensure speed.
*   **Secure Authentication:** Relies on your system's **Git Credential Manager** (GCM). No passwords or tokens are stored in the script.

---

## Prerequisites

Before running the script, ensure you have the following installed:

1.  **Node.js**: (Version 12+ recommended). [Download here](https://nodejs.org/).
2.  **Git**: Ensure `git` is available in your command line.
3.  **Git Credential Manager**: Usually installed with Git for Windows or Mac. This handles your Azure DevOps/GitHub login automatically.

---

## Usage Guide

Save the script logic into a file named `git-migration-tool.js`.

### Step 1: Export (On the Old Laptop)
This step scans your existing workspace and creates a "snapshot" file.

1.  Open a terminal.
2.  Run the script:
    ```bash
    node git-migration-tool.js
    ```
3.  Select **Option 1 (IMPORT)**.
4.  Paste the **Absolute Path** of your root workspace (e.g., `C:\Users\John\Source\Repos`).
5.  The script will generate a file named **`git-repos-snapshot.json`** in the same folder.

### Step 2: Transfer
Copy the following two files to your **New Laptop**:
1.  `git-migration-tool.js`
2.  `git-repos-snapshot.json`

### Step 3: Restore (On the New Laptop)
This step reads the snapshot and clones the repositories.

1.  Open a terminal on the new machine.
2.  Run the script:
    ```bash
    node git-migration-tool.js
    ```
3.  Select **Option 2 (RESTORE)**.
4.  Paste the **Absolute Path** where you want the repositories to live (e.g., `D:\Work\Source`).
5.  The script will:
    *   Read the JSON snapshot.
    *   Recreate the folder hierarchy (e.g., `D:\Work\Source\Backend\Microservices`).
    *   Clone the specific git repositories into their correct folders.

---

## Authentication & Security

**Does this script ask for my password?**
No.

**How does it authenticate?**
The script executes standard `git clone` commands. It relies on your operating system's Git configuration.
*   If you are already logged in via Git on the command line, it clones silently.
*   If you are not logged in, the standard **Git Credential Manager popup** (Azure DevOps/GitHub login window) will appear for the first repository. Once you log in, subsequent clones will proceed automatically.

---

## The Snapshot File (`git-repos-snapshot.json`)
The generated JSON file contains a simple map of your repositories. It looks like this:

```json
[
  {
    "relativePath": "Backend\\Microservices\\QSIXL-Auth",
    "remoteUrl": "https://dev.azure.com/org/project/_git/QSIXL-Auth"
  },
  {
    "relativePath": "Frontend\\Web\\QSIXL-UI",
    "remoteUrl": "https://dev.azure.com/org/project/_git/QSIXL-UI"
  }
]
```

## Troubleshooting

*   **"Directory not empty" error:** The script tries to be safe. If a target folder already exists and is empty, the script deletes it to allow `git clone` to work. If the folder contains files but no `.git` folder, the script may skip it to avoid overwriting work.
*   **Path issues:** You can paste paths with or without quotes (e.g., `"C:\My Path"` or `C:\My Path`). The script handles both.
*   **Hidden Folders:** The script automatically detects repositories inside hidden folders, but it will ignore system protected folders (like `System Volume Info`) to prevent crashing.
