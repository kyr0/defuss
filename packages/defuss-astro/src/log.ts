export const logMessage = (message: string): void => {
	const date = new Date().toLocaleTimeString()
	console.log(`${date} \x1b[32mdefuss-astro:\x1b[0m ${message}`)
}