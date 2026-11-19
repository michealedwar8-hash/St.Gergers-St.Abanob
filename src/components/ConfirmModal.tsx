import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد الحذف',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-3"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[95vw] sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 overflow-y-auto">
          <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-semibold">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-4 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl font-bold text-sm text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl font-bold text-sm text-white shadow-sm transition-colors cursor-pointer ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
