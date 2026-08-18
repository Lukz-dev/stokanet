export const THEME_PREFERENCES = ['SUNSET', 'OCEAN', 'FOREST', 'ROSE'] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export const THEME_ATTRIBUTE_MAP: Record<ThemePreference, string> = {
  SUNSET: 'sunset',
  OCEAN: 'ocean',
  FOREST: 'forest',
  ROSE: 'rose',
}

export const THEME_COLOR_PRESETS: Record<ThemePreference, { primary: string; secondary: string }> = {
  SUNSET: { primary: '#e0a15f', secondary: '#cf6f7a' },
  OCEAN: { primary: '#3f8fbf', secondary: '#61add9' },
  FOREST: { primary: '#5f9a58', secondary: '#7db677' },
  ROSE: { primary: '#cf6f7a', secondary: '#e0a15f' },
}

export function isThemePreference(value: string): value is ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
}

export function toThemeAttribute(value?: string | null): string {
  if (!value) return THEME_ATTRIBUTE_MAP.SUNSET
  if (isThemePreference(value)) return THEME_ATTRIBUTE_MAP[value]
  return THEME_ATTRIBUTE_MAP.SUNSET
}
