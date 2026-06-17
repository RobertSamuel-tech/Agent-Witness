/**
 * AgentWitness design tokens, mirroring the SalesOps Dashboard visual system.
 *
 * These values match the CSS custom properties defined in `app/globals.css`.
 * Prefer using the Tailwind utility classes (e.g. `bg-card`, `text-success`,
 * `rounded-lg`) over importing these constants directly — this module exists
 * as a single documented reference for the token set and for non-Tailwind
 * consumers (e.g. chart libraries that need raw color values).
 */

export const colors = {
  background: "oklch(0.09 0.005 260)",
  foreground: "oklch(0.95 0 0)",
  card: "oklch(0.12 0.005 260)",
  cardForeground: "oklch(0.95 0 0)",
  popover: "oklch(0.12 0.005 260)",
  primary: "oklch(0.95 0 0)",
  primaryForeground: "oklch(0.09 0.005 260)",
  secondary: "oklch(0.18 0.005 260)",
  muted: "oklch(0.18 0.005 260)",
  mutedForeground: "oklch(0.65 0 0)",
  accent: "oklch(0.7 0.18 145)",
  accentForeground: "oklch(0.09 0.005 260)",
  border: "oklch(0.22 0.005 260)",
  input: "oklch(0.18 0.005 260)",
  ring: "oklch(0.7 0.18 145)",
  success: "oklch(0.7 0.18 145)",
  warning: "oklch(0.75 0.18 55)",
  destructive: "oklch(0.65 0.2 25)",
  sidebar: "oklch(0.11 0.005 260)",
  sidebarBorder: "oklch(0.22 0.005 260)",
  chart1: "oklch(0.7 0.18 220)",
  chart2: "oklch(0.7 0.18 145)",
  chart3: "oklch(0.75 0.18 55)",
  chart4: "oklch(0.65 0.2 25)",
  chart5: "oklch(0.7 0.15 300)",
} as const

export const spacing = {
  pagePadding: "1.5rem", // p-6
  sectionGap: "1.5rem", // space-y-6 / gap-6
  cardPadding: "1.25rem", // p-5
  gridGapTight: "1rem", // gap-4
} as const

export const radii = {
  base: "0.5rem",
  sm: "calc(var(--radius) - 4px)",
  md: "calc(var(--radius) - 2px)",
  lg: "var(--radius)",
  xl: "calc(var(--radius) + 4px)",
} as const

export const shadows = {
  card: "shadow-sm",
  elevated: "shadow-md",
} as const

export const animation = {
  pageEnter: "animate-in fade-in slide-in-from-bottom-4 duration-500",
  cardEnter: "animate-in fade-in slide-in-from-bottom-4",
  hoverTransition: "transition-all duration-300",
  hoverBorder: "hover:border-accent/50",
} as const

export const fonts = {
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
} as const
