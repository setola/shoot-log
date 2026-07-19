import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dashboard } from "../components/Dashboard";
import { DriveSyncPanel } from "../components/DriveSyncPanel";
import { BottomNav, Header, Sidebar } from "../components/Navigation";
import { SettingsPanel } from "../components/SettingsPanel";
import { StatusMessage } from "../components/StatusMessage";
import { db } from "../db/schema";
import {
	AmmunitionCrud,
	type AmmunitionTab,
} from "../domain/ammunition/AmmunitionCrud";
import { FirearmsCrud } from "../domain/firearms/FirearmsCrud";
import { MaintenanceCrud } from "../domain/maintenance/MaintenanceCrud";
import { MatchAnalysis } from "../domain/matches/MatchAnalysis";
import { MatchesCrud } from "../domain/matches/MatchesCrud";
import { MatchScorecards } from "../domain/matches/MatchScorecards";
import type { MatchEvent } from "../domain/matches/types";
import { PaperworkCrud } from "../domain/paperwork/PaperworkCrud";
import { TrainingCrud } from "../domain/training/TrainingCrud";
import type { MatchStageAsset } from "../domain/matches/stageAssets";
import type { PaperworkAttachment } from "../domain/paperwork/attachmentTypes";
import { createBackupEnvelope } from "../export/jsonExport";
import type { Section } from "./sections";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "shooting-logbook-theme";
const SECTION_STORAGE_KEY = "shooting-logbook-section";
const LAST_DRIVE_SYNC_STORAGE_KEY = "shooting-logbook-last-drive-sync";
const AUTO_IMPORT_URL_PARAMS = ["importJsonUrl", "importUrl", "jsonUrl"];
const AUTO_IMPORT_SAMPLE_PARAMS = ["importSample", "sampleData"];

