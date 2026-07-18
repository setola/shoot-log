import {
	Download,
	Edit3,
	FileUp,
	Info,
	Plus,
	Save,
	Shield,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useState, type DragEvent, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../db/schema";
import {
	DEFAULT_SETTINGS_ID,
	normalizeIdentifiers,
	parseIdentifierText,
	updateOwnerPractiscoreIdentifiers,
} from "../domain/settings/settingsRepository";
import {
	createEmptyRegularCompetitorForm,
	deleteRegularCompetitor,
	regularCompetitorToFormValues,
	saveRegularCompetitor,
	type RegularCompetitor,
	type RegularCompetitorFormValues,
} from "../domain/settings/regularCompetitors";

interface SettingsPanelProps {
	driveSyncContent: ReactNode;
	onExportData: () => void;
	onImportData: (file: File) => void;
	onClearData: () => Promise<void>;
}

export function SettingsPanel({
	driveSyncContent,
	onExportData,
	onImportData,
	onClearData,
}: SettingsPanelProps) {
	const { t } = useTranslation();
	const appSettings = useLiveQuery(
		() => db.appSettings.get(DEFAULT_SETTINGS_ID),
		[],
	);
	const regularCompetitors = useLiveQuery(
		() => db.regularCompetitors.orderBy("displayName").toArray(),
		[],
	);
	const [confirmClearOpen, setConfirmClearOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [importFile, setImportFile] = useState<File | null>(null);

	async function handleClearData() {
		await onClearData();
		setConfirmClearOpen(false);
	}

	function handleImportDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		const file = event.dataTransfer.files[0];
		if (file) setImportFile(file);
	}

	function handleImportConfirm() {
		if (!importFile) return;
		onImportData(importFile);
		setImportFile(null);
		setImportOpen(false);
	}

	function closeImportDialog() {
		setImportFile(null);
		setImportOpen(false);
	}

	return (
		<section className="screen-stack" aria-labelledby="settings-title">
			<div className="section-heading figma-heading">
				<div>
					<h2 id="settings-title">{t("settingsPage.title")}</h2>
					<p>{t("settingsPage.description")}</p>
				</div>
			</div>

			<article className="settings-card">
				<div>
					<h3>{t("settingsPage.owner.title")}</h3>
					<p className="muted settings-card-description">
						{t("settingsPage.owner.description")}
					</p>
				</div>
				<OwnerIdentifiersEditor
					key={appSettings?.updatedAt ?? "empty-owner-identifiers"}
					identifiers={appSettings?.ownerPractiscoreIdentifiers ?? []}
				/>
			</article>

			<article className="settings-card">
				<div>
					<h3>{t("settingsPage.regularCompetitors.title")}</h3>
					<p className="muted settings-card-description">
						{t("settingsPage.regularCompetitors.description")}
					</p>
				</div>
				<RegularCompetitorsEditor competitors={regularCompetitors ?? []} />
			</article>

			<article className="settings-card">
				<h3>{t("sync.title")}</h3>
				<p className="muted settings-card-description">
					{t("sync.description")}
				</p>
				<PrivacyNotice>{t("sync.privacyDescription")}</PrivacyNotice>
				{driveSyncContent}
			</article>

			<article className="settings-card">
				<h3>{t("settingsPage.data.title")}</h3>
				<div className="data-actions">
					<SettingsAction
						icon={<Download size={17} />}
						title={t("settingsPage.data.exportTitle")}
						description={t("settingsPage.data.exportDescription")}
						buttonLabel={t("settingsPage.data.exportButton")}
						onClick={onExportData}
					/>
					<SettingsAction
						icon={<Upload size={17} />}
						title={t("settingsPage.data.importTitle")}
						description={t("settingsPage.data.importDescription")}
						buttonLabel={t("settingsPage.data.importButton")}
						onClick={() => setImportOpen(true)}
					/>
					<SettingsAction
						danger
						icon={<Trash2 size={17} />}
						title={t("settingsPage.data.clearTitle")}
						description={t("settingsPage.data.clearDescription")}
						buttonLabel={t("settingsPage.data.clearButton")}
						onClick={() => setConfirmClearOpen(true)}
					/>
				</div>
			</article>

			<article className="settings-card">
				<h3>{t("settingsPage.about.title")}</h3>
				<div className="about-row">
					<span className="settings-action-icon">
						<Info size={17} />
					</span>
					<div>
						<p>{t("settingsPage.about.description")}</p>
						<div className="settings-group settings-group-compact about-privacy-notes">
							<PrivacyNotice>
								{t("settingsPage.privacy.localOnly")}
							</PrivacyNotice>
							<PrivacyNotice>
								{t("settingsPage.privacy.sensitive")}
							</PrivacyNotice>
						</div>
						<span>{t("settingsPage.about.version")}</span>
					</div>
				</div>
			</article>

			{importOpen ? (
				<div
					className="dialog-backdrop"
					role="presentation"
					onMouseDown={closeImportDialog}
				>
					<div
						className="panel form-grid import-dialog"
						role="dialog"
						aria-modal="true"
						aria-labelledby="import-data-title"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="form-title-row import-dialog-heading">
							<div>
								<h3 id="import-data-title">
									{t("settingsPage.data.importTitle")}
								</h3>
								<p className="muted import-dialog-intro">
									{t("settingsPage.data.importDescription")}
								</p>
							</div>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={closeImportDialog}
							>
								<X size={16} />
							</button>
						</div>
						<label
							className="import-drop-zone"
							onDragOver={(event) => event.preventDefault()}
							onDrop={handleImportDrop}
						>
							<FileUp size={28} />
							<strong>{t("settingsPage.data.importDropTitle")}</strong>
							<span>{t("settingsPage.data.importDropHint")}</span>
							<input
								type="file"
								accept="application/json,.json"
								onChange={(event) =>
									setImportFile(event.target.files?.[0] ?? null)
								}
							/>
						</label>
						{importFile ? (
							<p className="muted">
								{t("settingsPage.data.selectedFile", {
									fileName: importFile.name,
								})}
							</p>
						) : null}
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={closeImportDialog}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button"
								type="button"
								disabled={!importFile}
								onClick={handleImportConfirm}
							>
								<Upload size={16} />
								{t("settingsPage.data.importButton")}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{confirmClearOpen ? (
				<div
					className="dialog-backdrop"
					role="presentation"
					onMouseDown={() => setConfirmClearOpen(false)}
				>
					<div
						className="dialog"
						role="dialog"
						aria-modal="true"
						aria-labelledby="clear-data-title"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="dialog-title-row">
							<h3 id="clear-data-title">
								{t("settingsPage.clearDialog.title")}
							</h3>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={() => setConfirmClearOpen(false)}
							>
								×
							</button>
						</div>
						<p>{t("settingsPage.clearDialog.description")}</p>
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={() => setConfirmClearOpen(false)}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button button-danger"
								type="button"
								onClick={() => void handleClearData()}
							>
								{t("settingsPage.clearDialog.confirm")}
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
	const [draft, setDraft] = useState("");

	async function updateItems(nextItems: string[]) {
		const normalizedItems = normalizeIdentifiers(nextItems);
		setItems(normalizedItems);
		await updateOwnerPractiscoreIdentifiers(normalizedItems);
	}

	async function addDraft() {
		const newItems = parseIdentifierText(draft);
		if (normalizeIdentifiers(newItems).length === 0) return;
		setDraft("");
		await updateItems([...items, ...newItems]);
	}

	return (
		<div className="settings-group settings-group-compact">
			<div
				className="owner-pill-list"
				aria-label={t("settingsPage.owner.identifiersLabel")}
			>
				{items.length ? (
					items.map((item) => (
						<span className="owner-pill" key={item}>
							{item}
							<button
								type="button"
								aria-label={t("settingsPage.owner.removeIdentifier", {
									identifier: item,
								})}
								onClick={() =>
									void updateItems(
										items.filter((candidate) => candidate !== item),
									)
								}
							>
								<X size={13} />
							</button>
						</span>
					))
				) : (
					<span className="muted">{t("settingsPage.owner.empty")}</span>
				)}
			</div>
			<label>
				<div className="owner-add-row">
					<input
						aria-label={t("settingsPage.owner.addLabel")}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								void addDraft();
							}
						}}
						placeholder={t("settingsPage.owner.identifiersPlaceholder")}
					/>
					<button
						className="button button-secondary"
						type="button"
						onClick={() => void addDraft()}
					>
						<Plus size={15} />
						{t("settingsPage.owner.addButton")}
					</button>
				</div>
			</label>
		</div>
	);
}

function RegularCompetitorsEditor({
	competitors,
}: {
	competitors: RegularCompetitor[];
}) {
	const { t } = useTranslation();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [form, setForm] = useState<RegularCompetitorFormValues>(
		createEmptyRegularCompetitorForm,
	);

	function startCreate() {
		setEditingId(null);
		setForm(createEmptyRegularCompetitorForm());
		setFormOpen(true);
	}

	function closeForm() {
		setEditingId(null);
		setForm(createEmptyRegularCompetitorForm());
		setFormOpen(false);
	}

	function startEdit(competitor: RegularCompetitor) {
		setEditingId(competitor.id);
		setForm(regularCompetitorToFormValues(competitor));
		setFormOpen(true);
	}

	async function save() {
		if (!form.displayName.trim()) return;
		await saveRegularCompetitor(form, editingId ?? undefined);
		closeForm();
	}

	return (
		<div className="settings-group settings-group-compact">
			<div className="form-actions form-actions-end">
				<button className="button" type="button" onClick={startCreate}>
					<Plus size={16} />
					{t("settingsPage.regularCompetitors.addButton")}
				</button>
			</div>
			{competitors.length ? (
				<div className="record-list">
					{competitors.map((competitor) => (
						<article className="record-card compact-card" key={competitor.id}>
							<div className="record-content">
								<h4>{competitor.displayName}</h4>
								<p>{competitor.identifiers.join(" · ")}</p>
								{competitor.notes ? <p>{competitor.notes}</p> : null}
							</div>
							<div className="record-actions">
								<button
									className="icon-button"
									type="button"
									onClick={() => startEdit(competitor)}
									aria-label={t("actions.edit")}
								>
									<Edit3 size={15} />
								</button>
								<button
									className="icon-button danger"
									type="button"
									onClick={() => void deleteRegularCompetitor(competitor.id)}
									aria-label={t("actions.delete")}
								>
									<Trash2 size={15} />
								</button>
							</div>
						</article>
					))}
				</div>
			) : (
				<p className="muted">{t("settingsPage.regularCompetitors.empty")}</p>
			)}
			{formOpen ? (
				<div
					className="dialog-backdrop"
					role="presentation"
					onMouseDown={closeForm}
				>
					<div
						className="panel form-grid entity-form-dialog"
						role="dialog"
						aria-modal="true"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="form-title-row">
							<h3>
								{editingId
									? t("settingsPage.regularCompetitors.editTitle")
									: t("settingsPage.regularCompetitors.createTitle")}
							</h3>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={closeForm}
							>
								<X size={16} />
							</button>
						</div>
						<label>
							<span>{t("settingsPage.regularCompetitors.name")}</span>
							<input
								value={form.displayName}
								onChange={(event) =>
									setForm({ ...form, displayName: event.target.value })
								}
								placeholder={t(
									"settingsPage.regularCompetitors.namePlaceholder",
								)}
							/>
						</label>
						<label>
							<span>{t("settingsPage.regularCompetitors.identifiers")}</span>
							<textarea
								rows={3}
								value={form.identifiersText}
								onChange={(event) =>
									setForm({ ...form, identifiersText: event.target.value })
								}
								placeholder={t(
									"settingsPage.regularCompetitors.identifiersPlaceholder",
								)}
							/>
						</label>
						<label>
							<span>{t("settingsPage.regularCompetitors.notes")}</span>
							<textarea
								rows={2}
								value={form.notes}
								onChange={(event) =>
									setForm({ ...form, notes: event.target.value })
								}
							/>
						</label>
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={closeForm}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button"
								type="button"
								onClick={() => void save()}
							>
								<Save size={16} />
								{t("actions.save")}
							</button>
						</div>
					</div>
				</div>
			) : null}
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

function SettingsAction({
	icon,
	title,
	description,
	buttonLabel,
	danger,
	onClick,
}: SettingsActionProps) {
	return (
		<div
			className={
				danger ? "settings-action settings-action-danger" : "settings-action"
			}
		>
			<div className="settings-action-copy">
				<span className="settings-action-icon">{icon}</span>
				<div>
					<p>{title}</p>
					<span>{description}</span>
				</div>
			</div>
			<button
				className={danger ? "button button-danger" : "button button-secondary"}
				type="button"
				onClick={onClick}
			>
				{buttonLabel}
			</button>
		</div>
	);
}
