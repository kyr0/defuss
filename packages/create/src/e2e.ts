#!/usr/bin/env node

/**
 * E2E test for create-defuss package.
 * Checks out the create package itself from GitHub to verify all features work.
 */

import { performSparseCheckout } from "./git.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, rmSync, readFileSync, readdirSync } from "node:fs";

const TEST_URL = "https://github.com/kyr0/defuss/tree/main/packages/create";

async function runE2ETest(): Promise<void> {
    const testDir = join(tmpdir(), `create-defuss-e2e-${Date.now()}`);

    console.log("🧪 E2E Test for create-defuss");
    console.log("=".repeat(50));
    console.log(`Test URL: ${TEST_URL}`);
    console.log(`Test Directory: ${testDir}`);
    console.log("=".repeat(50));

    let passed = true;
    const results: { test: string; passed: boolean; message?: string }[] = [];

    try {
        // Test 1: Run sparse checkout
        console.log("\n📥 Running sparse checkout...\n");
        performSparseCheckout(TEST_URL, testDir);

        // Test 2: Verify destination folder exists
        console.log("\n🔍 Running verification checks...\n");

        if (existsSync(testDir)) {
            results.push({ test: "Destination folder created", passed: true });
        } else {
            results.push({ test: "Destination folder created", passed: false, message: "Folder does not exist" });
            passed = false;
        }

        // Test 3: Verify package.json exists
        const packageJsonPath = join(testDir, "package.json");
        if (existsSync(packageJsonPath)) {
            results.push({ test: "package.json exists", passed: true });

            // Test 4: Verify package.json is valid JSON
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
                results.push({ test: "package.json is valid JSON", passed: true });

                // Test 5: Verify package name
                if (packageJson.name === "create-defuss") {
                    results.push({ test: "Package name is correct", passed: true });
                } else {
                    results.push({ test: "Package name is correct", passed: false, message: `Expected 'create-defuss', got '${packageJson.name}'` });
                    passed = false;
                }

                // Test 6: Check that no workspace:* versions remain in package.json
                const hasWorkspaceRefs = checkForWorkspaceRefs(packageJson);
                if (!hasWorkspaceRefs) {
                    results.push({ test: "No workspace:* versions in package.json", passed: true });
                } else {
                    results.push({ test: "No workspace:* versions in package.json", passed: false, message: "Found workspace:* references" });
                    passed = false;
                }
            } catch (err) {
                results.push({ test: "package.json is valid JSON", passed: false, message: (err as Error).message });
                passed = false;
            }
        } else {
            results.push({ test: "package.json exists", passed: false, message: "File not found" });
            passed = false;
        }

        // Test 7: Verify src folder exists
        const srcPath = join(testDir, "src");
        if (existsSync(srcPath)) {
            results.push({ test: "src folder exists", passed: true });

            // Test 8: Verify key source files
            const expectedFiles = ["cli.ts", "git.ts"];
            for (const file of expectedFiles) {
                if (existsSync(join(srcPath, file))) {
                    results.push({ test: `src/${file} exists`, passed: true });
                } else {
                    results.push({ test: `src/${file} exists`, passed: false, message: "File not found" });
                    passed = false;
                }
            }
        } else {
            results.push({ test: "src folder exists", passed: false, message: "Folder not found" });
            passed = false;
        }

        // Test 9: Verify .git folder was created (new repo initialized)
        const gitPath = join(testDir, ".git");
        if (existsSync(gitPath)) {
            results.push({ test: "Git repository initialized", passed: true });
        } else {
            results.push({ test: "Git repository initialized", passed: false, message: ".git folder not found" });
            passed = false;
        }

        // Test 10: List all files for verification
        console.log("\n📁 Files in checkout:");
        listFilesRecursively(testDir, "", 2);

    } catch (err) {
        console.error("\n❌ Test execution failed:", (err as Error).message);
        passed = false;
        results.push({ test: "Checkout execution", passed: false, message: (err as Error).message });
    } finally {
        // Cleanup
        console.log("\n🧹 Cleaning up test directory...");
        if (existsSync(testDir)) {
            rmSync(testDir, { recursive: true, force: true });
            console.log("✅ Test directory removed");
        }
    }

    // Report results
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST RESULTS");
    console.log("=".repeat(50));

    for (const result of results) {
        const icon = result.passed ? "✅" : "❌";
        const msg = result.message ? ` (${result.message})` : "";
        console.log(`${icon} ${result.test}${msg}`);
    }

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    console.log("\n" + "=".repeat(50));
    console.log(`📈 Summary: ${passedCount}/${totalCount} tests passed`);
    console.log("=".repeat(50));

    if (!passed) {
        console.log("\n❌ E2E TEST FAILED");
        process.exit(1);
    } else {
        console.log("\n✅ E2E TEST PASSED");
        process.exit(0);
    }
}

/**
 * Check if any dependency has workspace:* references
 */
function checkForWorkspaceRefs(packageJson: Record<string, unknown>): boolean {
    const depTypes = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

    for (const depType of depTypes) {
        const deps = packageJson[depType] as Record<string, string> | undefined;
        if (!deps || typeof deps !== "object") continue;

        for (const version of Object.values(deps)) {
            if (typeof version === "string" && version.startsWith("workspace:")) {
                return true;
            }
        }
    }
    return false;
}

/**
 * List files recursively with indentation (limited depth)
 */
function listFilesRecursively(dir: string, indent: string, maxDepth: number): void {
    if (maxDepth <= 0) {
        console.log(`${indent}...`);
        return;
    }

    const items = readdirSync(dir);
    for (const item of items) {
        if (item === ".git" || item === "node_modules") {
            console.log(`${indent}${item}/`);
            continue;
        }
        const itemPath = join(dir, item);
        try {
            const stat = require("fs").lstatSync(itemPath);
            if (stat.isDirectory()) {
                console.log(`${indent}${item}/`);
                listFilesRecursively(itemPath, indent + "  ", maxDepth - 1);
            } else {
                console.log(`${indent}${item}`);
            }
        } catch {
            console.log(`${indent}${item}`);
        }
    }
}

// Run the test
runE2ETest();
