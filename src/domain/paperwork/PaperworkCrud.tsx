import { FormEvent, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import {
	Download,
	FileText,
	Paperclip,
	Plus,
	Save,
	Shield,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import {
	EntityAddButton,
	EntityPage,
	RecordActionButtons,
} from "../../components/EntityUi";
import { db } from "../../db/schema";
import type { PaperworkAttachment } from "./attachmentTypes";
import type { PaperworkCredential } from "./types";
import {
	addPaperworkAttachment,
	createEmptyPaperworkForm,
	createPaperworkCredential,
	deletePaperworkAttachment,
	deletePaperworkCredential,
	paperworkToFormValues,
	type PaperworkCredentialType,
	type PaperworkFormValues,
	updatePaperworkCredential,
} from "./paperworkRepository";

const paperworkTypes: PaperworkCredentialType[] = [
	"license",
	"permit",
	"clubMembership",
	"medicalCertificate",
	"matchDocument",
	"other",
];

export function PaperworkCrud() {
	const { t } = useTranslation();
	const records = useLiveQuery(
		() => db.paperworkCredentials.orderBy("title").toArray(),
		[],
	);
	const attachments = useLiveQuery(() => db.paperworkAttachments.toArray(), []);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<PaperworkCredential | null>(
		null,
	);
	const [showForm, setShowForm] = useState(false);
	const [formValues, setFormValues] = useState<PaperworkFormValues>(
		createEmptyPaperworkForm,
	);

	const editingRecord = useMemo(
		() => records?.find((record) => record.id === editingId),
		[editingId, records],
	);

	function startCreate() {
		setEditingId(null);
		setFormValues(createEmptyPaperworkForm());
		setShowForm(true);
	}

	function resetForm() {
		setEditingId(null);
		setFormValues(createEmptyPaperworkForm());
		setShowForm(false);
	}

	function startEdit(record: PaperworkCredential) {
		setEditingId(record.id);
		setFormValues(paperworkToFormValues(record));
		setShowForm(true);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!formValues.title.trim()) {
			return;
		}

		if (editingId) {
			await updatePaperworkCredential(editingId, formValues);
		} else {
			await createPaperworkCredential(formValues);
		}

		resetForm();
	}

	async function handleUpload(recordId: string, file: File) {
		await addPaperworkAttachment(recordId, file);
	}

	function handleDownload(attachmentId: string) {
		const attachment = attachments?.find((item) => item.id === attachmentId);
		if (!attachment) {
			return;
		}

		const url = URL.createObjectURL(attachment.content);
		const link = document.createElement("a");
		link.href = url;
		link.download = attachment.fileName;
		link.click();
		URL.revokeObjectURL(url);
	}

	async function handleDeleteAttachment(
		recordId: string,
		attachmentId: string,
	) {
		await deletePaperworkAttachment(recordId, attachmentId);
	}

	async function handleDelete() {
		if (!deleteTarget) {
			return;
		}

		await deletePaperworkCredential(deleteTarget.id);
		if (editingId === deleteTarget.id) {
			resetForm();
		}
		setDeleteTarget(null);
	}

	return (
		<EntityPage
			title={t("paperwork.title")}
			titleId="paperwork-title"
			description={t("paperwork.description")}
			actions={
				!showForm ? (
					<EntityAddButton onClick={startCreate}>
						{t("paperwork.new")}
					</EntityAddButton>
				) : null
			}
		>
			<div className="crud-layout crud-layout-list-only">
				{showForm ? (
					<div
						className="dialog-backdrop"
						role="presentation"
						onMouseDown={resetForm}
					>
						<form
							className="panel form-grid entity-form-dialog"
							role="dialog"
							aria-modal="true"
							onMouseDown={(event) => event.stopPropagation()}
							onSubmit={handleSubmit}
						>
							<div className="form-title-row">
								<h3>
									{editingRecord
										? t("paperwork.editTitle")
										: t("paperwork.createTitle")}
								</h3>
								<button
									className="icon-button"
									type="button"
									aria-label={t("actions.close")}
									onClick={resetForm}
								>
									<X size={16} />
								</button>
							</div>

							<label>
								<span>{t("paperwork.fields.title")} *</span>
								<input
									required
									value={formValues.title}
									onChange={(event) =>
										setFormValues({ ...formValues, title: event.target.value })
									}
									placeholder={t("paperwork.placeholders.title")}
								/>
							</label>

							<div className="two-columns">
								<label>
									<span>{t("paperwork.fields.type")}</span>
									<select
										value={formValues.type}
										onChange={(event) =>
											setFormValues({
												...formValues,
												type: event.target.value as PaperworkCredentialType,
											})
										}
									>
										{paperworkTypes.map((type) => (
											<option key={type} value={type}>
												{t(`paperwork.types.${type}`)}
											</option>
										))}
									</select>
								</label>

								<label>
									<span>{t("paperwork.fields.issuingAuthority")}</span>
									<input
										value={formValues.issuingAuthority}
										onChange={(event) =>
											setFormValues({
												...formValues,
												issuingAuthority: event.target.value,
											})
										}
										placeholder={t("paperwork.placeholders.issuingAuthority")}
									/>
								</label>
							</div>

							<div className="two-columns">
								<label>
									<span>{t("paperwork.fields.validFrom")}</span>
									<input
										type="date"
										value={formValues.validFrom}
										onChange={(event) =>
											setFormValues({
												...formValues,
												validFrom: event.target.value,
											})
										}
									/>
								</label>

								<label>
									<span>{t("paperwork.fields.validUntil")}</span>
									<input
										type="date"
										value={formValues.validUntil}
										onChange={(event) =>
											setFormValues({
												...formValues,
												validUntil: event.target.value,
											})
										}
									/>
								</label>
							</div>

							<div className="two-columns">
								<label>
									<span>{t("paperwork.fields.reminderDate")}</span>
									<input
										type="date"
										value={formValues.reminderDate}
										onChange={(event) =>
											setFormValues({
												...formValues,
												reminderDate: event.target.value,
											})
										}
									/>
								</label>

								<label>
									<span>{t("paperwork.fields.referenceNumber")}</span>
									<input
										value={formValues.referenceNumber}
										onChange={(event) =>
											setFormValues({
												...formValues,
												referenceNumber: event.target.value,
											})
										}
										placeholder={t("paperwork.placeholders.referenceNumber")}
									/>
								</label>
							</div>

							<label>
								<span>{t("paperwork.fields.notes")}</span>
								<textarea
									rows={3}
									value={formValues.notes}
									onChange={(event) =>
										setFormValues({ ...formValues, notes: event.target.value })
									}
								/>
							</label>

							{editingId ? (
								<div className="attachment-hint">
									<Paperclip size={15} />
									<span>{t("paperwork.attachments.editHint")}</span>
								</div>
							) : null}

							<p className="privacy-note">
								<Shield size={14} />
								{t("paperwork.privacyNote")}
							</p>

							<div className="dialog-actions">
								<button
									className="button button-secondary"
									type="button"
									onClick={resetForm}
								>
									{t("actions.cancel")}
								</button>
								<button className="button" type="submit">
									<Save size={16} />
									{editingId ? t("actions.save") : t("paperwork.createAction")}
								</button>
							</div>
						</form>
					</div>
				) : null}

				<div className="list-panel-clean">
					{!records ? <p className="muted">{t("common.loading")}</p> : null}
					{records?.length === 0 ? (
						<div className="empty-state-card">
							<FileText size={42} strokeWidth={1.4} />
							<h3>{t("paperwork.emptyTitle")}</h3>
							<p>{t("paperwork.empty")}</p>
							{!showForm ? (
								<button className="button" type="button" onClick={startCreate}>
									<Plus size={16} />
									{t("paperwork.new")}
								</button>
							) : null}
						</div>
					) : null}

					<div className="record-list">
						{records?.map((record) => (
							<article className="record-card" key={record.id}>
								<div className="record-icon">
									<FileText size={18} />
								</div>
								<div className="record-content">
									<div className="record-title-row">
										<h4>{record.title}</h4>
										<ExpiryBadge validUntil={record.validUntil} />
									</div>
									<p>
										{[
											record.issuingAuthority,
											t(`paperwork.types.${record.type}`),
										]
											.filter(Boolean)
											.join(" · ")}
									</p>
									{record.validUntil ? (
										<p className="muted">
											{t("paperwork.expires", {
												date: formatDate(record.validUntil),
											})}
										</p>
									) : null}
									{record.referenceNumber ? (
										<p className="muted">
											{t("paperwork.reference", {
												reference: record.referenceNumber,
											})}
										</p>
									) : null}
									<AttachmentList
										record={record}
										attachments={
											attachments?.filter(
												(attachment) => attachment.credentialId === record.id,
											) ?? []
										}
										onUpload={(file) => void handleUpload(record.id, file)}
										onDownload={handleDownload}
										onDelete={(attachmentId) =>
											void handleDeleteAttachment(record.id, attachmentId)
										}
									/>
								</div>
								<RecordActionButtons
									editLabel={t("actions.edit")}
									deleteLabel={t("actions.delete")}
									onEdit={() => startEdit(record)}
									onDelete={() => setDeleteTarget(record)}
								/>
							</article>
						))}
					</div>
				</div>
			</div>

			{deleteTarget ? (
				<div
					className="dialog-backdrop"
					role="presentation"
					onMouseDown={() => setDeleteTarget(null)}
				>
					<div
						className="dialog"
						role="dialog"
						aria-modal="true"
						aria-labelledby="delete-paperwork-title"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="dialog-title-row">
							<h3 id="delete-paperwork-title">{t("paperwork.deleteTitle")}</h3>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={() => setDeleteTarget(null)}
							>
								<X size={16} />
							</button>
						</div>
						<p>{t("paperwork.deleteConfirm", { name: deleteTarget.title })}</p>
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={() => setDeleteTarget(null)}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button button-danger"
								type="button"
								onClick={() => void handleDelete()}
							>
								{t("actions.delete")}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</EntityPage>
	);
}

interface AttachmentListProps {
	record: PaperworkCredential;
	attachments: PaperworkAttachment[];
	onUpload: (file: File) => void;
	onDownload: (attachmentId: string) => void;
	onDelete: (attachmentId: string) => void;
}

function AttachmentList({
	record,
	attachments,
	onUpload,
	onDownload,
	onDelete,
}: AttachmentListProps) {
	const { t } = useTranslation();

	return (
		<div
			className="attachment-list"
			aria-label={t("paperwork.attachments.label")}
		>
			{attachments.map((attachment) => (
				<div className="attachment-row" key={attachment.id}>
					<div>
						<span>{attachment.fileName}</span>
						<small>{formatFileSize(attachment.size)}</small>
					</div>
					<button
						className="icon-button"
						type="button"
						onClick={() => onDownload(attachment.id)}
						aria-label={t("paperwork.attachments.download")}
					>
						<Download size={14} />
					</button>
					<button
						className="icon-button danger"
						type="button"
						onClick={() => onDelete(attachment.id)}
						aria-label={t("paperwork.attachments.delete")}
					>
						<Trash2 size={14} />
					</button>
				</div>
			))}
			<label
				className="attachment-drop-zone"
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => {
					event.preventDefault();
					const file = event.dataTransfer.files[0];
					if (file) onUpload(file);
				}}
			>
				<Upload size={14} />
				<span>
					{record.attachmentIds?.length
						? t("paperwork.attachments.addAnother")
						: t("paperwork.attachments.add")}
				</span>
				<small>{t("paperwork.attachments.dropHint")}</small>
				<input
					type="file"
					accept="application/pdf,image/*"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) onUpload(file);
						event.currentTarget.value = "";
					}}
				/>
			</label>
		</div>
	);
}

function ExpiryBadge({ validUntil }: { validUntil?: string }) {
	const { t } = useTranslation();
	const days = daysUntil(validUntil);

	if (days === null) {
		return null;
	}

	if (days < 0) {
		return (
			<span className="badge badge-destructive">
				{t("paperwork.status.expired")}
			</span>
		);
	}

	if (days <= 30) {
		return (
			<span className="badge badge-warning">
				{t("paperwork.status.expiresDays", { count: days })}
			</span>
		);
	}

	if (days <= 90) {
		return (
			<span className="badge badge-warning">
				{t("paperwork.status.expiresMonths", { count: Math.ceil(days / 30) })}
			</span>
		);
	}

	return (
		<span className="badge badge-success">{t("paperwork.status.valid")}</span>
	);
}

function daysUntil(date?: string): number | null {
	if (!date) {
		return null;
	}

	const diff = new Date(date).getTime() - Date.now();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date: string): string {
	return new Date(date).toLocaleDateString();
}

function formatFileSize(size: number): string {
	if (size < 1024 * 1024) {
		return `${Math.max(1, Math.round(size / 1024))} KB`;
	}

	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
