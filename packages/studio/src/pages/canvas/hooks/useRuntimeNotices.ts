import { useCallback, useEffect, useState } from "react";

export type RuntimeNotice = {
	id: string;
	message: string;
	tone: "info" | "warning";
	dedupeKey: string;
};

export function useRuntimeNotices() {
	const [runtimeNotices, setRuntimeNotices] = useState<RuntimeNotice[]>([]);

	const pushRuntimeNotice = useCallback(
		(
			message: string,
			tone: RuntimeNotice["tone"] = "warning",
			dedupeKey = message,
		) => {
			setRuntimeNotices((current) => {
				if (current.some((notice) => notice.dedupeKey === dedupeKey)) {
					return current;
				}
				return [
					...current.slice(-2),
					{
						id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
						message,
						tone,
						dedupeKey,
					},
				];
			});
		},
		[],
	);

	const dismissRuntimeNotice = useCallback((id: string) => {
		setRuntimeNotices((current) =>
			current.filter((notice) => notice.id !== id),
		);
	}, []);

	useEffect(() => {
		if (!runtimeNotices.length) return;
		const timer = window.setTimeout(() => {
			setRuntimeNotices((current) => current.slice(1));
		}, 5200);
		return () => window.clearTimeout(timer);
	}, [runtimeNotices]);

	return { runtimeNotices, pushRuntimeNotice, dismissRuntimeNotice };
}
