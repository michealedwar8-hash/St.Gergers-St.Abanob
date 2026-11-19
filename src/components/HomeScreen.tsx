import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarCheck2,
  Crown,
  Flame,
  RefreshCw,
  Settings2,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { GROUPS_CONFIG } from '../data/seedData';
import { useApp } from '../context/AppContext';
import { formatArabicDateFull, normalizeDateKey } from '../utils/helpers';
import { FontSizeControl } from './FontSizeControl';
import { SheetsSettingsModal } from './SheetsSettingsModal';

const CARD_ICONS = {
  shield: Shield,
  crown: Crown,
  flame: Flame,
  sparkles: Sparkles,
};

export const HomeScreen: React.FC = () => {
  const {
    groupsData,
    todayUTC,
    openGroup,
    isSheetsConfigured,
    isSheetsOnline,
    isRefreshing,
    refreshAllFromSheets,
  } = useApp();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const globalStats = useMemo(() => {
    let totalMembers = 0;
    let totalTodayPresent = 0;

    for (const cfg of GROUPS_CONFIG) {
      const grp = groupsData[cfg.id];
      totalMembers += grp.members.length;
      const todayIds = new Set<string>();
      for (const l of grp.logs) {
        if (normalizeDateKey(l.date) === todayUTC && l.type === 'attendance') {
          todayIds.add(l.memberId);
        }
      }
      totalTodayPresent += todayIds.size;
    }

    return { totalMembers, totalTodayPresent };
  }, [groupsData, todayUTC]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      {/* Compact Responsive Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-200/70 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          {/* Status & Today Date */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
                isSheetsConfigured && isSheetsOnline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-amber-50 border-amber-200 text-amber-950 hover:bg-amber-100'
              }`}
            >
              <span>
                {isSheetsConfigured && isSheetsOnline
                  ? 'متصل بـ Google Sheets 🟢'
                  : 'وضع محلي 🟡'}
              </span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold">
              <CalendarCheck2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{formatArabicDateFull(todayUTC)}</span>
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <FontSizeControl compact />

            <button
              type="button"
              onClick={() => void refreshAllFromSheets(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>إعدادات Google Sheets</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-5">
        {/* Compact Joyful Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-indigo-700 via-blue-700 to-teal-700 text-white px-4 py-4 sm:px-6 sm:py-5 shadow-md">
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-amber-200">
                نظام الحضور والمتابعة الروحية والافتقاد
              </p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight">
                أسرة مدارس الأحد إعدادي وثانوي
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100 font-semibold">
                اختر السجل المطلوب لتسجيل الحضور ومتابعة الـ ٥ عناصر الروحية والافتقاد وأعياد الميلاد.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-white/15 border border-white/25 rounded-xl px-3.5 py-2.5 text-center min-w-[105px]">
                <p className="text-[11px] font-extrabold text-indigo-100">إجمالي المخدومين</p>
                <p className="text-xl sm:text-2xl font-black font-mono-num text-white">
                  {globalStats.totalMembers}
                </p>
              </div>
              <div className="bg-white/15 border border-white/25 rounded-xl px-3.5 py-2.5 text-center min-w-[105px]">
                <p className="text-[11px] font-extrabold text-amber-200">حضور اليوم</p>
                <p className="text-xl sm:text-2xl font-black font-mono-num text-amber-200">
                  {globalStats.totalTodayPresent}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Compact 2x2 Grid of 4 Family Cards */}
        <section aria-label="سجلات الأسر الأربعة">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GROUPS_CONFIG.map((group) => {
              const Icon = CARD_ICONS[group.iconName];
              const grpData = groupsData[group.id];
              const memberCount = grpData.members.length;

              const presentTodaySet = new Set<string>();
              const attendanceDatesSet = new Set<string>();
              for (const l of grpData.logs) {
                if (l.type === 'attendance') {
                  const dk = normalizeDateKey(l.date);
                  attendanceDatesSet.add(dk);
                  if (dk === todayUTC) {
                    presentTodaySet.add(l.memberId);
                  }
                }
              }
              const presentToday = presentTodaySet.size;
              const attendanceRate =
                memberCount > 0 ? Math.round((presentToday / memberCount) * 100) : 0;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => openGroup(group.id)}
                  className={`group text-right bg-white rounded-2xl border-2 ${group.borderClass} shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-0.5`}
                >
                  {/* Compact Colorful Card Header + Dual Saint/Youth Showcase */}
                  <div
                    className={`bg-gradient-to-l ${group.gradientClass} text-white p-3.5 sm:p-4 w-full space-y-3`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-white/95 bg-white/20 px-2.5 py-0.5 rounded-md">
                          <Icon className="w-3 h-3" />
                          <span>{group.familyName}</span>
                        </span>
                        <h2 className="text-lg sm:text-xl font-black leading-snug mt-1">
                          {group.cardTitle}
                        </h2>
                      </div>
                    </div>

                    {/* Sleek Balanced Portrait Showcase (fits cleanly on mobile/tablet/desktop) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-slate-900/35 to-slate-900/60 border border-white/50 shadow-sm h-28 sm:h-36 flex items-center justify-center">
                        <img
                          src={group.saintImage}
                          alt={group.saintAlt}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-2 py-1">
                          <span className="text-[11px] font-extrabold text-white">
                            {group.familyName}
                          </span>
                        </div>
                      </div>

                      <div className="relative rounded-xl overflow-hidden bg-white/15 border border-white/50 shadow-sm h-28 sm:h-36">
                        <img
                          src={group.groupImage}
                          alt={group.groupAlt}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-2 py-1">
                          <span className="text-[11px] font-extrabold text-white">
                            {group.stageLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3 w-full">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 border border-slate-200 py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-500">
                          <Users className="w-3 h-3" />
                          <span>المخدومون</span>
                        </div>
                        <p className="text-lg sm:text-xl font-black font-mono-num text-slate-900">
                          {memberCount}
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 py-2 px-2 text-center">
                        <p className="text-[11px] font-extrabold text-emerald-800">حضور اليوم</p>
                        <p className="text-lg sm:text-xl font-black font-mono-num text-emerald-700">
                          {presentToday}
                        </p>
                      </div>

                      <div className="rounded-xl bg-indigo-50 border border-indigo-200 py-2 px-2 text-center">
                        <p className="text-[11px] font-extrabold text-indigo-800">نسبة اليوم</p>
                        <p className="text-lg sm:text-xl font-black font-mono-num text-indigo-700">
                          {attendanceRate}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs font-extrabold text-slate-500">
                        أيام مسجلة:{' '}
                        <strong className="font-mono-num text-slate-800">
                          {attendanceDatesSet.size}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 group-hover:bg-indigo-700 text-white font-extrabold text-xs transition-colors">
                        <span>فتح السجل</span>
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <SheetsSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
