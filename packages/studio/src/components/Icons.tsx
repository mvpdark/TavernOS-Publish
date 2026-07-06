/**
 * Centralized icon library for TavernOS.
 * All icons share consistent:
 *   - 1.5px stroke width
 *   - round line caps/joins
 *   - currentColor (inherit from text color)
 *   - standard sizes (16/20/24/32)
 *
 * Usage:
 *   import { IconPen, IconGlobe } from "../components/Icons.js";
 *   <IconPen size={20} className="text-[#C9A86C]" />
 */

import type { JSX } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IconProps = {
  readonly size?: number;
  readonly className?: string;
};

const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export function IconArrowLeft({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function IconChevron({ size = 20, className, direction = "down" }: IconProps & { readonly direction?: "up" | "down" | "left" | "right" }): JSX.Element {
  const rotations: Record<string, string> = { down: "0", right: "-90", up: "180", left: "90" };
  return (
    <svg {...svgProps(size)} className={className} style={{ transform: `rotate(${rotations[direction] ?? 0}deg)` }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function IconPlus({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconX({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IconSave({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export function IconRefresh({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Category icons (for Launcher / navigation)
// ---------------------------------------------------------------------------

export function IconPen({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 19l7-7 3 3-7 7h-3v-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

export function IconUsers({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconGlobe({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

export function IconBook({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

export function IconFolder({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

export function IconLayers({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Editor / File icons
// ---------------------------------------------------------------------------

export function IconUpload({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function IconDownload({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function IconTrash2({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

export function IconImage({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function IconSparkles({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M12 2l2.09 6.26L20 9l-5.91 2.74L12 18l-2.09-6.26L4 9l5.91-2.74z" />
      <path d="M5 3v2M3 4h2M19 17v2M18 18h2" />
    </svg>
  );
}

export function IconMessageSquare({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function IconUndo({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 00-4-4H4" />
    </svg>
  );
}

export function IconRedo({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polyline points="15 14 20 9 15 4" />
      <path d="M4 20v-7a4 4 0 014-4h12" />
    </svg>
  );
}

export function IconHistory({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 106 5.3L3 8" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

export function IconMenu({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function IconFileText({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// UI controls
// ---------------------------------------------------------------------------

export function IconSearch({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function IconGripVertical({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

export function IconUser({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconSettings({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function IconCopy({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

export function IconVolume({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  );
}

export function IconStop({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <rect x="5" y="5" width="14" height="14" rx="2" ry="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCheck({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconMasks({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <path d="M8.5 14c1 1.5 6 1.5 7 0" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status / Feedback icons
// ---------------------------------------------------------------------------

export function IconCheckCircle({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function IconXCircle({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function IconAlertCircle({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function IconInfo({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function IconAlertTriangle({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Additional utility icons (unique — not duplicated above)
// ---------------------------------------------------------------------------

export function IconSend({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function IconRefreshCw({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

export function IconMap({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

export function IconGamepad({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
    </svg>
  );
}

export function IconPalette({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

export function IconFileEdit({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 18l-1 1 1-1z" />
      <path d="M16 12l-4 4" />
    </svg>
  );
}

export function IconSunMoon({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

export function IconWifi({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <path d="M5 12.55a11 11 0 0114.08 0" />
      <path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

export function IconWifiOff({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
      <path d="M5 12.55a11 11 0 015.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0122.58 9" />
      <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

export function IconReturn({ size = 20, className }: IconProps): JSX.Element {
  return (
    <svg {...svgProps(size)} className={className}>
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 00-4-4H4" />
    </svg>
  );
}


