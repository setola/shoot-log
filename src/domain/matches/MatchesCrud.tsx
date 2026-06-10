import { DragEvent, FormEvent, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Edit3, FileUp, Save, Trash2, Trophy, X } from 'lucide-react';
import { StatusMessage } from '../../components/StatusMessage';
import { db } from '../../db/schema';
import type { MatchEvent } from './types';
import { createEmptyMatchForm, createMatchEvent, deleteMatchEvent, matchToFormValues, type MatchFormValues, updateMatchEvent } from './matchRepository';
import { parseMare2PdfSnapshot } from './mare2PdfParser';
import { parsePractiscoreCabSnapshot } from './practiscoreParser';
import { importPractiscoreSnapshot } from './practiscoreRepository';
import { DEFAULT_SETTINGS_ID } from '../settings/settingsRepository';
import { normalizeImportedDiscipline, summarizeOwnerDivisionAndCategoryValue, summarizeSnapshotDivisionsAndCategoriesValue } from './snapshotSummary';

export function MatchesCrud() {
  const { t } = useTranslation();
  const matches = useLiveQuery(() => db.matchEvents.orderBy('date').reverse().toArray(), []);
  const practiscoreImports = useLiveQuery(() => db.practiscoreMatchImports.toArray(), []);
  const firearms = useLiveQuery(() => db.firearms.orderBy('nickname').toArray(), []);
  const settings = useLiveQuery(() => db.appSettings.get(DEFAULT_SETTINGS_ID), []);
  const names = useMemo(() => new Map((firearms ?? []).map((f) => [f.id, f.nickname])), [firearms]);
  const practiscoreByMatchId = useMemo(() => new Map((practiscoreImports ?? []).map((record) => [record.matchEventId, record])), [practiscoreImports]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchEvent | null>(null);
  const [form, setForm] = useState<MatchFormValues>(createEmptyMatchForm);
  const [importOverlay, setImportOverlay] = useState<'practiscore' | 'mare2' | null>(null);
  const [practiscoreFile, setPractiscoreFile] = useState<File | null>(null);
  const [mare2File, setMare2File] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function reset() {
    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyMatchForm());
    setPractiscoreFile(null);
    setMare2File(null);
  }

  function edit(match: MatchEvent) {
    setEditingId(match.id);
    setForm(matchToFormValues(match));
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.date) return;
    if (editingId) await updateMatchEvent(editingId, form);
    else await createMatchEvent(form);
    reset();
  }

  async function remove() {
    if (!deleteTarget) return;
    await deleteMatchEvent(deleteTarget.id);
    setDeleteTarget(null);
    if (editingId === deleteTarget.id) reset();
  }

  async function importPractiscore(file = practiscoreFile) {
    setImportMessage(null);
    setImportError(null);

    if (!file) {
      setImportError(t('matches.practiscore.validation'));
      return;
    }

    try {
      setImporting(true);
      const snapshot = await parsePractiscoreCabSnapshot(file);
      const ownerIdentifiers = settings?.ownerPractiscoreIdentifiers ?? [];
      const matchEventId = await importPractiscoreSnapshot(snapshot, editingId ?? undefined, ownerIdentifiers);
      const summary = t('matches.practiscore.importedSummary', { stages: snapshot.stages.length, competitors: snapshot.competitors.length, scores: snapshot.scores.length });
      setImportMessage(summary);
      setPractiscoreFile(null);
      setImportOverlay(null);
      setEditingId(matchEventId);
      setForm({
        ...createEmptyMatchForm(),
        name: snapshot.match.name,
        date: snapshot.match.date,
        discipline: normalizeImportedDiscipline(snapshot),
        roundsFired: String(snapshot.stages.reduce((total, stage) => total + (stage.minRounds ?? 0), 0)),
        divisionOrCategory: summarizeOwnerDivisionAndCategoryValue(snapshot, ownerIdentifiers) ?? summarizeSnapshotDivisionsAndCategoriesValue(snapshot) ?? '',
        notes: `Imported from PractiScore ${snapshot.sourceFileName}`
      });
      setShowForm(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('matches.practiscore.importError'));
    } finally {
      setImporting(false);
    }
  }

  async function importMare2Pdf(file = mare2File) {
    setImportMessage(null);
    setImportError(null);

    if (!file) {
      setImportError(t('matches.mare2.validation'));
      return;
    }

    try {
      setImporting(true);
      const snapshot = await parseMare2PdfSnapshot(file);
      const ownerIdentifiers = settings?.ownerPractiscoreIdentifiers ?? [];
      const matchEventId = await importPractiscoreSnapshot(snapshot, editingId ?? undefined, ownerIdentifiers);
      const summary = t('matches.mare2.importedSummary', { stages: snapshot.stages.length, competitors: snapshot.competitors.length, scores: snapshot.scores.length });
      setImportMessage(summary);
      setMare2File(null);
      setImportOverlay(null);
      setEditingId(matchEventId);
      setForm({
        ...createEmptyMatchForm(),
        name: snapshot.match.name,
        date: snapshot.match.date,
        discipline: normalizeImportedDiscipline(snapshot),
        roundsFired: String(snapshot.stages.reduce((total, stage) => total + (stage.minRounds ?? 0), 0)),
        divisionOrCategory: summarizeOwnerDivisionAndCategoryValue(snapshot, ownerIdentifiers) ?? summarizeSnapshotDivisionsAndCategoriesValue(snapshot) ?? '',
        notes: `Imported from Mare2 PDF ${snapshot.sourceFileName}`
      });
      setShowForm(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('matches.mare2.importError'));
    } finally {
      setImporting(false);
    }
  }

  function openImportOverlay(type: 'practiscore' | 'mare2') {
    setImportMessage(null);
    setImportError(null);
    setPractiscoreFile(null);
    setMare2File(null);
    setImportOverlay(type);
  }

  function closeImportOverlay() {
    setImportOverlay(null);
    setPractiscoreFile(null);
    setMare2File(null);
    setImportError(null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>, type: 'practiscore' | 'mare2') {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    if (type === 'practiscore') setPractiscoreFile(file);
    else setMare2File(file);
  }

  return (
    <section className="screen-stack">
      <div className="section-heading figma-heading">
        <div>
          <h2>{t('matches.title')}</h2>
          <p>{t('matches.description')}</p>
        </div>
        <div className="panel import-card">
          <span>{t('matches.import.fromLabel')}</span>
          <div className="import-action-row">
            <button className="button import-button-practiscore" type="button" onClick={() => openImportOverlay('practiscore')}><FileUp size={16} />PractiScore</button>
            <button className="button import-button-mare2" type="button" onClick={() => openImportOverlay('mare2')}><FileUp size={16} />Mare2</button>
          </div>
        </div>
      </div>

      {importMessage && <StatusMessage tone="success" onDismiss={() => setImportMessage(null)}>{importMessage}</StatusMessage>}
      {importError && !importOverlay && <StatusMessage tone="error" onDismiss={() => setImportError(null)}>{importError}</StatusMessage>}

      <div className="crud-layout crud-layout-list-only">
        <div className="list-panel-clean">
          <div className="list-title-row">
            <div>
              <h3>{t('matches.listTitle')}</h3>
              <p className="muted">{t('matches.listCount', { count: matches?.length ?? 0 })}</p>
            </div>
          </div>
          {matches?.length === 0 && <div className="empty-state-card"><Trophy size={42} strokeWidth={1.4} /><h3>{t('matches.emptyTitle')}</h3><p>{t('matches.empty')}</p><div className="panel import-card"><span>{t('matches.import.fromLabel')}</span><div className="import-action-row"><button className="button import-button-practiscore" type="button" onClick={() => openImportOverlay('practiscore')}><FileUp size={16} />PractiScore</button><button className="button import-button-mare2" type="button" onClick={() => openImportOverlay('mare2')}><FileUp size={16} />Mare2</button></div></div></div>}
          <div className="record-list">{matches?.map((match) => {
            const practiscoreImport = practiscoreByMatchId.get(match.id);
            const importSource = practiscoreImport ? importSourceLabel(practiscoreImport.practiscoreMatchId) : undefined;
            const importSourceClass = practiscoreImport ? importSourceClassName(practiscoreImport.practiscoreMatchId) : undefined;
            const divisionSummary = match.divisionOrCategory ?? (practiscoreImport ? summarizeOwnerDivisionAndCategoryValue(practiscoreImport.snapshot, settings?.ownerPractiscoreIdentifiers) ?? summarizeSnapshotDivisionsAndCategoriesValue(practiscoreImport.snapshot) : undefined);
            const matchMeta = [
              match.discipline,
              divisionSummary,
              practiscoreImport ? t('matches.import.stages', { count: practiscoreImport.snapshot.stages.length }) : undefined,
              practiscoreImport ? t('matches.import.competitors', { count: practiscoreImport.snapshot.competitors.length }) : undefined,
              importSource,
              match.firearmId ? names.get(match.firearmId) : undefined,
              match.score ? t('matches.score', { score: match.score }) : undefined
            ].filter(Boolean);
            return <article className="record-card" key={match.id}><div className="record-icon-stack"><div className="record-icon"><Trophy size={18} /></div><span>{formatDate(match.date)}</span></div><div className="record-content"><div className="record-title-row"><h4>{match.name}</h4>{match.placement && <span className="badge badge-success">#{match.placement}</span>}</div>{match.clubOrRange && <p>{match.clubOrRange}</p>}{matchMeta.length > 0 && <div className="match-meta-row">{matchMeta.map((item, index) => item === importSource && importSourceClass ? <span className={`import-source-pill ${importSourceClass}`} key={`${item}-${index}`}>{item}</span> : <span className={`match-meta-pill match-meta-pill-${index % 4}`} key={`${item}-${index}`}>{item}</span>)}</div>}</div><div className="record-actions"><button className="icon-button" onClick={() => edit(match)} aria-label={t('actions.edit')}><Edit3 size={15} /></button><button className="icon-button danger" onClick={() => setDeleteTarget(match)} aria-label={t('actions.delete')}><Trash2 size={15} /></button></div></article>;
          })}</div>
        </div>
      </div>
      {importOverlay && (
        <div className="dialog-backdrop" onMouseDown={closeImportOverlay}>
          <div className="panel form-grid import-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="form-title-row import-dialog-heading">
              <div>
                <h3>{importOverlay === 'practiscore' ? t('matches.practiscore.title') : t('matches.mare2.title')}</h3>
                <p className="muted import-dialog-intro">{importOverlay === 'practiscore' ? t('matches.practiscore.createHint') : t('matches.mare2.createHint')}</p>
              </div>
              <button className="icon-button" type="button" aria-label={t('actions.close')} onClick={closeImportOverlay}><X size={16} /></button>
            </div>
            <p className="import-help import-dialog-instructions">{importOverlay === 'practiscore' ? t('matches.practiscore.downloadHelp') : t('matches.mare2.downloadHelp')}</p>
            <label className="import-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, importOverlay)}>
              <FileUp size={28} />
              <strong>{t('matches.import.dropTitle')}</strong>
              <span>{t('matches.import.dropHint')}</span>
              <input type="file" accept={importOverlay === 'practiscore' ? '.cab,application/vnd.ms-cab-compressed,application/octet-stream' : '.pdf,application/pdf'} onChange={(event) => importOverlay === 'practiscore' ? setPractiscoreFile(event.target.files?.[0] ?? null) : setMare2File(event.target.files?.[0] ?? null)} />
            </label>
            {(importOverlay === 'practiscore' ? practiscoreFile : mare2File) && <p className="muted">{t('matches.import.selectedFile', { fileName: (importOverlay === 'practiscore' ? practiscoreFile : mare2File)?.name })}</p>}
            {importError && <StatusMessage tone="error" onDismiss={() => setImportError(null)}>{importError}</StatusMessage>}
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={closeImportOverlay}>{t('actions.cancel')}</button>
              <button className="button" type="button" disabled={importing} onClick={() => void (importOverlay === 'practiscore' ? importPractiscore() : importMare2Pdf())}><FileUp size={16} />{importing ? (importOverlay === 'practiscore' ? t('matches.practiscore.importing') : t('matches.mare2.importing')) : (importOverlay === 'practiscore' ? t('matches.practiscore.importAction') : t('matches.mare2.importAction'))}</button>
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <div className="dialog-backdrop" onMouseDown={reset}>
          <form className="panel form-grid match-form-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
            <div className="form-title-row"><h3>{editingId ? t('matches.editTitle') : t('matches.createTitle')}</h3><button className="icon-button" type="button" aria-label={t('actions.close')} onClick={reset}><X size={16} /></button></div>
            <label><span>{t('matches.fields.name')} *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('matches.placeholders.name')} /></label>
            <div className="two-columns"><label><span>{t('matches.fields.date')} *</span><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label><span>{t('matches.fields.club')}</span><input value={form.clubOrRange} onChange={(event) => setForm({ ...form, clubOrRange: event.target.value })} /></label></div>
            <div className="two-columns"><label><span>{t('matches.fields.discipline')}</span><input value={form.discipline} onChange={(event) => setForm({ ...form, discipline: event.target.value })} /></label><label><span>{t('matches.fields.division')}</span><input value={form.divisionOrCategory} onChange={(event) => setForm({ ...form, divisionOrCategory: event.target.value })} /></label></div>
            <label><span>{t('matches.fields.firearm')}</span><select value={form.firearmId} onChange={(event) => setForm({ ...form, firearmId: event.target.value })}><option value="">{t('common.none')}</option>{firearms?.filter((f) => !f.archived).map((f) => <option key={f.id} value={f.id}>{f.nickname}</option>)}</select></label>
            <div className="three-columns"><label><span>{t('matches.fields.rounds')}</span><input type="number" min="0" value={form.roundsFired} onChange={(event) => setForm({ ...form, roundsFired: event.target.value })} /></label><label><span>{t('matches.fields.score')}</span><input value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} /></label><label><span>{t('matches.fields.placement')}</span><input value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })} /></label></div>
            <label><span>{t('matches.fields.notes')}</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={reset}>{t('actions.cancel')}</button><button className="button" type="submit"><Save size={16} />{editingId ? t('actions.save') : t('matches.createAction')}</button></div>
          </form>
        </div>
      )}
      {deleteTarget && <div className="dialog-backdrop" onMouseDown={() => setDeleteTarget(null)}><div className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="dialog-title-row"><h3>{t('matches.deleteTitle')}</h3><button className="icon-button" onClick={() => setDeleteTarget(null)}><X size={16} /></button></div><p>{t('matches.deleteConfirm')}</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setDeleteTarget(null)}>{t('actions.cancel')}</button><button className="button button-danger" onClick={() => void remove()}>{t('actions.delete')}</button></div></div></div>}
    </section>
  );
}

function importSourceLabel(practiscoreMatchId: string) {
  return practiscoreMatchId.startsWith('mare2:') ? 'Mare2' : 'PractiScore';
}

function importSourceClassName(practiscoreMatchId: string) {
  return practiscoreMatchId.startsWith('mare2:') ? 'import-source-mare2' : 'import-source-practiscore';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}
