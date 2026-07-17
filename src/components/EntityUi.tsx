import type { ReactNode } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";

export function EntityPage({
	title,
	description,
	actions,
	children,
}: {
	title: string;
	description?: ReactNode;
	titleId?: string;
	actions?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="screen-stack" aria-label={title}>
			{description || actions ? (
				<div className="section-heading figma-heading">
					<div>{description ? <p>{description}</p> : null}</div>
					{actions}
				</div>
			) : null}
			{children}
		</section>
	);
}

export function EntityActionPanel({
	label,
	children,
}: {
	label: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="panel import-card">
			<span>{label}</span>
			<div className="import-action-row">{children}</div>
		</div>
	);
}

export function EntityAddButton({
	children,
	onClick,
	className = "button",
}: {
	children: ReactNode;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button className={className} type="button" onClick={onClick}>
			<Plus size={16} />
			{children}
		</button>
	);
}

export function RecordActionButtons({
	editLabel,
	deleteLabel,
	onEdit,
	onDelete,
	children,
}: {
	editLabel: string;
	deleteLabel: string;
	onEdit?: () => void;
	onDelete: () => void;
	children?: ReactNode;
}) {
	return (
		<div className="record-actions">
			{children}
			{onEdit ? (
				<button
					className="icon-button"
					type="button"
					onClick={onEdit}
					aria-label={editLabel}
				>
					<Edit3 size={15} />
				</button>
			) : null}
			<button
				className="icon-button danger"
				type="button"
				onClick={onDelete}
				aria-label={deleteLabel}
			>
				<Trash2 size={15} />
			</button>
		</div>
	);
}
