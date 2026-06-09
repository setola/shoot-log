import { X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

interface StatusMessageProps {
  children: ReactNode;
  tone: 'success' | 'error';
  autoHideMs?: number;
  onDismiss?: () => void;
}

export function StatusMessage({ children, tone, autoHideMs = 6000, onDismiss }: StatusMessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoHideMs <= 0) return;

    const timeout = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoHideMs);

    return () => window.clearTimeout(timeout);
  }, [autoHideMs, children, onDismiss, tone]);

  if (!visible) return null;

  return (
    <div className={`status-message status-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      <button className="status-message-close" type="button" aria-label="Dismiss message" onClick={() => {
        setVisible(false);
        onDismiss?.();
      }}>
        <X size={14} />
      </button>
    </div>
  );
}
