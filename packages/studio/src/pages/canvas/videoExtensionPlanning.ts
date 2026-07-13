import type { KakaChatMessageContentPart } from "./kakaApi";

type VideoExtensionFrame = {
	time: number;
	dataUrl: string;
};

export const VIDEO_EXTENSION_FALLBACK_PROMPT =
	"从当前最后一帧自然继续人物动作，保持当前景别、人物大小、构图、镜头距离和画面比例。";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function appendFrameSequence(
	contentParts: KakaChatMessageContentPart[],
	title: string,
	description: string,
	frames: VideoExtensionFrame[],
) {
	if (!frames.length) return;
	contentParts.push({
		type: "text",
		text: `${description}：${frames
			.map((frame, index) => `#${index + 1}=${frame.time.toFixed(3)}s`)
			.join("；")}。`,
	});
	for (const [index, frame] of frames.entries()) {
		contentParts.push({
			type: "text",
			text: `${title} #${index + 1}：t=${frame.time.toFixed(3)}s`,
		});
		contentParts.push({ type: "image_url", image_url: { url: frame.dataUrl } });
	}
}

export function buildVideoExtensionGeminiContent({
	sourceVideoDurationSec,
	sourceFrameWidth,
	sourceFrameHeight,
	sourceFrameAspectRatio,
	storyboardFrames,
	tailTrajectoryFrames,
	originalFrameDataUrl,
}: {
	sourceVideoDurationSec: number | null;
	sourceFrameWidth: number;
	sourceFrameHeight: number;
	sourceFrameAspectRatio: string;
	storyboardFrames: VideoExtensionFrame[];
	tailTrajectoryFrames: VideoExtensionFrame[];
	originalFrameDataUrl: string;
}) {
	const contentParts: KakaChatMessageContentPart[] = [
		{
			type: "text",
			text: `你是专业视频导演、动作连续性分析师和续写提示词专家。下面会按时间顺序给你当前视频的全程关键帧、最后几秒的连续运动轨迹帧，最后还会单独给出“尾帧/最后一帧”。请先理解全程动作、节奏、人物运动方向、镜头趋势和视觉连续性，再重点分析最后几秒的运动轨迹、姿态变化、速度和构图变化，输出用于生成后续 5-8 秒视频的一段中文提示词和衔接/剪辑指令。

源视频技术参数：
- 视频时长：${sourceVideoDurationSec ? `${sourceVideoDurationSec.toFixed(3)} 秒` : "unknown"}
- 尾帧分辨率：${sourceFrameWidth}x${sourceFrameHeight}
- 画面比例：${sourceFrameAspectRatio}

重要规则：
- 你必须看全程关键帧来判断动作和节奏，但不要引用、继承或猜测任何原始文字提示词。
- 你必须重点看最后几秒连续帧，判断人物/主体的运动轨迹、速度、姿态变化、手脚方向、镜头是否在移动，并让下一段从这个轨迹自然延续。
- 后续视频是接在尾帧后面的续写，开头前 2 秒必须严格贴住尾帧和最后几秒轨迹的视觉连续性：人物大小、镜头距离、构图重心、身体姿态、运动方向和速度都不能突然跳变。
- 全程保持原视频画面比例 ${sourceFrameAspectRatio}、当前景别、角色身份、服装、场景、光线和画风。
- 不要突然镜头拉远、拉近、推拉、变焦、切景别或换构图；如果原视频已有轻微运动，只能自然、平滑地延续，不能加剧成明显跳变。
- 从下一帧自然继续人物动作，不要冻结、重复、复制上一段最后一帧，也不要多出停顿帧。
- 不要生成横屏画布、黑边、留白或画中画。

输出要求：只输出合法 JSON，不要 Markdown，不要解释。JSON 结构如下：
{
  "motion_trajectory_summary": "用一句话概括最后几秒人物/主体运动方向、速度、姿态变化和镜头趋势",
  "continuation_prompt": "可直接给图生视频模型使用的中文续写提示词，必须包含开头衔接指令和后续动作延展",
  "edit_instructions": "给 FFmpeg 拼接使用的中文剪辑指令，说明为什么应该无缝直连或如何处理首帧重复",
  "edit_plan": {
    "concat_strategy": "direct_concat",
    "generated_video_trim_start_sec": 0,
    "transition_type": "cut",
    "transition_duration_sec": 0,
    "notes_for_ffmpeg": []
  },
  "warnings": []
}
其中 generated_video_trim_start_sec 默认必须是 0；只有你能从“续写模型通常会复制尾帧造成重复”的角度明确判断需要跳过，才允许填写 0.033 到 0.12。不能为了追求流畅随意跳帧。`,
		},
	];

	appendFrameSequence(
		contentParts,
		"全程关键帧",
		"以下是全程关键帧，按时间顺序排列",
		storyboardFrames,
	);
	appendFrameSequence(
		contentParts,
		"最后几秒连续运动轨迹帧",
		"以下是源视频最后几秒的连续运动轨迹帧，按时间顺序排列。必须用它们判断下一段开头的动作方向、速度、人物大小、镜头距离和构图重心",
		tailTrajectoryFrames,
	);
	contentParts.push(
		{
			type: "text",
			text: `下面这一张是必须无缝衔接的尾帧/最后一帧。续写开头前 2 秒的人物大小、镜头距离、构图重心、姿态和运动方向必须以“最后几秒轨迹 + 这一张尾帧”为准；画面比例 ${sourceFrameAspectRatio} 必须全程保持。`,
		},
		{ type: "image_url", image_url: { url: originalFrameDataUrl } },
	);

	return contentParts;
}

