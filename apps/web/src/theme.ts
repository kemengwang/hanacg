import { useEffect, useState } from 'react';
import type { ThemePreference } from '@hanacg/domain';
import { browserStorage } from './platform';

const initial = browserStorage.getItem('hana:theme');
export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(
    initial === 'light' || initial === 'dark' ? initial : 'system',
  );
  const [systemDark, setSystemDark] = useState(
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const handle = () => setSystemDark(media.matches);
    media.addEventListener('change', handle);
    return () => media.removeEventListener('change', handle);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? '#18191b' : '#f7f7f8');
    browserStorage.setItem('hana:theme', theme);
  }, [theme, resolved]);
  return { theme, resolved, setTheme };
}
