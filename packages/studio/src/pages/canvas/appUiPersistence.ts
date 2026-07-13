import type {
	MiniMaxTokenPlanStorage,
	TapNoticesStorage,
	TapTutorialTipsStorage,
} from "./appLegacyStorageMigration";

export const HOTKEY_UPDATE_NOTICE_ID = "hotkey_update";
export const HOTKEY_UPDATE_NOTICE_EXPIRES_AT = "2026-04-30";
export const WORKFLOW_PANEL_TIP_ID = "dockbar-workflow-panel-tip";

export function buildHotkeyNoticeStorage(
	notices: TapNoticesStorage,
	showHotkeyNotice: boolean,
): TapNoticesStorage {
	return {
		...notices,
		[HOTKEY_UPDATE_NOTICE_ID]: {
			...(notices[HOTKEY_UPDATE_NOTICE_ID] ?? {}),
			dismissed: !showHotkeyNotice,
			expiresAt:
				notices[HOTKEY_UPDATE_NOTICE_ID]?.expiresAt ??
				HOTKEY_UPDATE_NOTICE_EXPIRES_AT,
		},
	};
}

export function buildWorkflowPanelTipStorage(
	tips: TapTutorialTipsStorage,
	showConnectionTip: boolean,
): TapTutorialTipsStorage {
	const currentTips = tips.state?.tips ?? {};
	return {
		...tips,
		state: {
			...(tips.state ?? {}),
			tips: {
				...currentTips,
				[WORKFLOW_PANEL_TIP_ID]: {
					...(currentTips[WORKFLOW_PANEL_TIP_ID] ?? {}),
					dismissCount: showConnectionTip ? 0 : 1,
					neverShow: !showConnectionTip,
				},
			},
		},
		version: tips.version ?? 0,
	};
}

export function buildMiniMaxTokenPlanStorage(
	rawText: string,
	now = Date.now(),
): MiniMaxTokenPlanStorage {
	return {
		rawText,
		updatedAt: now,
	};
}
