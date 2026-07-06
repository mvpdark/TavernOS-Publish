// ---------------------------------------------------------------------------
// Theme type contracts for TavernOS Studio.
// Pure interface definitions — no runtime logic, no color data.
// ---------------------------------------------------------------------------

/** Complete set of themeable colors for one mode (light or dark). */
export interface PresetColors {
  // Primary / accent
  primary: string;
  primaryHover: string;
  primary500: string;
  primaryTint: string;          // very light primary bg (e.g. indigo-50)
  primaryTintStrong: string;    // light primary highlight (e.g. indigo-100)
  primaryBorder: string;       // primary-tinted border (e.g. indigo-200)
  // Surfaces
  bg: string;                   // page background
  hoverBg: string;              // hover background for list items / buttons
  surface: string;              // card / panel background
  surfaceRaised: string;        // elevated surface (modal, popover)
  surfaceSunken: string;        // indented surface (input bg, inset area)
  // Borders
  border: string;               // default border
  borderStrong: string;         // stronger border (inputs, selects)
  borderSubtle: string;         // very subtle divider / hairline border
  // Text
  text: string;                 // main text
  textMuted: string;            // secondary / muted text
  textFaint: string;            // tertiary / disabled text
  textPlaceholder: string;      // input placeholder text
  // Accent glow
  primaryGlow: string;          // soft glow shadow using primary color
  // Sidebar
  sidebarBg: string;
  sidebarText: string;
  sidebarActive: string;        // active nav item bg
  sidebarHover: string;         // hover nav item bg
  sidebarMuted: string;         // inactive nav item text
  // Status
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  successBorder: string;
  warningBg: string;
  warningText: string;
  info: string;
  infoBg: string;
  infoBorder: string;
  purple: string;
  purpleBg: string;
  purpleBorder: string;
  // Overlay
  overlay: string;
}

/** A full preset theme with light and dark variants. */
export interface PresetTheme {
  id: string;
  name: string;
  description: string;
  light: PresetColors;
  dark: PresetColors;
}
