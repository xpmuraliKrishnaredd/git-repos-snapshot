const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const SNAPSHOT_FILE = 'git-repos-snapshot.json';

// Setup Readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

// Helper to run commands
function runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        // Increase buffer for large repo operations
        const fullCommand = `git -c http.postBuffer=524288000 ${command}`;
        exec(fullCommand, options, (error, stdout, stderr) => {
            if (error) {
                // Reject with both error object and stderr for debugging
                reject({ error, stderr });
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

/**
 * --- IMPORT LOGIC (Scanning) ---
 */
async function scanForRepos(currentDir, baseDir, repoList) {
    const gitFolderPath = path.join(currentDir, '.git');
    
    // 1. Check if it's a git repo
    if (fs.existsSync(gitFolderPath)) {
        try {
            const remoteUrl = await runCommand('config --get remote.origin.url', { cwd: currentDir });
            const relativePath = path.relative(baseDir, currentDir);
            
            console.log(`[FOUND] ${relativePath}`);
            repoList.push({ relativePath, remoteUrl });
            return; // Don't look inside a git repo for more git repos
        } catch (err) {
            console.warn(`[WARN] Found .git at ${currentDir} but failed to read remote URL.`);
            return;
        }
    }

    // 2. If not, recurse
    let items;
    try {
        items = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) { return; } // Skip locked system folders

    for (const item of items) {
        if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
            await scanForRepos(path.join(currentDir, item.name), baseDir, repoList);
        }
    }
}

async function handleImport() {
    console.log('\n--- IMPORT MODE ---');
    let baseDir = await askQuestion('Enter absolute path of Source Directory: ');
    baseDir = baseDir.replace(/"/g, '').trim();

    if (!fs.existsSync(baseDir)) {
        console.error('Directory does not exist.');
        process.exit(1);
    }

    const repos = [];
    console.log(`Scanning...`);
    await scanForRepos(baseDir, baseDir, repos);

    if (repos.length > 0) {
        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(repos, null, 2));
        console.log(`\nSuccess! Saved ${repos.length} repos to ${SNAPSHOT_FILE}`);
    } else {
        console.log('No repositories found.');
    }
}

/**
 * --- CHECKOUT LOGIC ---
 * Tries to find specific branches on remote and checkout locally
 */
async function tryCheckoutStrategies(repoPath) {
    try {
        // 1. Get list of all remote branches
        // Output looks like: "origin/HEAD -> origin/main \n origin/dev \n origin/feature-1"
        const rawBranches = await runCommand('branch -r', { cwd: repoPath });
        
        // Clean up the list into an array of strings like "origin/dev"
        const remoteBranches = rawBranches.split('\n').map(b => b.trim());

        // Strategy 1: Check for 'dev'
        if (remoteBranches.some(b => b === 'origin/dev')) {
            await runCommand('checkout dev', { cwd: repoPath });
            return 'dev'; // Success
        }

        // Strategy 2: Check for 'dev_branch'
        if (remoteBranches.some(b => b === 'origin/dev_branch')) {
            await runCommand('checkout dev_branch', { cwd: repoPath });
            return 'dev_branch'; // Success
        }

        return 'default'; // Neither found
    } catch (error) {
        console.warn(`[WARN] Could not switch branches in ${repoPath}`);
        return 'error';
    }
}

/**
 * --- RESTORE LOGIC ---
 */
async function cloneRepository(repoUrl, targetPath, attemptSwitch) {
    // 1. Skip if exists
    if (fs.existsSync(targetPath) && fs.existsSync(path.join(targetPath, '.git'))) {
        console.log(`[SKIP] Exists: ${targetPath}`);
        return;
    }

    // 2. Prepare folder
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    if(fs.existsSync(targetPath) && fs.readdirSync(targetPath).length === 0) fs.rmdirSync(targetPath);

    console.log(`[CLONE] ${repoUrl} -> ${targetPath}`);

    try {
        // 3. Clone
        await runCommand(`clone ${repoUrl} "${targetPath}"`);
        
        // 4. Handle Branch Switching (if user requested)
        if (attemptSwitch) {
            const result = await tryCheckoutStrategies(targetPath);
            if (result === 'default') {
                console.log(`   -> Remained on default branch (dev/dev_branch not found).`);
            } else if (result !== 'error') {
                console.log(`   -> Switched to branch: '${result}'`);
            }
        }
    } catch (error) {
        console.error(`[ERROR] Failed to clone ${repoUrl}`);
    }
}

async function handleRestore() {
    console.log('\n--- RESTORE MODE ---');
    if (!fs.existsSync(SNAPSHOT_FILE)) {
        console.error(`Error: '${SNAPSHOT_FILE}' not found.`);
        process.exit(1);
    }

    // 1. Get Target Directory
    let targetBaseDir = await askQuestion('Enter absolute path of Target Directory: ');
    targetBaseDir = targetBaseDir.replace(/"/g, '').trim();
    if (!fs.existsSync(targetBaseDir)) fs.mkdirSync(targetBaseDir, { recursive: true });

    // 2. Ask for Branch Strategy
    console.log('\n--- BRANCH STRATEGY ---');
    console.log('We can attempt to auto-checkout branches in this priority:');
    console.log('   1. "dev"');
    console.log('   2. "dev_branch"');
    console.log('   3. Stay on default (main/master)');
    
    const branchAns = await askQuestion('Do you want to attempt this checkout strategy? (y/n): ');
    const attemptSwitch = branchAns.toLowerCase().startsWith('y');

    // 3. Process Repos
    const reposToClone = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
    console.log(`\nStarting restore for ${reposToClone.length} repositories...\n`);

    for (const repo of reposToClone) {
        const fullTargetPath = path.join(targetBaseDir, repo.relativePath);
        await cloneRepository(repo.remoteUrl, fullTargetPath, attemptSwitch);
    }

    console.log('\nAll processing complete.');
}

/**
 * --- MAIN MENU ---
 */
async function main() {
    console.log('=============================================');
    console.log('      GIT REPO MIGRATION TOOL');
    console.log('=============================================');
    console.log('1. IMPORT (Scan source -> Save JSON)');
    console.log('2. RESTORE (Read JSON -> Clone -> Checkout)');
    console.log('3. Exit');
    
    const answer = await askQuestion('\nSelect option (1-3): ');

    try {
        if (answer.trim() === '1') await handleImport();
        else if (answer.trim() === '2') await handleRestore();
        else console.log('Exiting...');
    } catch (err) {
        console.error('Unexpected error:', err);
    } finally {
        rl.close();
    }
}

main();