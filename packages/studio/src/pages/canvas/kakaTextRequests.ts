import {
	type KakaApiConfig,
	type KakaChatCompletionRequest,
	requestKakaChatCompletion,
} from "./kakaApi";

export async function requestTextLikeCompletion({
	config,
	model,
	nextPrompt,
}: {
	config: KakaApiConfig;
	model: string;
	nextPrompt: string;
}) {
	const requestBody: KakaChatCompletionRequest = {
		model,
		messages: [{ role: "user", content: nextPrompt }],
		stream: false,
	};
	const result = await requestKakaChatCompletion(config, requestBody);
	const rawContent = result.data.choices?.[0]?.message?.content;
	return typeof rawContent === "string" ? rawContent : undefined;
}
