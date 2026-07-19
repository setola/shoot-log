import type { ReactNode } from "react";
import { Edit3, Plus, Trash2, X } from "lucide-react";

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

export function AppModal({
	title,
	description,
	onClose,
	children,
	footer,
	className = "entity-form-dialog",
	bodyClassName,
}: {
	title: ReactNode;
	description?: ReactNode;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
	bodyClassName?: string;
}) {
	return (
		<div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
			<div
				className={`panel form-grid app-modal ${className}`}
				role="dialog"
				aria-modal="true"
				onMouseDown={(event) => event.stopPropagation()}
			>
				<div className="form-title-row import-dialog-heading app-modal-header">
					<div>
						<h3>{title}</h3>
						{description ? (
							<p className="muted import-dialog-intro">{description}</p>
						) : null}
					</div>
					<button
						className="icon-button"
						type="button"
						aria-label="Close"
						onClick={onClose}
					>
						<X size={16} />
					</button>
				</div>
				<div className={bodyClassName ?? "app-modal-body"}>{children}</div>
				{footer ? (
					<div className="dialog-actions app-modal-footer">{footer}</div>
				) : null}
			</div>
		</div>
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
