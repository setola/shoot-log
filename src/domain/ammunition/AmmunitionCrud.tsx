import { type FormEvent, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { FlaskConical, Gauge, Package, Save, X } from "lucide-react";
import {
	EntityActionPanel,
	EntityAddButton,
	EntityPage,
	RecordActionButtons,
} from "../../components/EntityUi";
import { db } from "../../db/schema";
import type {
	AmmunitionBatch,
	AmmoTransaction,
	ChronographSession,
	ReloadingBrass,
	ReloadingBullet,
	ReloadingPowder,
	ReloadingPrimer,
	ReloadingRecipe,
} from "./types";
import {
	ammunitionToFormValues,
	brassToFormValues,
	bulletToFormValues,
	calculateChronographStats,
	chronographSessionToFormValues,
	computeBatchStock,
	createAmmoTransaction,
	createAmmunitionBatch,
	createEmptyAmmoTransactionForm,
	createEmptyAmmunitionForm,
	createEmptyBrassForm,
	createEmptyBulletForm,
	createEmptyChronographForm,
	createEmptyPowderForm,
	createEmptyPrimerForm,
	createEmptyRecipeForm,
	deleteAmmoTransaction,
	deleteAmmunitionBatch,
	deleteBrass,
	deleteBullet,
	deleteChronographSession,
	deletePowder,
	deletePrimer,
	deleteRecipe,
	parseVelocityReadings,
	powderToFormValues,
	primerToFormValues,
	recipeToFormValues,
	saveBrass,
	saveBullet,
	saveChronographSession,
	savePowder,
	savePrimer,
	saveRecipe,
	updateAmmunitionBatch,
	type AmmunitionFormValues,
	type AmmoTransactionFormValues,
	type ChronographSessionFormValues,
	type ReloadingBrassFormValues,
	type ReloadingBulletFormValues,
	type ReloadingPowderFormValues,
	type ReloadingPrimerFormValues,
	type ReloadingRecipeFormValues,
} from "./ammunitionRepository";

const COMMON_CALIBERS = [
	"9x19",
	"9×19mm",
	".40 S&W",
	".45 ACP",
	".38 Super",
	".357 Magnum",
	".223 Rem",
	"12 gauge",
];
const COMMON_RELOADING_BRANDS = [
	"Fiocchi",
	"Federal",
	"Sellier & Bellot",
	"Magtech",
	"CamPro",
	"LOS",
	"Frontier",
	"H&N",
	"Vihtavuori",
	"Lovex",
	"Vectan",
	"Hodgdon",
	"Winchester",
	"CCI",
	"Cheddite",
	"Murom",
];
const COMMON_POWDER_NAMES = [
	"N310",
	"N320",
	"N330",
	"N340",
	"N350",
	"3N37",
	"BA9",
	"BA9 1/2",
	"D032",
	"D036",
	"Titegroup",
	"HP-38",
	"Win 231",
];
const COMMON_PRIMER_TYPES = [
	"Small Pistol",
	"Small Pistol Magnum",
	"Large Pistol",
	"Large Pistol Magnum",
	"Small Rifle",
	"Small Rifle Magnum",
	"Large Rifle",
	"Large Rifle Magnum",
	"Shotgun 209",
];
const COMMON_BULLET_PROFILES = [
	"RN",
	"TC",
	"FP",
	"HP",
	"JHP",
	"FMJ",
	"CMJ",
	"LRN",
	"SWC",
];

export type AmmunitionTab = "recipes" | "components" | "chrono" | "stock";
type ComponentDialogType = "bullet" | "powder" | "primer" | "brass";
type DeleteTarget =
	| { type: "batch"; id: string }
	| { type: "transaction"; id: string }
	| { type: "bullet"; id: string }
	| { type: "powder"; id: string }
	| { type: "primer"; id: string }
	| { type: "brass"; id: string }
	| { type: "recipe"; id: string }
	| { type: "chrono"; id: string };

export function AmmunitionCrud({
	fixedTab,
	tab,
	onTabChange,
}: {
	fixedTab?: AmmunitionTab;
	tab?: AmmunitionTab;
	onTabChange?: (tab: AmmunitionTab) => void;
} = {}) {
	const { t } = useTranslation();
	const batches = useLiveQuery(
		() => db.ammunitionBatches.orderBy("caliber").toArray(),
		[],
	);
	const transactions = useLiveQuery(
		() => db.ammoTransactions.orderBy("date").reverse().toArray(),
		[],
	);
	const bullets = useLiveQuery(
		() => db.reloadingBullets.orderBy("weightGrains").toArray(),
		[],
	);
	const powders = useLiveQuery(
		() => db.reloadingPowders.orderBy("name").toArray(),
		[],
	);
	const primers = useLiveQuery(
		() => db.reloadingPrimers.orderBy("name").toArray(),
		[],
	);
	const brassItems = useLiveQuery(
		() => db.reloadingBrass.orderBy("name").toArray(),
		[],
	);
	const recipes = useLiveQuery(
		() => db.reloadingRecipes.orderBy("caliber").toArray(),
		[],
	);
	const chronoSessions = useLiveQuery(
		() => db.chronographSessions.orderBy("date").reverse().toArray(),
		[],
	);
	const firearms = useLiveQuery(
		() => db.firearms.orderBy("nickname").toArray(),
		[],
	);

	const [selectedTab, setSelectedTab] = useState<AmmunitionTab>(
		fixedTab ?? tab ?? "recipes",
	);
	const activeTab = fixedTab ?? tab ?? selectedTab;
	function selectTab(nextTab: AmmunitionTab) {
		setSelectedTab(nextTab);
		onTabChange?.(nextTab);
	}
	const [showRecipeForm, setShowRecipeForm] = useState(false);
	const [showChronoForm, setShowChronoForm] = useState(false);
	const [componentDialog, setComponentDialog] =
		useState<ComponentDialogType | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
	const [showStockForm, setShowStockForm] = useState(false);
	const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
	const [stockForm, setStockForm] = useState<AmmunitionFormValues>(
		createEmptyAmmunitionForm,
	);
	const [txForm, setTxForm] = useState<AmmoTransactionFormValues>(
		createEmptyAmmoTransactionForm,
	);
	const [bulletForm, setBulletForm] = useState<ReloadingBulletFormValues>(
		createEmptyBulletForm,
	);
	const [editingBulletId, setEditingBulletId] = useState<string | null>(null);
	const [powderForm, setPowderForm] = useState<ReloadingPowderFormValues>(
		createEmptyPowderForm,
	);
	const [editingPowderId, setEditingPowderId] = useState<string | null>(null);
	const [primerForm, setPrimerForm] = useState<ReloadingPrimerFormValues>(
		createEmptyPrimerForm,
	);
	const [editingPrimerId, setEditingPrimerId] = useState<string | null>(null);
	const [brassForm, setBrassForm] =
		useState<ReloadingBrassFormValues>(createEmptyBrassForm);
	const [editingBrassId, setEditingBrassId] = useState<string | null>(null);
	const [recipeForm, setRecipeForm] = useState<ReloadingRecipeFormValues>(
		createEmptyRecipeForm,
	);
	const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
	const [editingChronoId, setEditingChronoId] = useState<string | null>(null);
	const [chronoForm, setChronoForm] = useState<ChronographSessionFormValues>(
		createEmptyChronographForm,
	);
	const [chronoError, setChronoError] = useState<string | null>(null);

	const totalStock = useMemo(
		() =>
			(transactions ?? []).reduce(
				(sum, tx) => sum + (tx.type === "used" ? -tx.quantity : tx.quantity),
				0,
			),
		[transactions],
	);
	const bulletById = useMemo(
		() => new Map((bullets ?? []).map((bullet) => [bullet.id, bullet])),
		[bullets],
	);
	const powderById = useMemo(
		() => new Map((powders ?? []).map((powder) => [powder.id, powder])),
		[powders],
	);
	const primerById = useMemo(
		() => new Map((primers ?? []).map((primer) => [primer.id, primer])),
		[primers],
	);
	const brassById = useMemo(
		() => new Map((brassItems ?? []).map((brass) => [brass.id, brass])),
		[brassItems],
	);
	const firearmById = useMemo(
		() => new Map((firearms ?? []).map((firearm) => [firearm.id, firearm])),
		[firearms],
	);
	const chronoByRecipe = useMemo(() => {
		const map = new Map<string, ChronographSession[]>();
		for (const session of chronoSessions ?? []) {
			map.set(session.recipeId, [
				...(map.get(session.recipeId) ?? []),
				session,
			]);
		}
		return map;
	}, [chronoSessions]);
	const chronoPreview = useMemo(() => {
		const recipe = (recipes ?? []).find(
			(item) => item.id === chronoForm.recipeId,
		);
		const bullet = recipe ? bulletById.get(recipe.bulletId) : undefined;
		const readings = parseVelocityReadings(chronoForm.readings);
		return bullet && readings.length
			? calculateChronographStats(readings, bullet.weightGrains)
			: undefined;
	}, [bulletById, chronoForm.readings, chronoForm.recipeId, recipes]);

	function resetStockForm() {
		setShowStockForm(false);
		setEditingBatchId(null);
		setStockForm(createEmptyAmmunitionForm());
	}

	function editBatch(batch: AmmunitionBatch) {
		setEditingBatchId(batch.id);
		setStockForm(
			ammunitionToFormValues(
				batch,
				computeBatchStock(transactions ?? [], batch.id),
			),
		);
		setShowStockForm(true);
	}

	async function submitStock(event: FormEvent) {
		event.preventDefault();
		if (!stockForm.caliber.trim()) return;
		if (editingBatchId) await updateAmmunitionBatch(editingBatchId, stockForm);
		else await createAmmunitionBatch(stockForm);
		resetStockForm();
	}

	async function submitTransaction(event: FormEvent) {
		event.preventDefault();
		if (!txForm.caliber.trim()) return;
		await createAmmoTransaction(txForm);
		setTxForm(createEmptyAmmoTransactionForm());
	}

	function closeComponentDialog() {
		setComponentDialog(null);
		setBulletForm(createEmptyBulletForm());
		setEditingBulletId(null);
		setPowderForm(createEmptyPowderForm());
		setEditingPowderId(null);
		setPrimerForm(createEmptyPrimerForm());
		setEditingPrimerId(null);
		setBrassForm(createEmptyBrassForm());
		setEditingBrassId(null);
	}

	async function submitBullet(event: FormEvent) {
		event.preventDefault();
		if (!bulletForm.name.trim() || !bulletForm.weightGrains) return;
		await saveBullet(bulletForm, editingBulletId ?? undefined);
		closeComponentDialog();
	}

	async function submitPowder(event: FormEvent) {
		event.preventDefault();
		if (!powderForm.name.trim()) return;
		await savePowder(powderForm, editingPowderId ?? undefined);
		closeComponentDialog();
	}

	async function submitPrimer(event: FormEvent) {
		event.preventDefault();
		if (!primerForm.name.trim()) return;
		await savePrimer(primerForm, editingPrimerId ?? undefined);
		closeComponentDialog();
	}

	async function submitBrass(event: FormEvent) {
		event.preventDefault();
		if (!brassForm.name.trim()) return;
		await saveBrass(brassForm, editingBrassId ?? undefined);
		closeComponentDialog();
	}

	function closeRecipeForm() {
		setShowRecipeForm(false);
		setRecipeForm(createEmptyRecipeForm());
		setEditingRecipeId(null);
	}

	async function submitRecipe(event: FormEvent) {
		event.preventDefault();
		if (!recipeForm.name.trim() || !recipeForm.bulletId || !recipeForm.powderId)
			return;
		await saveRecipe(recipeForm, editingRecipeId ?? undefined);
		closeRecipeForm();
	}

	function closeChronoForm() {
		setShowChronoForm(false);
		setEditingChronoId(null);
		setChronoForm(createEmptyChronographForm());
		setChronoError(null);
	}

	async function submitChrono(event: FormEvent) {
		event.preventDefault();
		setChronoError(null);
		try {
			await saveChronographSession(chronoForm, editingChronoId ?? undefined);
			closeChronoForm();
		} catch (error) {
			setChronoError(error instanceof Error ? error.message : String(error));
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		if (deleteTarget.type === "batch")
			await deleteAmmunitionBatch(deleteTarget.id);
		if (deleteTarget.type === "transaction")
			await deleteAmmoTransaction(deleteTarget.id);
		if (deleteTarget.type === "bullet") await deleteBullet(deleteTarget.id);
		if (deleteTarget.type === "powder") await deletePowder(deleteTarget.id);
		if (deleteTarget.type === "primer") await deletePrimer(deleteTarget.id);
		if (deleteTarget.type === "brass") await deleteBrass(deleteTarget.id);
		if (deleteTarget.type === "recipe") await deleteRecipe(deleteTarget.id);
		if (deleteTarget.type === "chrono")
			await deleteChronographSession(deleteTarget.id);
		setDeleteTarget(null);
	}

	const pageDescription =
		activeTab === "stock"
			? t("ammunition.summary", {
					entries: batches?.length ?? 0,
					rounds: totalStock.toLocaleString(),
				})
			: t(`ammunition.sections.${activeTab}.description`);

	const pageActions =
		activeTab === "components" ? (
			<EntityActionPanel label={t("ammunition.components.addComponent")}>
				<EntityAddButton onClick={() => setComponentDialog("bullet")}>
					{t("ammunition.components.bullet")}
				</EntityAddButton>
				<EntityAddButton onClick={() => setComponentDialog("powder")}>
					{t("ammunition.components.powder")}
				</EntityAddButton>
				<EntityAddButton onClick={() => setComponentDialog("primer")}>
					{t("ammunition.components.primer")}
				</EntityAddButton>
				<EntityAddButton onClick={() => setComponentDialog("brass")}>
					{t("ammunition.components.brass")}
				</EntityAddButton>
			</EntityActionPanel>
		) : (
			<EntityActionPanel label={t(`ammunition.actions.${activeTab}`)}>
				{activeTab === "recipes" ? (
					<EntityAddButton onClick={() => setShowRecipeForm(true)}>
						{t("ammunition.recipes.createTitle")}
					</EntityAddButton>
				) : null}
				{activeTab === "chrono" ? (
					<EntityAddButton
						onClick={() => {
							setEditingChronoId(null);
							setChronoForm(createEmptyChronographForm());
							setShowChronoForm(true);
						}}
					>
						{t("ammunition.chrono.save")}
					</EntityAddButton>
				) : null}
				{activeTab === "stock" ? (
					<EntityAddButton onClick={() => setShowStockForm(true)}>
						{t("ammunition.new")}
					</EntityAddButton>
				) : null}
			</EntityActionPanel>
		);

	return (
		<div className="screen-stack">
			{fixedTab ? null : (
				<div className="tab-row" aria-label={t("sections.ammunition")}>
					{(
						["recipes", "chrono", "components", "stock"] as AmmunitionTab[]
					).map((tab) => (
						<button
							key={tab}
							type="button"
							className={
								activeTab === tab
									? "tab-button tab-button-active"
									: "tab-button"
							}
							onClick={() => selectTab(tab)}
						>
							{t(`ammunition.tabs.${tab}`)}
						</button>
					))}
				</div>
			)}

			<EntityPage
				title={t(`ammunition.sections.${activeTab}.title`)}
				description={pageDescription}
				actions={pageActions}
			>
				<datalist id="ammo-caliber-options">
					{COMMON_CALIBERS.map((value) => (
						<option key={value} value={value} />
					))}
				</datalist>
				<datalist id="reloading-brand-options">
					{COMMON_RELOADING_BRANDS.map((value) => (
						<option key={value} value={value} />
					))}
				</datalist>
				<datalist id="powder-name-options">
					{COMMON_POWDER_NAMES.map((value) => (
						<option key={value} value={value} />
					))}
				</datalist>
				<datalist id="primer-type-options">
					{COMMON_PRIMER_TYPES.map((value) => (
						<option key={value} value={value} />
					))}
				</datalist>
				<datalist id="bullet-profile-options">
					{COMMON_BULLET_PROFILES.map((value) => (
						<option key={value} value={value} />
					))}
				</datalist>

				{activeTab === "recipes" && (
					<div className="screen-stack">
						{showRecipeForm && (
							<div className="dialog-backdrop" onMouseDown={closeRecipeForm}>
								<form
									className="panel form-grid entity-form-dialog"
									role="dialog"
									aria-modal="true"
									onMouseDown={(event) => event.stopPropagation()}
									onSubmit={submitRecipe}
								>
									<div className="form-title-row">
										<h3>
											{editingRecipeId
												? t("ammunition.recipes.editTitle")
												: t("ammunition.recipes.createTitle")}
										</h3>
										<button
											className="icon-button"
											type="button"
											aria-label={t("actions.close")}
											onClick={closeRecipeForm}
										>
											<X size={16} />
										</button>
									</div>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.recipes.fields.name")} *</span>
											<input
												required
												value={recipeForm.name}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														name: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>{t("ammunition.fields.caliber")} *</span>
											<input
												required
												value={recipeForm.caliber}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														caliber: event.target.value,
													})
												}
												placeholder={t("ammunition.placeholders.caliber")}
												list="ammo-caliber-options"
											/>
										</label>
									</div>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.components.bullet")} *</span>
											<select
												required
												value={recipeForm.bulletId}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														bulletId: event.target.value,
													})
												}
											>
												<option value="">{t("common.none")}</option>
												{(bullets ?? []).map((bullet) => (
													<option key={bullet.id} value={bullet.id}>
														{formatBullet(bullet)}
													</option>
												))}
											</select>
										</label>
										<label>
											<span>{t("ammunition.components.powder")} *</span>
											<select
												required
												value={recipeForm.powderId}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														powderId: event.target.value,
													})
												}
											>
												<option value="">{t("common.none")}</option>
												{(powders ?? []).map((powder) => (
													<option key={powder.id} value={powder.id}>
														{formatPowder(powder)}
													</option>
												))}
											</select>
										</label>
									</div>
									<div className="three-columns">
										<label>
											<span>{t("ammunition.recipes.fields.charge")} *</span>
											<input
												required
												type="number"
												step="0.01"
												min="0"
												value={recipeForm.powderChargeGrains}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														powderChargeGrains: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>{t("ammunition.recipes.fields.minimumPf")}</span>
											<input
												type="number"
												step="0.1"
												min="0"
												value={recipeForm.minimumPowerFactor}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														minimumPowerFactor: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>{t("ammunition.recipes.fields.oal")}</span>
											<input
												type="number"
												step="0.01"
												min="0"
												value={recipeForm.oalMm}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														oalMm: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.recipes.fields.primer")}</span>
											<select
												value={recipeForm.primerId}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														primerId: event.target.value,
													})
												}
											>
												<option value="">{t("common.none")}</option>
												{(primers ?? []).map((primer) => (
													<option key={primer.id} value={primer.id}>
														{formatPrimer(primer)}
													</option>
												))}
											</select>
										</label>
										<label>
											<span>{t("ammunition.recipes.fields.brass")}</span>
											<select
												value={recipeForm.brassId}
												onChange={(event) =>
													setRecipeForm({
														...recipeForm,
														brassId: event.target.value,
													})
												}
											>
												<option value="">{t("common.none")}</option>
												{(brassItems ?? []).map((brass) => (
													<option key={brass.id} value={brass.id}>
														{formatBrass(brass)}
													</option>
												))}
											</select>
										</label>
									</div>
									<label>
										<span>{t("ammunition.fields.notes")}</span>
										<textarea
											rows={3}
											value={recipeForm.notes}
											onChange={(event) =>
												setRecipeForm({
													...recipeForm,
													notes: event.target.value,
												})
											}
										/>
									</label>
									<div className="dialog-actions">
										<button
											className="button button-secondary"
											type="button"
											onClick={closeRecipeForm}
										>
											{t("actions.cancel")}
										</button>
										<button className="button" type="submit">
											<Save size={16} />
											{t("actions.save")}
										</button>
									</div>
								</form>
							</div>
						)}
						<div className="list-panel-clean">
							<div className="record-list">
								{(recipes ?? []).map((recipe) => (
									<RecipeCard
										key={recipe.id}
										recipe={recipe}
										bullet={bulletById.get(recipe.bulletId)}
										powder={powderById.get(recipe.powderId)}
										primer={
											recipe.primerId
												? primerById.get(recipe.primerId)
												: undefined
										}
										brass={
											recipe.brassId ? brassById.get(recipe.brassId) : undefined
										}
										chronoSessions={chronoByRecipe.get(recipe.id) ?? []}
										onChrono={() => {
											selectTab("chrono");
											setChronoForm(createEmptyChronographForm(recipe.id));
											setShowChronoForm(true);
										}}
										onEdit={() => {
											setEditingRecipeId(recipe.id);
											setRecipeForm(recipeToFormValues(recipe));
											setShowRecipeForm(true);
										}}
										onDelete={() =>
											setDeleteTarget({ type: "recipe", id: recipe.id })
										}
									/>
								))}
							</div>
							{recipes?.length === 0 && (
								<EmptyCard
									icon={<FlaskConical size={42} strokeWidth={1.4} />}
									title={t("ammunition.recipes.emptyTitle")}
									body={t("ammunition.recipes.empty")}
								/>
							)}
						</div>
					</div>
				)}

				{activeTab === "chrono" && (
					<div className="screen-stack">
						{showChronoForm && (
							<div className="dialog-backdrop" onMouseDown={closeChronoForm}>
								<form
									className="panel form-grid entity-form-dialog"
									role="dialog"
									aria-modal="true"
									onMouseDown={(event) => event.stopPropagation()}
									onSubmit={submitChrono}
								>
									<div className="form-title-row">
										<h3>
											{editingChronoId
												? t("ammunition.chrono.editTitle")
												: t("ammunition.chrono.createTitle")}
										</h3>
										<button
											className="icon-button"
											type="button"
											aria-label={t("actions.close")}
											onClick={closeChronoForm}
										>
											<X size={16} />
										</button>
									</div>
									<label>
										<span>{t("ammunition.recipes.singular")} *</span>
										<select
											required
											value={chronoForm.recipeId}
											onChange={(event) =>
												setChronoForm({
													...chronoForm,
													recipeId: event.target.value,
												})
											}
										>
											<option value="">{t("common.none")}</option>
											{(recipes ?? []).map((recipe) => (
												<option key={recipe.id} value={recipe.id}>
													{recipe.name}
												</option>
											))}
										</select>
									</label>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.chrono.fields.firearm")}</span>
											<select
												value={chronoForm.firearmId}
												onChange={(event) =>
													setChronoForm({
														...chronoForm,
														firearmId: event.target.value,
													})
												}
											>
												<option value="">{t("common.none")}</option>
												{(firearms ?? []).map((firearm) => (
													<option key={firearm.id} value={firearm.id}>
														{firearm.nickname}
													</option>
												))}
											</select>
										</label>
										<label>
											<span>{t("ammunition.fields.date")}</span>
											<input
												type="date"
												value={chronoForm.date}
												onChange={(event) =>
													setChronoForm({
														...chronoForm,
														date: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<label>
										<span>{t("ammunition.chrono.fields.location")}</span>
										<input
											value={chronoForm.location}
											onChange={(event) =>
												setChronoForm({
													...chronoForm,
													location: event.target.value,
												})
											}
										/>
									</label>
									<div className="three-columns">
										<label>
											<span>{t("ammunition.chrono.fields.temperature")}</span>
											<input
												type="number"
												step="0.1"
												value={chronoForm.temperatureC}
												onChange={(event) =>
													setChronoForm({
														...chronoForm,
														temperatureC: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>{t("ammunition.chrono.fields.humidity")}</span>
											<input
												type="number"
												step="1"
												min="0"
												max="100"
												value={chronoForm.humidityPercent}
												onChange={(event) =>
													setChronoForm({
														...chronoForm,
														humidityPercent: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>{t("ammunition.chrono.fields.pressure")}</span>
											<input
												type="number"
												step="1"
												value={chronoForm.pressureHpa}
												onChange={(event) =>
													setChronoForm({
														...chronoForm,
														pressureHpa: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<label>
										<span>{t("ammunition.chrono.fields.readings")} *</span>
										<textarea
											required
											rows={5}
											value={chronoForm.readings}
											onChange={(event) =>
												setChronoForm({
													...chronoForm,
													readings: event.target.value,
												})
											}
											placeholder={t("ammunition.chrono.readingsPlaceholder")}
										/>
									</label>
									{chronoPreview && (
										<div className="metric-grid">
											<Metric
												label={t("ammunition.chrono.average")}
												value={`${chronoPreview.averageFps.toFixed(1)} fps`}
											/>
											<Metric
												label={t("ammunition.chrono.powerFactor")}
												value={chronoPreview.powerFactor.toFixed(1)}
											/>
											<Metric
												label={t("ammunition.chrono.spread")}
												value={`${chronoPreview.extremeSpreadFps.toFixed(0)} fps`}
											/>
										</div>
									)}
									{chronoError && (
										<p className="status-message status-error">{chronoError}</p>
									)}
									<label>
										<span>{t("ammunition.fields.notes")}</span>
										<textarea
											rows={2}
											value={chronoForm.notes}
											onChange={(event) =>
												setChronoForm({
													...chronoForm,
													notes: event.target.value,
												})
											}
										/>
									</label>
									<div className="dialog-actions">
										<button
											className="button button-secondary"
											type="button"
											onClick={closeChronoForm}
										>
											{t("actions.cancel")}
										</button>
										<button className="button" type="submit">
											<Gauge size={16} />
											{t("ammunition.chrono.save")}
										</button>
									</div>
								</form>
							</div>
						)}
						<div className="list-panel-clean">
							<div className="record-list">
								{(chronoSessions ?? []).map((session) => (
									<ChronoCard
										key={session.id}
										session={session}
										recipe={(recipes ?? []).find(
											(recipe) => recipe.id === session.recipeId,
										)}
										firearmName={
											session.firearmId
												? firearmById.get(session.firearmId)?.nickname
												: undefined
										}
										onEdit={() => {
											setEditingChronoId(session.id);
											setChronoForm(chronographSessionToFormValues(session));
											setShowChronoForm(true);
										}}
										onDelete={() =>
											setDeleteTarget({ type: "chrono", id: session.id })
										}
									/>
								))}
							</div>
							{chronoSessions?.length === 0 && (
								<EmptyCard
									icon={<Gauge size={42} strokeWidth={1.4} />}
									title={t("ammunition.chrono.emptyTitle")}
									body={t("ammunition.chrono.empty")}
								/>
							)}
						</div>
					</div>
				)}

				{activeTab === "components" && (
					<div className="screen-stack">
						<div className="list-panel-clean">
							<h3>{t("ammunition.components.bulletsTitle")}</h3>
							<div className="record-list">
								{(bullets ?? []).map((bullet) => (
									<ComponentCard
										key={bullet.id}
										title={formatBullet(bullet)}
										body={bullet.notes}
										onEdit={() => {
											setEditingBulletId(bullet.id);
											setBulletForm(bulletToFormValues(bullet));
											setComponentDialog("bullet");
										}}
										onDelete={() =>
											setDeleteTarget({ type: "bullet", id: bullet.id })
										}
									/>
								))}
							</div>
							<h3>{t("ammunition.components.powdersTitle")}</h3>
							<div className="record-list">
								{(powders ?? []).map((powder) => (
									<ComponentCard
										key={powder.id}
										title={formatPowder(powder)}
										body={powder.notes}
										onEdit={() => {
											setEditingPowderId(powder.id);
											setPowderForm(powderToFormValues(powder));
											setComponentDialog("powder");
										}}
										onDelete={() =>
											setDeleteTarget({ type: "powder", id: powder.id })
										}
									/>
								))}
							</div>
							<h3>{t("ammunition.components.primersTitle")}</h3>
							<div className="record-list">
								{(primers ?? []).map((primer) => (
									<ComponentCard
										key={primer.id}
										title={formatPrimer(primer)}
										body={primer.notes}
										onEdit={() => {
											setEditingPrimerId(primer.id);
											setPrimerForm(primerToFormValues(primer));
											setComponentDialog("primer");
										}}
										onDelete={() =>
											setDeleteTarget({ type: "primer", id: primer.id })
										}
									/>
								))}
							</div>
							<h3>{t("ammunition.components.brassTitle")}</h3>
							<div className="record-list">
								{(brassItems ?? []).map((brass) => (
									<ComponentCard
										key={brass.id}
										title={formatBrass(brass)}
										body={brass.notes}
										onEdit={() => {
											setEditingBrassId(brass.id);
											setBrassForm(brassToFormValues(brass));
											setComponentDialog("brass");
										}}
										onDelete={() =>
											setDeleteTarget({ type: "brass", id: brass.id })
										}
									/>
								))}
							</div>
						</div>
					</div>
				)}

				{componentDialog && (
					<div className="dialog-backdrop" onMouseDown={closeComponentDialog}>
						<form
							className="panel form-grid entity-form-dialog"
							role="dialog"
							aria-modal="true"
							onMouseDown={(event) => event.stopPropagation()}
							onSubmit={
								componentDialog === "bullet"
									? submitBullet
									: componentDialog === "powder"
										? submitPowder
										: componentDialog === "primer"
											? submitPrimer
											: submitBrass
							}
						>
							<div className="form-title-row">
								<h3>
									{componentDialog === "bullet"
										? t("ammunition.components.bulletsTitle")
										: componentDialog === "powder"
											? t("ammunition.components.powdersTitle")
											: componentDialog === "primer"
												? t("ammunition.components.primersTitle")
												: t("ammunition.components.brassTitle")}
								</h3>
								<button
									className="icon-button"
									type="button"
									aria-label={t("actions.close")}
									onClick={closeComponentDialog}
								>
									<X size={16} />
								</button>
							</div>
							{componentDialog === "bullet" && (
								<>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.fields.brand")}</span>
											<input
												list="reloading-brand-options"
												value={bulletForm.brand}
												onChange={(event) =>
													setBulletForm({
														...bulletForm,
														brand: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>
												{t("ammunition.components.fields.bulletName")} *
											</span>
											<input
												required
												value={bulletForm.name}
												onChange={(event) =>
													setBulletForm({
														...bulletForm,
														name: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<div className="three-columns">
										<label>
											<span>{t("ammunition.components.fields.weight")} *</span>
											<input
												required
												type="number"
												step="0.1"
												min="0"
												value={bulletForm.weightGrains}
												onChange={(event) =>
													setBulletForm({
														...bulletForm,
														weightGrains: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>{t("ammunition.components.fields.diameter")}</span>
											<input
												value={bulletForm.diameter}
												onChange={(event) =>
													setBulletForm({
														...bulletForm,
														diameter: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>{t("ammunition.components.fields.profile")}</span>
											<input
												list="bullet-profile-options"
												value={bulletForm.profile}
												onChange={(event) =>
													setBulletForm({
														...bulletForm,
														profile: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<label>
										<span>{t("ammunition.fields.notes")}</span>
										<textarea
											rows={2}
											value={bulletForm.notes}
											onChange={(event) =>
												setBulletForm({
													...bulletForm,
													notes: event.target.value,
												})
											}
										/>
									</label>
								</>
							)}
							{componentDialog === "powder" && (
								<>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.fields.brand")}</span>
											<input
												list="reloading-brand-options"
												value={powderForm.brand}
												onChange={(event) =>
													setPowderForm({
														...powderForm,
														brand: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>
												{t("ammunition.components.fields.powderName")} *
											</span>
											<input
												required
												list="powder-name-options"
												value={powderForm.name}
												onChange={(event) =>
													setPowderForm({
														...powderForm,
														name: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<label>
										<span>{t("ammunition.fields.notes")}</span>
										<textarea
											rows={2}
											value={powderForm.notes}
											onChange={(event) =>
												setPowderForm({
													...powderForm,
													notes: event.target.value,
												})
											}
										/>
									</label>
								</>
							)}
							{componentDialog === "primer" && (
								<>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.fields.brand")}</span>
											<input
												list="reloading-brand-options"
												value={primerForm.brand}
												onChange={(event) =>
													setPrimerForm({
														...primerForm,
														brand: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>
												{t("ammunition.components.fields.primerName")} *
											</span>
											<input
												required
												value={primerForm.name}
												onChange={(event) =>
													setPrimerForm({
														...primerForm,
														name: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<label>
										<span>{t("ammunition.components.fields.primerType")}</span>
										<input
											list="primer-type-options"
											value={primerForm.type}
											onChange={(event) =>
												setPrimerForm({
													...primerForm,
													type: event.target.value,
												})
											}
										/>
									</label>
									<label>
										<span>{t("ammunition.fields.notes")}</span>
										<textarea
											rows={2}
											value={primerForm.notes}
											onChange={(event) =>
												setPrimerForm({
													...primerForm,
													notes: event.target.value,
												})
											}
										/>
									</label>
								</>
							)}
							{componentDialog === "brass" && (
								<>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.fields.brand")}</span>
											<input
												list="reloading-brand-options"
												value={brassForm.brand}
												onChange={(event) =>
													setBrassForm({
														...brassForm,
														brand: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>
												{t("ammunition.components.fields.brassName")} *
											</span>
											<input
												required
												value={brassForm.name}
												onChange={(event) =>
													setBrassForm({
														...brassForm,
														name: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<div className="two-columns">
										<label>
											<span>{t("ammunition.fields.caliber")}</span>
											<input
												list="ammo-caliber-options"
												value={brassForm.caliber}
												onChange={(event) =>
													setBrassForm({
														...brassForm,
														caliber: event.target.value,
													})
												}
											/>
										</label>
										<label>
											<span>
												{t("ammunition.components.fields.timesFired")}
											</span>
											<input
												type="number"
												min="0"
												value={brassForm.timesFired}
												onChange={(event) =>
													setBrassForm({
														...brassForm,
														timesFired: event.target.value,
													})
												}
											/>
										</label>
									</div>
									<label>
										<span>{t("ammunition.fields.notes")}</span>
										<textarea
											rows={2}
											value={brassForm.notes}
											onChange={(event) =>
												setBrassForm({
													...brassForm,
													notes: event.target.value,
												})
											}
										/>
									</label>
								</>
							)}
							<div className="dialog-actions">
								<button
									className="button button-secondary"
									type="button"
									onClick={closeComponentDialog}
								>
									{t("actions.cancel")}
								</button>
								<button className="button" type="submit">
									<Save size={16} />
									{t("actions.save")}
								</button>
							</div>
						</form>
					</div>
				)}

				{activeTab === "stock" && (
					<StockPanel
						batches={batches ?? []}
						transactions={transactions ?? []}
						showForm={showStockForm}
						editingBatchId={editingBatchId}
						form={stockForm}
						txForm={txForm}
						onSubmitStock={(event) => void submitStock(event)}
						onCancelStock={resetStockForm}
						onFormChange={setStockForm}
						onTxFormChange={setTxForm}
						onSubmitTx={(event) => void submitTransaction(event)}
						onEditBatch={editBatch}
						onDelete={setDeleteTarget}
					/>
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
								<h3>{t("ammunition.deleteTitle")}</h3>
								<button
									className="icon-button"
									onClick={() => setDeleteTarget(null)}
								>
									<X size={16} />
								</button>
							</div>
							<p>{t("ammunition.deleteConfirm")}</p>
							<div className="dialog-actions">
								<button
									className="button button-secondary"
									onClick={() => setDeleteTarget(null)}
								>
									{t("actions.cancel")}
								</button>
								<button
									className="button button-danger"
									onClick={() => void confirmDelete()}
								>
									{t("actions.delete")}
								</button>
							</div>
						</div>
					</div>
				)}
			</EntityPage>
		</div>
	);
}

function RecipeCard({
	recipe,
	bullet,
	powder,
	primer,
	brass,
	chronoSessions,
	onChrono,
	onEdit,
	onDelete,
}: {
	recipe: ReloadingRecipe;
	bullet?: ReloadingBullet;
	powder?: ReloadingPowder;
	primer?: ReloadingPrimer;
	brass?: ReloadingBrass;
	chronoSessions: ChronographSession[];
	onChrono: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const { t } = useTranslation();
	const latest = chronoSessions[0];
	const minPf = chronoSessions.length
		? Math.min(...chronoSessions.map((session) => session.powerFactor))
		: undefined;
	const maxPf = chronoSessions.length
		? Math.max(...chronoSessions.map((session) => session.powerFactor))
		: undefined;
	const lowMargin =
		recipe.minimumPowerFactor &&
		minPf !== undefined &&
		minPf < recipe.minimumPowerFactor + 3;
	return (
		<article className="record-card">
			<div className="record-icon">
				<FlaskConical size={18} />
			</div>
			<div className="record-content">
				<div className="record-title-row">
					<h4>{recipe.name}</h4>
					{recipe.minimumPowerFactor && (
						<span
							className={
								lowMargin ? "badge badge-warning" : "badge badge-muted"
							}
						>
							{t("ammunition.recipes.minimumPfTag", {
								pf: recipe.minimumPowerFactor,
							})}
						</span>
					)}
				</div>
				<p>
					{[
						recipe.caliber,
						bullet ? formatBullet(bullet) : undefined,
						powder
							? `${formatPowder(powder)} ${recipe.powderChargeGrains}gr`
							: undefined,
						primer ? formatPrimer(primer) : recipe.primer,
						brass ? formatBrass(brass) : recipe.brass,
						recipe.oalMm ? `OAL ${recipe.oalMm}mm` : undefined,
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
				{latest ? (
					<p>
						{t("ammunition.recipes.latestPf", {
							pf: latest.powerFactor.toFixed(1),
							fps: latest.averageFps.toFixed(0),
							date: formatDate(latest.date),
						})}
						{minPf !== undefined && maxPf !== undefined
							? ` · ${t("ammunition.recipes.pfRange", { min: minPf.toFixed(1), max: maxPf.toFixed(1) })}`
							: ""}
					</p>
				) : (
					<p>{t("ammunition.recipes.noChrono")}</p>
				)}
			</div>
			<RecordActionButtons
				editLabel={t("actions.edit")}
				deleteLabel={t("actions.delete")}
				onEdit={onEdit}
				onDelete={onDelete}
			>
				<button
					className="button button-secondary"
					onClick={onChrono}
					type="button"
				>
					<Gauge size={15} />
					{t("ammunition.chrono.shortAction")}
				</button>
			</RecordActionButtons>
		</article>
	);
}

function ChronoCard({
	session,
	recipe,
	firearmName,
	onEdit,
	onDelete,
}: {
	session: ChronographSession;
	recipe?: ReloadingRecipe;
	firearmName?: string;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const { t } = useTranslation();
	return (
		<article className="record-card compact-card">
			<div className="record-content">
				<div className="record-title-row">
					<h4>
						{recipe?.name ?? t("ammunition.recipes.singular")} ·{" "}
						{session.powerFactor.toFixed(1)} PF
					</h4>
					<span className="badge badge-muted">
						{session.averageFps.toFixed(0)} fps
					</span>
				</div>
				<p>
					{[
						formatDate(session.date),
						firearmName,
						session.location,
						session.temperatureC !== undefined
							? `${session.temperatureC}°C`
							: undefined,
						`${session.readingsFps.length} letture`,
						`ES ${session.extremeSpreadFps.toFixed(0)} fps`,
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
			</div>
			<RecordActionButtons
				editLabel={t("actions.edit")}
				deleteLabel={t("actions.delete")}
				onEdit={onEdit}
				onDelete={onDelete}
			/>
		</article>
	);
}

function ComponentCard({
	title,
	body,
	onEdit,
	onDelete,
}: {
	title: string;
	body?: string;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const { t } = useTranslation();
	return (
		<article className="record-card compact-card">
			<div className="record-content">
				<h4>{title}</h4>
				{body && <p>{body}</p>}
			</div>
			<RecordActionButtons
				editLabel={t("actions.edit")}
				deleteLabel={t("actions.delete")}
				onEdit={onEdit}
				onDelete={onDelete}
			/>
		</article>
	);
}

function StockPanel({
	batches,
	transactions,
	showForm,
	editingBatchId,
	form,
	txForm,
	onSubmitStock,
	onCancelStock,
	onFormChange,
	onTxFormChange,
	onSubmitTx,
	onEditBatch,
	onDelete,
}: {
	batches: AmmunitionBatch[];
	transactions: AmmoTransaction[];
	showForm: boolean;
	editingBatchId: string | null;
	form: AmmunitionFormValues;
	txForm: AmmoTransactionFormValues;
	onSubmitStock: (event: FormEvent) => void;
	onCancelStock: () => void;
	onFormChange: (form: AmmunitionFormValues) => void;
	onTxFormChange: (form: AmmoTransactionFormValues) => void;
	onSubmitTx: (event: FormEvent) => void;
	onEditBatch: (batch: AmmunitionBatch) => void;
	onDelete: (target: DeleteTarget) => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="crud-layout crud-layout-list-only">
			{showForm && (
				<form className="panel form-grid" onSubmit={onSubmitStock}>
					<h3>
						{editingBatchId
							? t("ammunition.editTitle")
							: t("ammunition.createTitle")}
					</h3>
					<label>
						<span>{t("ammunition.fields.caliber")} *</span>
						<input
							required
							value={form.caliber}
							onChange={(event) =>
								onFormChange({ ...form, caliber: event.target.value })
							}
							placeholder={t("ammunition.placeholders.caliber")}
							list="ammo-caliber-options"
						/>
					</label>
					<div className="two-columns">
						<label>
							<span>{t("ammunition.fields.brand")}</span>
							<input
								list="reloading-brand-options"
								value={form.brand}
								onChange={(event) =>
									onFormChange({ ...form, brand: event.target.value })
								}
							/>
						</label>
						<label>
							<span>{t("ammunition.fields.bulletWeight")}</span>
							<input
								value={form.bulletWeight}
								onChange={(event) =>
									onFormChange({ ...form, bulletWeight: event.target.value })
								}
							/>
						</label>
					</div>
					<div className="two-columns">
						<label>
							<span>{t("ammunition.fields.lot")}</span>
							<input
								value={form.lotNumber}
								onChange={(event) =>
									onFormChange({ ...form, lotNumber: event.target.value })
								}
							/>
						</label>
						{!editingBatchId && (
							<label>
								<span>{t("ammunition.fields.quantity")}</span>
								<input
									type="number"
									min="0"
									value={form.quantity}
									onChange={(event) =>
										onFormChange({ ...form, quantity: event.target.value })
									}
								/>
							</label>
						)}
					</div>
					<label>
						<span>{t("ammunition.fields.notes")}</span>
						<textarea
							rows={3}
							value={form.notes}
							onChange={(event) =>
								onFormChange({ ...form, notes: event.target.value })
							}
						/>
					</label>
					<div className="dialog-actions">
						<button
							className="button button-secondary"
							type="button"
							onClick={onCancelStock}
						>
							{t("actions.cancel")}
						</button>
						<button className="button" type="submit">
							<Save size={16} />
							{editingBatchId
								? t("actions.save")
								: t("ammunition.createAction")}
						</button>
					</div>
				</form>
			)}
			<div className="record-list">
				{batches.map((batch) => {
					const stock = computeBatchStock(transactions, batch.id);
					return (
						<article className="record-card" key={batch.id}>
							<div className="record-icon">
								<Package size={18} />
							</div>
							<div className="record-content">
								<div className="record-title-row">
									<h4>
										{[batch.brand, batch.caliber, batch.bulletWeight]
											.filter(Boolean)
											.join(" ") || batch.caliber}
									</h4>
									<span
										className={`badge ${stock > 100 ? "badge-success" : stock > 0 ? "badge-warning" : "badge-destructive"}`}
									>
										{t("ammunition.rounds", { count: stock })}
									</span>
								</div>
								<p>
									{[
										batch.lotNumber
											? t("ammunition.lot", { lot: batch.lotNumber })
											: "",
										batch.notes,
									]
										.filter(Boolean)
										.join(" · ")}
								</p>
							</div>
							<RecordActionButtons
								editLabel={t("actions.edit")}
								deleteLabel={t("actions.delete")}
								onEdit={() => onEditBatch(batch)}
								onDelete={() => onDelete({ type: "batch", id: batch.id })}
							/>
						</article>
					);
				})}
			</div>
			<form className="panel form-grid compact-panel" onSubmit={onSubmitTx}>
				<h3>{t("ammunition.transactionTitle")}</h3>
				<div className="three-columns">
					<label>
						<span>{t("ammunition.fields.type")}</span>
						<select
							value={txForm.type}
							onChange={(event) =>
								onTxFormChange({
									...txForm,
									type: event.target.value as AmmoTransactionFormValues["type"],
								})
							}
						>
							<option value="added">{t("ammunition.types.added")}</option>
							<option value="used">{t("ammunition.types.used")}</option>
							<option value="adjusted">{t("ammunition.types.adjusted")}</option>
						</select>
					</label>
					<label>
						<span>{t("ammunition.fields.quantity")}</span>
						<input
							type="number"
							min="0"
							value={txForm.quantity}
							onChange={(event) =>
								onTxFormChange({ ...txForm, quantity: event.target.value })
							}
						/>
					</label>
					<label>
						<span>{t("ammunition.fields.date")}</span>
						<input
							type="date"
							value={txForm.date}
							onChange={(event) =>
								onTxFormChange({ ...txForm, date: event.target.value })
							}
						/>
					</label>
				</div>
				<div className="two-columns">
					<label>
						<span>{t("ammunition.fields.batch")}</span>
						<select
							value={txForm.batchId}
							onChange={(event) => {
								const batch = batches.find(
									(item) => item.id === event.target.value,
								);
								onTxFormChange({
									...txForm,
									batchId: event.target.value,
									caliber: batch?.caliber ?? txForm.caliber,
								});
							}}
						>
							<option value="">{t("common.none")}</option>
							{batches.map((batch) => (
								<option key={batch.id} value={batch.id}>
									{[batch.brand, batch.caliber, batch.lotNumber]
										.filter(Boolean)
										.join(" · ")}
								</option>
							))}
						</select>
					</label>
					<label>
						<span>{t("ammunition.fields.caliber")}</span>
						<input
							list="ammo-caliber-options"
							value={txForm.caliber}
							onChange={(event) =>
								onTxFormChange({ ...txForm, caliber: event.target.value })
							}
						/>
					</label>
				</div>
				<button className="button button-secondary" type="submit">
					{t("ammunition.addTransaction")}
				</button>
			</form>
			<div className="record-list">
				{transactions.slice(0, 8).map((tx) => (
					<article className="record-card compact-card" key={tx.id}>
						<div className="record-content">
							<div className="record-title-row">
								<h4>
									{t(`ammunition.types.${tx.type}`)} · {tx.caliber}
								</h4>
								<span className="badge badge-muted">
									{t("ammunition.rounds", { count: tx.quantity })}
								</span>
							</div>
							<p>{formatDate(tx.date)}</p>
						</div>
						<RecordActionButtons
							editLabel={t("actions.edit")}
							deleteLabel={t("actions.delete")}
							onDelete={() => onDelete({ type: "transaction", id: tx.id })}
						/>
					</article>
				))}
			</div>
		</div>
	);
}

function EmptyCard({
	icon,
	title,
	body,
}: {
	icon: React.ReactNode;
	title: string;
	body: string;
}) {
	return (
		<div className="empty-state-card">
			{icon}
			<h3>{title}</h3>
			<p>{body}</p>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="metric-card">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function formatBullet(bullet: ReloadingBullet) {
	return [bullet.brand, bullet.name, `${bullet.weightGrains}gr`, bullet.profile]
		.filter(Boolean)
		.join(" · ");
}

function formatPowder(powder: ReloadingPowder) {
	return [powder.brand, powder.name].filter(Boolean).join(" ");
}

function formatPrimer(primer: ReloadingPrimer) {
	return [primer.brand, primer.name, primer.type].filter(Boolean).join(" · ");
}

function formatBrass(brass: ReloadingBrass) {
	return [
		brass.brand,
		brass.name,
		brass.caliber,
		brass.timesFired !== undefined ? `${brass.timesFired}x` : undefined,
	]
		.filter(Boolean)
		.join(" · ");
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString();
}
