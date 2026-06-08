import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'shooting-logbook-theme';

function getInitialTheme(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <label className="control-switcher">
      <span>{t('settings.theme')}</span>
      <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
        <option value="light">{t('settings.themeLight')}</option>
        <option value="dark">{t('settings.themeDark')}</option>
      </select>
    </label>
  );
}
