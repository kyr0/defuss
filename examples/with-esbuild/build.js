import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { copyFileSync } from 'node:fs'

/**
 * Build JS files with esbuild
 * @param {boolean} watch - Enable watch mode
 */
export const buildJS = async (watch = false) => {
    const CWD = process.cwd()

    // Create dist directory if it doesn't exist
    const distDir = join(CWD, 'dist')
    await mkdir(distDir, { recursive: true })

    const startTime = performance.now()

    // esbuild CLI arguments
    const esbuildArgs = [
        join(CWD, 'src', 'app.jsx'),
        '--bundle',
        '--format=esm',
        `--outdir=${distDir}`,
        '--minify',
        '--sourcemap',
        '--target=es2020,chrome100,firefox100,safari15',
        '--jsx=automatic',
        '--jsx-import-source=defuss'
    ]

    if (watch) {
        esbuildArgs.push('--watch')
    }

    const esbuildBin = join(CWD, 'node_modules', '.bin', 'esbuild')

    return new Promise((resolve, reject) => {
        const child = spawn(esbuildBin, esbuildArgs, {
            stdio: 'inherit',
            shell: process.platform === 'win32'
        })

        child.on('error', reject)
        child.on('close', (code) => {
            if (code === 0) {

                // copy index.html to dist
                const indexHtml = join(CWD, 'src', 'index.html')
                const distIndexHtml = join(distDir, 'index.html')
                copyFileSync(indexHtml, distIndexHtml)

                const endTime = performance.now()
                console.log(`✅ JS build completed in ${(endTime - startTime).toFixed(2)}ms`)
                resolve()
            } else {
                reject(new Error(`esbuild exited with code ${code}`))
            }
        })
    })

}

// Check for --watch flag
const isWatch = process.argv.includes('--watch')
buildJS(isWatch).catch(err => {
    console.error('Build failed:', err)
    process.exit(1)
})