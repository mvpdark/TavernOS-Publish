import { getMiniMaxUsageLabel } from "./minimaxTokenPlan";
import { getModelDisplayLabel, getSelectedModelPlatformEmoji } from "./modelOptions";
import type { ComposerPreset, NodeType } from "./canvas-types";

function getModelKey(model: string) {
  const label = getModelDisplayLabel(model).trim();
  const emoji = getSelectedModelPlatformEmoji(model).trim();
  return emoji ? `${label} ${emoji}` : label;
}

export function getComposerUsageLabel(type: NodeType, composer: ComposerPreset) {
  const modelKey = getModelKey(composer.model);
  if (type === "image" || type === "editor") {
    switch (modelKey) {
      case "Kolors 🌊":
        return "代金券";
      case "GPT Image 2 ☁️":
      case "GPT Image 1.5 ☁️":
      case "Nano Banana ☁️":
        return "￥";
      case "MiniMax Image 01 🤖":
        return getMiniMaxUsageLabel(composer) ?? "套餐剩余";
      default:
        return composer.credits;
    }
  }

  if (type === "video") {
    switch (modelKey) {
      case "Grok Imagine Video ☁️":
      case "Grok Video 3 ☁️":
      case "Grok Video 3 10s ☁️":
        return "￥";
      case "MiniMax Hailuo 2.3 ☁️":
        return getMiniMaxUsageLabel(composer) ?? "套餐剩余";
      case "Seedance 2.0 🎥":
        return "3点/s";
      case "Seedance 1.5 Pro 🎥":
        return "点数";
      case "VEO 3.1 ☁️":
      case "Veo 3.1 ☁️":
        return "￥";
      default:
        return composer.credits;
    }
  }

  if (type === "audio") {
    switch (modelKey) {
      case "Minimax Speech 2.8 ☁️":
        return getMiniMaxUsageLabel(composer) ?? "套餐剩余";
      case "Eleven v3 🌐":
      case "IndexTTS2 🌐":
        return "待定";
      default:
        return composer.credits;
    }
  }

	if (type === "music") {
		switch (modelKey) {
      case "Suno ☁️":
        return "￥";
      default:
        return composer.credits;
    }
  }

  return composer.credits;
}
