import React from 'react';
import { Type } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FontSizeControlProps {
  compact?: boolean;
}

export const FontSizeControl: React.FC<FontSizeControlProps> = ({ compact = false }) => {
  const { fontScale, setFontScale } = useApp();

  return (
    <div
      className="inline-flex items-center gap-0.5 bg-white/95 border border-slate-200 rounded-xl p-0.5 shadow-xs"
      role="group"
      aria-label="تكبير وتصغير الخط"
    >
      {!compact && (
        <span className="hidden md:inline-flex items-center gap-1 px-2 text-xs font-extrabold text-slate-600 whitespace-nowrap">
          <Type className="w-3.5 h-3.5 text-indigo-600" />
          الخط
        </span>
      )}
      <button
        type="button"
        onClick={() => setFontScale('normal')}
        className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
          fontScale === 'normal'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        title="حجم خط متناسق"
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => setFontScale('large')}
        className={`px-2 py-1 rounded-lg text-sm font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
          fontScale === 'large'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        title="حجم خط متوسط"
      >
        A
      </button>
      <button
        type="button"
        onClick={() => setFontScale('xlarge')}
        className={`px-2 py-1 rounded-lg text-base font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
          fontScale === 'xlarge'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        title="حجم خط كبير"
      >
        A+
      </button>
    </div>
  );
};
