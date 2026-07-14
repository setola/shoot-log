import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import {
	Edit3,
	FileImage,
	FileUp,
	Save,
	Trash2,
	Trophy,
	X,
} from "lucide-react";
import { StatusMessage } from "../../components/StatusMessage";
import { db } from "../../db/schema";
import type { MatchEvent } from "./types";
import {
	createEmptyMatchForm,
	createMatchEvent,
	deleteMatchEvent,
	matchToFormValues,
	type MatchFormValues,
	updateMatchEvent,
} from "./matchRepository";
import {
	parseMare2BriefingPdf,
	type Mare2BriefingStageCandidate,
} from "./mare2BriefingParser";
import { parseMare2PdfSnapshot } from "./mare2PdfParser";
import { parsePractiscoreCabSnapshot } from "./practiscoreParser";
import { importPractiscoreSnapshot } from "./practiscoreRepository";
import type {
	PractiscoreImportRecord,
	PractiscoreMatchSnapshot,
	PractiscoreStage,
} from "./practiscoreTypes";
import { DEFAULT_SETTINGS_ID } from "../settings/settingsRepository";
import {
	normalizeImportedDiscipline,
	summarizeOwnerDivisionAndCategoryValue,
	summarizeSnapshotDivisionsAndCategoriesValue,
} from "./snapshotSummary";

const MARE2_PUBLIC_CATALOG_URL =
	"https://shooting-logbook-mare2-data.pages.dev/manifest.json";

interface Mare2PublicCatalogMatch {
	mare2MatchId: string;
	name: string;
	dateFrom?: string;
	dateTo?: string;
	badges?: string[];
	macroArea?: string;
	matchUrl: string;
	snapshotUrl: string;
	pageCount?: number;
	verifyPrintedAt?: string;
	verifyPdfUrl?: string;
}

interface Mare2PublicCatalog {
	format: string;
	schemaVersion: number;
	generatedAt: string;
	matches: Mare2PublicCatalogMatch[];
}

interface Mare2PublicMatchFile {
	pages?: Array<{
		pageNumber: number;
		url: string;
		mimeType?: string;
	}>;
	stagePageMapping?: Record<string, number>;
}

