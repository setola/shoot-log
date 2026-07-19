import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import {
	Download,
	FileImage,
	Image,
	Plus,
	Search,
	Trash2,
	X,
	ArrowLeft,
} from "lucide-react";
import {
	AppModal,
	EntityActionPanel,
	EntityAddButton,
	EntityPage,
} from "../../components/EntityUi";
import { db } from "../../db/schema";
import type { PractiscoreMatchSnapshot } from "./practiscoreTypes";
import {
	calculateScorecardStage,
	createScorecardFromMare2Catalog,
	deleteScorecard,
	updateScorecardPowerFactor,
	updateScorecardStage,
	updateScorecardStagePageMapping,
} from "./scorecardRepository";
import {
	parseMare2BriefingPdf,
	type Mare2BriefingStageCandidate,
} from "./mare2BriefingParser";
import {
	createFallbackStagePageMapping,
	getEffectiveStagePageMapping,
	repairScorecardPageUrl,
	resolveCatalogPageUrl,
} from "./scorecardPageMapping";
import type {
	MatchScorecard,
	MatchScorecardStage,
	ScorecardPowerFactor,
} from "./scorecardTypes";

const MARE2_PUBLIC_CATALOG_URL =
	"https://shooting-logbook-mare2-data.pages.dev/manifest.json";

interface Mare2PublicCatalogMatch {
	mare2MatchId: string;
	name: string;
	dateFrom?: string;
	dateTo?: string;
	location?: string;
	matchUrl: string;
	snapshotUrl: string;
}