function getInitialTheme(): Theme {
	const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

	if (storedTheme === "light" || storedTheme === "dark") {
		return storedTheme;
	}

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

type MatchesTab = "registry" | "analysis" | "scorecards";
type LogbookTab = "firearms" | "reloading" | "maintenance" | "paperwork";

interface AppRoute {
	section: Section;
	matchesTab: MatchesTab;
	logbookTab: LogbookTab;
	ammunitionTab: AmmunitionTab;
}

const SECTIONS: Section[] = [
	"dashboard",
	"matches",
	"training",
	"logbook",
	"settings",
];

function readRouteFromLocation(): AppRoute {
	const params = new URLSearchParams(window.location.search);
	const sectionParam = params.get("section");
	const tabParam = params.get("tab");
	const storedSection = window.localStorage.getItem(SECTION_STORAGE_KEY);
	const legacyLogbookTab = getLegacyLogbookTab(sectionParam);
	const storedLegacyLogbookTab = getLegacyLogbookTab(storedSection);
	const section =
		sectionParam === "analysis"
			? "matches"
			: legacyLogbookTab
				? "logbook"
				: SECTIONS.includes(sectionParam as Section)
					? (sectionParam as Section)
					: storedLegacyLogbookTab
						? "logbook"
						: SECTIONS.includes(storedSection as Section)
							? (storedSection as Section)
							: "dashboard";

	return {
		section,
		matchesTab:
			sectionParam === "analysis" || tabParam === "analysis"
				? "analysis"
				: tabParam === "scorecards"
					? "scorecards"
					: "registry",
		logbookTab:
			legacyLogbookTab ??
			storedLegacyLogbookTab ??
			(isLogbookTab(tabParam) ? tabParam : "firearms"),
		ammunitionTab: isAmmunitionTab(params.get("reloadingTab") ?? tabParam)
			? ((params.get("reloadingTab") ?? tabParam) as AmmunitionTab)
			: "recipes",
	};
}

function isLogbookTab(value: string | null): value is LogbookTab {
	return ["firearms", "reloading", "maintenance", "paperwork"].includes(
		value ?? "",
	);
}

function getLegacyLogbookTab(value: string | null): LogbookTab | undefined {
	if (value === "firearms") return "firearms";
	if (value === "ammunition") return "reloading";
	if (value === "maintenance") return "maintenance";
	if (value === "paperwork") return "paperwork";
	return undefined;
}

function isAmmunitionTab(value: string | null): value is AmmunitionTab {
	return ["recipes", "chrono", "components", "stock"].includes(value ?? "");
}

function writeRouteToLocation(
	section: Section,
	options: {
		matchesTab?: MatchesTab;
		logbookTab?: LogbookTab;
		ammunitionTab?: AmmunitionTab;
	} = {},
	mode: "push" | "replace" = "push",
) {
	const url = new URL(window.location.href);
	url.searchParams.set("section", section);
	url.searchParams.delete("tab");
	if (
		section === "matches" &&
		options.matchesTab &&
		options.matchesTab !== "registry"
	) {
		url.searchParams.set("tab", options.matchesTab);
	} else {
		url.searchParams.delete("match");
		url.searchParams.delete("mare2");
		url.searchParams.delete("mare2MatchId");
		url.searchParams.delete("competitors");
		url.searchParams.delete("compare");
		url.searchParams.delete("shooters");
	}
	url.searchParams.delete("reloadingTab");
	if (section === "logbook") {
		const logbookTab = options.logbookTab ?? "firearms";
		url.searchParams.set("tab", logbookTab);
		if (logbookTab === "reloading") {
			url.searchParams.set("reloadingTab", options.ammunitionTab ?? "recipes");
		}
	}
	if (mode === "replace") window.history.replaceState(null, "", url.toString());
	else window.history.pushState(null, "", url.toString());
}

async function blobToBase64(blob: Blob): Promise<string> {
	const dataUrl = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

	return dataUrl.split(",")[1] ?? "";
}

function deserializeMatchStageAsset(value: unknown): MatchStageAsset {
	const asset = value as Record<string, unknown>;
	const content =
		typeof asset.content === "string"
			? base64ToBlob(asset.content, String(asset.mimeType ?? "image/png"))
			: new Blob();

	return {
		id: String(asset.id),
		matchEventId: String(asset.matchEventId),
		internalStageId: String(asset.internalStageId),
		sourceFileName: String(asset.sourceFileName),
		sourcePageNumber: Number(asset.sourcePageNumber ?? 0),
		courseType:
			typeof asset.courseType === "string" ? asset.courseType : undefined,
		minRounds:
			typeof asset.minRounds === "number" ? asset.minRounds : undefined,
		maxPoints:
			typeof asset.maxPoints === "number" ? asset.maxPoints : undefined,
		mimeType: String(asset.mimeType ?? "image/png"),
		size: Number(asset.size ?? 0),
		content,
		createdAt: String(asset.createdAt),
		updatedAt: String(asset.updatedAt),
	};
}

function deserializePaperworkAttachment(value: unknown): PaperworkAttachment {
	const attachment = value as Record<string, unknown>;
	const content =
		typeof attachment.content === "string"
			? base64ToBlob(
					attachment.content,
					String(attachment.mimeType ?? "application/octet-stream"),
				)
			: new Blob();

	return {
		id: String(attachment.id),
		credentialId: String(attachment.credentialId),
		fileName: String(attachment.fileName),
		mimeType: String(attachment.mimeType ?? "application/octet-stream"),
		size: Number(attachment.size ?? 0),
		content,
		createdAt: String(attachment.createdAt),
		updatedAt: String(attachment.updatedAt),
	};
}

function base64ToBlob(base64: string, mimeType: string): Blob {
	const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
	return new Blob([bytes], { type: mimeType });
}

function getAutoImportUrlFromLocation(): URL | null {
	const params = new URLSearchParams(window.location.search);
	const shouldImportSample = AUTO_IMPORT_SAMPLE_PARAMS.some((param) =>
		isTruthyUrlParam(params.get(param)),
	);

	if (shouldImportSample) {
		return new URL("./sample-backup.json", window.location.href);
	}

	const rawUrl = AUTO_IMPORT_URL_PARAMS.map((param) => params.get(param)).find(
		Boolean,
	);
	if (!rawUrl) return null;

	const importUrl = new URL(rawUrl, window.location.href);
	if (importUrl.protocol !== "https:" && importUrl.protocol !== "http:") {
		throw new Error("unsupported-import-url-protocol");
	}

	return importUrl;
}

function isTruthyUrlParam(value: string | null): boolean {
	return value !== null && value !== "0" && value.toLowerCase() !== "false";
}

function removeAutoImportParamsFromLocation(): void {
	const url = new URL(window.location.href);
	let changed = false;

	for (const param of [
		...AUTO_IMPORT_URL_PARAMS,
		...AUTO_IMPORT_SAMPLE_PARAMS,
	]) {
		if (url.searchParams.has(param)) {
			url.searchParams.delete(param);
			changed = true;
		}
	}

	if (changed) {
		window.history.replaceState(
			null,
			"",
			`${url.pathname}${url.search}${url.hash}`,
		);
	}
}

export function App() {
	const { i18n, t } = useTranslation();
	const [theme, setTheme] = useState<Theme>(getInitialTheme);
	const [route, setRoute] = useState<AppRoute>(readRouteFromLocation);
	const activeSection = route.section;
	const matchesTab = route.matchesTab;
	const logbookTab = route.logbookTab;
	const ammunitionTab = route.ammunitionTab;
	const [lastDriveSyncedAt, setLastDriveSyncedAt] = useState<string | null>(
		() => window.localStorage.getItem(LAST_DRIVE_SYNC_STORAGE_KEY),
	);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [autoImportStatus, setAutoImportStatus] = useState<
		"idle" | "importing" | "success" | "error"
	>("idle");
	const [autoImportError, setAutoImportError] = useState<string | null>(null);

	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.style.colorScheme = theme;
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	}, [theme]);

	useEffect(() => {
		window.localStorage.setItem(SECTION_STORAGE_KEY, activeSection);
	}, [activeSection]);

	useEffect(() => {
		writeRouteToLocation(
			activeSection,
			{ matchesTab, ammunitionTab },
			"replace",
		);
		// Normalize the initial URL once so the currently visible page is shareable.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		function handlePopState() {
			setRoute(readRouteFromLocation());
		}
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	useEffect(() => {
		let autoImportUrl: URL | null;

		try {
			autoImportUrl = getAutoImportUrlFromLocation();
		} catch (error) {
			removeAutoImportParamsFromLocation();
			queueMicrotask(() => {
				setAutoImportError(
					error instanceof Error ? error.message : String(error),
				);
				setAutoImportStatus("error");
			});
			return;
		}

		if (!autoImportUrl) return;

		removeAutoImportParamsFromLocation();
		queueMicrotask(() => {
			setAutoImportStatus("importing");
			setAutoImportError(null);
		});

		void fetch(autoImportUrl.toString(), { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(`import-url-request-failed-${response.status}`);
				}

				await importBackup(await response.text());
				setAutoImportStatus("success");
			})
			.catch((error: unknown) => {
				setAutoImportError(
					error instanceof Error ? error.message : String(error),
				);
				setAutoImportStatus("error");
			});
	}, []);

	async function collectBackupPayload() {
		const [
			firearms,
			trainingSessions,
			matchEvents,
			practiscoreMatchImports,
			matchStageAssets,
			ammunitionBatches,
			ammoTransactions,
			reloadingBullets,
			reloadingPowders,
			reloadingPrimers,
			reloadingBrass,
			reloadingRecipes,
			chronographSessions,
			maintenanceEvents,
			paperworkCredentials,
			paperworkAttachments,
			appSettings,
			regularCompetitors,
			matchAnalysisSelections,
			matchScorecards,
		] = await Promise.all([
			db.firearms.toArray(),
			db.trainingSessions.toArray(),
			db.matchEvents.toArray(),
			db.practiscoreMatchImports.toArray(),
			db.matchStageAssets.toArray(),
			db.ammunitionBatches.toArray(),
			db.ammoTransactions.toArray(),
			db.reloadingBullets.toArray(),
			db.reloadingPowders.toArray(),
			db.reloadingPrimers.toArray(),
			db.reloadingBrass.toArray(),
			db.reloadingRecipes.toArray(),
			db.chronographSessions.toArray(),
			db.maintenanceEvents.toArray(),
			db.paperworkCredentials.toArray(),
			db.paperworkAttachments.toArray(),
			db.appSettings.toArray(),
			db.regularCompetitors.toArray(),
			db.matchAnalysisSelections.toArray(),
			db.matchScorecards.toArray(),
		]);

		const serializedMatchStageAssets = await Promise.all(
			matchStageAssets.map(async (asset) => ({
				...asset,
				content: await blobToBase64(asset.content),
			})),
		);

		const serializedPaperworkAttachments = await Promise.all(
			paperworkAttachments.map(async (attachment) => ({
				...attachment,
				content: await blobToBase64(attachment.content),
			})),
		);

		return {
			firearms,
			trainingSessions,
			matchEvents,
			practiscoreMatchImports,
			matchStageAssets: serializedMatchStageAssets,
			ammunitionBatches,
			ammoTransactions,
			reloadingBullets,
			reloadingPowders,
			reloadingPrimers,
			reloadingBrass,
			reloadingRecipes,
			chronographSessions,
			maintenanceEvents,
			paperworkCredentials,
			paperworkAttachments: serializedPaperworkAttachments,
			appSettings,
			regularCompetitors,
			matchAnalysisSelections,
			matchScorecards,
		};
	}

	async function createBackupJson() {
		const payload = await collectBackupPayload();
		const envelope = createBackupEnvelope(payload);
		return JSON.stringify(envelope, null, 2);
	}

	async function handleExportData() {
		const backupJson = await createBackupJson();
		const blob = new Blob([backupJson], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `shooting-logbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	function handleImportData(file: File) {
		const reader = new FileReader();
		reader.onload = () => {
			void importBackup(String(reader.result ?? ""));
		};
		reader.readAsText(file);
	}

	async function importBackup(rawJson: string) {
		const parsed = JSON.parse(rawJson) as {
			payload?: Record<string, unknown>;
		} & Record<string, unknown>;
		const payload: Record<string, unknown> =
			parsed.payload && typeof parsed.payload === "object"
				? parsed.payload
				: parsed;

		await db.transaction(
			"rw",
			[
				db.firearms,
				db.trainingSessions,
				db.matchEvents,
				db.practiscoreMatchImports,
				db.matchStageAssets,
				db.ammunitionBatches,
				db.ammoTransactions,
				db.reloadingBullets,
				db.reloadingPowders,
				db.reloadingPrimers,
				db.reloadingBrass,
				db.reloadingRecipes,
				db.chronographSessions,
				db.maintenanceEvents,
				db.paperworkCredentials,
				db.paperworkAttachments,
				db.appSettings,
				db.regularCompetitors,
				db.matchAnalysisSelections,
				db.matchScorecards,
			],
			async () => {
				if (Array.isArray(payload.firearms))
					await db.firearms.bulkPut(payload.firearms);
				if (Array.isArray(payload.trainingSessions))
					await db.trainingSessions.bulkPut(payload.trainingSessions);
				if (Array.isArray(payload.matchEvents))
					await db.matchEvents.bulkPut(payload.matchEvents);
				if (Array.isArray(payload.practiscoreMatchImports))
					await db.practiscoreMatchImports.bulkPut(
						payload.practiscoreMatchImports,
					);
				if (Array.isArray(payload.matchStageAssets))
					await db.matchStageAssets.bulkPut(
						payload.matchStageAssets.map(deserializeMatchStageAsset),
					);
				if (Array.isArray(payload.ammunitionBatches))
					await db.ammunitionBatches.bulkPut(payload.ammunitionBatches);
				if (Array.isArray(payload.ammoTransactions))
					await db.ammoTransactions.bulkPut(payload.ammoTransactions);
				if (Array.isArray(payload.reloadingBullets))
					await db.reloadingBullets.bulkPut(payload.reloadingBullets);
				if (Array.isArray(payload.reloadingPowders))
					await db.reloadingPowders.bulkPut(payload.reloadingPowders);
				if (Array.isArray(payload.reloadingPrimers))
					await db.reloadingPrimers.bulkPut(payload.reloadingPrimers);
				if (Array.isArray(payload.reloadingBrass))
					await db.reloadingBrass.bulkPut(payload.reloadingBrass);
				if (Array.isArray(payload.reloadingRecipes))
					await db.reloadingRecipes.bulkPut(payload.reloadingRecipes);
				if (Array.isArray(payload.chronographSessions))
					await db.chronographSessions.bulkPut(payload.chronographSessions);
				if (Array.isArray(payload.maintenanceEvents))
					await db.maintenanceEvents.bulkPut(payload.maintenanceEvents);
				if (Array.isArray(payload.paperworkCredentials))
					await db.paperworkCredentials.bulkPut(payload.paperworkCredentials);
				if (Array.isArray(payload.paperworkAttachments)) {
					await db.paperworkAttachments.bulkPut(
						payload.paperworkAttachments.map(deserializePaperworkAttachment),
					);
				}
				if (Array.isArray(payload.appSettings))
					await db.appSettings.bulkPut(payload.appSettings);
				if (Array.isArray(payload.regularCompetitors))
					await db.regularCompetitors.bulkPut(payload.regularCompetitors);
				if (Array.isArray(payload.matchAnalysisSelections))
					await db.matchAnalysisSelections.bulkPut(
						payload.matchAnalysisSelections,
					);
				if (Array.isArray(payload.matchScorecards))
					await db.matchScorecards.bulkPut(payload.matchScorecards);
			},
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
			"rw",
			[
				db.firearms,
				db.trainingSessions,
				db.matchEvents,
				db.practiscoreMatchImports,
				db.matchStageAssets,
				db.ammunitionBatches,
				db.ammoTransactions,
				db.reloadingBullets,
				db.reloadingPowders,
				db.reloadingPrimers,
				db.reloadingBrass,
				db.reloadingRecipes,
				db.chronographSessions,
				db.maintenanceEvents,
				db.paperworkCredentials,
				db.paperworkAttachments,
				db.appSettings,
				db.regularCompetitors,
				db.matchAnalysisSelections,
				db.matchScorecards,
			],
			async () => {
				await Promise.all([
					db.firearms.clear(),
					db.trainingSessions.clear(),
					db.matchEvents.clear(),
					db.practiscoreMatchImports.clear(),
					db.matchStageAssets.clear(),
					db.ammunitionBatches.clear(),
					db.ammoTransactions.clear(),
					db.reloadingBullets.clear(),
					db.reloadingPowders.clear(),
					db.reloadingPrimers.clear(),
					db.reloadingBrass.clear(),
					db.reloadingRecipes.clear(),
					db.chronographSessions.clear(),
					db.maintenanceEvents.clear(),
					db.paperworkCredentials.clear(),
					db.paperworkAttachments.clear(),
					db.appSettings.clear(),
					db.regularCompetitors.clear(),
					db.matchAnalysisSelections.clear(),
					db.matchScorecards.clear(),
				]);
			},
		);
	}

	function navigateToSection(section: Section) {
		const nextRoute: AppRoute = {
			section,
			matchesTab: "registry",
			logbookTab: "firearms",
			ammunitionTab: "recipes",
		};
		writeRouteToLocation(section, nextRoute);
		setRoute(nextRoute);
	}

	function navigateToLogbookTab(nextTab: LogbookTab) {
		const nextRoute = {
			...route,
			section: "logbook" as const,
			logbookTab: nextTab,
		};
		writeRouteToLocation("logbook", nextRoute);
		setRoute(nextRoute);
	}

	function navigateToMatchesTab(nextTab: MatchesTab) {
		const nextRoute = {
			...route,
			section: "matches" as const,
			matchesTab: nextTab,
		};
		writeRouteToLocation("matches", { matchesTab: nextTab });
		setRoute(nextRoute);
	}

	function navigateToAmmunitionTab(nextTab: AmmunitionTab) {
		const nextRoute = {
			...route,
			section: "logbook" as const,
			logbookTab: "reloading" as const,
			ammunitionTab: nextTab,
		};
		writeRouteToLocation("logbook", nextRoute);
		setRoute(nextRoute);
	}

	function openMatchAnalysis(match: MatchEvent) {
		const url = new URL(window.location.href);
		url.searchParams.set("section", "matches");
		url.searchParams.set("tab", "analysis");
		url.searchParams.delete("mare2");
		url.searchParams.delete("mare2MatchId");
		url.searchParams.set("match", match.practiscoreMatchId ?? match.id);
		url.searchParams.delete("competitors");
		url.searchParams.delete("compare");
		url.searchParams.delete("shooters");
		window.history.pushState(null, "", url.toString());
		setRoute({ ...route, section: "matches", matchesTab: "analysis" });
	}

	function renderMatchesSection() {
		return (
			<div className="screen-stack">
				<div className="tab-row">
					{(["registry", "analysis", "scorecards"] as MatchesTab[]).map(
						(tab) => (
							<button
								key={tab}
								type="button"
								className={
									matchesTab === tab
										? "tab-button tab-button-active"
										: "tab-button"
								}
								onClick={() => navigateToMatchesTab(tab)}
							>
								{t(`matches.tabs.${tab}`)}
							</button>
						),
					)}
				</div>
				{matchesTab === "registry" ? (
					<MatchesCrud onAnalyzeMatch={openMatchAnalysis} />
				) : null}
				{matchesTab === "analysis" ? <MatchAnalysis /> : null}
				{matchesTab === "scorecards" ? <MatchScorecards /> : null}
			</div>
		);
	}

	function renderLogbookSection() {
		const tabs: Array<{ id: LogbookTab; label: string }> = [
			{ id: "firearms", label: t("logbook.tabs.firearms") },
			{ id: "reloading", label: t("logbook.tabs.reloading") },
			{ id: "maintenance", label: t("logbook.tabs.maintenance") },
			{ id: "paperwork", label: t("logbook.tabs.paperwork") },
		];
		return (
			<div className="screen-stack">
				<div className="tab-row">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							className={
								logbookTab === tab.id
									? "tab-button tab-button-active"
									: "tab-button"
							}
							onClick={() => navigateToLogbookTab(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>
				{logbookTab === "firearms" ? <FirearmsCrud /> : null}
				{logbookTab === "reloading" ? (
					<AmmunitionCrud
						tab={ammunitionTab}
						onTabChange={navigateToAmmunitionTab}
					/>
				) : null}
				{logbookTab === "maintenance" ? <MaintenanceCrud /> : null}
				{logbookTab === "paperwork" ? <PaperworkCrud /> : null}
			</div>
		);
	}

	function renderSection() {
		switch (activeSection) {
			case "dashboard":
				return (
					<Dashboard
						onNavigate={navigateToSection}
						onNavigateLogbook={navigateToLogbookTab}
					/>
				);
			case "training":
				return <TrainingCrud />;
			case "matches":
				return renderMatchesSection();
			case "logbook":
				return renderLogbookSection();
			case "settings":
				return (
					<SettingsPanel
						driveSyncContent={
							<DriveSyncPanel
								embedded
								lastSyncedAt={lastDriveSyncedAt}
								onBackupContentRequested={createBackupJson}
								onRestoreContent={importBackup}
								onLastSyncedAtChange={handleLastDriveSyncedAtChange}
							/>
						}
						onExportData={() => void handleExportData()}
						onImportData={handleImportData}
						onClearData={handleClearData}
					/>
				);
			default:
				return null;
		}
	}

	return (
		<div className="app-layout">
			<Sidebar
				active={activeSection}
				mobileOpen={mobileMenuOpen}
				onNavigate={navigateToSection}
				onMobileClose={() => setMobileMenuOpen(false)}
			/>
			<div className="main-column">
				<Header
					active={activeSection}
					theme={theme}
					language={i18n.language}
					onMenuOpen={() => setMobileMenuOpen(true)}
					onThemeChange={setTheme}
					onLanguageChange={(language) => void i18n.changeLanguage(language)}
				/>
				<main className="main-content">
					{autoImportStatus !== "idle" ? (
						<StatusMessage
							tone={autoImportStatus === "error" ? "error" : "success"}
							onDismiss={() => setAutoImportStatus("idle")}
						>
							{autoImportStatus === "importing" && t("importUrl.importing")}
							{autoImportStatus === "success" && t("importUrl.success")}
							{autoImportStatus === "error" &&
								t("importUrl.error", { error: autoImportError })}
						</StatusMessage>
					) : null}
					{renderSection()}
				</main>
			</div>
			<BottomNav active={activeSection} onNavigate={navigateToSection} />
		</div>
	);
}
