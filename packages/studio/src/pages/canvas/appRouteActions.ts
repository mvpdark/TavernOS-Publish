import type { AppRoute } from "./appRouting";

export type AppRouteNavigator = (routeOrPath: AppRoute | string) => void;

export function getLandingRoute(): AppRoute {
	return { page: "landing" };
}

export function getCanvasBrowserRoute(): AppRoute {
	return { page: "canvas-browser" };
}

export function getCanvasWorkspaceRoute(projectId: string): AppRoute {
	return { page: "canvas-workspace", projectId };
}

export function getWorkshopBrowserRoute(): AppRoute {
	return { page: "workshop-browser" };
}

export function getWorkshopWorkspaceRoute(projectId: string): AppRoute {
	return { page: "workshop-workspace", projectId };
}

export function getSettingsRoute(): AppRoute {
	return { page: "settings" };
}

export function createAppRouteActions(navigate: AppRouteNavigator) {
	return {
		openLanding: () => navigate(getLandingRoute()),
		openCanvasBrowser: () => navigate(getCanvasBrowserRoute()),
		openCanvasWorkspace: (projectId: string) =>
			navigate(getCanvasWorkspaceRoute(projectId)),
		openWorkshopBrowser: () => navigate(getWorkshopBrowserRoute()),
		openWorkshopWorkspace: (projectId: string) =>
			navigate(getWorkshopWorkspaceRoute(projectId)),
		openSettings: () => navigate(getSettingsRoute()),
	};
}