interface Mare2PublicCatalog {
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

interface StageImageMappingCandidate {
	pageNumber: number;
	minRounds?: number;
	maxPoints?: number;
	imageBlob?: Blob;
	imageUrl?: string;
}

export function MatchScorecards() {
	const { t } = useTranslation();
	const scorecards = useLiveQuery(
		() => db.matchScorecards.orderBy("updatedAt").reverse().toArray(),
		[],
	);
	const [catalogOpen, setCatalogOpen] = useState(false);
	const [catalogLoading, setCatalogLoading] = useState(false);
	const [catalogMatches, setCatalogMatches] = useState<
		Mare2PublicCatalogMatch[]
	>([]);
	const [catalogSearch, setCatalogSearch] = useState("");
	const [selectedCatalogMatchId, setSelectedCatalogMatchId] = useState("");
	const [catalogError, setCatalogError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [activeScorecardId, setActiveScorecardId] = useState<string | null>(
		null,
	);

	const activeScorecard = scorecards?.find(
		(scorecard) => scorecard.id === activeScorecardId,
	);
	const filteredMatches = useMemo(
		() => filterCatalogMatches(catalogMatches, catalogSearch),
		[catalogMatches, catalogSearch],
	);
	const todaysMatches = filteredMatches.filter(isTodayMatch);
	const upcomingMatches = filteredMatches.filter(
		(match) => !isTodayMatch(match) && isUpcomingMatch(match),
	);
	const olderMatches = filteredMatches.filter(
		(match) => !isTodayMatch(match) && !isUpcomingMatch(match),
	);

	async function openCatalog() {
		setCatalogOpen(true);
		setCatalogError(null);
		if (catalogMatches.length) return;
		setCatalogLoading(true);
		try {
			const catalog = await fetchJson<Mare2PublicCatalog>(
				MARE2_PUBLIC_CATALOG_URL,
			);
			setCatalogMatches(catalog.matches);
		} catch (error) {
			setCatalogError(error instanceof Error ? error.message : String(error));
		} finally {
			setCatalogLoading(false);
		}
	}

	function closeCatalog() {
		setCatalogOpen(false);
		setSelectedCatalogMatchId("");
		setCatalogError(null);
	}

	async function createSelectedScorecard() {
		const catalogMatch = catalogMatches.find(
			(match) => match.mare2MatchId === selectedCatalogMatchId,
		);
		if (!catalogMatch) return;
		setCreating(true);
		setCatalogError(null);
		try {
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
			const publicPages = matchFile.pages?.map((page) => ({
				...page,
				url: resolveCatalogPageUrl(page.url, matchUrl),
			}));
			await createScorecardFromMare2Catalog(
				{
					...catalogMatch,
					matchUrl,
					snapshotUrl,
					publicPages,
					stagePageMapping:
						matchFile.stagePageMapping ??
						createFallbackStagePageMapping(
							snapshot.stages.map((stage) => ({
								stageId: stage.internalStageId,
								name: stage.name,
								minRounds: stage.minRounds,
								maxPoints: stage.maxPoints,
								charlie: 0,
								delta: 0,
								miss: 0,
								noShoot: 0,
								procedures: 0,
							})),
							publicPages,
						),
				},
				snapshot,
			);
			closeCatalog();
		} catch (error) {
			setCatalogError(error instanceof Error ? error.message : String(error));
		} finally {
			setCreating(false);
		}
	}

	return (
		<EntityPage
			title={t("matches.scorecards.title")}
			description={t("matches.scorecards.description")}
			actions={
				<EntityActionPanel label={t("matches.scorecards.actionsLabel")}>
					<EntityAddButton onClick={() => void openCatalog()}>
						{t("matches.scorecards.new")}
					</EntityAddButton>
				</EntityActionPanel>
			}
		>
			{activeScorecard ? (
				<ScorecardDetail
					scorecard={activeScorecard}
					onBack={() => setActiveScorecardId(null)}
				/>
			) : (
				<div className="record-list">
					{scorecards?.map((scorecard) => (
						<ScorecardCard
							key={scorecard.id}
							scorecard={scorecard}
							onCompile={() => setActiveScorecardId(scorecard.id)}
						/>
					))}
				</div>
			)}
			{!activeScorecard && scorecards?.length === 0 ? (
				<div className="empty-state-card">
					<Search size={42} strokeWidth={1.4} />
					<h3>{t("matches.scorecards.emptyTitle")}</h3>
					<p>{t("matches.scorecards.empty")}</p>
					<button
						className="button"
						type="button"
						onClick={() => void openCatalog()}
					>
						<Plus size={16} />
						{t("matches.scorecards.new")}
					</button>
				</div>
			) : null}

			{catalogOpen ? (
				<div
					className="dialog-backdrop"
					role="presentation"
					onMouseDown={closeCatalog}
				>
					<div
						className="panel form-grid import-dialog"
						role="dialog"
						aria-modal="true"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<div className="form-title-row import-dialog-heading">
							<div>
								<h3>{t("matches.scorecards.catalogTitle")}</h3>
								<p className="muted import-dialog-intro">
									{t("matches.scorecards.catalogDescription")}
								</p>
							</div>
							<button
								className="icon-button"
								type="button"
								aria-label={t("actions.close")}
								onClick={closeCatalog}
							>
								<X size={16} />
							</button>
						</div>
						<label>
							<span>{t("matches.publicCatalog.search")}</span>
							<input
								value={catalogSearch}
								onChange={(event) => setCatalogSearch(event.target.value)}
								placeholder={t("matches.publicCatalog.searchPlaceholder")}
							/>
						</label>
						{catalogLoading ? (
							<p className="muted">{t("matches.publicCatalog.loading")}</p>
						) : null}
						{catalogError ? (
							<p className="status-message status-message-error">
								{catalogError}
							</p>
						) : null}
						{!catalogLoading ? (
							<div className="scorecard-catalog-groups">
								<CatalogGroup
									title={t("matches.scorecards.todayGroup")}
									matches={todaysMatches}
									selectedId={selectedCatalogMatchId}
									onSelect={setSelectedCatalogMatchId}
									today
								/>
								<CatalogGroup
									title={t("matches.scorecards.upcomingGroup")}
									matches={upcomingMatches}
									selectedId={selectedCatalogMatchId}
									onSelect={setSelectedCatalogMatchId}
								/>
								{olderMatches.length ? (
									<CatalogGroup
										title={t("matches.scorecards.otherGroup")}
										matches={olderMatches}
										selectedId={selectedCatalogMatchId}
										onSelect={setSelectedCatalogMatchId}
									/>
								) : null}
							</div>
						) : null}
						<div className="dialog-actions">
							<button
								className="button button-secondary"
								type="button"
								onClick={closeCatalog}
							>
								{t("actions.cancel")}
							</button>
							<button
								className="button"
								type="button"
								disabled={!selectedCatalogMatchId || creating}
								onClick={() => void createSelectedScorecard()}
							>
								{creating
									? t("matches.scorecards.creating")
									: t("matches.scorecards.create")}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</EntityPage>
	);
}

function CatalogGroup({
	title,
	matches,
	selectedId,
	onSelect,
	today,
}: {
	title: string;
	matches: Mare2PublicCatalogMatch[];
	selectedId: string;
	onSelect: (id: string) => void;
	today?: boolean;
}) {
	if (matches.length === 0) return null;
	return (
		<div className="panel-stack">
			<h4>{title}</h4>
			<div className="record-list">
				{matches.map((match) => (
					<label className="record-card compact-card" key={match.mare2MatchId}>
						<div className="record-content">
							<div className="record-title-row">
								<input
									type="radio"
									name="scorecard-match"
									checked={selectedId === match.mare2MatchId}
									onChange={() => onSelect(match.mare2MatchId)}
								/>
								<h4>{match.name}</h4>
								{today ? (
									<span className="badge badge-success">In corso</span>
								) : null}
							</div>
							<p>
								{[match.location, formatDateRange(match.dateFrom, match.dateTo)]
									.filter(Boolean)
									.join(" · ")}
							</p>
						</div>
					</label>
				))}
			</div>
		</div>
	);
}

function ScorecardCard({
	scorecard,
	onCompile,
}: {
	scorecard: MatchScorecard;
	onCompile: () => void;
}) {
	const { t } = useTranslation();
	const completedStages = scorecard.stages.filter(isStageCompleted).length;
	return (
		<article className="record-card scorecard-card scorecard-list-card">
			<div className="record-content">
				<div className="record-title-row">
					<h4>{scorecard.matchName}</h4>
					<span className="badge badge-muted">
						Mare2 {scorecard.mare2MatchId}
					</span>
				</div>
				<p>
					{[
						scorecard.location,
						formatDateRange(scorecard.dateFrom, scorecard.dateTo),
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
				<p className="scorecard-progress-text">
					{t("matches.scorecards.completedCount", {
						completed: completedStages,
						total: scorecard.stages.length,
					})}
				</p>
			</div>
			<div className="record-actions scorecard-list-actions">
				<button className="button" type="button" onClick={onCompile}>
					{t("matches.scorecards.compile")}
				</button>
				<button
					className="icon-button"
					type="button"
					onClick={() => downloadOverride(scorecard)}
					aria-label={t("matches.scorecards.downloadOverride")}
					disabled={!getEffectiveStagePageMapping(scorecard)}
				>
					<Download size={15} />
				</button>
				<button
					className="icon-button danger"
					type="button"
					onClick={() => void deleteScorecard(scorecard.id)}
					aria-label={t("actions.delete")}
				>
					<Trash2 size={15} />
				</button>
			</div>
		</article>
	);
}

function ScorecardDetail({
	scorecard,
	onBack,
}: {
	scorecard: MatchScorecard;
	onBack: () => void;
}) {
	const { t } = useTranslation();
	const [mappingOpen, setMappingOpen] = useState(false);
	const [editingStageId, setEditingStageId] = useState<string | null>(null);
	const [imageStageId, setImageStageId] = useState<string | null>(null);
	const effectiveStagePageMapping = getEffectiveStagePageMapping(scorecard);
	const editingStage = scorecard.stages.find(
		(stage) => stage.stageId === editingStageId,
	);
	const imageStage = scorecard.stages.find(
		(stage) => stage.stageId === imageStageId,
	);
	return (
		<article className="record-card scorecard-card scorecard-detail-card">
			<div className="record-content">
				<div className="record-title-row scorecard-detail-heading">
					<button
						className="button button-secondary"
						type="button"
						onClick={onBack}
					>
						<ArrowLeft size={15} />
						{t("actions.back")}
					</button>
					<h4>{scorecard.matchName}</h4>
					<span className="badge badge-muted">
						Mare2 {scorecard.mare2MatchId}
					</span>
				</div>
				<p>
					{[
						scorecard.location,
						formatDateRange(scorecard.dateFrom, scorecard.dateTo),
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
				<label className="compact-control scorecard-power-factor">
					<span>{t("matches.scorecards.powerFactor")}</span>
					<select
						value={scorecard.powerFactor}
						onChange={(event) =>
							void updateScorecardPowerFactor(
								scorecard.id,
								event.target.value as ScorecardPowerFactor,
							)
						}
					>
						<option value="minor">Minor</option>
						<option value="major">Major</option>
					</select>
				</label>
				<div className="scorecard-stage-list">
					{scorecard.stages.map((stage) => (
						<ScorecardStageSummary
							key={stage.stageId}
							scorecard={scorecard}
							stage={stage}
							onEdit={() => setEditingStageId(stage.stageId)}
							onSelectImage={() => setImageStageId(stage.stageId)}
						/>
					))}
				</div>
			</div>
			<div className="record-actions">
				<button
					className="icon-button"
					type="button"
					onClick={() => setMappingOpen(true)}
					aria-label={t("matches.scorecards.mapImages")}
				>
					<Image size={15} />
				</button>
				<button
					className="icon-button"
					type="button"
					onClick={() => downloadOverride(scorecard)}
					aria-label={t("matches.scorecards.downloadOverride")}
					disabled={!effectiveStagePageMapping}
				>
					<Download size={15} />
				</button>
				<button
					className="icon-button danger"
					type="button"
					onClick={() => void deleteScorecard(scorecard.id)}
					aria-label={t("actions.delete")}
				>
					<Trash2 size={15} />
				</button>
			</div>
			{editingStage ? (
				<ScorecardStageScoreDialog
					scorecard={scorecard}
					stage={editingStage}
					onClose={() => setEditingStageId(null)}
				/>
			) : null}
			{imageStage ? (
				<ScorecardStageImageDialog
					scorecard={scorecard}
					stage={imageStage}
					onClose={() => setImageStageId(null)}
				/>
			) : null}
			{mappingOpen ? (
				<ScorecardBriefingMappingDialog
					scorecard={scorecard}
					onClose={() => setMappingOpen(false)}
				/>
			) : null}
		</article>
	);
}

function ScorecardStageSummary({
	scorecard,
	stage,
	onEdit,
	onSelectImage,
}: {
	scorecard: MatchScorecard;
	stage: MatchScorecardStage;
	onEdit: () => void;
	onSelectImage: () => void;
}) {
	const { t } = useTranslation();
	const summary = calculateScorecardStage(stage, scorecard.powerFactor);
	const stageImage = getScorecardStageImage(scorecard, stage.stageId);
	const completed = isStageCompleted(stage);
	return (
		<div
			className={[
				"scorecard-stage-summary",
				completed
					? "scorecard-stage-summary-complete"
					: "scorecard-stage-summary-todo",
				stageImage ? "" : "scorecard-stage-summary-no-image",
			]
				.filter(Boolean)
				.join(" ")}
		>
			{stageImage ? (
				<div className="scorecard-stage-summary-image">
					<ScorecardStageImage url={stageImage.url} stageName={stage.name} />
				</div>
			) : null}
			<div className="scorecard-stage-summary-content">
				<div className="record-title-row">
					<h4>{stage.name}</h4>
					<span
						className={completed ? "badge badge-success" : "badge badge-muted"}
					>
						{completed
							? t("matches.scorecards.completed")
							: t("matches.scorecards.todo")}
					</span>
				</div>
				<p>
					{t("matches.scorecards.stageMeta", {
						rounds: stage.minRounds ?? "—",
						points: stage.maxPoints ?? "—",
					})}
				</p>
				{completed ? (
					<div className="scorecard-stage-result-pills">
						<span>
							{t("matches.scorecards.time")}: {stage.timeSeconds?.toFixed(2)}s
						</span>
						<span>
							{t("matches.scorecards.points")}: {summary.points}
						</span>
						<span>HF: {summary.hitFactor?.toFixed(3) ?? "—"}</span>
					</div>
				) : null}
			</div>
			<div className="scorecard-stage-summary-actions">
				<button
					className="button button-secondary"
					type="button"
					onClick={onSelectImage}
				>
					<Image size={15} />
					{t("matches.scorecards.selectImage")}
				</button>
				<button className="button" type="button" onClick={onEdit}>
					{completed
						? t("matches.scorecards.editScore")
						: t("matches.scorecards.enterScore")}
				</button>
			</div>
		</div>
	);
}

function ScorecardStageScoreDialog({
	scorecard,
	stage,
	onClose,
}: {
	scorecard: MatchScorecard;
	stage: MatchScorecardStage;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const [draft, setDraft] = useState<MatchScorecardStage>(stage);
	const summary = calculateScorecardStage(draft, scorecard.powerFactor);
	const requiredHits = getRequiredHits(draft);
	const rawAlpha = requiredHits - draft.charlie - draft.delta - draft.miss;
	const alpha = Math.max(0, rawAlpha);
	const overMaxHits = rawAlpha < 0;
	const maxPoints = draft.maxPoints ?? requiredHits * 5;

	async function saveStageScore() {
		if (overMaxHits) return;
		await updateScorecardStage(scorecard, stage.stageId, draft);
		onClose();
	}

	function updateDraft(updates: Partial<MatchScorecardStage>) {
		setDraft((current) => ({ ...current, ...updates }));
	}

	return (
		<AppModal
			title={stage.name}
			onClose={onClose}
			className="scorecard-score-dialog"
			footer={
				<div className="scorecard-score-footer">
					<div className="scorecard-score-footer-metrics">
						<span>
							<strong>
								{summary.points}/{maxPoints}
							</strong>
							{t("matches.scorecards.points")}
						</span>
						<span>
							<strong>{summary.hitFactor?.toFixed(3) ?? "—"}</strong>
							HF
						</span>
					</div>
					<div className="scorecard-score-footer-actions">
						<button
							className="button button-secondary"
							type="button"
							onClick={onClose}
						>
							{t("actions.cancel")}
						</button>
						<button
							className="button"
							type="button"
							disabled={overMaxHits}
							onClick={() => void saveStageScore()}
						>
							{t("actions.save")}
						</button>
					</div>
				</div>
			}
		>
			{overMaxHits ? (
				<p className="status-message status-message-error">
					{t("matches.scorecards.tooManyHits", {
						count: draft.charlie + draft.delta + draft.miss,
						max: requiredHits,
					})}
				</p>
			) : null}
			<div className="scorecard-counter-row scorecard-time-row">
				<span>{t("matches.scorecards.time")}</span>
				<div>
					<input
						type="number"
						inputMode="decimal"
						min="0"
						step="0.01"
						value={draft.timeSeconds ?? ""}
						onChange={(event) =>
							updateDraft({
								timeSeconds: event.target.value
									? Number(event.target.value)
									: undefined,
							})
						}
					/>
				</div>
			</div>
			<Counter
				label={t("matches.scorecards.fields.alpha")}
				value={alpha}
				readOnly
			/>
			{(["charlie", "delta", "miss", "noShoot", "procedures"] as const).map(
				(field) => (
					<Counter
						key={field}
						label={t(`matches.scorecards.fields.${field}`)}
						value={draft[field]}
						onChange={(value) => updateDraft({ [field]: value })}
					/>
				),
			)}
		</AppModal>
	);
}

function ScorecardStageImageDialog({
	scorecard,
	stage,
	onClose,
}: {
	scorecard: MatchScorecard;
	stage: MatchScorecardStage;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const pages = (scorecard.publicPages ?? []).map((page) => ({
		...page,
		url: repairScorecardPageUrl(page.url, scorecard),
	}));
	const currentPageNumber =
		getEffectiveStagePageMapping(scorecard)?.[stage.stageId];
	const [selectedPageNumber, setSelectedPageNumber] = useState<
		number | undefined
	>(currentPageNumber);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function saveStageImage() {
		if (!selectedPageNumber) return;
		setSaving(true);
		setError(null);
		try {
			await updateScorecardStagePageMapping(scorecard.id, {
				...(getEffectiveStagePageMapping(scorecard) ?? {}),
				[stage.stageId]: selectedPageNumber,
			});
			onClose();
		} catch (saveError) {
			setError(
				saveError instanceof Error ? saveError.message : String(saveError),
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<AppModal
			title={t("matches.scorecards.selectImageTitle")}
			description={t("matches.scorecards.selectImageDescription", {
				stage: stage.name,
			})}
			onClose={onClose}
			className="scorecard-image-dialog"
			bodyClassName="scorecard-image-picker-body"
			footer={
				<>
					<button
						className="button button-secondary"
						type="button"
						onClick={onClose}
					>
						{t("actions.cancel")}
					</button>
					<button
						className="button"
						type="button"
						disabled={!selectedPageNumber || saving}
						onClick={() => void saveStageImage()}
					>
						{saving
							? t("matches.scorecards.savingImage")
							: t("matches.scorecards.saveImage")}
					</button>
				</>
			}
		>
			{error ? (
				<p className="status-message status-message-error">{error}</p>
			) : null}
			{pages.length ? (
				<div className="scorecard-image-picker-grid">
					{pages.map((page) => {
						const selected = selectedPageNumber === page.pageNumber;
						return (
							<button
								className={
									selected
										? "briefing-thumbnail-option briefing-thumbnail-option-selected"
										: "briefing-thumbnail-option"
								}
								type="button"
								key={page.pageNumber}
								onClick={() => setSelectedPageNumber(page.pageNumber)}
							>
								<img
									className="briefing-thumbnail"
									src={page.url}
									alt={`Page ${page.pageNumber}`}
									loading="lazy"
								/>
								<span>
									{t("matches.scorecards.pageOption", {
										page: page.pageNumber,
									})}
								</span>
							</button>
						);
					})}
				</div>
			) : (
				<p className="muted">{t("matches.scorecards.noCatalogImages")}</p>
			)}
		</AppModal>
	);
}

function ScorecardBriefingMappingDialog({
	scorecard,
	onClose,
}: {
	scorecard: MatchScorecard;
	onClose: () => void;
}) {
	const { t } = useTranslation();
	const [briefingFile, setBriefingFile] = useState<File | null>(null);
	const [candidates, setCandidates] = useState<Mare2BriefingStageCandidate[]>(
		[],
	);
	const initialMapping = getEffectiveStagePageMapping(scorecard) ?? {};
	const catalogPages = useMemo(
		() =>
			(scorecard.publicPages ?? []).map((page) => ({
				...page,
				url: repairScorecardPageUrl(page.url, scorecard),
			})),
		[scorecard],
	);
	const [mapping, setMapping] =
		useState<Record<string, number>>(initialMapping);
	const [confirmedPages, setConfirmedPages] =
		useState<Record<string, number>>(initialMapping);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function parseBriefingFile(file: File) {
		setError(null);
		setBriefingFile(file);
		try {
			const nextCandidates = await parseMare2BriefingPdf(file);
			setCandidates(nextCandidates);
			const initialMapping = createBriefingMapping(
				scorecard.stages,
				nextCandidates,
			);
			setMapping({ ...initialMapping, ...mapping });
			setConfirmedPages({});
		} catch (parseError) {
			setError(
				parseError instanceof Error ? parseError.message : String(parseError),
			);
		}
	}

	function selectCandidate(stageId: string, pageNumber: number) {
		setMapping((current) => ({ ...current, [stageId]: pageNumber }));
	}

	function confirmCandidate(stage: MatchScorecardStage) {
		const pageNumber = mapping[stage.stageId];
		if (!pageNumber) return;
		const nextConfirmedPages = {
			...confirmedPages,
			[stage.stageId]: pageNumber,
		};
		setConfirmedPages(nextConfirmedPages);
		setMapping((current) =>
			candidates.length
				? autoSelectOnlyRemainingBriefingCandidates(
						scorecard.stages,
						candidates,
						current,
						nextConfirmedPages,
					)
				: current,
		);
	}

	async function saveMapping() {
		setSaving(true);
		setError(null);
		try {
			const nextMapping = Object.fromEntries(
				Object.entries(mapping).filter(([, pageNumber]) => pageNumber > 0),
			);
			await updateScorecardStagePageMapping(scorecard.id, nextMapping);
			onClose();
		} catch (saveError) {
			setError(
				saveError instanceof Error ? saveError.message : String(saveError),
			);
		} finally {
			setSaving(false);
		}
	}

	function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		const file = event.dataTransfer.files[0];
		if (file) void parseBriefingFile(file);
	}

	return (
		<div className="dialog-backdrop" onMouseDown={onClose}>
			<div
				className="panel form-grid briefing-dialog"
				role="dialog"
				aria-modal="true"
				onMouseDown={(event) => event.stopPropagation()}
			>
				<div className="form-title-row import-dialog-heading">
					<div>
						<h3>{t("matches.scorecards.mappingTitle")}</h3>
						<p className="muted import-dialog-intro">
							{t("matches.scorecards.mappingDescription", {
								match: scorecard.matchName,
							})}
						</p>
					</div>
					<button
						className="icon-button"
						type="button"
						aria-label={t("actions.close")}
						onClick={onClose}
					>
						<X size={16} />
					</button>
				</div>
				{catalogPages.length ? (
					<p className="muted">
						{t("matches.scorecards.catalogImagesAvailable", {
							count: catalogPages.length,
						})}
					</p>
				) : null}
				{!briefingFile ? (
					<label
						className={
							catalogPages.length
								? "import-drop-zone import-drop-zone-compact"
								: "import-drop-zone"
						}
						onDragOver={(event) => event.preventDefault()}
						onDrop={handleDrop}
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
						{t("matches.import.selectedFile", { fileName: briefingFile.name })}
					</p>
				) : null}
				{error ? (
					<p className="status-message status-message-error">{error}</p>
				) : null}
				{candidates.length || catalogPages.length ? (
					<div className="briefing-mapping-list">
						{scorecard.stages.map((stage) => {
							const compatibleCandidates: StageImageMappingCandidate[] =
								candidates.length
									? getCompatibleBriefingCandidates(stage, candidates).map(
											(candidate) => ({
												pageNumber: candidate.pageNumber,
												minRounds: candidate.minRounds,
												maxPoints: candidate.maxPoints,
												imageBlob: candidate.imageBlob,
											}),
										)
									: catalogPages.map((page) => ({
											pageNumber: page.pageNumber,
											imageUrl: page.url,
										}));
							const selectedPage =
								mapping[stage.stageId] ?? compatibleCandidates[0]?.pageNumber;
							const selectedCandidate =
								compatibleCandidates.find(
									(candidate) => candidate.pageNumber === selectedPage,
								) ?? compatibleCandidates[0];
							const isConfirmed =
								confirmedPages[stage.stageId] === selectedPage;
							return (
								<div className="briefing-mapping-row" key={stage.stageId}>
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
										<StageImageMappingThumbnail candidate={selectedCandidate} />
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
												const selected = selectedPage === candidate.pageNumber;
												return (
													<button
														className={
															selected
																? "briefing-thumbnail-option briefing-thumbnail-option-selected"
																: "briefing-thumbnail-option"
														}
														type="button"
														key={candidate.pageNumber}
														onClick={() =>
															selectCandidate(
																stage.stageId,
																candidate.pageNumber,
															)
														}
													>
														<StageImageMappingThumbnail candidate={candidate} />
														<span>
															{candidate.minRounds || candidate.maxPoints
																? t("matches.briefing.pageOption", {
																		page: candidate.pageNumber,
																		rounds: candidate.minRounds ?? "—",
																		points: candidate.maxPoints ?? "—",
																	})
																: t("matches.scorecards.pageOption", {
																		page: candidate.pageNumber,
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
											onClick={() => confirmCandidate(stage)}
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
						onClick={onClose}
					>
						{t("actions.cancel")}
					</button>
					<button
						className="button"
						type="button"
						disabled={
							saving ||
							(!candidates.length &&
								!catalogPages.length &&
								!Object.keys(mapping).length)
						}
						onClick={() => void saveMapping()}
					>
						<FileImage size={16} />
						{saving
							? t("matches.briefing.importing")
							: t("matches.scorecards.saveMapping")}
					</button>
				</div>
			</div>
		</div>
	);
}

function isStageCompleted(stage: MatchScorecardStage) {
	return typeof stage.timeSeconds === "number" && stage.timeSeconds > 0;
}

function getRequiredHits(stage: MatchScorecardStage) {
	return Math.max(
		0,
		stage.maxPoints ? Math.round(stage.maxPoints / 5) : (stage.minRounds ?? 0),
	);
}

function Counter({
	label,
	value,
	onChange,
	readOnly,
}: {
	label: string;
	value: number;
	onChange?: (value: number) => void;
	readOnly?: boolean;
}) {
	return (
		<div className="scorecard-counter-row">
			<span>{label}</span>
			<div>
				<button
					className="icon-button"
					type="button"
					disabled={readOnly || !onChange}
					onClick={() => onChange?.(Math.max(0, value - 1))}
				>
					−
				</button>
				<strong>{value}</strong>
				<button
					className="icon-button"
					type="button"
					disabled={readOnly || !onChange}
					onClick={() => onChange?.(value + 1)}
				>
					+
				</button>
			</div>
		</div>
	);
}

function ScorecardStageImage({
	url,
	stageName,
}: {
	url: string;
	stageName: string;
}) {
	const [lightboxOpen, setLightboxOpen] = useState(false);
	return (
		<>
			<button
				className="stage-asset-thumbnail-button scorecard-stage-image-button"
				type="button"
				onClick={() => setLightboxOpen(true)}
			>
				<img
					className="stage-asset-thumbnail"
					src={url}
					alt={stageName}
					loading="lazy"
				/>
			</button>
			{lightboxOpen ? (
				<div
					className="stage-asset-lightbox"
					role="presentation"
					onMouseDown={() => setLightboxOpen(false)}
				>
					<div
						className="stage-asset-lightbox-content"
						onMouseDown={(event) => event.stopPropagation()}
					>
						<button
							className="stage-asset-lightbox-close"
							type="button"
							onClick={() => setLightboxOpen(false)}
							aria-label="Close"
						>
							<X size={18} />
						</button>
						<img src={url} alt={stageName} />
					</div>
				</div>
			) : null}
		</>
	);
}

function getScorecardStageImage(scorecard: MatchScorecard, stageId: string) {
	const pageNumber = getEffectiveStagePageMapping(scorecard)?.[stageId];
	if (!pageNumber) return undefined;
	const page = scorecard.publicPages?.find(
		(item) => item.pageNumber === pageNumber,
	);
	return page
		? { ...page, url: repairScorecardPageUrl(page.url, scorecard) }
		: undefined;
}

function createBriefingMapping(
	stages: MatchScorecardStage[],
	candidates: Mare2BriefingStageCandidate[],
): Record<string, number> {
	const mapping: Record<string, number> = {};
	const usedPages = new Set<number>();
	for (const stage of stages) {
		const candidate = getCompatibleBriefingCandidates(stage, candidates).find(
			(candidateItem) => !usedPages.has(candidateItem.pageNumber),
		);
		if (!candidate) continue;
		mapping[stage.stageId] = candidate.pageNumber;
		usedPages.add(candidate.pageNumber);
	}
	return mapping;
}

function getCompatibleBriefingCandidates(
	stage: MatchScorecardStage,
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
	stages: MatchScorecardStage[],
	candidates: Mare2BriefingStageCandidate[],
	currentMapping: Record<string, number>,
	confirmedPages: Record<string, number>,
): Record<string, number> {
	const nextMapping = { ...currentMapping };
	for (const stage of stages) {
		if (confirmedPages[stage.stageId]) continue;
		const usedConfirmedPages = new Set(
			Object.entries(confirmedPages)
				.filter(([stageId]) => stageId !== stage.stageId)
				.map(([, page]) => page),
		);
		const remaining = getCompatibleBriefingCandidates(stage, candidates).filter(
			(candidate) => !usedConfirmedPages.has(candidate.pageNumber),
		);
		if (remaining.length === 1)
			nextMapping[stage.stageId] = remaining[0].pageNumber;
	}
	return nextMapping;
}

function StageImageMappingThumbnail({
	candidate,
}: {
	candidate: StageImageMappingCandidate;
}) {
	const blobUrl = useMemo(
		() =>
			candidate.imageBlob
				? URL.createObjectURL(candidate.imageBlob)
				: undefined,
		[candidate.imageBlob],
	);
	useEffect(() => {
		return () => {
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [blobUrl]);
	return (
		<img
			className="briefing-thumbnail"
			src={candidate.imageUrl ?? blobUrl}
			alt={`Page ${candidate.pageNumber}`}
		/>
	);
}

function filterCatalogMatches(
	matches: Mare2PublicCatalogMatch[],
	query: string,
) {
	const tokens = query
		.toLowerCase()
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean);
	if (tokens.length === 0) return matches;
	return matches.filter((match) =>
		tokens.every((token) =>
			[
				match.name,
				match.mare2MatchId,
				match.location,
				match.dateFrom,
				match.dateTo,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(token),
		),
	);
}

function isTodayMatch(match: Mare2PublicCatalogMatch) {
	const today = new Date().toISOString().slice(0, 10);
	return Boolean(
		match.dateFrom &&
			match.dateFrom <= today &&
			(match.dateTo ?? match.dateFrom) >= today,
	);
}

function isUpcomingMatch(match: Mare2PublicCatalogMatch) {
	const today = new Date().toISOString().slice(0, 10);
	return Boolean(match.dateFrom && match.dateFrom > today);
}

function formatDateRange(dateFrom?: string, dateTo?: string) {
	if (!dateFrom) return undefined;
	return dateTo && dateTo !== dateFrom ? `${dateFrom} / ${dateTo}` : dateFrom;
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) throw new Error(`Request failed (${response.status})`);
	return (await response.json()) as T;
}

function downloadOverride(scorecard: MatchScorecard) {
	const stagePageMapping = getEffectiveStagePageMapping(scorecard);
	if (!stagePageMapping) return;
	const blob = new Blob(
		[
			`${JSON.stringify({ format: "shooting-logbook-mare2-stage-page-override", schemaVersion: 1, mare2MatchId: scorecard.mare2MatchId, matchName: scorecard.matchName, generatedAt: new Date().toISOString(), stagePageMapping }, null, 2)}\n`,
		],
		{ type: "application/json" },
	);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${scorecard.mare2MatchId}.json`;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
