import { NumberField } from "../../components/ui.tsx";
import type { ScanConfig } from "./types.js";
import type { JSX } from "react";

interface ScanConfigPanelProps {
  scanConfig: ScanConfig;
  configSaving: boolean;
  onChange: (newConfig: ScanConfig) => void;
}

export function ScanConfigPanel({
  scanConfig,
  configSaving,
  onChange,
}: ScanConfigPanelProps): JSX.Element {
  return (
    <div className="mt-6 rounded-lg bg-white p-4 shadow">
      <h2 className="mb-3 text-sm font-light text-gray-700">扫描配置</h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-xs text-gray-500">
            递归深度（0-5）
          </label>
          <select
            value={scanConfig.recursionDepth}
            onChange={(e) => {
              const newConfig = {
                ...scanConfig,
                recursionDepth: Number(e.target.value),
              };
              onChange(newConfig);
            }}
            disabled={configSaving}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {[0, 1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "0（关闭递归）" : `${d} 级递归`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            关键词触发条目后，条目内容再触发更多条目
          </p>
        </div>
        <NumberField
          label="消息扫描深度"
          value={scanConfig.scanDepth}
          onChange={(v) => {
            const newConfig = { ...scanConfig, scanDepth: v };
            onChange(newConfig);
          }}
        />
        <NumberField
          label="预算百分比"
          value={scanConfig.budgetPercentage}
          onChange={(v) => {
            const newConfig = { ...scanConfig, budgetPercentage: v };
            onChange(newConfig);
          }}
        />
      </div>
    </div>
  );
}
