import {
	Clock,
	Cloud,
	CloudDownload,
	CloudUpload,
	Database,
	LogOut,
	RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	connectGoogleDrive,
	disconnectGoogleDrive,
	downloadDriveBackup,
	getDriveAppDataUsage,
	hasGoogleDriveAccessToken,
	hasStoredGoogleDriveAuthorization,
	isGoogleDriveConfigured,
	uploadDriveBackup,
	type DriveAppDataUsage,
} from "../sync/googleDrive";

interface DriveSyncPanelProps {
	lastSyncedAt: string | null;
	onBackupContentRequested: () => Promise<string>;
	onRestoreContent: (content: string) => Promise<void>;
	onLastSyncedAtChange: (timestamp: string | null) => void;
	embedded?: boolean;
}

type SyncState = "idle" | "connecting" | "syncing" | "restoring" | "error";

export function DriveSyncPanel({
	lastSyncedAt,
	onBackupContentRequested,
	onRestoreContent,
	onLastSyncedAtChange,
	embedded = false,
}: DriveSyncPanelProps) {
	const { t } = useTranslation();
	const [connected, setConnected] = useState(
		() => hasGoogleDriveAccessToken() || hasStoredGoogleDriveAuthorization(),
	);
	const [state, setState] = useState<SyncState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [driveUsage, setDriveUsage] = useState<DriveAppDataUsage | null>(null);
	const configured = isGoogleDriveConfigured();

	async function refreshDriveUsage() {
		if (!hasGoogleDriveAccessToken()) return;
		setDriveUsage(await getDriveAppDataUsage());
	}

	useEffect(() => {
		if (!connected || !hasGoogleDriveAccessToken()) return;

		let active = true;
		void getDriveAppDataUsage()
			.then((usage) => {
				if (active) setDriveUsage(usage);
			})
			.catch(() => undefined);

		return () => {
			active = false;
		};
	}, [connected]);

	async function handleConnect() {
		setState("connecting");
		setError(null);

		try {
			await connectGoogleDrive("consent");
			setConnected(true);
			await refreshDriveUsage();
			setState("idle");
		} catch (caught) {
			setError(toErrorMessage(caught));
			setState("error");
		}
	}

	async function handleDisconnect() {
		await disconnectGoogleDrive();
		setConnected(false);
		setDriveUsage(null);
		onLastSyncedAtChange(null);
	}

	async function handleBackup() {
		setState("syncing");
		setError(null);

		try {
			if (!hasGoogleDriveAccessToken()) {
				await connectGoogleDrive("");
				setConnected(true);
			}

			const content = await onBackupContentRequested();
			await uploadDriveBackup(content);
			await refreshDriveUsage();
			const timestamp = new Date().toISOString();
			onLastSyncedAtChange(timestamp);
			setState("idle");
		} catch (caught) {
			setError(toErrorMessage(caught));
			setState("error");
		}
	}

	async function handleRestore() {
		if (!window.confirm(t("sync.restoreConfirm"))) {
			return;
		}

		setState("restoring");
		setError(null);

		try {
			if (!hasGoogleDriveAccessToken()) {
				await connectGoogleDrive("");
				setConnected(true);
			}

			const content = await downloadDriveBackup();

			if (!content) {
				setError(t("sync.noBackupFound"));
				setState("error");
				return;
			}

			await onRestoreContent(content);
			await refreshDriveUsage();
			const timestamp = new Date().toISOString();
			onLastSyncedAtChange(timestamp);
			setState("idle");
		} catch (caught) {
			setError(toErrorMessage(caught));
			setState("error");
		}
	}

	const busy =
		state === "connecting" || state === "syncing" || state === "restoring";

	const content = (
		<>
			<div className="sync-hero-card">
				<div className="sync-status-icon">
					{busy ? (
						<RefreshCw size={24} className="spin" />
					) : (
						<Cloud size={24} />
					)}
				</div>
				<div>
					<h3>
						{connected ? t("sync.connectedTitle") : t("sync.disconnectedTitle")}
					</h3>
					<p>
						{connected
							? t("sync.connectedDescription")
							: t("sync.disconnectedDescription")}
					</p>
					<div className="sync-meta-list">
						<span className="sync-meta-row">
							<Clock size={14} />
							{lastSyncedAt
								? t("sync.lastSyncedAt", {
										date: new Date(lastSyncedAt).toLocaleString(),
									})
								: t("sync.neverSynced")}
						</span>
						<span className="sync-meta-row">
							<Database size={14} />
							{driveUsage
								? t("sync.storageUsage", {
										size: formatBytes(driveUsage.totalBytes),
										count: driveUsage.fileCount,
									})
								: connected
									? t("sync.storageUsageLoading")
									: t("sync.storageUsageDisconnected")}
						</span>
					</div>
				</div>
			</div>

			{!configured ? (
				<div className="warning-card embedded-warning-card">
					<h3>{t("sync.configurationMissingTitle")}</h3>
					<p>{t("sync.configurationMissingDescription")}</p>
				</div>
			) : null}

			<div>
				<h3>{t("sync.actionsTitle")}</h3>
				<div className="data-actions">
					<SyncAction
						icon={<Cloud size={17} />}
						title={t("sync.connectTitle")}
						description={t("sync.connectDescription")}
						buttonLabel={
							connected ? t("sync.connectedButton") : t("sync.connectButton")
						}
						disabled={!configured || busy || connected}
						onClick={() => void handleConnect()}
					/>
					<SyncAction
						icon={<CloudUpload size={17} />}
						title={t("sync.backupTitle")}
						description={t("sync.backupDescription")}
						buttonLabel={
							state === "syncing"
								? t("sync.backingUpButton")
								: t("sync.backupButton")
						}
						disabled={!configured || busy || !connected}
						onClick={() => void handleBackup()}
					/>
					<SyncAction
						icon={<CloudDownload size={17} />}
						title={t("sync.restoreTitle")}
						description={t("sync.restoreDescription")}
						buttonLabel={
							state === "restoring"
								? t("sync.restoringButton")
								: t("sync.restoreButton")
						}
						disabled={!configured || busy || !connected}
						onClick={() => void handleRestore()}
					/>
					<SyncAction
						icon={<LogOut size={17} />}
						title={t("sync.disconnectTitle")}
						description={t("sync.disconnectDescription")}
						buttonLabel={t("sync.disconnectButton")}
						disabled={busy || !connected}
						onClick={() => void handleDisconnect()}
					/>
				</div>
			</div>

			{error ? (
				<div className="warning-card embedded-warning-card" role="alert">
					<h3>{t("sync.errorTitle")}</h3>
					<p>{error}</p>
				</div>
			) : null}
		</>
	);

	if (embedded) {
		return <div className="embedded-drive-sync">{content}</div>;
	}

	return (
		<section className="screen-stack" aria-labelledby="sync-title">
			<div className="section-heading figma-heading">
				<div>
					<h2 id="sync-title">{t("sync.title")}</h2>
					<p>{t("sync.description")}</p>
				</div>
			</div>
			<article className="settings-card embedded-drive-sync">{content}</article>
		</section>
	);
}

interface SyncActionProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	buttonLabel: string;
	disabled?: boolean;
	onClick: () => void;
}

function SyncAction({
	icon,
	title,
	description,
	buttonLabel,
	disabled,
	onClick,
}: SyncActionProps) {
	return (
		<div className="settings-action">
			<div className="settings-action-copy">
				<span className="settings-action-icon">{icon}</span>
				<div>
					<p>{title}</p>
					<span>{description}</span>
				</div>
			</div>
			<button
				className="button button-secondary"
				type="button"
				disabled={disabled}
				onClick={onClick}
			>
				{buttonLabel}
			</button>
		</div>
	);
}

function formatBytes(bytes: number): string {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const unitIndex = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** unitIndex;
	return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: value >= 10 ? 1 : 2 }).format(value)} ${units[unitIndex]}`;
}

function toErrorMessage(caught: unknown): string {
	return caught instanceof Error ? caught.message : String(caught);
}
