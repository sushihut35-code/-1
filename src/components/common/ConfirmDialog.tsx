import { ReactNode } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  details,
  confirmText = '実行',
  cancelText = 'キャンセル',
  type = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: '⚠️',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      titleColor: 'text-red-900',
    },
    warning: {
      icon: '⚡',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
      titleColor: 'text-yellow-900',
    },
    info: {
      icon: 'ℹ️',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
      titleColor: 'text-blue-900',
    },
  };

  const styles = typeStyles[type];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">{styles.icon}</span>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${styles.titleColor} mb-2`}>
              {title}
            </h3>
            <p className="text-sm text-gray-700 mb-1">{message}</p>
            {details && (
              <div className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                {details}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-md transition-colors font-medium ${styles.confirmBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
