import type { Props, FC } from "@/render/types.js";
import { Router } from "./router.js";

export interface RouteComponentProps extends Props {
	path: string;
	router?: Router;
	exact?: boolean;

	/**
	 * A component function to render when this route matches.
	 * Unlike children (which are eagerly evaluated by the JSX runtime),
	 * the component function is called **lazily** — only after the route
	 * has been registered and matched. This ensures `Router.getRequest()`
	 * returns the correct params inside the component.
	 *
	 * The component receives a `route` prop (RouteContext) with:
	 * - `route.request` — the matched RouteRequest with params, query, etc.
	 * - `route.onBeforeLeave(fn)` — register a hook before route leaves; return `false` to block
	 * - `route.onLeave(fn)` — register a hook after route has been left
	 *
	 * When the component is async and Route has children, the children are
	 * shown as a loading fallback until the async component resolves.
	 *
	 * @example
	 * ```tsx
	 * <Route path="/project/:projectName" component={ProjectDetailsScreen} />
	 *
	 * // With loading fallback for async components:
	 * <Route path="/dashboard" component={AsyncDashboard}>
	 *   <Spinner />
	 * </Route>
	 * ```
	 */
	component?: FC<any>;
}

export const Route: FC<RouteComponentProps> = ({
	path,
	exact,
	children,
	component: Component,
	router = Router,
}) => {
	// make sure the router knows the path to be matched
	router.add({
		path,
		exact: exact || false,
	});
	const req = router.match(path);

	if (!req.match) return null;

	// component prop: lazily called AFTER route registration and matching,
	// so Router.getRequest() returns the correct match with params.
	if (Component) {
		const routeContext = router.createRouteContext(req);

		// For async components with children: pass children as fallback
		// defuss jsx() intercepts `fallback` on async components automatically
		const isAsync = Component.constructor.name === "AsyncFunction";
		const routeChildren = Array.isArray(children) ? children[0] : children;
		if (isAsync && routeChildren) {
			return <Component route={routeContext} fallback={routeChildren} />;
		}
		return <Component route={routeContext} />;
	}
	return Array.isArray(children) ? children[0] : children || null;
};
