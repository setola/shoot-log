import { Download, Info, Plus, Shield, Trash2, Upload, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../db/schema';
import { DEFAULT_SETTINGS_ID, updateOwnerPractiscoreIdentifiers } from '../domain/settings/settingsRepository';

interface SettingsPanelProps {
  driveSyncContent: ReactNode;
  onExportData: () => void;
  onImportData: () => void;
  onClearData: () => Promise<void>;
}

export function SettingsPanel({
  driveSyncContent,
  onExportData,
  onImportData,
  onClearData
}: SettingsPanelProps) {
  const { t } = useTranslation();
  const appSettings = useLiveQuery(() => db.appSettings.get(DEFAULT_SETTINGS_ID), []);
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
        <h3>{t('settingsPage.owner.title')}</h3>
        <OwnerIdentifiersEditor key={appSettings?.updatedAt ?? 'empty-owner-identifiers'} identifiers={appSettings?.ownerPractiscoreIdentifiers ?? []} />
      </article>

      <article className="settings-card">
        <h3>{t('sync.title')}</h3>
        <p className="muted">{t('sync.description')}</p>
        {driveSyncContent}
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
            <div className="settings-group settings-group-compact about-privacy-notes">
              <PrivacyNotice>{t('settingsPage.privacy.localOnly')}</PrivacyNotice>
              <PrivacyNotice>{t('settingsPage.privacy.sensitive')}</PrivacyNotice>
            </div>
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

function OwnerIdentifiersEditor({ identifiers }: { identifiers: string[] }) {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => identifiers.filter(Boolean));
  const [draft, setDraft] = useState('');

  async function updateItems(nextItems: string[]) {
    const normalizedItems = [...new Set(nextItems.map((item) => item.trim()).filter(Boolean))];
    setItems(normalizedItems);
    await updateOwnerPractiscoreIdentifiers(normalizedItems);
  }

  async function addDraft() {
    const newItem = draft.trim();
    if (!newItem) return;
    setDraft('');
    await updateItems([...items, newItem]);
  }

  return (
    <div className="settings-group settings-group-compact">
      <div className="owner-pill-list" aria-label={t('settingsPage.owner.identifiersLabel')}>
        {items.length ? items.map((item) => (
          <span className="owner-pill" key={item}>
            {item}
            <button type="button" aria-label={t('settingsPage.owner.removeIdentifier', { identifier: item })} onClick={() => void updateItems(items.filter((candidate) => candidate !== item))}>
              <X size={13} />
            </button>
          </span>
        )) : <span className="muted">{t('settingsPage.owner.empty')}</span>}
      </div>
      <label>
        <span className="settings-label">{t('settingsPage.owner.addLabel')}</span>
        <div className="owner-add-row">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void addDraft();
            }
          }} placeholder={t('settingsPage.owner.identifiersPlaceholder')} />
          <button className="button button-secondary" type="button" onClick={() => void addDraft()}>
            <Plus size={15} />{t('settingsPage.owner.addButton')}
          </button>
        </div>
      </label>
      <p className="muted">{t('settingsPage.owner.description')}</p>
    </div>
  );
}

function PrivacyNotice({ children }: { children: ReactNode }) {
  return (
    <div className="privacy-note settings-privacy-note">
      <Shield size={15} />
      <span>{children}</span>
    </div>
  );
}

interface SettingsActionProps {
  icon: ReactNode;
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
