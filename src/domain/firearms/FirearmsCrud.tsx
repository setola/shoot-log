import { FormEvent, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Edit3, Plus, Save, Shield, Target, Trash2, X } from 'lucide-react';
import { db } from '../../db/schema';
import type { Firearm, FirearmType } from './types';
import {
  createEmptyFirearmForm,
  createFirearm,
  deleteFirearm,
  firearmToFormValues,
  type FirearmFormValues,
  updateFirearm
} from './firearmRepository';

const firearmTypes: FirearmType[] = ['pistol', 'revolver', 'rifle', 'shotgun', 'airgun', 'other'];

export function FirearmsCrud() {
  const { t } = useTranslation();
  const firearms = useLiveQuery(() => db.firearms.orderBy('nickname').toArray(), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Firearm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<FirearmFormValues>(createEmptyFirearmForm);

  const editingFirearm = useMemo(
    () => firearms?.find((firearm) => firearm.id === editingId),
    [editingId, firearms]
  );

  function startCreate() {
    setEditingId(null);
    setFormValues(createEmptyFirearmForm());
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormValues(createEmptyFirearmForm());
    setShowForm(false);
  }

  function startEdit(firearm: Firearm) {
    setEditingId(firearm.id);
    setFormValues(firearmToFormValues(firearm));
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formValues.nickname.trim()) {
      return;
    }

    if (editingId) {
      await updateFirearm(editingId, formValues);
    } else {
      await createFirearm(formValues);
    }

    resetForm();
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    await deleteFirearm(deleteTarget.id);
    if (editingId === deleteTarget.id) {
      resetForm();
    }
    setDeleteTarget(null);
  }

  return (
    <section className="screen-stack" aria-labelledby="firearms-title">
      <div className="section-heading figma-heading">
        <div>
          <h2 id="firearms-title">{t('firearms.title')}</h2>
          <p>{t('firearms.description')}</p>
        </div>
        {!showForm ? (
          <button className="button" type="button" onClick={startCreate}>
            <Plus size={16} />
            {t('firearms.new')}
          </button>
        ) : null}
      </div>

      <div className={showForm ? 'crud-layout' : 'crud-layout crud-layout-list-only'}>
        {showForm ? (
          <form className="panel form-grid" onSubmit={handleSubmit}>
            <div className="form-title-row">
              <h3>{editingFirearm ? t('firearms.editTitle') : t('firearms.createTitle')}</h3>
              <button className="button button-ghost button-small" type="button" onClick={resetForm}>
                <X size={15} />
                {t('actions.cancel')}
              </button>
            </div>

            <label>
              <span>{t('firearms.fields.nickname')} *</span>
              <input
                required
                value={formValues.nickname}
                onChange={(event) => setFormValues({ ...formValues, nickname: event.target.value })}
                placeholder={t('firearms.placeholders.nickname')}
              />
            </label>

            <div className="two-columns">
              <label>
                <span>{t('firearms.fields.type')}</span>
                <select
                  value={formValues.type}
                  onChange={(event) => setFormValues({ ...formValues, type: event.target.value as FirearmType })}
                >
                  {firearmTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`firearms.types.${type}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t('firearms.fields.caliber')}</span>
                <input
                  value={formValues.caliber}
                  onChange={(event) => setFormValues({ ...formValues, caliber: event.target.value })}
                  placeholder={t('firearms.placeholders.caliber')}
                />
              </label>
            </div>

            <div className="two-columns">
              <label>
                <span>{t('firearms.fields.manufacturer')}</span>
                <input
                  value={formValues.manufacturer}
                  onChange={(event) => setFormValues({ ...formValues, manufacturer: event.target.value })}
                />
              </label>

              <label>
                <span>{t('firearms.fields.model')}</span>
                <input value={formValues.model} onChange={(event) => setFormValues({ ...formValues, model: event.target.value })} />
              </label>
            </div>

            <div className="two-columns">
              <label>
                <span>{t('firearms.fields.acquisitionDate')}</span>
                <input
                  type="date"
                  value={formValues.acquisitionDate}
                  onChange={(event) => setFormValues({ ...formValues, acquisitionDate: event.target.value })}
                />
              </label>

              <label>
                <span>{t('firearms.fields.initialRoundCount')}</span>
                <input
                  type="number"
                  min="0"
                  value={formValues.initialRoundCount}
                  onChange={(event) => setFormValues({ ...formValues, initialRoundCount: event.target.valueAsNumber })}
                />
              </label>
            </div>

            <label>
              <span>{t('firearms.fields.notes')}</span>
              <textarea
                rows={3}
                value={formValues.notes}
                onChange={(event) => setFormValues({ ...formValues, notes: event.target.value })}
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={formValues.archived}
                onChange={(event) => setFormValues({ ...formValues, archived: event.target.checked })}
              />
              <span>{t('firearms.fields.archived')}</span>
            </label>

            <details className="sensitive-box">
              <summary>
                <Shield size={15} />
                {t('firearms.sensitiveTitle')}
              </summary>
              <div className="sensitive-content">
                <div className="two-columns">
                  <label>
                    <span>{t('firearms.fields.serialNumber')}</span>
                    <input
                      value={formValues.serialNumber}
                      onChange={(event) => setFormValues({ ...formValues, serialNumber: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>{t('firearms.fields.acquisitionReference')}</span>
                    <input
                      value={formValues.acquisitionReference}
                      onChange={(event) => setFormValues({ ...formValues, acquisitionReference: event.target.value })}
                    />
                  </label>
                </div>
                <p className="privacy-note"><Shield size={14} />{t('firearms.sensitiveHelp')}</p>
              </div>
            </details>

            <div className="form-actions">
              <button className="button" type="submit">
                <Save size={16} />
                {editingId ? t('actions.save') : t('actions.create')}
              </button>
            </div>
          </form>
        ) : null}

        <div className="list-panel-clean">
          {!firearms ? <p className="muted">{t('common.loading')}</p> : null}
          {firearms?.length === 0 ? (
            <div className="empty-state-card">
              <Target size={42} strokeWidth={1.4} />
              <h3>{t('firearms.emptyTitle')}</h3>
              <p>{t('firearms.empty')}</p>
              {!showForm ? (
                <button className="button" type="button" onClick={startCreate}>
                  <Plus size={16} />
                  {t('firearms.new')}
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="record-list">
            {firearms?.map((firearm) => (
              <article className={firearm.archived ? 'record-card record-card-muted' : 'record-card'} key={firearm.id}>
                <div className="record-icon">
                  <Target size={18} />
                </div>
                <div className="record-content">
                  <div className="record-title-row">
                    <h4>{firearm.nickname}</h4>
                    {firearm.archived ? <span className="badge badge-muted">{t('firearms.archived')}</span> : null}
                  </div>
                  <p>
                    {[firearm.manufacturer, firearm.model, firearm.caliber].filter(Boolean).join(' · ') ||
                      t(`firearms.types.${firearm.type}`)}
                  </p>
                  <p className="muted">{t('firearms.roundCount', { count: firearm.initialRoundCount })}</p>
                  <span className="badge">{t(`firearms.types.${firearm.type}`)}</span>
                </div>
                <div className="record-actions">
                  <button className="icon-button" type="button" onClick={() => startEdit(firearm)} aria-label={t('actions.edit')}>
                    <Edit3 size={15} />
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    onClick={() => setDeleteTarget(firearm)}
                    aria-label={t('actions.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setDeleteTarget(null)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-firearm-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-title-row">
              <h3 id="delete-firearm-title">{t('firearms.deleteTitle')}</h3>
              <button className="icon-button" type="button" aria-label={t('actions.close')} onClick={() => setDeleteTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <p>{t('firearms.deleteConfirm', { name: deleteTarget.nickname })}</p>
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={() => setDeleteTarget(null)}>
                {t('actions.cancel')}
              </button>
              <button className="button button-danger" type="button" onClick={() => void handleDelete()}>
                {t('actions.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