export function parseVideoExtensionGeminiResponse(rawContent: unknown) {
	const rawText = typeof rawContent === "string" ? rawContent.trim() : "";
	if (!rawText) {
		return {
			geminiText: VIDEO_EXTENSION_FALLBACK_PROMPT,
			extensionEditPlan: null as Record<string, unknown> | null,
		};
	}

	const codeBlockMatch = rawText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
	const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : rawText;
	try {
		const parsed = JSON.parse(jsonText) as unknown;
		if (!isRecord(parsed)) throw new Error("Not an object");
		const extensionEditPlan = isRecord(parsed.edit_plan) ? parsed.edit_plan : null;
		const promptCandidate =
			typeof parsed.continuation_prompt === "string"
				? parsed.continuation_prompt.trim()
				: "";
		const editInstruction =
			typeof parsed.edit_instructions === "string"
				? parsed.edit_instructions.trim()
				: "";
		return {
			geminiText: [
				promptCandidate || VIDEO_EXTENSION_FALLBACK_PROMPT,
				editInstruction ? `剪辑衔接要求：${editInstruction}` : "",
			]
				.filter(Boolean)
				.join("\n"),
			extensionEditPlan,
		};
	} catch {
		return {
			geminiText: rawText,
			extensionEditPlan: null as Record<string, unknown> | null,
		};
	}
}

export function buildVideoExtensionPrompt({
	geminiText,
	sourceFrameAspectRatio,
	sourceFrameWidth,
	sourceFrameHeight,
}: {
	geminiText: string;
	sourceFrameAspectRatio: string;
	sourceFrameWidth: number;
	sourceFrameHeight: number;
}) {
	return [
		geminiText || VIDEO_EXTENSION_FALLBACK_PROMPT,
		`必须保持原视频画面比例 ${sourceFrameAspectRatio}（${sourceFrameWidth}x${sourceFrameHeight}），输出全画幅续写视频。不要横屏黑边，不要把竖屏内容放进横屏画布，不要 picture-in-picture。`,
		"这是接在原视频最后一帧之后的续写：全程保持当前景别；开头前 2 秒必须稳定贴住源视频最后几秒的运动轨迹、尾帧的人物大小、镜头距离和构图重心，之后也只能自然平滑变化。",
		"禁止突然镜头拉远、拉近、推拉、变焦或切换景别。从第一帧开始自然继续动作，避免冻结、重复、复制上一段最后一帧或多出停顿帧。",
	].join("\n");
}

export function resolveVideoExtensionTrimStart(
	extensionEditPlan: Record<string, unknown> | null,
) {
	const trimStartSec = extensionEditPlan?.generated_video_trim_start_sec;
	return typeof trimStartSec === "number" && Number.isFinite(trimStartSec)
		? Math.max(0, Math.min(trimStartSec, 0.12))
		: 0;
}
