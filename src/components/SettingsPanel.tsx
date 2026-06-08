import { Download, Info, Moon, Shield, Sun, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsPanelProps {
  theme: 'light' | 'dark';
  language: string;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLanguageChange: (language: string) => void;
  onExportData: () => void;
  onImportData: () => void;
  onClearData: () => Promise<void>;
}

const languages = ['en', 'it'] as const;
const themes = ['light', 'dark'] as const;

export function SettingsPanel({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
  onExportData,
  onImportData,
  onClearData
}: SettingsPanelProps) {
  const { t } = useTranslation();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  async function handleClearData() {
    await onClearData();
    setConfirmClearOpen(false);
  }

  return (
    <section className="screen-stack" aria-labelledby="settings-title">
      <div className="section-heading figma-heading">
        <div>
          <h2 id="settings-title">{t('settingsPage.title')}</h2>
          <p>{t('settingsPage.description')}</p>
        </div>
      </div>

      <article className="settings-card">
        <h3>{t('settingsPage.appearance.title')}</h3>
        <div className="settings-group">
          <div>
            <p className="settings-label">{t('settings.theme')}</p>
            <div className="segmented-grid segmented-grid-two" role="group" aria-label={t('settings.theme')}>
              {themes.map((themeOption) => {
                const Icon = themeOption === 'light' ? Sun : Moon;
                return (
                  <button
                    key={themeOption}
                    className={theme === themeOption ? 'segmented-option segmented-option-active' : 'segmented-option'}
                    type="button"
                    onClick={() => onThemeChange(themeOption)}
                  >
                    <Icon size={15} />
                    {t(`settings.themeValues.${themeOption}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="settings-label">{t('settings.language')}</p>
            <div className="segmented-grid" role="group" aria-label={t('settings.language')}>
              {languages.map((languageOption) => (
                <button
                  key={languageOption}
                  className={language.startsWith(languageOption) ? 'segmented-option segmented-option-active' : 'segmented-option'}
                  type="button"
                  onClick={() => onLanguageChange(languageOption)}
                >
                  {t(`settings.languageNames.${languageOption}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="settings-card">
        <h3>{t('settingsPage.privacy.title')}</h3>
        <div className="settings-group settings-group-compact">
          <PrivacyNotice>{t('settingsPage.privacy.localOnly')}</PrivacyNotice>
          <PrivacyNotice>{t('settingsPage.privacy.sensitive')}</PrivacyNotice>
        </div>
      </article>

      <article className="settings-card">
        <h3>{t('settingsPage.data.title')}</h3>
        <div className="data-actions">
          <SettingsAction
            icon={<Download size={17} />}
            title={t('settingsPage.data.exportTitle')}
            description={t('settingsPage.data.exportDescription')}
            buttonLabel={t('settingsPage.data.exportButton')}
            onClick={onExportData}
          />
          <SettingsAction
            icon={<Upload size={17} />}
            title={t('settingsPage.data.importTitle')}
            description={t('settingsPage.data.importDescription')}
            buttonLabel={t('settingsPage.data.importButton')}
            onClick={onImportData}
          />
          <SettingsAction
            danger
            icon={<Trash2 size={17} />}
            title={t('settingsPage.data.clearTitle')}
            description={t('settingsPage.data.clearDescription')}
            buttonLabel={t('settingsPage.data.clearButton')}
            onClick={() => setConfirmClearOpen(true)}
          />
        </div>
      </article>

      <article className="settings-card">
        <h3>{t('settingsPage.about.title')}</h3>
        <div className="about-row">
          <Info size={18} />
          <div>
            <p>{t('settingsPage.about.description')}</p>
            <span>{t('settingsPage.about.version')}</span>
          </div>
        </div>
      </article>

      {confirmClearOpen ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setConfirmClearOpen(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="clear-data-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-title-row">
              <h3 id="clear-data-title">{t('settingsPage.clearDialog.title')}</h3>
              <button className="icon-button" type="button" aria-label={t('actions.close')} onClick={() => setConfirmClearOpen(false)}>
                ×
              </button>
            </div>
            <p>{t('settingsPage.clearDialog.description')}</p>
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={() => setConfirmClearOpen(false)}>
                {t('actions.cancel')}
              </button>
              <button className="button button-danger" type="button" onClick={() => void handleClearData()}>
                {t('settingsPage.clearDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PrivacyNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="privacy-note settings-privacy-note">
      <Shield size={15} />
      <span>{children}</span>
    </div>
  );
}

interface SettingsActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  danger?: boolean;
  onClick: () => void;
}

function SettingsAction({ icon, title, description, buttonLabel, danger, onClick }: SettingsActionProps) {
  return (
    <div className={danger ? 'settings-action settings-action-danger' : 'settings-action'}>
      <div className="settings-action-copy">
        <span className="settings-action-icon">{icon}</span>
        <div>
          <p>{title}</p>
          <span>{description}</span>
        </div>
      </div>
      <button className={danger ? 'button button-danger' : 'button button-secondary'} type="button" onClick={onClick}>
        {buttonLabel}
      </button>
    </div>
  );
}
