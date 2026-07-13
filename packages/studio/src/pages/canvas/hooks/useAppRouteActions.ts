import { useMemo } from "react";

import { createAppRouteActions } from "../appRouteActions";

export function useAppRouteActions(
	navigate: Parameters<typeof createAppRouteActions>[0],
) {
	return useMemo(() => createAppRouteActions(navigate), [navigate]);
}
