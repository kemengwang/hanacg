export const tokens = {
  colors: {
    light: {
      canvas: '#ffffff',
      sidebar: '#f7f7f8',
      text: '#252628',
      muted: '#77797e',
      border: '#e9e9ec',
      accent: '#447467',
    },
    dark: {
      canvas: '#202123',
      sidebar: '#18191b',
      text: '#eeeff0',
      muted: '#a0a2a7',
      border: '#343638',
      accent: '#9bbcaf',
    },
  },
  radius: { small: 6, control: 8, poster: 10, panel: 14 },
  layout: { sidebar: 232, collapsedSidebar: 72, maxContent: 1240 },
} as const;
