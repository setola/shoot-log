import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard } from '../components/Dashboard';
import { DriveSyncPanel } from '../components/DriveSyncPanel';
import { BottomNav, Header, Sidebar } from '../components/Navigation';
import { SettingsPanel } from '../components/SettingsPanel';
import { db } from '../db/schema';
import { AmmunitionCrud } from '../domain/ammunition/AmmunitionCrud';
import { FirearmsCrud } from '../domain/firearms/FirearmsCrud';
import { MaintenanceCrud } from '../domain/maintenance/MaintenanceCrud';
import { MatchAnalysis } from '../domain/matches/MatchAnalysis';
import { MatchesCrud } from '../domain/matches/MatchesCrud';
import { PaperworkCrud } from '../domain/paperwork/PaperworkCrud';
import { TrainingCrud } from '../domain/training/TrainingCrud';
import type { PaperworkAttachment } from '../domain/paperwork/attachmentTypes';
import { createBackupEnvelope } from '../export/jsonExport';
import type { Section } from './sections';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'shooting-logbook-theme';
const SECTION_STORAGE_KEY = 'shooting-logbook-section';
const LAST_DRIVE_SYNC_STORAGE_KEY = 'shooting-logbook-last-drive-sync';

function getInitialTheme(): Theme {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialSection(): Section {
  const storedSection = window.localStorage.getItem(SECTION_STORAGE_KEY);
  const sections: Section[] = ['dashboard', 'firearms', 'training', 'matches', 'analysis', 'ammunition', 'maintenance', 'paperwork', 'reports', 'sync', 'settings'];
  return sections.includes(storedSection as Section) ? (storedSection as Section) : 'dashboard';
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  return dataUrl.split(',')[1] ?? '';
}

function deserializePaperworkAttachment(value: unknown): PaperworkAttachment {
  const attachment = value as Record<string, unknown>;
  const content = typeof attachment.content === 'string' ? base64ToBlob(attachment.content, String(attachment.mimeType ?? 'application/octet-stream')) : new Blob();

  return {
    id: String(attachment.id),
    credentialId: String(attachment.credentialId),
    fileName: String(attachment.fileName),
    mimeType: String(attachment.mimeType ?? 'application/octet-stream'),
    size: Number(attachment.size ?? 0),
    content,
    createdAt: String(attachment.createdAt),
    updatedAt: String(attachment.updatedAt)
  };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export function App() {
  const { i18n, t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [activeSection, setActiveSection] = useState<Section>(getInitialSection);
  const [lastDriveSyncedAt, setLastDriveSyncedAt] = useState<string | null>(() => window.localStorage.getItem(LAST_DRIVE_SYNC_STORAGE_KEY));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(SECTION_STORAGE_KEY, activeSection);
  }, [activeSection]);

  async function collectBackupPayload() {
    const [
      firearms,
      trainingSessions,
      matchEvents,
      practiscoreMatchImports,
      ammunitionBatches,
      ammoTransactions,
      maintenanceEvents,
      paperworkCredentials,
      paperworkAttachments,
      appSettings
    ] = await Promise.all([
      db.firearms.toArray(),
      db.trainingSessions.toArray(),
      db.matchEvents.toArray(),
      db.practiscoreMatchImports.toArray(),
      db.ammunitionBatches.toArray(),
      db.ammoTransactions.toArray(),
      db.maintenanceEvents.toArray(),
      db.paperworkCredentials.toArray(),
      db.paperworkAttachments.toArray(),
      db.appSettings.toArray()
    ]);

    const serializedPaperworkAttachments = await Promise.all(
      paperworkAttachments.map(async (attachment) => ({
        ...attachment,
        content: await blobToBase64(attachment.content)
      }))
    );

    return {
      firearms,
      trainingSessions,
      matchEvents,
      practiscoreMatchImports,
      ammunitionBatches,
      ammoTransactions,
      maintenanceEvents,
      paperworkCredentials,
      paperworkAttachments: serializedPaperworkAttachments,
      appSettings
    };
  }

  async function createBackupJson() {
    const payload = await collectBackupPayload();
    const envelope = createBackupEnvelope(payload);
    return JSON.stringify(envelope, null, 2);
  }

  async function handleExportData() {
    const backupJson = await createBackupJson();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shooting-logbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        void importBackup(String(reader.result ?? ''));
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function importBackup(rawJson: string) {
    const parsed = JSON.parse(rawJson) as { payload?: Record<string, unknown> } & Record<string, unknown>;
    const payload: Record<string, unknown> = parsed.payload && typeof parsed.payload === 'object' ? parsed.payload : parsed;

    await db.transaction(
      'rw',
      [
        db.firearms,
        db.trainingSessions,
        db.matchEvents,
        db.practiscoreMatchImports,
        db.ammunitionBatches,
        db.ammoTransactions,
        db.maintenanceEvents,
        db.paperworkCredentials,
        db.paperworkAttachments,
        db.appSettings
      ],
      async () => {
        if (Array.isArray(payload.firearms)) await db.firearms.bulkPut(payload.firearms);
        if (Array.isArray(payload.trainingSessions)) await db.trainingSessions.bulkPut(payload.trainingSessions);
        if (Array.isArray(payload.matchEvents)) await db.matchEvents.bulkPut(payload.matchEvents);
        if (Array.isArray(payload.practiscoreMatchImports)) await db.practiscoreMatchImports.bulkPut(payload.practiscoreMatchImports);
        if (Array.isArray(payload.ammunitionBatches)) await db.ammunitionBatches.bulkPut(payload.ammunitionBatches);
        if (Array.isArray(payload.ammoTransactions)) await db.ammoTransactions.bulkPut(payload.ammoTransactions);
        if (Array.isArray(payload.maintenanceEvents)) await db.maintenanceEvents.bulkPut(payload.maintenanceEvents);
        if (Array.isArray(payload.paperworkCredentials)) await db.paperworkCredentials.bulkPut(payload.paperworkCredentials);
        if (Array.isArray(payload.paperworkAttachments)) {
          await db.paperworkAttachments.bulkPut(payload.paperworkAttachments.map(deserializePaperworkAttachment));
        }
        if (Array.isArray(payload.appSettings)) await db.appSettings.bulkPut(payload.appSettings);
      }
    );
  }

  function handleLastDriveSyncedAtChange(timestamp: string | null) {
    setLastDriveSyncedAt(timestamp);

    if (timestamp) {
      window.localStorage.setItem(LAST_DRIVE_SYNC_STORAGE_KEY, timestamp);
    } else {
      window.localStorage.removeItem(LAST_DRIVE_SYNC_STORAGE_KEY);
    }
  }

  async function handleClearData() {
    await db.transaction(
      'rw',
      [
        db.firearms,
        db.trainingSessions,
        db.matchEvents,
        db.practiscoreMatchImports,
        db.ammunitionBatches,
        db.ammoTransactions,
        db.maintenanceEvents,
        db.paperworkCredentials,
        db.paperworkAttachments,
        db.appSettings
      ],
      async () => {
        await Promise.all([
          db.firearms.clear(),
          db.trainingSessions.clear(),
          db.matchEvents.clear(),
          db.practiscoreMatchImports.clear(),
          db.ammunitionBatches.clear(),
          db.ammoTransactions.clear(),
          db.maintenanceEvents.clear(),
          db.paperworkCredentials.clear(),
          db.paperworkAttachments.clear(),
          db.appSettings.clear()
        ]);
      }
    );
  }

  function renderSection() {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveSection} />;
      case 'firearms':
        return <FirearmsCrud />;
      case 'training':
        return <TrainingCrud />;
      case 'matches':
        return <MatchesCrud />;
      case 'analysis':
        return <MatchAnalysis />;
      case 'ammunition':
        return <AmmunitionCrud />;
      case 'maintenance':
        return <MaintenanceCrud />;
      case 'paperwork':
        return <PaperworkCrud />;
      case 'sync':
        return (
          <DriveSyncPanel
            lastSyncedAt={lastDriveSyncedAt}
            onBackupContentRequested={createBackupJson}
            onRestoreContent={importBackup}
            onLastSyncedAtChange={handleLastDriveSyncedAtChange}
          />
        );
      case 'settings':
        return (
          <SettingsPanel
            theme={theme}
            language={i18n.language}
            onThemeChange={setTheme}
            onLanguageChange={(language) => void i18n.changeLanguage(language)}
            onExportData={() => void handleExportData()}
            onImportData={handleImportData}
            onClearData={handleClearData}
          />
        );
      default:
        return (
          <section className="empty-state-card placeholder-screen">
            <h2>{t(`sections.${activeSection}`)}</h2>
            <p>{t('common.comingSoon')}</p>
          </section>
        );
    }
  }

  return (
    <div className="app-layout">
      <Sidebar active={activeSection} mobileOpen={mobileMenuOpen} onNavigate={setActiveSection} onMobileClose={() => setMobileMenuOpen(false)} />
      <div className="main-column">
        <Header
          active={activeSection}
          theme={theme}
          language={i18n.language}
          onMenuOpen={() => setMobileMenuOpen(true)}
          onThemeChange={setTheme}
          onLanguageChange={(language) => void i18n.changeLanguage(language)}
        />
        <main className="main-content">{renderSection()}</main>
      </div>
      <BottomNav active={activeSection} onNavigate={setActiveSection} />
    </div>
  );
}
