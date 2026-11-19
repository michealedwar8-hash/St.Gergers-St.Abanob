import React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100vw-2.5rem)] sm:w-auto"
    >
      {toasts.map((toast) => {
        const styles = {
          success: {
            bg: 'bg-emerald-700 text-white border-emerald-500',
            icon: <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-200" />,
          },
          info: {
            bg: 'bg-indigo-700 text-white border-indigo-500',
            icon: <Info className="w-6 h-6 shrink-0 text-indigo-200" />,
          },
          warning: {
            bg: 'bg-amber-600 text-white border-amber-400',
            icon: <AlertTriangle className="w-6 h-6 shrink-0 text-amber-100" />,
          },
          error: {
            bg: 'bg-rose-700 text-white border-rose-500',
            icon: <XCircle className="w-6 h-6 shrink-0 text-rose-200" />,
          },
        }[toast.variant];

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-xl transition-all ${styles.bg}`}
          >
            {styles.icon}
            <p className="font-bold text-base leading-snug flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
