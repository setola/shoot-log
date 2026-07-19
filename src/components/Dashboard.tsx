import {
	Cloud,
	Package,
	Shield,
	Target,
	Timer,
	Trophy,
	Wrench,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import type { Section } from "../app/sections";
import { db } from "../db/schema";

type DashboardLogbookTab =
	| "firearms"
	| "reloading"
	| "maintenance"
	| "paperwork";

interface DashboardProps {
	onNavigate: (section: Section) => void;
	onNavigateLogbook: (tab: DashboardLogbookTab) => void;
}

export function Dashboard({ onNavigate, onNavigateLogbook }: DashboardProps) {
	const { t } = useTranslation();
	const firearms = useLiveQuery(() => db.firearms.toArray(), []);
	const trainingSessions = useLiveQuery(
		() => db.trainingSessions.toArray(),
		[],
	);
	const matchEvents = useLiveQuery(() => db.matchEvents.toArray(), []);
	const ammoTransactions = useLiveQuery(
		() => db.ammoTransactions.toArray(),
		[],
	);
	const maintenanceEvents = useLiveQuery(
		() => db.maintenanceEvents.toArray(),
		[],
	);

	const currentMonthSessions = trainingSessions?.filter((session) => {
		const sessionDate = new Date(session.date);
		const now = new Date();
		return (
			sessionDate.getMonth() === now.getMonth() &&
			sessionDate.getFullYear() === now.getFullYear()
		);
	});

	const currentMonthRounds =
		currentMonthSessions?.reduce(
			(sum, session) => sum + session.roundsFired,
			0,
		) ?? 0;

	return (
		<div className="dashboard-stack">
			<section className="privacy-banner">
				<div className="banner-icon">
					<Shield size={20} />
				</div>
				<div>
					<h2>{t("dashboard.welcomeTitle")}</h2>
					<p>{t("dashboard.welcomeDescription")}</p>
				</div>
			</section>

			<section aria-labelledby="overview-title">
				<div className="section-title-row">
					<h2 id="overview-title">{t("dashboard.overview")}</h2>
				</div>
				<div className="stat-grid">
					<StatCard
						icon={<Target size={18} />}
						label={t("dashboard.stats.firearms")}
						value={firearms?.length ?? 0}
						sub={t("dashboard.stats.activeFirearms", {
							count:
								firearms?.filter((firearm) => !firearm.archived).length ?? 0,
						})}
						onClick={() => onNavigateLogbook("firearms")}
						accent
					/>
					<StatCard
						icon={<Timer size={18} />}
						label={t("dashboard.stats.sessionsThisMonth")}
						value={currentMonthSessions?.length ?? 0}
						sub={t("dashboard.stats.roundsFired", {
							count: currentMonthRounds,
						})}
						onClick={() => onNavigate("training")}
					/>
					<StatCard
						icon={<Trophy size={18} />}
						label={t("dashboard.stats.matches")}
						value={matchEvents?.length ?? 0}
						sub={t("dashboard.stats.allTime")}
						onClick={() => onNavigate("matches")}
					/>
					<StatCard
						icon={<Package size={18} />}
						label={t("dashboard.stats.ammo")}
						value={ammoTransactions?.length ?? 0}
						sub={t("dashboard.stats.inventory")}
						onClick={() => onNavigateLogbook("reloading")}
					/>
					<StatCard
						icon={<Wrench size={18} />}
						label={t("dashboard.stats.maintenance")}
						value={maintenanceEvents?.length ?? 0}
						sub={t("dashboard.stats.reminders")}
						onClick={() => onNavigateLogbook("maintenance")}
					/>
					<StatCard
						icon={<Cloud size={18} />}
						label={t("dashboard.stats.drive")}
						value={t("dashboard.stats.notConnected")}
						sub={t("dashboard.stats.connectBackup")}
						onClick={() => onNavigate("settings")}
					/>
				</div>
			</section>
		</div>
	);
}

interface StatCardProps {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	sub: string;
	accent?: boolean;
	onClick: () => void;
}

function StatCard({ icon, label, value, sub, accent, onClick }: StatCardProps) {
	return (
		<button
			className={accent ? "stat-card stat-card-accent" : "stat-card"}
			type="button"
			onClick={onClick}
		>
			<span className="stat-icon">{icon}</span>
			<span className="stat-value">{value}</span>
			<span className="stat-label">{label}</span>
			<span className="stat-sub">{sub}</span>
		</button>
	);
}
