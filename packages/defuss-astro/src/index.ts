import type { AstroIntegration, AstroRenderer, ContainerRenderer, ViteUserConfig } from 'astro';
import type { Options } from './types.js';
import defussPlugin from 'defuss-vite';

const getRenderer = (development: boolean): AstroRenderer => ({
    name: 'defuss',
    clientEntrypoint: 'defuss-astro/client.js',
    serverEntrypoint: 'defuss-astro/server.js',
})

export const getContainerRenderer = (): ContainerRenderer => ({
    name: 'defuss',
    serverEntrypoint: 'defuss-astro/server.js',
})

export default function ({ include, exclude, devtools }: Options = {}): AstroIntegration {
	return {
		name: 'defuss',
		hooks: {
			'astro:config:setup': ({ addRenderer, updateConfig, command, injectScript }) => {
				addRenderer(getRenderer(command === 'dev'));
				updateConfig({
					vite: {
						optimizeDeps: {
							include: ['defuss-astro/client.js', 'defuss-astro/server.js'],
						},
						plugins: [defussPlugin()],
					},
				});

				/**
				 * if (command === 'dev' && devtools) {
					injectScript('page', 'import "preact/debug";');
				}*/
			},
		},
	};
}