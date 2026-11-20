import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import {
  ARABIC_MONTHS,
  ARABIC_WEEKDAYS_SHORT,
  formatArabicDateFull,
  formatArabicDateShort,
} from '../utils/helpers';

interface ArabicCalendarModalProps {
  isOpen: boolean;
  selectedDate: string; // YYYY-MM-DD
  todayUTC: string; // YYYY-MM-DD
  datesWithAttendance: Set<string>;
  onSelectDate: (date: string) => void;
  onClose: () => void;
  title?: string;
}

export const ArabicCalendarModal: React.FC<ArabicCalendarModalProps> = ({
  isOpen,
  selectedDate,
  todayUTC,
  datesWithAttendance,
  onSelectDate,
  onClose,
  title = 'اختيار التاريخ',
}) => {
  const [viewYear, setViewYear] = useState<number>(() => {
    const parsed = Number(selectedDate.split('-')[0]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parsed = Number(selectedDate.split('-')[1]);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed - 1 : new Date().getMonth();
  });
  const [yearInput, setYearInput] = useState<string>(() => String(viewYear));

  useEffect(() => {
    if (isOpen && /^\d{4,}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('-');
      const yr = Number(parts[0]);
      const mo = Number(parts[1]) - 1;
      if (Number.isFinite(yr) && yr > 0) {
        setViewYear(yr);
        setYearInput(String(yr));
      }
      if (Number.isFinite(mo) && mo >= 0 && mo <= 11) {
        setViewMonth(mo);
      }
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    setYearInput(String(viewYear));
  }, [viewYear]);

  // Dynamic sliding year list with zero upper cap — always extends 100 years ahead of whichever year is viewed
  const dynamicYearOptions = useMemo(() => {
    const todayYr = Number(todayUTC.split('-')[0]) || new Date().getFullYear();
    const startYear = Math.max(1900, Math.min(todayYr - 10, viewYear - 50));
    const endYear = Math.max(todayYr + 100, viewYear + 100);
    const list: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push(y);
    }
    return list;
  }, [todayUTC, viewYear]);

  const calendarDays = useMemo(() => {
    const firstDayWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const yyyy = String(viewYear).padStart(4, '0');

    const cells: Array<{ dateStr: string; dayNum: number } | null> = [];
    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayNum: d,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => Math.max(1900, y - 1));
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleYearInputCommit = (rawVal: string) => {
    const cleaned = rawVal.replace(/[^\d]/g, '');
    setYearInput(cleaned);
    const parsed = Number(cleaned);
    if (cleaned.length >= 4 && Number.isFinite(parsed) && parsed >= 1900) {
      setViewYear(parsed);
    }
  };

  const handleJumpToday = () => {
    onSelectDate(todayUTC);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-indigo-100 w-full max-w-[95vw] sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Colorful Top Header */}
        <div className="bg-gradient-to-l from-indigo-600 via-blue-600 to-sky-600 text-white px-4 py-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold truncate">{title}</h3>
                <p className="text-indigo-100 text-xs font-semibold truncate">
                  المختار: {formatArabicDateFull(selectedDate)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer shrink-0"
              aria-label="إغلاق التقويم"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month & Unlimited Year Navigation */}
        <div className="px-3 py-2.5 bg-indigo-50/70 border-b border-indigo-100 space-y-2 shrink-0">
          {/* Row 1: Month Navigation */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-bold text-xs hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الشهر السابق</span>
            </button>

            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 font-extrabold text-slate-900 text-xs sm:text-sm cursor-pointer"
              aria-label="الشهر"
            >
              {ARABIC_MONTHS.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 font-bold text-xs hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
            >
              <span>الشهر التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Unlimited Year Selector (Step -/+ , Auto-Expanding Dropdown, or Type Any Year) */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => setViewYear((y) => Math.max(1900, y - 1))}
              className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-slate-700 font-extrabold text-xs hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
              title="السنة السابقة"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <span>سنة -</span>
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-white border border-indigo-200 font-extrabold font-mono-num text-slate-900 text-xs sm:text-sm cursor-pointer"
                aria-label="اختيار السنة"
              >
                {dynamicYearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                value={yearInput}
                onChange={(e) => handleYearInputCommit(e.target.value)}
                onBlur={() => setYearInput(String(viewYear))}
                aria-label="كتابة أي سنة"
                title="يمكنك كتابة أي سنة مباشرة بدون حد أقصى"
                placeholder="سنة..."
                className="w-16 px-2 py-1 rounded-lg bg-white border border-indigo-200 focus:border-indigo-500 font-extrabold font-mono-num text-center text-xs sm:text-sm text-indigo-900"
              />
            </div>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-slate-700 font-extrabold text-xs hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
              title="السنة التالية (بلا نهاية)"
            >
              <span>سنة +</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Compact Calendar Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto">
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {ARABIC_WEEKDAYS_SHORT.map((day, idx) => (
              <div
                key={day}
                className={`text-center text-xs font-extrabold py-1 rounded-md ${
                  idx === 0
                    ? 'text-indigo-700 bg-indigo-50'
                    : 'text-slate-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-9 sm:h-10" />;
              }

              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayUTC;
              const hasAttendance = datesWithAttendance.has(cell.dateStr);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => {
                    onSelectDate(cell.dateStr);
                    onClose();
                  }}
                  className={`relative h-9 sm:h-10 rounded-lg flex flex-col items-center justify-center font-bold font-mono-num text-sm transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : isToday
                      ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
                      : hasAttendance
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-800 border-slate-200/80 hover:bg-indigo-50 hover:border-indigo-300'
                  }`}
                >
                  <span className="leading-none">{cell.dayNum}</span>
                  {hasAttendance && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Legend & Jump to Today */}
        <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              اليوم (مباشر)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              به حضور
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
              المختار
            </span>
          </div>

          <button
            type="button"
            onClick={handleJumpToday}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>اليوم: {formatArabicDateShort(todayUTC)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
