import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// ESM don't have __dirname, so we need to use the following workaround
// to declare __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// developers would be faced with warnings that dynamic imports cannot be analyzed by Vite
// this is, however, not a problem, as the dynamic imports are only used in the build process
// therefore, we can safely ignore these warnings. This function adds a comment to the dynamic import
// that tells Vite to do so.
function addViteIgnoreCommentToDynamicImports(fileName: string) {

    // define the absolute path to the file, based on the current directory and relative path
    const filePath = join(__dirname, `../dist/${fileName}`);

    // read the content of the file
    const fileContent = readFileSync(filePath, 'utf-8');

    // make sure, Vite is not going to try to analyze the import statement when Vite is importing this file (Astro is based on Vite, so it's safe to assume)
    const updatedContent = fileContent.replace(/return import\(filepath\)/g, "return import(/* @vite-ignore */ filepath)");

    // write the updated content back to the file
    writeFileSync(filePath, updatedContent, 'utf-8');
}

// apply the function to both index.cjs and index.mjs
addViteIgnoreCommentToDynamicImports('index.mjs');
addViteIgnoreCommentToDynamicImports('index.cjs');
