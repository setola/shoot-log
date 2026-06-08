import { FormEvent, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Edit3, FileUp, Plus, Save, Trash2, Trophy, X } from 'lucide-react';
import { db } from '../../db/schema';
import type { MatchEvent } from './types';
import { createEmptyMatchForm, createMatchEvent, deleteMatchEvent, matchToFormValues, type MatchFormValues, updateMatchEvent } from './matchRepository';
import { normalizePractiscoreMatchId, parsePractiscoreCabSnapshot } from './practiscoreParser';
import { importPractiscoreSnapshot } from './practiscoreRepository';

export function MatchesCrud() {
  const { t } = useTranslation();
  const matches = useLiveQuery(() => db.matchEvents.orderBy('date').reverse().toArray(), []);
  const practiscoreImports = useLiveQuery(() => db.practiscoreMatchImports.toArray(), []);
  const firearms = useLiveQuery(() => db.firearms.orderBy('nickname').toArray(), []);
  const names = useMemo(() => new Map((firearms ?? []).map((f) => [f.id, f.nickname])), [firearms]);
  const practiscoreByMatchId = useMemo(() => new Map((practiscoreImports ?? []).map((record) => [record.matchEventId, record])), [practiscoreImports]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MatchEvent | null>(null);
  const [form, setForm] = useState<MatchFormValues>(createEmptyMatchForm);
  const [practiscoreInput, setPractiscoreInput] = useState('');
  const [practiscoreFile, setPractiscoreFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function reset() {
    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyMatchForm());
    setPractiscoreInput('');
    setPractiscoreFile(null);
  }

  function edit(match: MatchEvent) {
    setEditingId(match.id);
    setForm(matchToFormValues(match));
    setShowForm(true);
    const practiscoreImport = practiscoreByMatchId.get(match.id);
    setPractiscoreInput(practiscoreImport?.practiscoreMatchId ?? match.registrationReference ?? '');
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

  async function importPractiscore() {
    setImportMessage(null);
    setImportError(null);

    if (!practiscoreInput.trim() || !practiscoreFile) {
      setImportError(t('matches.practiscore.validation'));
      return;
    }

    try {
      setImporting(true);
      const snapshot = await parsePractiscoreCabSnapshot(practiscoreFile, practiscoreInput);
      const matchEventId = await importPractiscoreSnapshot(snapshot, editingId ?? undefined);
      const summary = t('matches.practiscore.importedSummary', { stages: snapshot.stages.length, competitors: snapshot.competitors.length, scores: snapshot.scores.length });
      setImportMessage(summary);
      setPractiscoreInput(snapshot.practiscoreMatchId);
      setPractiscoreFile(null);
      setEditingId(matchEventId);
      setForm({
        ...createEmptyMatchForm(),
        name: snapshot.match.name,
        date: snapshot.match.date,
        discipline: 'PractiScore',
        roundsFired: String(snapshot.stages.reduce((total, stage) => total + (stage.minRounds ?? 0), 0)),
        registrationReference: snapshot.practiscoreMatchId,
        notes: `Imported from PractiScore ${snapshot.sourceFileName}`
      });
      setShowForm(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('matches.practiscore.importError'));
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="screen-stack">
      <div className="section-heading figma-heading">
        <div>
          <h2>{t('matches.title')}</h2>
          <p>{t('matches.description')}</p>
        </div>
        {!showForm && <button className="button" onClick={() => setShowForm(true)}><Plus size={16} />{t('matches.new')}</button>}
      </div>

      <div className="panel form-grid practiscore-import-panel">
        <div className="form-title-row">
          <div>
            <h3>{t('matches.practiscore.title')}</h3>
            <p className="muted">{editingId ? t('matches.practiscore.replaceHint') : t('matches.practiscore.createHint')}</p>
          </div>
          <FileUp size={20} />
        </div>
        <label>
          <span>{t('matches.practiscore.idOrUrl')}</span>
          <input value={practiscoreInput} onChange={(event) => setPractiscoreInput(event.target.value)} placeholder={t('matches.practiscore.idPlaceholder')} />
        </label>
        {practiscoreInput.trim() && <p className="muted">{t('matches.practiscore.normalizedId', { id: normalizePractiscoreMatchId(practiscoreInput) })}</p>}
        <div className="two-columns">
          <label>
            <span>{t('matches.practiscore.cabFile')}</span>
            <input type="file" accept=".cab,application/vnd.ms-cab-compressed,application/octet-stream" onChange={(event) => setPractiscoreFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="form-actions-end">
            <button className="button" type="button" disabled={importing} onClick={() => void importPractiscore()}><FileUp size={16} />{importing ? t('matches.practiscore.importing') : t('matches.practiscore.importAction')}</button>
          </div>
        </div>
        {importMessage && <p className="status-message status-success">{importMessage}</p>}
        {importError && <p className="status-message status-error">{importError}</p>}
      </div>


      <div className={showForm ? 'crud-layout' : 'crud-layout crud-layout-list-only'}>
        {showForm && (
          <form className="panel form-grid" onSubmit={submit}>
            <div className="form-title-row"><h3>{editingId ? t('matches.editTitle') : t('matches.createTitle')}</h3><button className="button button-ghost button-small" type="button" onClick={reset}><X size={15} />{t('actions.cancel')}</button></div>
            <label><span>{t('matches.fields.name')} *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('matches.placeholders.name')} /></label>
            <div className="two-columns"><label><span>{t('matches.fields.date')} *</span><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label><span>{t('matches.fields.club')}</span><input value={form.clubOrRange} onChange={(event) => setForm({ ...form, clubOrRange: event.target.value })} /></label></div>
            <div className="two-columns"><label><span>{t('matches.fields.discipline')}</span><input value={form.discipline} onChange={(event) => setForm({ ...form, discipline: event.target.value })} /></label><label><span>{t('matches.fields.division')}</span><input value={form.divisionOrCategory} onChange={(event) => setForm({ ...form, divisionOrCategory: event.target.value })} /></label></div>
            <label><span>{t('matches.fields.firearm')}</span><select value={form.firearmId} onChange={(event) => setForm({ ...form, firearmId: event.target.value })}><option value="">{t('common.none')}</option>{firearms?.filter((f) => !f.archived).map((f) => <option key={f.id} value={f.id}>{f.nickname}</option>)}</select></label>
            <div className="three-columns"><label><span>{t('matches.fields.rounds')}</span><input type="number" min="0" value={form.roundsFired} onChange={(event) => setForm({ ...form, roundsFired: event.target.value })} /></label><label><span>{t('matches.fields.score')}</span><input value={form.score} onChange={(event) => setForm({ ...form, score: event.target.value })} /></label><label><span>{t('matches.fields.placement')}</span><input value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })} /></label></div>
            <label><span>{t('matches.fields.registration')}</span><input value={form.registrationReference} onChange={(event) => setForm({ ...form, registrationReference: event.target.value })} /></label>
            <label><span>{t('matches.fields.notes')}</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <button className="button" type="submit"><Save size={16} />{editingId ? t('actions.save') : t('matches.createAction')}</button>
          </form>
        )}
        <div className="list-panel-clean">
          {matches?.length === 0 && <div className="empty-state-card"><Trophy size={42} strokeWidth={1.4} /><h3>{t('matches.emptyTitle')}</h3><p>{t('matches.empty')}</p><button className="button" onClick={() => setShowForm(true)}><Plus size={16} />{t('matches.new')}</button></div>}
          <div className="record-list">{matches?.map((match) => {
            const practiscoreImport = practiscoreByMatchId.get(match.id);
            return <article className="record-card" key={match.id}><div className="record-icon"><Trophy size={18} /></div><div className="record-content"><div className="record-title-row"><h4>{match.name}</h4>{match.placement && <span className="badge badge-success">#{match.placement}</span>}{practiscoreImport && <span className="badge badge-muted">PractiScore</span>}</div><p>{[formatDate(match.date), match.clubOrRange].filter(Boolean).join(' · ')}</p><p className="muted">{[match.discipline, match.divisionOrCategory, match.firearmId ? names.get(match.firearmId) : '', match.score ? t('matches.score', { score: match.score }) : ''].filter(Boolean).join(' · ')}</p>{practiscoreImport && <p className="muted">{t('matches.practiscore.cardSummary', { stages: practiscoreImport.snapshot.stages.length, competitors: practiscoreImport.snapshot.competitors.length, scores: practiscoreImport.snapshot.scores.length })}</p>}</div><div className="record-actions"><button className="icon-button" onClick={() => edit(match)} aria-label={t('actions.edit')}><Edit3 size={15} /></button><button className="icon-button danger" onClick={() => setDeleteTarget(match)} aria-label={t('actions.delete')}><Trash2 size={15} /></button></div></article>;
          })}</div>
        </div>
      </div>
      {deleteTarget && <div className="dialog-backdrop" onMouseDown={() => setDeleteTarget(null)}><div className="dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="dialog-title-row"><h3>{t('matches.deleteTitle')}</h3><button className="icon-button" onClick={() => setDeleteTarget(null)}><X size={16} /></button></div><p>{t('matches.deleteConfirm')}</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setDeleteTarget(null)}>{t('actions.cancel')}</button><button className="button button-danger" onClick={() => void remove()}>{t('actions.delete')}</button></div></div></div>}
    </section>
  );
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}
