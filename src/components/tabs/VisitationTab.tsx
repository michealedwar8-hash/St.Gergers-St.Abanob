import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  HeartHandshake,
  Sparkles,
  Users,
} from 'lucide-react';
import { GroupId, LogEntry, RegularityStatus, SpiritualElement } from '../../types';
import { SPIRITUAL_ELEMENTS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  calculateElementRegularity,
  daysBetweenUTC,
  formatAbsenceDuration,
  getLastAttendanceDate,
  normalizeArabic,
  normalizeDateKey,
  REGULARITY_META,
} from '../../utils/helpers';
import { PhoneActions } from '../PhoneActions';

interface VisitationTabProps {
  groupId: GroupId;
  searchQuery: string;
}

type AbsencePreset = '14d' | '21d' | '30d' | '60d' | '90d' | 'never' | 'custom';
type DurationUnit = 'days' | 'weeks' | 'months' | 'years';
type VisitedFilter = 'all' | 'pending' | 'visited';

export const VisitationTab: React.FC<VisitationTabProps> = ({
  groupId,
  searchQuery,
}) => {
  const { groupsData, todayUTC, toggleVisitation, updateMemberField } = useApp();
  const { members, logs } = groupsData[groupId];

  // Section A state
  const [preset, setPreset] = useState<AbsencePreset>('14d');
  const [customAmount, setCustomAmount] = useState<number>(5);
  const [customUnit, setCustomUnit] = useState<DurationUnit>('weeks');
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilter>('all');

  // Section B state
  const [selectedElement, setSelectedElement] = useState<'all' | SpiritualElement>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | RegularityStatus>('irregular');

  const logsByMember = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const log of logs) {
      const arr = map.get(log.memberId);
      if (arr) arr.push(log);
      else map.set(log.memberId, [log]);
    }
    return map;
  }, [logs]);

  // Compute enriched rows including active absence-cycle visitation status
  const enrichedMembers = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return members
      .filter((m) =>
        !q
          ? true
          : normalizeArabic(m.name).includes(q) ||
            m.phone.includes(searchQuery.trim()) ||
            normalizeArabic(m.notes).includes(q) ||
            normalizeArabic(m.visitationNotes || '').includes(q)
      )
      .map((member) => {
        const mLogs = logsByMember.get(member.id) || [];
        const lastAttendance = getLastAttendanceDate(member.id, mLogs);
        const daysAbsent = lastAttendance
          ? Math.max(0, daysBetweenUTC(lastAttendance, todayUTC))
          : null;

        // Latest attendance timestamp & latest visitation timestamp
        let latestAttDate = '';
        let latestAttTs = '';
        let latestVisitDate = '';
        let latestVisitTs = '';

        for (const l of mLogs) {
          const d = normalizeDateKey(l.date);
          if (l.type === 'attendance') {
            if (d > latestAttDate || (d === latestAttDate && l.timestampUTC > latestAttTs)) {
              latestAttDate = d;
              latestAttTs = l.timestampUTC;
            }
          } else if (l.type === 'visitation') {
            if (d > latestVisitDate || (d === latestVisitDate && l.timestampUTC > latestVisitTs)) {
              latestVisitDate = d;
              latestVisitTs = l.timestampUTC;
            }
          }
        }

        // Visited during THIS current absence cycle (resets automatically once they attend again!)
        const isVisitedThisCycle = Boolean(latestVisitDate) && (
          !latestAttDate ||
          latestVisitDate > latestAttDate ||
          (latestVisitDate === latestAttDate && latestVisitTs > latestAttTs)
        );

        const elementsReg = {} as Record<SpiritualElement, RegularityStatus>;
        for (const el of SPIRITUAL_ELEMENTS) {
          elementsReg[el.key] = calculateElementRegularity(
            member.id,
            el.key,
            mLogs,
            todayUTC
          ).status;
        }

        return {
          member,
          lastAttendance,
          daysAbsent,
          isVisitedThisCycle,
          latestVisitDate,
          elementsReg,
        };
      });
  }, [members, logsByMember, todayUTC, searchQuery]);

  // Summary metrics across ALL members of this group
  const summary = useMemo(() => {
    let needingVisitation = 0;
    let activeRecent = 0;
    let irregularSpiritualCount = 0;

    for (const m of members) {
      const mLogs = logsByMember.get(m.id) || [];
      const last = getLastAttendanceDate(m.id, mLogs);
      const d = last ? Math.max(0, daysBetweenUTC(last, todayUTC)) : null;
      if (d === null || d >= 14) needingVisitation++;
      else activeRecent++;

      const hasIrregular = SPIRITUAL_ELEMENTS.some(
        (el) => calculateElementRegularity(m.id, el.key, mLogs, todayUTC).status === 'irregular'
      );
      if (hasIrregular) irregularSpiritualCount++;
    }

    return {
      total: members.length,
      needingVisitation,
      activeRecent,
      irregularSpiritualCount,
    };
  }, [members, logsByMember, todayUTC]);

  // Calculate threshold in days for Section A
  const thresholdDays = useMemo(() => {
    switch (preset) {
      case '14d':
        return 14;
      case '21d':
        return 21;
      case '30d':
        return 30;
      case '60d':
        return 60;
      case '90d':
        return 90;
      case 'custom': {
        const val = Math.max(1, Number(customAmount) || 1);
        const multiplier =
          customUnit === 'days'
            ? 1
            : customUnit === 'weeks'
            ? 7
            : customUnit === 'months'
            ? 30
            : 365;
        return val * multiplier;
      }
      case 'never':
      default:
        return Infinity;
    }
  }, [preset, customAmount, customUnit]);

  // Base absent members meeting the absence duration threshold
  // Note: Once a member logs attendance (daysAbsent = 0), they immediately leave this list!
  const allAbsentMatchingDuration = useMemo(() => {
    return enrichedMembers
      .filter((item) => {
        if (preset === 'never') {
          return item.daysAbsent === null;
        }
        return item.daysAbsent === null || item.daysAbsent >= thresholdDays;
      })
      .sort((a, b) => {
        // Unvisited first, visited below (optional nice grouping, still sorted by absence duration)
        if (a.isVisitedThisCycle !== b.isVisitedThisCycle) {
          return a.isVisitedThisCycle ? 1 : -1;
        }
        if (a.daysAbsent === null && b.daysAbsent === null) return 0;
        if (a.daysAbsent === null) return -1;
        if (b.daysAbsent === null) return 1;
        return b.daysAbsent - a.daysAbsent;
      });
  }, [enrichedMembers, preset, thresholdDays]);

  const visitedCountInList = useMemo(
    () => allAbsentMatchingDuration.filter((x) => x.isVisitedThisCycle).length,
    [allAbsentMatchingDuration]
  );

  const absentMembers = useMemo(() => {
    if (visitedFilter === 'pending') {
      return allAbsentMatchingDuration.filter((x) => !x.isVisitedThisCycle);
    }
    if (visitedFilter === 'visited') {
      return allAbsentMatchingDuration.filter((x) => x.isVisitedThisCycle);
    }
    return allAbsentMatchingDuration;
  }, [allAbsentMatchingDuration, visitedFilter]);

  const spiritualFilteredMembers = useMemo(() => {
    return enrichedMembers.filter((item) => {
      if (selectedElement === 'all') {
        if (selectedStatus === 'all') return true;
        return SPIRITUAL_ELEMENTS.some(
          (el) => item.elementsReg[el.key] === selectedStatus
        );
      }
      if (selectedStatus === 'all') return true;
      return item.elementsReg[selectedElement] === selectedStatus;
    });
  }, [enrichedMembers, selectedElement, selectedStatus]);

  const presetButtons: Array<{ id: AbsencePreset; label: string }> = [
    { id: '14d', label: 'أسبوعين (14 يوم)' },
    { id: '21d', label: '3 أسابيع' },
    { id: '30d', label: 'شهر' },
    { id: '60d', label: 'شهرين' },
    { id: '90d', label: '3 شهور' },
    { id: 'never', label: 'لم يحضر أبداً' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-indigo-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-600">
              إجمالي المخدومين
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono-num text-indigo-950 mt-1">
            {summary.total}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-600">
              يحتاجون للافتقاد (≥ 14 يوم)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono-num text-rose-700 mt-1">
            {summary.needingVisitation}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-600">
              منتظمون بالحضور (آخر 14 يوم)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono-num text-emerald-700 mt-1">
            {summary.activeRecent}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-600">
              يحتاجون متابعة روحية
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono-num text-amber-700 mt-1">
            {summary.irregularSpiritualCount}
          </p>
        </div>
      </div>

      {/* SECTION A: افتقاد الغائبين */}
      <section className="bg-white rounded-2xl border border-rose-200/80 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-l from-rose-600 to-orange-600 text-white px-4 py-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold">
                القسم الأول: افتقاد الغائبين
              </h3>
              <p className="text-rose-100 text-xs font-semibold">
                صحّح مربع «تم الافتقاد» لوضع خط على الاسم واكتب ملاحظات الافتقاد (تُحفظ دائماً حتى لو حضر وعاد لاحقاً)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-white/20 text-white font-extrabold text-xs tabular-nums">
              الإجمالي: {allAbsentMatchingDuration.length}
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-500/90 text-white font-extrabold text-xs tabular-nums">
              تم افتقادهم: {visitedCountInList}
            </span>
            <span className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-extrabold text-xs tabular-nums">
              متبقي: {allAbsentMatchingDuration.length - visitedCountInList}
            </span>
          </div>
        </div>

        {/* Presets + Unlimited Custom Duration + Visited Status Filter */}
        <div className="p-3.5 bg-rose-50/40 border-b border-rose-100 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {presetButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setPreset(btn.id)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                  preset === btn.id
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-rose-300 hover:bg-rose-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Unlimited Custom Duration */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-white border border-rose-200">
              <span className="font-extrabold text-xs text-slate-800">
                مدة مخصصة مفتوحة:
              </span>
              <input
                type="number"
                min={1}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(Math.max(1, Number(e.target.value) || 1));
                  setPreset('custom');
                }}
                aria-label="المدة الرقمية"
                className="w-16 px-2 py-1 rounded-lg border border-slate-300 focus:border-rose-500 font-mono-num font-extrabold text-sm text-center text-slate-900"
              />
              <select
                value={customUnit}
                onChange={(e) => {
                  setCustomUnit(e.target.value as DurationUnit);
                  setPreset('custom');
                }}
                aria-label="وحدة المدة"
                className="px-2.5 py-1 rounded-lg border border-slate-300 focus:border-rose-500 font-extrabold text-xs text-slate-900 bg-white cursor-pointer"
              >
                <option value="days">أيام</option>
                <option value="weeks">أسابيع</option>
                <option value="months">شهور</option>
                <option value="years">سنوات</option>
              </select>
              <button
                type="button"
                onClick={() => setPreset('custom')}
                className={`px-3 py-1 rounded-lg font-extrabold text-xs cursor-pointer transition-colors ${
                  preset === 'custom'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                تطبيق
              </button>
            </div>

            {/* Visited Status Filter */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200">
              {(
                [
                  { id: 'all', label: 'الكل' },
                  { id: 'pending', label: 'لم يتم افتقادهم' },
                  { id: 'visited', label: 'تم افتقادهم ✓' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setVisitedFilter(f.id)}
                  className={`px-3 py-1 rounded-lg font-extrabold text-xs transition-colors cursor-pointer ${
                    visitedFilter === f.id
                      ? f.id === 'visited'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Absence Table with Visited Checkbox + Strikethrough + Dedicated Visitation Notes */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[1180px]">
            <thead className="bg-slate-100 text-slate-800 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm min-w-[235px]">
                  تم الافتقاد والاسم
                </th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm min-w-[230px] bg-teal-50/80 text-teal-950">
                  ملاحظات الافتقاد (محفوظة دائماً)
                </th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm min-w-[175px]">
                  التليفون والتواصل
                </th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">العنوان</th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm text-center">
                  آخر حضور
                </th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm text-center">
                  مدة الغياب
                </th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">
                  ملاحظات السجل
                </th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">
                  الـ ٥ عناصر الروحية
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {absentMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <p className="text-base font-extrabold text-emerald-700">
                      {allAbsentMatchingDuration.length === 0
                        ? 'ممتاز! لا يوجد مخدومون غائبون ضمن هذه المدة المحددة'
                        : 'لا توجد نتائج ضمن تصفية حالة الافتقاد المختارة'}
                    </p>
                  </td>
                </tr>
              ) : (
                absentMembers.map(
                  ({
                    member,
                    lastAttendance,
                    daysAbsent,
                    isVisitedThisCycle,
                    latestVisitDate,
                    elementsReg,
                  }) => (
                    <tr
                      key={member.id}
                      className={`transition-colors ${
                        isVisitedThisCycle
                          ? 'bg-emerald-50/75 hover:bg-emerald-50'
                          : 'hover:bg-rose-50/35'
                      }`}
                    >
                      {/* Checkbox + Name with Strikethrough when visited */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleVisitation(groupId, member.id)}
                            aria-pressed={isVisitedThisCycle}
                            aria-label={`تم افتقاد ${member.name}`}
                            title={
                              isVisitedThisCycle
                                ? `تم الافتقاد بتاريخ ${latestVisitDate} — اضغط للإلغاء`
                                : 'اضغط لتسجيل أنه تم افتقاده'
                            }
                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer active:scale-95 ${
                              isVisitedThisCycle
                                ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                                : 'bg-white border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div className="min-w-0">
                            <span
                              className={`block font-extrabold text-sm sm:text-base transition-all ${
                                isVisitedThisCycle
                                  ? 'line-through decoration-2 decoration-emerald-700 text-slate-500'
                                  : 'text-slate-900'
                              }`}
                            >
                              {member.name}
                            </span>
                            {isVisitedThisCycle && (
                              <span className="inline-block text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded mt-0.5">
                                تم الافتقاد ✓ ({latestVisitDate})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Dedicated Permanent Visitation Notes */}
                      <td className="px-2.5 py-2 bg-teal-50/30">
                        <input
                          type="text"
                          value={member.visitationNotes || ''}
                          onChange={(e) =>
                            updateMemberField(groupId, member.id, {
                              visitationNotes: e.target.value,
                            })
                          }
                          placeholder="اكتب نتيجة وملاحظات الافتقاد..."
                          aria-label={`ملاحظات الافتقاد للمخدوم ${member.name}`}
                          className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-teal-200 focus:border-teal-600 font-semibold text-xs text-slate-900 placeholder:text-slate-400"
                        />
                      </td>

                      {/* Phone + Call & Official WhatsApp */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {member.phone && (
                            <span className="font-mono-num font-bold text-xs text-slate-700">
                              {member.phone}
                            </span>
                          )}
                          <PhoneActions
                            phone={member.phone}
                            notes={member.notes}
                            whatsappMessage={`سلام ونعمة يا ${member.name}، مفتقدينك جداً في أسرة مدارس الأحد! بنطمن عليك ونتمنى نشوفك قريباً 🤍`}
                          />
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">
                        {member.address || <span className="text-slate-400">—</span>}
                      </td>

                      {/* Last Attendance */}
                      <td className="px-3 py-2.5 text-center font-mono-num font-bold text-xs text-slate-800">
                        {lastAttendance || <span className="text-slate-400">—</span>}
                      </td>

                      {/* Absence Duration */}
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-extrabold border whitespace-nowrap ${
                            daysAbsent === null
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {formatAbsenceDuration(daysAbsent)}
                        </span>
                      </td>

                      {/* General Notes from Main Record */}
                      <td className="px-3 py-2.5 text-xs font-bold text-amber-950 max-w-[160px]">
                        {member.notes ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                            {member.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 5 Spiritual Elements */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {SPIRITUAL_ELEMENTS.map((el) => {
                            const meta = REGULARITY_META[elementsReg[el.key]];
                            return (
                              <span
                                key={el.key}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${meta.badgeClass}`}
                              >
                                <span>{el.shortLabel}:</span>
                                <span>{meta.label}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION B: متابعة الـ ٥ عناصر الروحية */}
      <section className="bg-white rounded-2xl border border-indigo-200/80 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-700 to-violet-700 text-white px-4 py-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold">
                القسم الثاني: متابعة الـ ٥ عناصر الروحية
              </h3>
              <p className="text-indigo-100 text-xs font-semibold">
                تصفية حسب العنصر الروحي ومستوى الانتظام (منتظم / متقطع / غير منتظم)
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-white/20 text-white font-extrabold text-xs tabular-nums">
            المطابقون: {spiritualFilteredMembers.length}
          </span>
        </div>

        <div className="p-3.5 bg-indigo-50/40 border-b border-indigo-100 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-slate-700 ml-1">العنصر:</span>
            <button
              type="button"
              onClick={() => setSelectedElement('all')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer border ${
                selectedElement === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-indigo-50'
              }`}
            >
              الكل
            </button>
            {SPIRITUAL_ELEMENTS.map((el) => (
              <button
                key={el.key}
                type="button"
                onClick={() => setSelectedElement(el.key)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer border ${
                  selectedElement === el.key
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-indigo-50'
                }`}
              >
                {el.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-slate-700 ml-1">حالة الانتظام:</span>
            {(
              [
                { id: 'all', label: 'الكل', activeClass: 'bg-slate-800 text-white border-slate-900' },
                { id: 'regular', label: 'منتظم', activeClass: 'bg-emerald-600 text-white border-emerald-700' },
                { id: 'intermittent', label: 'متقطع', activeClass: 'bg-amber-500 text-white border-amber-600' },
                { id: 'irregular', label: 'غير منتظم', activeClass: 'bg-rose-600 text-white border-rose-700' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer border transition-colors ${
                  selectedStatus === st.id
                    ? st.activeClass
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[960px]">
            <thead className="bg-slate-100 text-slate-800 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">الاسم</th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">التليفون</th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">العنوان</th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">ملاحظات الافتقاد</th>
                <th className="px-3 py-2.5 font-extrabold text-xs sm:text-sm">ملاحظات السجل</th>
                {SPIRITUAL_ELEMENTS.map((el) => (
                  <th
                    key={el.key}
                    className={`px-2 py-2.5 font-extrabold text-xs text-center ${
                      selectedElement === el.key ? 'bg-indigo-100 text-indigo-950' : ''
                    }`}
                  >
                    {el.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {spiritualFilteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-600 font-bold text-base">
                    لا يوجد مخدومون مطابقون لخيارات التصفية الحالية
                  </td>
                </tr>
              ) : (
                spiritualFilteredMembers.map(({ member, elementsReg }) => (
                  <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-3 py-2.5 font-extrabold text-sm text-slate-900">
                      {member.name}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {member.phone && (
                          <span className="font-mono-num text-xs font-bold text-slate-700">
                            {member.phone}
                          </span>
                        )}
                        <PhoneActions phone={member.phone} notes={member.notes} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">
                      {member.address || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-teal-950 max-w-[180px]">
                      {member.visitationNotes ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200">
                          {member.visitationNotes}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-bold text-amber-950 max-w-[160px]">
                      {member.notes ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                          {member.notes}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {SPIRITUAL_ELEMENTS.map((el) => {
                      const meta = REGULARITY_META[elementsReg[el.key]];
                      return (
                        <td
                          key={el.key}
                          className={`px-2 py-2.5 text-center ${
                            selectedElement === el.key ? 'bg-indigo-50/60' : ''
                          }`}
                        >
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold border whitespace-nowrap ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
