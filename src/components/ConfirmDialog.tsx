/**
 * Confirm Dialog Component
 *
 * A styled confirmation dialog that follows the QUAR Editor UI design.
 * Replaces browser's default confirm() dialog.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ComponentType<{ className?: string }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconColor: 'text-red-500',
      buttonClass: 'bg-red-500 hover:bg-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    },
    warning: {
      iconColor: 'text-yellow-500',
      buttonClass: 'bg-yellow-500 hover:bg-yellow-600',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    info: {
      iconColor: 'text-blue-500',
      buttonClass: 'bg-blue-500 hover:bg-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
  };

  const styles = variantStyles[variant];
  const Icon = icon || (variant === 'danger' ? Trash2 : AlertTriangle);

  return createPortal(
    <div
      className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-center z-[10000]"
      onClick={onCancel}
    >
      <div
        className="bg-[#18181B] border border-[#27272A] rounded-lg shadow-xl p-6 w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-2 rounded-lg ${styles.bgColor} ${styles.borderColor} border`}>
            <Icon className={`w-5 h-5 ${styles.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-[#FAFAFA] mb-1">{title}</h3>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-[#27272A] transition-colors -mt-1 -mr-1"
          >
            <X className="w-4 h-4 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] rounded transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white text-sm rounded transition-colors ${styles.buttonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}

// Hook for managing confirmation dialog state
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    icon?: React.ComponentType<{ className?: string }>;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (options: Omit<typeof dialogState, 'isOpen'>) => {
    setDialogState({
      ...options,
      isOpen: true,
    });
  };

  const handleConfirm = () => {
    dialogState.onConfirm();
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    dialogProps: {
      ...dialogState,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
    showConfirm,
  };
}