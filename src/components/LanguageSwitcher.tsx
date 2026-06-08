import { useTranslation } from 'react-i18next';

const languages = ['en', 'it'] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <label className="control-switcher">
      <span>{t('settings.language')}</span>
      <select value={i18n.language} onChange={(event) => void i18n.changeLanguage(event.target.value)}>
        {languages.map((language) => (
          <option key={language} value={language}>
            {t(`settings.languages.${language}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
