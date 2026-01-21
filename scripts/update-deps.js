#!/usr/bin/env node

/**
 * Script to update defuss-* packages to either:
 *   - workspace:* (for local development)
 *   - latest npm versions (for publishing/testing)
 * 
 * IMPORTANT: Only updates dependencies that ALREADY EXIST in each package.json.
 * Does NOT add new dependencies.
 *
 * Usage:
 *   node scripts/update-deps.js workspace   # Set to workspace:*
 *   node scripts/update-deps.js latest      # Update to latest npm versions
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const mode = process.argv[2] || 'workspace';

console.log('🔍 Discovering package names from packages/*...');

// Get all package names from packages/*
const packagesDir = join(rootDir, 'packages');
const packageNames = new Set();

for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
    if (dir.isDirectory()) {
        const pkgJsonPath = join(packagesDir, dir.name, 'package.json');
        if (existsSync(pkgJsonPath)) {
            const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
            if (pkgJson.name) {
                packageNames.add(pkgJson.name);
                console.log(`  Found: ${pkgJson.name}`);
            }
        }
    }
}

if (packageNames.size === 0) {
    console.error('❌ No packages found!');
    process.exit(1);
}

console.log('');

// Fetch latest versions from npm (only needed for 'latest' mode)
async function getLatestVersion(pkgName) {
    try {
        const result = execSync(`npm view ${pkgName} version`, { encoding: 'utf-8' }).trim();
        return result;
    } catch {
        console.warn(`  ⚠️ Could not fetch version for ${pkgName}`);
        return null;
    }
}

// Process a single package.json file
async function processPackageJson(pkgJsonPath, latestVersions) {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
    let modified = false;

    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

    for (const depType of depTypes) {
        if (!pkgJson[depType]) continue;

        for (const depName of Object.keys(pkgJson[depType])) {
            // Only update if this is one of our workspace packages
            if (!packageNames.has(depName)) continue;

            const currentVersion = pkgJson[depType][depName];
            let newVersion;

            if (mode === 'workspace' || mode === 'w') {
                // Preserve workspace:^ vs workspace:* if already using workspace protocol
                if (currentVersion.startsWith('workspace:')) {
                    continue; // Already workspace, skip
                }
                newVersion = 'workspace:*';
            } else if (mode === 'latest' || mode === 'l') {
                const latest = latestVersions.get(depName);
                if (latest) {
                    newVersion = `^${latest}`;
                } else {
                    continue; // Skip if we couldn't fetch the version
                }
            }

            if (newVersion && pkgJson[depType][depName] !== newVersion) {
                pkgJson[depType][depName] = newVersion;
                modified = true;
            }
        }
    }

    if (modified) {
        writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
        return true;
    }
    return false;
}

async function main() {
    // For 'latest' mode, fetch all versions upfront
    const latestVersions = new Map();

    if (mode === 'latest' || mode === 'l') {
        console.log('📦 Fetching latest npm versions...');
        for (const pkgName of packageNames) {
            const version = await getLatestVersion(pkgName);
            if (version) {
                latestVersions.set(pkgName, version);
                console.log(`  ${pkgName}: ${version}`);
            }
        }
        console.log('');
    }

    const modeLabel = (mode === 'workspace' || mode === 'w') ? 'workspace:*' : 'latest npm versions';
    console.log(`📦 Updating existing dependencies to ${modeLabel}...`);
    console.log('');

    // Find all package.json files in packages/* and examples/*
    const dirs = [
        ...readdirSync(join(rootDir, 'packages'), { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => join(rootDir, 'packages', d.name)),
        ...readdirSync(join(rootDir, 'examples'), { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => join(rootDir, 'examples', d.name)),
    ];

    let updatedCount = 0;

    for (const dir of dirs) {
        const pkgJsonPath = join(dir, 'package.json');
        if (existsSync(pkgJsonPath)) {
            const updated = await processPackageJson(pkgJsonPath, latestVersions);
            if (updated) {
                console.log(`  Updated: ${pkgJsonPath.replace(rootDir + '/', '')}`);
                updatedCount++;
            }
        }
    }

    console.log('');

    if (updatedCount > 0) {
        console.log(`✅ Done! Updated ${updatedCount} package.json files.`);
        console.log('');
        console.log('💡 Run "pnpm i" to install the updated dependencies.');
    } else {
        console.log('✅ Done! No changes needed.');
    }
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
