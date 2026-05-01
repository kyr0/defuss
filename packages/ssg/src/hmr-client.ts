/**
 * Vite HMR client module for defuss-ssg soft reload.
 * This module is injected into HTML by the Vite transform and
 * listens for custom HMR events from the server.
 */
if (import.meta.hot) {
	// @ts-expect-error custom event handler
	import.meta.hot.on("defuss:ssg-reload", (data: any) => {
		const path = data?.path || window.location.pathname;
		const currentNorm = window.location.pathname.replace(/\/$/, "") || "/";
		const eventNorm = (path || "/").replace(/\/$/, "") || "/";
		const pathMatch = currentNorm === eventNorm;

		if (!data?.path || pathMatch) {
			// Trigger soft reload via runtime
			const runtime = (window as any).__defuss_ssg_runtime;
			if (runtime?.navigateTo) {
				runtime.pageCache?.clear();
				runtime.bustCache = true;
				runtime.navigateTo(window.location.pathname, true);
			}
		}
	});
}
