import { defineConfig } from 'vitest/config'

export default defineConfig({
    esbuild: {
        jsx: 'automatic',
        jsxImportSource: 'defuss'
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.{js,jsx}']
    }
})
