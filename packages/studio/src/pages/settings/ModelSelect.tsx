import { useState, useRef, useEffect, useMemo, type JSX } from "react";
import type { ProviderInfo } from "./types.js";

// ---------------------------------------------------------------------------
// ModelSelect — a combobox for choosing an agent model.
//
// The input remains editable so the user can type a bare model id or a
// custom "provider:model" spec. A dropdown button on the right opens a panel
// listing every model from every known provider, grouped by provider name,
// with a live filter. Selecting an option fills the input with the explicit
// "provider:model" form so multi-provider division of labor is unambiguous.
// ---------------------------------------------------------------------------

export function ModelSelect({
  value,
  onChange,
  placeholder,
  providers,
  configuredProviders,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  providers: ProviderInfo[];
  /** Set of provider ids that have credentials configured. */
  configuredProviders?: Set<string>;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [open]);

  // Reset the filter whenever the panel is (re)opened.
  useEffect(() => {
    if (open) setFilter("");
  }, [open]);

  // Build a flat, filtered list of {providerId, providerName, modelId, modelName, contextWindow}.
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const result: Array<{
      providerId: string;
      providerName: string;
      modelId: string;
      modelName: string;
      contextWindow: number;
      spec: string;
    }> = [];
    // Determine the provider of the currently selected value so it stays
    // visible even if its key was removed (lets the user see/change it).
    const currentProviderId = value.includes(":") ? value.split(":")[0] : "";
    for (const p of providers) {
      // Hide providers without configured credentials, unless:
      //  - the provider has apiKeyOptional (e.g. Ollama local)
      //  - it is the provider of the currently selected model
      const isConfigured = configuredProviders?.has(p.id) ?? true;
      const isOptional = p.apiKeyOptional === true;
      const isCurrent = p.id === currentProviderId;
      if (!isConfigured && !isOptional && !isCurrent) continue;
      for (const m of p.models) {
        const spec = `${p.id}:${m.id}`;
        if (
          q &&
          !spec.toLowerCase().includes(q) &&
          !m.name.toLowerCase().includes(q) &&
          !p.name.toLowerCase().includes(q)
        ) {
          continue;
        }
        result.push({
          providerId: p.id,
          providerName: p.name,
          modelId: m.id,
          modelName: m.name,
          contextWindow: m.contextWindow,
          spec,
        });
      }
    }
    return result;
  }, [providers, filter, configuredProviders, value]);

  // Group the filtered models by provider for display.
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        providerName: string;
        configured: boolean;
        models: Array<{
          modelId: string;
          modelName: string;
          contextWindow: number;
          spec: string;
        }>;
      }
    >();
    for (const item of filtered) {
      let entry = map.get(item.providerId);
      if (!entry) {
        entry = {
          providerName: item.providerName,
          configured: configuredProviders?.has(item.providerId) ?? false,
          models: [],
        };
        map.set(item.providerId, entry);
      }
      entry.models.push({
        modelId: item.modelId,
        modelName: item.modelName,
        contextWindow: item.contextWindow,
        spec: item.spec,
      });
    }
    return Array.from(map.entries());
  }, [filtered, configuredProviders]);

  const selectModel = (spec: string): void => {
    onChange(spec);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className="relative mt-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#1A1A1A] bg-[#0F0F0F] px-3 py-2 pr-9 text-sm text-[#E8E8E8] placeholder-[#444444] transition-colors focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
        />
        {/* Dropdown toggle button */}
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            if (!open) inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[#666] transition-colors hover:text-[#C9A86C]"
          aria-label="选择模型"
          tabIndex={-1}
        >
          <svg
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#141414] shadow-xl popover-enter">
          {/* Filter input */}
          <div className="border-b border-[#1A1A1A] p-2">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索模型…"
              autoFocus
              className="w-full rounded-md border border-[#1A1A1A] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-[#E8E8E8] placeholder-[#444] focus:border-[rgba(201,168,108,0.3)] focus:outline-none"
            />
          </div>

          {/* Model list */}
          <div className="max-h-56 overflow-y-auto">
            {grouped.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-[#555]">
                未找到匹配的模型
              </div>
            )}
            {grouped.map(([providerId, group]) => (
              <div key={providerId}>
                {/* Provider header */}
                <div className="sticky top-0 flex items-center gap-1.5 bg-[#111] px-3 py-1.5 text-[11px] font-medium text-[#888]">
                  <span>{group.providerName}</span>
                  {group.configured ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6B9F6B]" title="已配置密钥" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#555]" title="未配置密钥" />
                  )}
                </div>
                {/* Models under this provider */}
                {group.models.map((m) => {
                  const isSelected = value === m.spec;
                  return (
                    <button
                      key={m.spec}
                      type="button"
                      onClick={() => selectModel(m.spec)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-[rgba(201,168,108,0.12)] text-[#C9A86C]"
                          : "text-[#CCC] hover:bg-[#1C1C1E]"
                      }`}
                    >
                      <span className="truncate font-mono">{m.modelId}</span>
                      <span className="ml-2 shrink-0 text-[10px] text-[#555]">
                        {m.contextWindow > 0
                          ? `${Math.round(m.contextWindow / 1000)}K`
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer: clear option */}
          {value && (
            <button
              type="button"
              onClick={() => selectModel("")}
              className="w-full border-t border-[#1A1A1A] px-3 py-1.5 text-left text-xs text-[#666] transition-colors hover:bg-[#1C1C1E] hover:text-[#C9685A]"
            >
              清空（使用全局模型）
            </button>
          )}
        </div>
      )}
    </div>
  );
}
