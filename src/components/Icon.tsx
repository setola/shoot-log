interface IconProps {
  name: 'add' | 'edit' | 'delete' | 'save' | 'cancel' | 'archive' | 'gun';
  label?: string;
}

const icons: Record<IconProps['name'], string> = {
  add: '+',
  edit: '✎',
  delete: '×',
  save: '✓',
  cancel: '↩',
  archive: '□',
  gun: '◉'
};

export function Icon({ name, label }: IconProps) {
  return (
    <span className="icon" aria-hidden={label ? undefined : true} aria-label={label}>
      {icons[name]}
    </span>
  );
}
