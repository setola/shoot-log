import {
  BarChart2,
  Cloud,
  FileText,
  Grid2X2,
  Menu,
  Moon,
  Package,
  Settings,
  Shield,
  Sun,
  Target,
  Timer,
  Trophy,
  Wrench,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Section } from '../app/sections';

interface NavigationProps {
  active: Section;
  mobileOpen: boolean;
  onNavigate: (section: Section) => void;
  onMobileClose: () => void;
}

interface HeaderProps {
  active: Section;
  theme: 'light' | 'dark';
  language: string;
  onMenuOpen: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onLanguageChange: (language: string) => void;
}

const navItems = [
  { id: 'dashboard', icon: Grid2X2 },
  { id: 'firearms', icon: Target },
  { id: 'training', icon: Timer },
  { id: 'matches', icon: Trophy },
  { id: 'ammunition', icon: Package },
  { id: 'maintenance', icon: Wrench },
  { id: 'paperwork', icon: FileText },
  { id: 'reports', icon: BarChart2 },
  { id: 'sync', icon: Cloud },
  { id: 'settings', icon: Settings }
] as const satisfies ReadonlyArray<{ id: Section; icon: typeof Target }>;

const bottomItems = navItems.slice(0, 5);

export function Sidebar({ active, mobileOpen, onNavigate, onMobileClose }: NavigationProps) {
  const { t } = useTranslation();

  return (
    <>
      {mobileOpen ? <button className="nav-overlay" type="button" aria-label={t('navigation.closeMenu')} onClick={onMobileClose} /> : null}
      <aside className={mobileOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Target size={17} />
          </div>
          <div>
            <p>{t('app.shortTitle')}</p>
            <span>{t('app.privateLogbook')}</span>
          </div>
          <button className="icon-button mobile-only" type="button" aria-label={t('navigation.closeMenu')} onClick={onMobileClose}>
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label={t('navigation.primary')}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={active === item.id ? 'nav-item nav-item-active' : 'nav-item'}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onMobileClose();
                }}
              >
                <Icon size={18} />
                <span>{t(`navigation.${item.id}`)}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-privacy">
          <Shield size={14} />
          <span>{t('privacy.localDevice')}</span>
        </div>
      </aside>
    </>
  );
}

export function Header({ active, theme, language, onMenuOpen, onThemeChange, onLanguageChange }: HeaderProps) {
  const { t } = useTranslation();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="topbar">
      <button className="icon-button mobile-only" type="button" aria-label={t('navigation.openMenu')} onClick={onMenuOpen}>
        <Menu size={20} />
      </button>
      <h1>{t(`sections.${active}`)}</h1>
      <div className="topbar-actions">
        <label className="compact-control">
          <span className="sr-only">{t('settings.language')}</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-label={t('settings.language')}>
            <option value="en">{t('settings.languages.en')}</option>
            <option value="it">{t('settings.languages.it')}</option>
          </select>
        </label>
        <button className="theme-toggle" type="button" aria-label={t(`settings.switchTo.${nextTheme}`)} onClick={() => onThemeChange(nextTheme)}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
}

export function BottomNav({ active, onNavigate }: Pick<NavigationProps, 'active' | 'onNavigate'>) {
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav" aria-label={t('navigation.mobile')}>
      {bottomItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={active === item.id ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item'}
            type="button"
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={18} />
            <span>{t(`navigation.${item.id}`)}</span>
          </button>
        );
      })}
    </nav>
  );
}
