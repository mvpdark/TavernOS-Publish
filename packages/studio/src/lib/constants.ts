// Shared cross-page constants.
// Centralised here so that multiple feature pages (chat, group-chat, ...)
// can import a single source of truth instead of redeclaring duplicates.

/**
 * Preferred CJK font stack. Used by chat-style rendering (bubbles, messages)
 * to ensure consistent CJK glyph rendering across platforms.
 */
export const CJK_FONT = "'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif";
