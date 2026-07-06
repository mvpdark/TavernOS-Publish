import type { JSX } from "react";
import { proxyImageUrl } from "../api/client.js";
import type { PersonaCard } from "../shared/types.js";
import { IconUser } from "../components/Icons.tsx";

// ---------------------------------------------------------------------------
// Character card — 120px x h-44 书本卡片样式
// ---------------------------------------------------------------------------

export function CharacterCard({
  card,
  avatar,
  generating,
  weightRank,
  appearanceCount,
  confirmedSlotUrl,
  onEdit,
  onDelete,
  onGenerateAvatar,
  onSelectImage,
  onClick,
}: {
  card: PersonaCard;
  avatar?: string;
  generating: boolean;
  weightRank: number;
  appearanceCount?: number;
  /** 确选槽对应的图片 URL（显示为右上角小图标） */
  confirmedSlotUrl?: string;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateAvatar: () => void;
  onSelectImage?: () => void;
  /** 点击卡片打开详情 */
  onClick?: () => void;
}): JSX.Element {
  const isPending = card.data.extensions?.tavernos?.pendingSelection === true;
  const allImages = card.data.extensions?.tavernos?.allImages as string[] | undefined;
  const roleType = card.data.extensions?.tavernos?.roleType as string | undefined;
  const gender = card.data.extensions?.tavernos?.gender as string | undefined;
  const threeViewUrl = card.data.extensions?.tavernos?.threeViewUrl as string | undefined;

  // Short labels for display.
  const roleShort = roleType?.startsWith("protagonist") ? "主角"
    : roleType?.startsWith("supporting") ? "配角"
    : roleType?.startsWith("NPC") ? "NPC" : undefined;
  const genderShort = gender === "male" ? "男" : gender === "female" ? "女" : gender === "non-binary" ? "中性" : undefined;

  // 显示图片：优先三视图（CSS遮罩只显示中间正面部分），其次 avatar
  const displayUrl = threeViewUrl || avatar;
  const isThreeView = !!threeViewUrl;

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] transition-all hover:border-[#C9A86C]/30 hover:shadow-2xl"
      style={{ width: 120 }}
      onClick={onClick}
    >
      <div className="relative h-44 bg-[#0A0A0A]">
        {displayUrl ? (
          isThreeView ? (
            // 三视图：用 CSS mask 遮罩只显示中间三分之一（正面视图），不拉伸不裁剪
            // 三视图是 1792x1024，三个视图从左到右排列
            // object-cover 填满容器高度，mask 让左右两侧透明，只露出中间正面
            <div className="relative h-full w-full overflow-hidden">
              <img
                src={proxyImageUrl(displayUrl)}
                alt={card.data.name}
                className="h-full w-full object-cover"
                style={{
                  objectPosition: "center center",
                  maskImage: "linear-gradient(to right, black 0%, black 30%, white 35%, white 65%, black 70%, black 100%)",
                  WebkitMaskImage: "linear-gradient(to right, black 0%, black 30%, white 35%, white 65%, black 70%, black 100%)",
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <img
              src={proxyImageUrl(displayUrl)}
              alt={card.data.name}
              className={`h-full w-full object-cover ${isPending ? "cursor-pointer" : ""}`}
              loading="lazy"
              onClick={isPending && onSelectImage ? (e) => { e.stopPropagation(); onSelectImage(); } : undefined}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {generating ? (
              <span className="text-xs text-[#C9A86C] animate-pulse">生成中…</span>
            ) : (
              <span className="text-[#555]"><IconUser size={32} /></span>
            )}
          </div>
        )}

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* 确选槽小图标（右上角） */}
        {confirmedSlotUrl && (
          <div className="absolute right-1.5 top-1.5 h-7 w-7 overflow-hidden rounded-full border-2 border-[#C9A86C]/40 bg-[#0F0F0F] shadow-lg">
            <img
              src={proxyImageUrl(confirmedSlotUrl)}
              alt="确选"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* 待挑选标记 */}
        {isPending && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[rgba(201,104,90,0.85)] px-1 py-0.5 text-[9px] font-medium text-white animate-pulse">
            待选
          </span>
        )}

        {/* 权重排名 - 仅在非待选状态下显示，避免重叠 */}
        {weightRank > 0 && !isPending && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-[#C9A86C]">
            #{weightRank + 1}
          </span>
        )}

        {/* 底部信息 */}
        <div className="absolute bottom-1.5 left-0 right-0 px-1.5 text-center">
          <p className="truncate text-xs font-medium text-[#C9A86C]">{card.data.name}</p>
          <div className="flex items-center justify-center gap-1">
            {roleShort && (
              <span className="text-[9px] text-gray-400">{roleShort}</span>
            )}
            {genderShort && (
              <span className="text-[9px] text-gray-500">·{genderShort}</span>
            )}
            {appearanceCount !== undefined && appearanceCount > 0 && (
              <span className="text-[9px] text-gray-500">·{appearanceCount}次</span>
            )}
          </div>
        </div>
      </div>

      {/* hover 操作按钮 */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/80 to-transparent pb-1 pt-3 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="btn-press rounded bg-[#1C1C1E]/80 px-1.5 py-0.5 text-[9px] text-gray-300 hover:bg-[#2A2A2A]"
        >
          编辑
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onGenerateAvatar(); }}
          disabled={generating}
          className="btn-press rounded bg-[rgba(201,168,108,0.2)] px-1.5 py-0.5 text-[9px] text-[#C9A86C] hover:bg-[rgba(201,168,108,0.3)] disabled:opacity-50"
        >
          {generating ? "…" : "三视图"}
        </button>
        {isPending && allImages && allImages.length > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelectImage?.(); }}
            className="btn-press rounded bg-[rgba(201,104,90,0.2)] px-1.5 py-0.5 text-[9px] text-[#C9685A] hover:bg-[rgba(201,104,90,0.3)]"
          >
            四选一
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="btn-press rounded bg-[rgba(201,104,90,0.15)] px-1.5 py-0.5 text-[9px] text-[#C9685A] hover:bg-[rgba(201,104,90,0.25)]"
        >
          删
        </button>
      </div>
    </div>
  );
}
