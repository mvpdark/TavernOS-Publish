import { useEffect } from "react";

export function useVoiceCatalogRefreshEvent(refreshVoiceCatalog: () => Promise<void>) {
	useEffect(() => {
		const handleUpdated = () => {
			void refreshVoiceCatalog();
		};
		window.addEventListener("kaka-voice-catalog-updated", handleUpdated);
		return () =>
			window.removeEventListener("kaka-voice-catalog-updated", handleUpdated);
	}, [refreshVoiceCatalog]);
}
