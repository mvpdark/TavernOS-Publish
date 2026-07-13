type ComposerLocalStatusProps = {
	isSending?: boolean;
};

type ComposerSendButtonProps = {
	isSending?: boolean;
	onSend?: () => void;
};

export function ComposerLocalStatus({ isSending }: ComposerLocalStatusProps) {
	if (!isSending) return null;

	return (
		<div className="composer-local-status" role="status" aria-live="polite">
			<div className="composer-local-status__copy">
				<strong>生成请求已提交</strong>
				<span>正在等待 kaka-api 返回结果</span>
			</div>
			<div className="composer-local-status__track" aria-hidden="true">
				<span />
			</div>
		</div>
	);
}

export function ComposerSendButton({
	isSending,
	onSend,
}: ComposerSendButtonProps) {
	return (
		<button
			className={`send-btn ${isSending ? "send-btn--sending" : ""}`}
			type="button"
			disabled={isSending}
			aria-busy={isSending ? "true" : undefined}
			title={isSending ? "生成中" : "发送生成"}
			onClick={onSend}
		>
			{isSending ? "..." : "↑"}
		</button>
	);
}