export function MatchesCrud() {
	const { t } = useTranslation();
	const matches = useLiveQuery(
		() => db.matchEvents.orderBy("date").reverse().toArray(),
		[],
	);
	const practiscoreImports = useLiveQuery(
		() => db.practiscoreMatchImports.toArray(),
		[],
	);
	const stageAssets = useLiveQuery(() => db.matchStageAssets.toArray(), []);
	const firearms = useLiveQuery(
		() => db.firearms.orderBy("nickname").toArray(),
		[],
	);
	const settings = useLiveQuery(
		() => db.appSettings.get(DEFAULT_SETTINGS_ID),
		[],
	);
	const names = useMemo(
		() => new Map((firearms ?? []).map((f) => [f.id, f.nickname])),
		[firearms],
	);
	const practiscoreByMatchId = useMemo(
		() =>
			new Map(
				(practiscoreImports ?? []).map((record) => [
					record.matchEventId,
					record,
				]),
			),
		[practiscoreImports],
	);
	const stageAssetCountByMatchId = useMemo(() => {
		const counts = new Map<string, number>();
		for (const asset of stageAssets ?? [])
			counts.set(asset.matchEventId, (counts.get(asset.matchEventId) ?? 0) + 1);
		return counts;
	}, [stageAssets]);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<MatchEvent | null>(null);
	const [form, setForm] = useState<MatchFormValues>(createEmptyMatchForm);
	const [importOverlay, setImportOverlay] = useState<
		"practiscore" | "mare2" | null
	>(null);
	const [practiscoreFile, setPractiscoreFile] = useState<File | null>(null);
	const [mare2File, setMare2File] = useState<File | null>(null);
	const [importing, setImporting] = useState(false);
	const [importMessage, setImportMessage] = useState<string | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const [publicCatalogOpen, setPublicCatalogOpen] = useState(false);
	const [publicCatalogLoading, setPublicCatalogLoading] = useState(false);
	const [publicCatalogMatches, setPublicCatalogMatches] = useState<
		Mare2PublicCatalogMatch[]
	>([]);
	const [selectedPublicMatchIds, setSelectedPublicMatchIds] = useState<
		string[]
	>([]);
	const [publicCatalogSearch, setPublicCatalogSearch] = useState("");
	const [publicCatalogImporting, setPublicCatalogImporting] = useState(false);
	const [publicCatalogError, setPublicCatalogError] = useState<string | null>(
		null,
	);
	const [briefingTarget, setBriefingTarget] = useState<{
		match: MatchEvent;
		importRecord: PractiscoreImportRecord;
	} | null>(null);
	const [briefingFile, setBriefingFile] = useState<File | null>(null);
	const [briefingCandidates, setBriefingCandidates] = useState<
		Mare2BriefingStageCandidate[]
	>([]);
	const [briefingMapping, setBriefingMapping] = useState<
		Record<string, number>
	>({});
	const [briefingConfirmedPages, setBriefingConfirmedPages] = useState<
		Record<string, number>
	>({});
	const [briefingImporting, setBriefingImporting] = useState(false);
	const [briefingError, setBriefingError] = useState<string | null>(null);
	const filteredPublicCatalogMatches = useMemo(
		() => filterPublicCatalogMatches(publicCatalogMatches, publicCatalogSearch),
		[publicCatalogMatches, publicCatalogSearch],
	);
	const selectedPublicCatalogMatchIds = selectedPublicMatchIds.filter((id) =>
		publicCatalogMatches.some((match) => match.mare2MatchId === id),
	);
	const selectedFilteredPublicCatalogMatchIds = selectedPublicMatchIds.filter(
		(id) =>
			filteredPublicCatalogMatches.some((match) => match.mare2MatchId === id),
	);

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
			setImportError(t("matches.practiscore.validation"));
			return;
		}

		try {
			setImporting(true);
			const snapshot = await parsePractiscoreCabSnapshot(file);
			const ownerIdentifiers = settings?.ownerPractiscoreIdentifiers ?? [];
			const matchEventId = await importPractiscoreSnapshot(
				snapshot,
				editingId ?? undefined,
				ownerIdentifiers,
			);
			const summary = t("matches.practiscore.importedSummary", {
				stages: snapshot.stages.length,
				competitors: snapshot.competitors.length,
				scores: snapshot.scores.length,
			});
			setImportMessage(summary);
			setPractiscoreFile(null);
			setImportOverlay(null);
			setEditingId(matchEventId);
			setForm({
				...createEmptyMatchForm(),
				name: snapshot.match.name,
				date: snapshot.match.date,
				discipline: normalizeImportedDiscipline(snapshot),
				roundsFired: String(
					snapshot.stages.reduce(
						(total, stage) => total + (stage.minRounds ?? 0),
						0,
					),
				),
				divisionOrCategory:
					summarizeOwnerDivisionAndCategoryValue(snapshot, ownerIdentifiers) ??
					summarizeSnapshotDivisionsAndCategoriesValue(snapshot) ??
					"",
				notes: `Imported from PractiScore ${snapshot.sourceFileName}`,
			});
			setShowForm(true);
		} catch (error) {
			setImportError(
				error instanceof Error
					? error.message
					: t("matches.practiscore.importError"),
			);
		} finally {
			setImporting(false);
		}
	}

	async function importMare2Pdf(file = mare2File) {
		setImportMessage(null);
		setImportError(null);

		if (!file) {
			setImportError(t("matches.mare2.validation"));
			return;
		}

		try {
			setImporting(true);
			const snapshot = await parseMare2PdfSnapshot(file);
			const ownerIdentifiers = settings?.ownerPractiscoreIdentifiers ?? [];
			const matchEventId = await saveImportedSnapshot(
				snapshot,
				ownerIdentifiers,
			);
			const summary = t("matches.mare2.importedSummary", {
				stages: snapshot.stages.length,
				competitors: snapshot.competitors.length,
				scores: snapshot.scores.length,
			});
			setImportMessage(summary);
			setMare2File(null);
			setImportOverlay(null);
			showImportedMatchForm(snapshot, ownerIdentifiers, matchEventId);
		} catch (error) {
			setImportError(
				error instanceof Error ? error.message : t("matches.mare2.importError"),
			);
		} finally {
			setImporting(false);
		}
	}

	async function saveImportedSnapshot(
		snapshot: PractiscoreMatchSnapshot,
		ownerIdentifiers: string[],
	): Promise<string> {
		return importPractiscoreSnapshot(
			snapshot,
			editingId ?? undefined,
			ownerIdentifiers,
		);
	}

	function showImportedMatchForm(
		snapshot: PractiscoreMatchSnapshot,
		ownerIdentifiers: string[],
		matchEventId: string,
	) {
		setEditingId(matchEventId);
		setForm({
			...createEmptyMatchForm(),
			name: snapshot.match.name,
			date: snapshot.match.date,
			discipline: normalizeImportedDiscipline(snapshot),
			roundsFired: String(
				snapshot.stages.reduce(
					(total, stage) => total + (stage.minRounds ?? 0),
					0,
				),
			),
			divisionOrCategory:
				summarizeOwnerDivisionAndCategoryValue(snapshot, ownerIdentifiers) ??
				summarizeSnapshotDivisionsAndCategoriesValue(snapshot) ??
				"",
			notes: `Imported from Mare2 ${snapshot.sourceFileName}`,
		});
		setShowForm(true);
	}

	async function openPublicCatalog() {
		setImportMessage(null);
		setPublicCatalogError(null);
		setPublicCatalogOpen(true);
		if (publicCatalogMatches.length > 0) return;

		try {
			setPublicCatalogLoading(true);
			const catalog = await fetchJson<Mare2PublicCatalog>(
				MARE2_PUBLIC_CATALOG_URL,
			);
			setPublicCatalogMatches(catalog.matches);
			setSelectedPublicMatchIds([]);
		} catch (error) {
			setPublicCatalogError(
				error instanceof Error
					? error.message
					: t("matches.publicCatalog.loadError"),
			);
		} finally {
			setPublicCatalogLoading(false);
		}
	}

	function closePublicCatalog() {
		setPublicCatalogOpen(false);
		setPublicCatalogError(null);
	}

	function togglePublicCatalogMatch(matchId: string) {
		setSelectedPublicMatchIds((current) =>
			current.includes(matchId)
				? current.filter((id) => id !== matchId)
				: [...current, matchId],
		);
	}

	function selectAllFilteredPublicCatalogMatches() {
		setSelectedPublicMatchIds((current) => [
			...new Set([
				...current,
				...filteredPublicCatalogMatches.map((match) => match.mare2MatchId),
			]),
		]);
	}

	function clearFilteredPublicCatalogMatches() {
		const filteredIds = new Set(
			filteredPublicCatalogMatches.map((match) => match.mare2MatchId),
		);
		setSelectedPublicMatchIds((current) =>
			current.filter((id) => !filteredIds.has(id)),
		);
	}

	async function importSelectedPublicMatches() {
		const catalogMatches = selectedPublicCatalogMatchIds.flatMap((matchId) => {
			const match = publicCatalogMatches.find(
				(candidate) => candidate.mare2MatchId === matchId,
			);
			return match ? [match] : [];
		});
		if (catalogMatches.length === 0) return;

		setPublicCatalogError(null);
		setPublicCatalogImporting(true);
		try {
			const ownerIdentifiers = settings?.ownerPractiscoreIdentifiers ?? [];
			let lastImported:
				| { snapshot: PractiscoreMatchSnapshot; matchEventId: string }
				| undefined;

			for (const catalogMatch of catalogMatches) {
				lastImported = await importPublicCatalogMatch(
					catalogMatch,
					ownerIdentifiers,
				);
			}

			setImportMessage(
				t("matches.publicCatalog.bulkImportedSummary", {
					count: catalogMatches.length,
				}),
			);
			closePublicCatalog();
			if (catalogMatches.length === 1 && lastImported) {
				showImportedMatchForm(
					lastImported.snapshot,
					ownerIdentifiers,
					lastImported.matchEventId,
				);
			}
		} catch (error) {
			setPublicCatalogError(
				error instanceof Error
					? error.message
					: t("matches.publicCatalog.importError"),
			);
		} finally {
			setPublicCatalogImporting(false);
		}
	}

	async function importPublicCatalogMatch(
		catalogMatch: Mare2PublicCatalogMatch,
		ownerIdentifiers: string[],
	): Promise<{ snapshot: PractiscoreMatchSnapshot; matchEventId: string }> {
		const matchUrl = new URL(
			catalogMatch.matchUrl,
			MARE2_PUBLIC_CATALOG_URL,
		).toString();
		const snapshotUrl = new URL(
			catalogMatch.snapshotUrl,
			MARE2_PUBLIC_CATALOG_URL,
		).toString();
		const [matchFile, snapshot] = await Promise.all([
			fetchJson<Mare2PublicMatchFile>(matchUrl),
			fetchJson<PractiscoreMatchSnapshot>(snapshotUrl),
		]);
		const matchEventId = await importPractiscoreSnapshot(
			snapshot,
			undefined,
			ownerIdentifiers,
		);
		await importPublicMatchPages(matchEventId, snapshot, matchFile, matchUrl);
		return { snapshot, matchEventId };
	}

	async function importPublicMatchPages(
		matchEventId: string,
		snapshot: PractiscoreMatchSnapshot,
		matchFile: Mare2PublicMatchFile,
		matchFileUrl: string,
	) {
		const pages = matchFile.pages ?? [];
		if (pages.length === 0) return;

		const mappedStagePages = getMappedStagePages(snapshot, matchFile, pages);
		const now = new Date().toISOString();
		const assets = await Promise.all(
			mappedStagePages.map(async ({ stage, page }) => {
				const assetUrl = new URL(page.url, matchFileUrl).toString();
				const content = await fetchBlob(assetUrl);
				return {
					id: `${matchEventId}:${stage.internalStageId}`,
					matchEventId,
					internalStageId: stage.internalStageId,
					sourceFileName: assetUrl.split("/").pop() ?? "mare2-page.webp",
					sourcePageNumber: page.pageNumber,
					minRounds: stage.minRounds,
					maxPoints: stage.maxPoints,
					mimeType: content.type || page.mimeType || "image/webp",
					size: content.size,
					content,
					createdAt: now,
					updatedAt: now,
				};
			}),
		);

		await db.transaction("rw", db.matchStageAssets, async () => {
			await db.matchStageAssets
				.where("matchEventId")
				.equals(matchEventId)
				.delete();
			await db.matchStageAssets.bulkPut(assets);
		});
	}

	function openImportOverlay(type: "practiscore" | "mare2") {
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

	function handleDrop(
		event: DragEvent<HTMLLabelElement>,
		type: "practiscore" | "mare2",
	) {
		event.preventDefault();
		const file = event.dataTransfer.files[0];
		if (!file) return;
		if (type === "practiscore") setPractiscoreFile(file);
		else setMare2File(file);
	}

	function openBriefingImport(
		match: MatchEvent,
		importRecord: PractiscoreImportRecord,
	) {
		setBriefingTarget({ match, importRecord });
		setBriefingFile(null);
		setBriefingCandidates([]);
		setBriefingMapping({});
		setBriefingConfirmedPages({});
		setBriefingError(null);
	}

	function closeBriefingImport() {
		setBriefingTarget(null);
		setBriefingFile(null);
		setBriefingCandidates([]);
		setBriefingMapping({});
		setBriefingConfirmedPages({});
		setBriefingError(null);
	}

	async function parseBriefingFile(file: File) {
		setBriefingFile(file);
		setBriefingError(null);
		setBriefingImporting(true);
		try {
			const candidates = await parseMare2BriefingPdf(file);
			setBriefingCandidates(candidates);
			setBriefingConfirmedPages({});
			setBriefingMapping(
				createBriefingMapping(
					briefingTarget?.importRecord.snapshot.stages ?? [],
					candidates,
				),
			);
		} catch (error) {
			setBriefingError(
				error instanceof Error
					? error.message
					: t("matches.briefing.importError"),
			);
		} finally {
			setBriefingImporting(false);
		}
	}

	async function saveBriefingMapping() {
		if (!briefingTarget || !briefingFile || !briefingCandidates.length) return;
		setBriefingError(null);
		setBriefingImporting(true);
		try {
			const now = new Date().toISOString();
			const assets = briefingTarget.importRecord.snapshot.stages.flatMap(
				(stage) => {
					const candidate = briefingCandidates.find(
						(item) =>
							item.pageNumber === briefingMapping[stage.internalStageId],
					);
					if (!candidate) return [];
					return [
						{
							id: `${briefingTarget.match.id}:${stage.internalStageId}`,
							matchEventId: briefingTarget.match.id,
							internalStageId: stage.internalStageId,
							sourceFileName: briefingFile.name,
							sourcePageNumber: candidate.pageNumber,
							courseType: candidate.courseType,
							minRounds: candidate.minRounds,
							maxPoints: candidate.maxPoints,
							mimeType: candidate.imageBlob.type || "image/png",
							size: candidate.imageBlob.size,
							content: candidate.imageBlob,
							createdAt: now,
							updatedAt: now,
						},
					];
				},
			);

			await db.transaction("rw", db.matchStageAssets, async () => {
				await db.matchStageAssets
					.where("matchEventId")
					.equals(briefingTarget.match.id)
					.delete();
				await db.matchStageAssets.bulkPut(assets);
			});
			downloadBriefingOverrideFile(
				briefingTarget.match,
				briefingTarget.importRecord,
				briefingMapping,
			);
			setImportMessage(
				t("matches.briefing.importedSummary", { count: assets.length }),
			);
			closeBriefingImport();
		} catch (error) {
			setBriefingError(
				error instanceof Error
					? error.message
					: t("matches.briefing.importError"),
			);
		} finally {
			setBriefingImporting(false);
		}
	}

	function handleBriefingDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		const file = event.dataTransfer.files[0];
		if (file) void parseBriefingFile(file);
	}

	function selectBriefingCandidate(stageId: string, pageNumber: number) {
		setBriefingMapping((current) => ({ ...current, [stageId]: pageNumber }));
	}

	function confirmBriefingCandidate(stage: PractiscoreStage) {
		const confirmedPage = briefingMapping[stage.internalStageId];
		if (!confirmedPage || !briefingTarget) return;

		setBriefingConfirmedPages((currentConfirmed) => {
			const nextConfirmed = {
				...currentConfirmed,
				[stage.internalStageId]: confirmedPage,
			};
			setBriefingMapping((currentMapping) =>
				autoSelectOnlyRemainingBriefingCandidates(
					briefingTarget.importRecord.snapshot.stages,
					briefingCandidates,
					currentMapping,
					nextConfirmed,
				),
			);
			return nextConfirmed;
		});
	}

	return (
		<section className="screen-stack">
			<div className="section-heading figma-heading">
				<div>
					<h2>{t("matches.title")}</h2>
					<p>{t("matches.description")}</p>
				</div>
				<div className="panel import-card">
					<span>{t("matches.import.fromLabel")}</span>
					<div className="import-action-row">
						<button
							className="button button-secondary import-button-practiscore"
							type="button"
							onClick={() => openImportOverlay("practiscore")}
						>
							<FileUp size={16} />
							PractiScore
						</button>
						<button
							className="button button-secondary import-button-mare2"
							type="button"
							onClick={() => openImportOverlay("mare2")}
						>
							<FileUp size={16} />
							Mare2 PDF
						</button>
						<button
							className="button"
							type="button"
							onClick={() => void openPublicCatalog()}
						>
							<FileImage size={16} />
							{t("matches.publicCatalog.action")}
						</button>
					</div>
				</div>
			</div>

			{importMessage && (
				<StatusMessage tone="success" onDismiss={() => setImportMessage(null)}>
					{importMessage}
				</StatusMessage>
			)}
			{importError && !importOverlay && (
				<StatusMessage tone="error" onDismiss={() => setImportError(null)}>
					{importError}
				</StatusMessage>
			)}

			<div className="crud-layout crud-layout-list-only">
				<div className="list-panel-clean">
					<div className="list-title-row">
						<div>
							<h3>{t("matches.listTitle")}</h3>
							<p className="muted">
								{t("matches.listCount", { count: matches?.length ?? 0 })}
							</p>
						</div>
					</div>
					{matches?.length === 0 && (
						<div className="empty-state-card">
							<Trophy size={42} strokeWidth={1.4} />
							<h3>{t("matches.emptyTitle")}</h3>
							<p>{t("matches.empty")}</p>
							<div className="panel import-card">
								<span>{t("matches.import.fromLabel")}</span>
								<div className="import-action-row">
									<button
										className="button button-secondary import-button-practiscore"
										type="button"
										onClick={() => openImportOverlay("practiscore")}
									>
										<FileUp size={16} />
										PractiScore
									</button>
									<button
										className="button button-secondary import-button-mare2"
										type="button"
										onClick={() => openImportOverlay("mare2")}
									>
										<FileUp size={16} />
										Mare2 PDF
									</button>
									<button
										className="button"
										type="button"
										onClick={() => void openPublicCatalog()}
									>
										<FileImage size={16} />
										{t("matches.publicCatalog.action")}
									</button>
								</div>
							</div>
						</div>
					)}
					<div className="record-list">
						{matches?.map((match) => {
							const practiscoreImport = practiscoreByMatchId.get(match.id);
							const importSource = practiscoreImport
								? importSourceLabel(practiscoreImport.practiscoreMatchId)
								: undefined;
							const importSourceClass = practiscoreImport
								? importSourceClassName(practiscoreImport.practiscoreMatchId)
								: undefined;
							const divisionSummary =
								match.divisionOrCategory ??
								(practiscoreImport
									? (summarizeOwnerDivisionAndCategoryValue(
											practiscoreImport.snapshot,
											settings?.ownerPractiscoreIdentifiers,
										) ??
										summarizeSnapshotDivisionsAndCategoriesValue(
											practiscoreImport.snapshot,
										))
									: undefined);
							const matchMeta = [
								match.discipline,
								divisionSummary,
								practiscoreImport
									? t("matches.import.stages", {
											count: practiscoreImport.snapshot.stages.length,
										})
									: undefined,
								practiscoreImport
									? t("matches.import.competitors", {
											count: practiscoreImport.snapshot.competitors.length,
										})
									: undefined,
								stageAssetCountByMatchId.get(match.id)
									? t("matches.briefing.stageImages", {
											count: stageAssetCountByMatchId.get(match.id),
										})
									: undefined,
								importSource,
								match.firearmId ? names.get(match.firearmId) : undefined,
								match.score
									? t("matches.score", { score: match.score })
									: undefined,
							].filter(Boolean);
							return (
								<article className="record-card" key={match.id}>
									<div className="record-icon-stack">
										<div className="record-icon">
											<Trophy size={18} />
										</div>
										<span>{formatDate(match.date)}</span>
									</div>
									<div className="record-content">
										<div className="record-title-row">
											<h4>{match.name}</h4>
											{match.placement && (
												<span className="badge badge-success">
													#{match.placement}
												</span>
											)}
										</div>
										{match.clubOrRange && <p>{match.clubOrRange}</p>}
										{matchMeta.length > 0 && (
											<div className="match-meta-row">
												{matchMeta.map((item, index) =>
													item === importSource && importSourceClass ? (
														<span
															className={`import-source-pill ${importSourceClass}`}
															key={`${item}-${index}`}
														>
															{item}
														</span>
													) : (
														<span
															className={`match-meta-pill match-meta-pill-${index % 4}`}
															key={`${item}-${index}`}
														>
															{item}
														</span>
													),
												)}
											</div>
										)}
									</div>
									<div className="record-actions">
										{practiscoreImport ? (
											<button
												className="icon-button"
												onClick={() =>
													openBriefingImport(match, practiscoreImport)
												}
												aria-label={t("matches.briefing.action")}
											>
												<FileImage size={15} />
											</button>
										) : null}
										<button
											className="icon-button"
											onClick={() => edit(match)}
											aria-label={t("actions.edit")}
										>
											<Edit3 size={15} />
										</button>
										<button
											className="icon-button danger"
											onClick={() => setDeleteTarget(match)}
											aria-label={t("actions.delete")}
										>
											<Trash2 size={15} />
										</button>
									</div>
								</article>
							);
						})}
					</div>
				</div>
			</div>
			{publicCatalogOpen && (
				<div className="dialog-backdrop" onMouseDown={closePublicCatalog}>
					<div
						className="panel form-grid import-dialog"
						role="dialog"
						aria-modal="true"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="form-title-row import-dialog-heading">
							<div>
								<h3>{t("matches.publicCatalog.title")}</h3>
								<p className="muted import-dialog-intro">
									{t("matches.publicCatalog.description")}
								</p>
							</div>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={closePublicCatalog}
							>
								<X size={16} />
							</button>
						</div>
						{publicCatalogLoading ? (
							<p className="muted">{t("matches.publicCatalog.loading")}</p>
						) : publicCatalogMatches.length > 0 ? (
							<>
								<label>
									<span>{t("matches.publicCatalog.search")}</span>
									<input
										value={publicCatalogSearch}
										onChange={(event) =>
											setPublicCatalogSearch(event.target.value)
										}
										placeholder={t("matches.publicCatalog.searchPlaceholder")}
									/>
								</label>
								<p className="muted">
									{t("matches.publicCatalog.resultCount", {
										count: filteredPublicCatalogMatches.length,
										total: publicCatalogMatches.length,
									})}
								</p>
								<div className="import-action-row">
									<button
										className="button button-secondary"
										type="button"
										disabled={filteredPublicCatalogMatches.length === 0}
										onClick={selectAllFilteredPublicCatalogMatches}
									>
										{t("matches.publicCatalog.selectAllFiltered")}
									</button>
									<button
										className="button button-secondary"
										type="button"
										disabled={
											selectedFilteredPublicCatalogMatchIds.length === 0
										}
										onClick={clearFilteredPublicCatalogMatches}
									>
										{t("matches.publicCatalog.clearFiltered")}
									</button>
								</div>
								{filteredPublicCatalogMatches.length > 0 ? (
									<div className="table-scroll">
										<table className="data-table">
											<thead>
												<tr>
													<th>{t("matches.publicCatalog.selected")}</th>
													<th>{t("matches.publicCatalog.match")}</th>
													<th>{t("matches.fields.date")}</th>
												</tr>
											</thead>
											<tbody>
												{filteredPublicCatalogMatches.map((match) => (
													<tr key={match.mare2MatchId}>
														<td>
															<input
																type="checkbox"
																checked={selectedPublicMatchIds.includes(
																	match.mare2MatchId,
																)}
																onChange={() =>
																	togglePublicCatalogMatch(match.mare2MatchId)
																}
																aria-label={t(
																	"matches.publicCatalog.toggleMatch",
																	{
																		match: match.name,
																	},
																)}
															/>
														</td>
														<td>{match.name}</td>
														<td>{match.dateFrom ?? "—"}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<p className="muted">
										{t("matches.publicCatalog.noSearchResults")}
									</p>
								)}
							</>
						) : (
							<p className="muted">{t("matches.publicCatalog.empty")}</p>
						)}
						{publicCatalogError ? (
							<StatusMessage
								tone="error"
								onDismiss={() => setPublicCatalogError(null)}
							>
								{publicCatalogError}
							</StatusMessage>
						) : null}
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={closePublicCatalog}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button"
								type="button"
								disabled={
									publicCatalogLoading ||
									publicCatalogImporting ||
									selectedPublicCatalogMatchIds.length === 0
								}
								onClick={() => void importSelectedPublicMatches()}
							>
								<FileImage size={16} />
								{publicCatalogImporting
									? t("matches.publicCatalog.importing")
									: t("matches.publicCatalog.importAction", {
											count: selectedPublicCatalogMatchIds.length,
										})}
							</button>
						</div>
					</div>
				</div>
			)}
			{importOverlay && (
				<div className="dialog-backdrop" onMouseDown={closeImportOverlay}>
					<div
						className="panel form-grid import-dialog"
						role="dialog"
						aria-modal="true"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="form-title-row import-dialog-heading">
							<div>
								<h3>
									{importOverlay === "practiscore"
										? t("matches.practiscore.title")
										: t("matches.mare2.title")}
								</h3>
								<p className="muted import-dialog-intro">
									{importOverlay === "practiscore"
										? t("matches.practiscore.createHint")
										: t("matches.mare2.createHint")}
								</p>
							</div>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={closeImportOverlay}
							>
								<X size={16} />
							</button>
						</div>
						<p className="import-help import-dialog-instructions">
							{importOverlay === "practiscore"
								? t("matches.practiscore.downloadHelp")
								: t("matches.mare2.downloadHelp")}
						</p>
						<label
							className="import-drop-zone"
							onDragOver={(event) => event.preventDefault()}
							onDrop={(event) => handleDrop(event, importOverlay)}
						>
							<FileUp size={28} />
							<strong>{t("matches.import.dropTitle")}</strong>
							<span>{t("matches.import.dropHint")}</span>
							<input
								type="file"
								accept={
									importOverlay === "practiscore"
										? ".cab,application/vnd.ms-cab-compressed,application/octet-stream"
										: ".pdf,application/pdf"
								}
								onChange={(event) =>
									importOverlay === "practiscore"
										? setPractiscoreFile(event.target.files?.[0] ?? null)
										: setMare2File(event.target.files?.[0] ?? null)
								}
							/>
						</label>
						{(importOverlay === "practiscore"
							? practiscoreFile
							: mare2File) && (
							<p className="muted">
								{t("matches.import.selectedFile", {
									fileName: (importOverlay === "practiscore"
										? practiscoreFile
										: mare2File
									)?.name,
								})}
							</p>
						)}
						{importError && (
							<StatusMessage
								tone="error"
								onDismiss={() => setImportError(null)}
							>
								{importError}
							</StatusMessage>
						)}
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={closeImportOverlay}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button"
								type="button"
								disabled={importing}
								onClick={() =>
									void (importOverlay === "practiscore"
										? importPractiscore()
										: importMare2Pdf())
								}
							>
								<FileUp size={16} />
								{importing
									? importOverlay === "practiscore"
										? t("matches.practiscore.importing")
										: t("matches.mare2.importing")
									: importOverlay === "practiscore"
										? t("matches.practiscore.importAction")
										: t("matches.mare2.importAction")}
							</button>
						</div>
					</div>
				</div>
			)}
			{briefingTarget && (
				<div className="dialog-backdrop" onMouseDown={closeBriefingImport}>
					<div
						className="panel form-grid briefing-dialog"
						role="dialog"
						aria-modal="true"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="form-title-row import-dialog-heading">
							<div>
								<h3>{t("matches.briefing.title")}</h3>
								<p className="muted import-dialog-intro">
									{t("matches.briefing.description", {
										match: briefingTarget.match.name,
									})}
								</p>
							</div>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={closeBriefingImport}
							>
								<X size={16} />
							</button>
						</div>
						{!briefingFile ? (
							<label
								className="import-drop-zone"
								onDragOver={(event) => event.preventDefault()}
								onDrop={handleBriefingDrop}
							>
								<FileImage size={28} />
								<strong>{t("matches.briefing.dropTitle")}</strong>
								<span>{t("matches.briefing.dropHint")}</span>
								<input
									type="file"
									accept=".pdf,application/pdf"
									onChange={(event) => {
										const file = event.target.files?.[0];
										if (file) void parseBriefingFile(file);
									}}
								/>
							</label>
						) : null}
						{briefingFile ? (
							<p className="muted">
								{t("matches.import.selectedFile", {
									fileName: briefingFile.name,
								})}
							</p>
						) : null}
						{briefingError ? (
							<StatusMessage
								tone="error"
								onDismiss={() => setBriefingError(null)}
							>
								{briefingError}
							</StatusMessage>
						) : null}
						{briefingCandidates.length > 0 ? (
							<div className="briefing-mapping-list">
								{briefingTarget.importRecord.snapshot.stages.map((stage) => {
									const compatibleCandidates = getCompatibleBriefingCandidates(
										stage,
										briefingCandidates,
									);
									const selectedPage =
										briefingMapping[stage.internalStageId] ??
										compatibleCandidates[0]?.pageNumber;
									const selectedCandidate =
										compatibleCandidates.find(
											(candidate) => candidate.pageNumber === selectedPage,
										) ?? compatibleCandidates[0];
									const confirmedPageByOtherStage = new Set(
										Object.entries(briefingConfirmedPages)
											.filter(([stageId]) => stageId !== stage.internalStageId)
											.map(([, page]) => page),
									);
									const isConfirmed =
										briefingConfirmedPages[stage.internalStageId] ===
										selectedPage;
									return (
										<div
											className="briefing-mapping-row"
											key={stage.internalStageId}
										>
											<div>
												<strong>{stage.name}</strong>
												<span>
													{t("matches.briefing.stageMeta", {
														rounds: stage.minRounds ?? "—",
														points: stage.maxPoints ?? "—",
													})}
												</span>
											</div>
											{selectedCandidate ? (
												<StageBriefingThumbnail candidate={selectedCandidate} />
											) : null}
											<div
												className="briefing-thumbnail-picker"
												role="list"
												aria-label={t("matches.briefing.selectStageImage", {
													stage: stage.name,
												})}
											>
												{compatibleCandidates.length ? (
													compatibleCandidates.map((candidate) => {
														const disabled = confirmedPageByOtherStage.has(
															candidate.pageNumber,
														);
														const selected =
															selectedPage === candidate.pageNumber;
														return (
															<button
																className={
																	selected
																		? "briefing-thumbnail-option briefing-thumbnail-option-selected"
																		: "briefing-thumbnail-option"
																}
																type="button"
																disabled={disabled}
																key={candidate.pageNumber}
																onClick={() =>
																	selectBriefingCandidate(
																		stage.internalStageId,
																		candidate.pageNumber,
																	)
																}
															>
																<StageBriefingThumbnail candidate={candidate} />
																<span>
																	{t("matches.briefing.pageOption", {
																		page: candidate.pageNumber,
																		rounds: candidate.minRounds ?? "—",
																		points: candidate.maxPoints ?? "—",
																	})}
																</span>
															</button>
														);
													})
												) : (
													<p className="muted">
														{t("matches.briefing.noCompatibleImages")}
													</p>
												)}
												<button
													className="button button-secondary briefing-confirm-button"
													type="button"
													disabled={!selectedCandidate || isConfirmed}
													onClick={() => confirmBriefingCandidate(stage)}
												>
													{isConfirmed
														? t("matches.briefing.confirmed")
														: t("matches.briefing.confirmImage")}
												</button>
											</div>
										</div>
									);
								})}
							</div>
						) : null}
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={closeBriefingImport}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button"
								type="button"
								disabled={briefingImporting || !briefingCandidates.length}
								onClick={() => void saveBriefingMapping()}
							>
								<FileImage size={16} />
								{briefingImporting
									? t("matches.briefing.importing")
									: t("matches.briefing.save")}
							</button>
						</div>
					</div>
				</div>
			)}
			{showForm && (
				<div className="dialog-backdrop" onMouseDown={reset}>
					<form
						className="panel form-grid match-form-dialog"
						role="dialog"
						aria-modal="true"
						onMouseDown={(event) => event.stopPropagation()}
						onSubmit={submit}
					>
						<div className="form-title-row">
							<h3>
								{editingId ? t("matches.editTitle") : t("matches.createTitle")}
							</h3>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={reset}
							>
								<X size={16} />
							</button>
						</div>
						<label>
							<span>{t("matches.fields.name")} *</span>
							<input
								required
								value={form.name}
								onChange={(event) =>
									setForm({ ...form, name: event.target.value })
								}
								placeholder={t("matches.placeholders.name")}
							/>
						</label>
						<div className="two-columns">
							<label>
								<span>{t("matches.fields.date")} *</span>
								<input
									required
									type="date"
									value={form.date}
									onChange={(event) =>
										setForm({ ...form, date: event.target.value })
									}
								/>
							</label>
							<label>
								<span>{t("matches.fields.club")}</span>
								<input
									value={form.clubOrRange}
									onChange={(event) =>
										setForm({ ...form, clubOrRange: event.target.value })
									}
								/>
							</label>
						</div>
						<div className="two-columns">
							<label>
								<span>{t("matches.fields.discipline")}</span>
								<input
									value={form.discipline}
									onChange={(event) =>
										setForm({ ...form, discipline: event.target.value })
									}
								/>
							</label>
							<label>
								<span>{t("matches.fields.division")}</span>
								<input
									value={form.divisionOrCategory}
									onChange={(event) =>
										setForm({ ...form, divisionOrCategory: event.target.value })
									}
								/>
							</label>
						</div>
						<label>
							<span>{t("matches.fields.firearm")}</span>
							<select
								value={form.firearmId}
								onChange={(event) =>
									setForm({ ...form, firearmId: event.target.value })
								}
							>
								<option value="">{t("common.none")}</option>
								{firearms
									?.filter((f) => !f.archived)
									.map((f) => (
										<option key={f.id} value={f.id}>
											{f.nickname}
										</option>
									))}
							</select>
						</label>
						<div className="three-columns">
							<label>
								<span>{t("matches.fields.rounds")}</span>
								<input
									type="number"
									min="0"
									value={form.roundsFired}
									onChange={(event) =>
										setForm({ ...form, roundsFired: event.target.value })
									}
								/>
							</label>
							<label>
								<span>{t("matches.fields.score")}</span>
								<input
									value={form.score}
									onChange={(event) =>
										setForm({ ...form, score: event.target.value })
									}
								/>
							</label>
							<label>
								<span>{t("matches.fields.placement")}</span>
								<input
									value={form.placement}
									onChange={(event) =>
										setForm({ ...form, placement: event.target.value })
									}
								/>
							</label>
						</div>
						<label>
							<span>{t("matches.fields.notes")}</span>
							<textarea
								rows={3}
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
								onClick={reset}
							>
								{t("actions.cancel")}
							</button>
							<button className="button" type="submit">
								<Save size={16} />
								{editingId ? t("actions.save") : t("matches.createAction")}
							</button>
						</div>
					</form>
				</div>
			)}
			{deleteTarget && (
				<div
					className="dialog-backdrop"
					onMouseDown={() => setDeleteTarget(null)}
				>
					<div
						className="dialog"
						role="dialog"
						aria-modal="true"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="dialog-title-row">
							<h3>{t("matches.deleteTitle")}</h3>
							<button
								className="icon-button"
								onClick={() => setDeleteTarget(null)}
							>
								<X size={16} />
							</button>
						</div>
						<p>{t("matches.deleteConfirm")}</p>
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								onClick={() => setDeleteTarget(null)}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button button-danger"
								onClick={() => void remove()}
							>
								{t("actions.delete")}
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

function downloadBriefingOverrideFile(
	match: MatchEvent,
	importRecord: PractiscoreImportRecord,
	stagePageMapping: Record<string, number>,
) {
	const mare2MatchId = extractMare2MatchId(importRecord.practiscoreMatchId);
	const override = {
		format: "shooting-logbook-mare2-stage-page-override",
		schemaVersion: 1,
		...(mare2MatchId ? { mare2MatchId } : {}),
		matchName: match.name,
		generatedAt: new Date().toISOString(),
		stagePageMapping: Object.fromEntries(
			Object.entries(stagePageMapping).sort(
				([stageA], [stageB]) => Number(stageA) - Number(stageB),
			),
		),
	};
	const fileName = mare2MatchId
		? `${mare2MatchId}.json`
		: `mare2-override-${slugifyFileName(match.name)}.json`;
	downloadJsonFile(fileName, override);
}

function extractMare2MatchId(practiscoreMatchId: string) {
	return practiscoreMatchId.match(/^mare2:(\d+)$/)?.[1];
}

function downloadJsonFile(fileName: string, value: unknown) {
	const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function slugifyFileName(value: string) {
	const slug = value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
	return slug || "match";
}

function getMappedStagePages(
	snapshot: PractiscoreMatchSnapshot,
	matchFile: Mare2PublicMatchFile,
	pages: NonNullable<Mare2PublicMatchFile["pages"]>,
): Array<{
	stage: PractiscoreStage;
	page: NonNullable<Mare2PublicMatchFile["pages"]>[number];
}> {
	const pageByNumber = new Map(pages.map((page) => [page.pageNumber, page]));
	const mapped = snapshot.stages.flatMap((stage) => {
		const pageNumber = matchFile.stagePageMapping?.[stage.internalStageId];
		const page = pageNumber ? pageByNumber.get(pageNumber) : undefined;
		return page ? [{ stage, page }] : [];
	});
	if (mapped.length > 0) return mapped;

	return pages.slice(-snapshot.stages.length).flatMap((page, index) => {
		const stage = snapshot.stages[index];
		return stage ? [{ stage, page }] : [];
	});
}

function filterPublicCatalogMatches(
	matches: Mare2PublicCatalogMatch[],
	query: string,
): Mare2PublicCatalogMatch[] {
	const tokens = query
		.toLowerCase()
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	if (tokens.length === 0) return matches;

	return matches.filter((match) => {
		const searchable = [
			match.name,
			match.mare2MatchId,
			match.dateFrom,
			match.dateTo,
			match.macroArea ? `ma${match.macroArea}` : undefined,
			...(match.badges ?? []),
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		return tokens.every((token) => searchable.includes(token));
	});
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) throw new Error(`Request failed (${response.status})`);
	return (await response.json()) as T;
}

async function fetchBlob(url: string): Promise<Blob> {
	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok)
		throw new Error(`Asset request failed (${response.status})`);
	return response.blob();
}

function createBriefingMapping(
	stages: PractiscoreStage[],
	candidates: Mare2BriefingStageCandidate[],
): Record<string, number> {
	const mapping: Record<string, number> = {};
	const usedPages = new Set<number>();

	for (const stage of stages) {
		const compatibleCandidates = getCompatibleBriefingCandidates(
			stage,
			candidates,
		).filter((candidate) => !usedPages.has(candidate.pageNumber));
		const candidate = compatibleCandidates[0];
		if (!candidate) continue;
		mapping[stage.internalStageId] = candidate.pageNumber;
		usedPages.add(candidate.pageNumber);
	}

	return mapping;
}

function getCompatibleBriefingCandidates(
	stage: PractiscoreStage,
	candidates: Mare2BriefingStageCandidate[],
): Mare2BriefingStageCandidate[] {
	const byMaxPoints = candidates.filter(
		(candidate) => candidate.maxPoints === stage.maxPoints,
	);
	const byMaxPointsAndRounds = byMaxPoints.filter(
		(candidate) => candidate.minRounds === stage.minRounds,
	);
	return byMaxPointsAndRounds.length ? byMaxPointsAndRounds : byMaxPoints;
}

function autoSelectOnlyRemainingBriefingCandidates(
	stages: PractiscoreStage[],
	candidates: Mare2BriefingStageCandidate[],
	currentMapping: Record<string, number>,
	confirmedPages: Record<string, number>,
): Record<string, number> {
	const nextMapping = { ...currentMapping };

	for (const stage of stages) {
		if (confirmedPages[stage.internalStageId]) continue;
		const usedConfirmedPages = new Set(
			Object.entries(confirmedPages)
				.filter(([stageId]) => stageId !== stage.internalStageId)
				.map(([, page]) => page),
		);
		const remaining = getCompatibleBriefingCandidates(stage, candidates).filter(
			(candidate) => !usedConfirmedPages.has(candidate.pageNumber),
		);
		if (remaining.length === 1)
			nextMapping[stage.internalStageId] = remaining[0].pageNumber;
	}

	return nextMapping;
}

function StageBriefingThumbnail({
	candidate,
}: {
	candidate: Mare2BriefingStageCandidate;
}) {
	const url = useMemo(
		() => URL.createObjectURL(candidate.imageBlob),
		[candidate.imageBlob],
	);

	useEffect(() => {
		return () => URL.revokeObjectURL(url);
	}, [url]);

	return (
		<img
			className="briefing-thumbnail"
			src={url}
			alt={`Page ${candidate.pageNumber}`}
		/>
	);
}

function importSourceLabel(practiscoreMatchId: string) {
	return practiscoreMatchId.startsWith("mare2:") ? "Mare2" : "PractiScore";
}

function importSourceClassName(practiscoreMatchId: string) {
	return practiscoreMatchId.startsWith("mare2:")
		? "import-source-mare2"
		: "import-source-practiscore";
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString();
}
