import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  FileSpreadsheet,
  FileUp,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { GroupId, LogEntry, Member, SpiritualElement } from '../../types';
import { GROUP_CONFIG_MAP, SPIRITUAL_ELEMENTS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  calculateElementRegularity,
  exportJSONBackup,
  exportRowsToExcel,
  formatArabicDateFull,
  getLastAttendanceDate,
  getTotalAttendanceCount,
  normalizeArabic,
  normalizeDateKey,
  parseMembersFromSpreadsheet,
  REGULARITY_META,
} from '../../utils/helpers';
import { PhoneActions } from '../PhoneActions';
import { AddMemberModal } from '../AddMemberModal';
import { ConfirmModal } from '../ConfirmModal';

interface MainRecordTabProps {
  groupId: GroupId;
  searchQuery: string;
  highlightedMemberId?: string | null;
  jumpCounter?: number;
  onMemberAdded?: (member: Member) => void;
}

export const MainRecordTab: React.FC<MainRecordTabProps> = ({
  groupId,
  searchQuery,
  highlightedMemberId = null,
  jumpCounter = 0,
  onMemberAdded,
}) => {
  const {
    groupsData,
    activeDate,
    todayUTC,
    toggleLog,
    addMember,
    updateMemberField,
    deleteMember,
    importMembers,
    addToast,
  } = useApp();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const groupConfig = GROUP_CONFIG_MAP[groupId];
  const { members, logs } = groupsData[groupId];

  // Smoothly scroll directly to the member selected from the autocomplete search dropdown
  useEffect(() => {
    if (!highlightedMemberId) return;
    const timer = setTimeout(() => {
      const container = tableContainerRef.current;
      const row = container?.querySelector<HTMLTableRowElement>(
        `tr[data-member-row-id="${highlightedMemberId}"]`
      );
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [highlightedMemberId, jumpCounter]);

  // Strict lookup strictly for activeDate ONLY (normalized YYYY-MM-DD):
  // If activeDate has NO attendance log for a member in logs[], their checkbox is UNCHECKED.
  const activeDateLogSet = useMemo(() => {
    const normalizedActive = normalizeDateKey(activeDate);
    const set = new Set<string>();
    for (const log of logs) {
      if (normalizeDateKey(log.date) === normalizedActive) {
        set.add(`${log.memberId}__${log.type}`);
      }
    }
    return set;
  }, [logs, activeDate]);

  // Precompute per-member logs array
  const logsByMember = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const log of logs) {
      const arr = map.get(log.memberId);
      if (arr) arr.push(log);
      else map.set(log.memberId, [log]);
    }
    return map;
  }, [logs]);

  const filteredMembers = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    if (!q) return members;
    return members.filter(
      (m) =>
        normalizeArabic(m.name).includes(q) ||
        m.phone.includes(searchQuery.trim()) ||
        normalizeArabic(m.notes).includes(q)
    );
  }, [members, searchQuery]);

  const presentOnActiveDateCount = useMemo(() => {
    let count = 0;
    for (const m of members) {
      if (activeDateLogSet.has(`${m.id}__attendance`)) count++;
    }
    return count;
  }, [members, activeDateLogSet]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseMembersFromSpreadsheet(file);
      if (parsed.length === 0) {
        addToast('لم يتم العثور على أسماء صالحة داخل الملف. تأكد من وجود عمود "الاسم".', 'warning');
      } else {
        importMembers(groupId, parsed);
      }
    } catch {
      addToast('تعذر قراءة الملف. يرجى اختيار ملف Excel (.xlsx) أو CSV صالح.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportExcel = () => {
    const rows = members.map((m) => {
      const mLogs = logsByMember.get(m.id) || [];
      const row: Record<string, string | number> = {
        'الاسم': m.name,
        'رقم التليفون': m.phone,
        'تاريخ الميلاد': m.birthDate,
        'العنوان': m.address,
        'ملاحظات': m.notes,
        'آخر تاريخ حضور': getLastAttendanceDate(m.id, mLogs),
        'إجمالي الحضور': getTotalAttendanceCount(m.id, mLogs),
      };
      for (const el of SPIRITUAL_ELEMENTS) {
        const reg = calculateElementRegularity(m.id, el.key, mLogs, activeDate);
        row[el.label] = REGULARITY_META[reg.status].label;
      }
      return row;
    });
    exportRowsToExcel(
      rows,
      groupConfig.stageLabel,
      `${groupConfig.cardTitle}_${activeDate}.xlsx`
    );
    addToast('تم تصدير السجل إلى ملف Excel بنجاح', 'success');
  };

  const handleExportJSON = () => {
    exportJSONBackup(
      {
        groupId,
        title: groupConfig.workspaceTitle,
        exportedAtUTC: new Date().toISOString(),
        data: groupsData[groupId],
      },
      `نسخة_احتياطية_${groupId}_${todayUTC}.json`
    );
    addToast('تم تنزيل النسخة الاحتياطية (JSON) بنجاح', 'success');
  };

  return (
    <div className="space-y-3.5">
      {/* Compact Top Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إضافة مخدوم جديد</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold text-xs sm:text-sm">
            التاريخ النشط:{' '}
            <span className="font-extrabold text-indigo-700">
              {formatArabicDateFull(activeDate)}
            </span>{' '}
            <span className="font-mono-num text-[11px] text-indigo-600">({activeDate})</span>
            {' — '}
            <span className="text-emerald-700 font-extrabold tabular-nums">
              الحضور: {presentOnActiveDateCount} / {members.length}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-extrabold text-xs transition-colors cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5 text-emerald-700" />
            <span>استيراد Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 font-extrabold text-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-700" />
            <span>تصدير Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-extrabold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>نسخة JSON</span>
          </button>
        </div>
      </div>

      {/* Compact Responsive Sticky-Header Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div
          ref={tableContainerRef}
          className="overflow-x-auto max-h-[68vh]"
        >
          <table className="w-full text-right border-collapse min-w-[1160px]">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
              <tr>
                <th
                  className="md:sticky md:right-0 md:z-30 bg-slate-900 px-1.5 py-2.5 text-[11px] font-extrabold text-center border-l border-slate-700 w-[46px] min-w-[46px]"
                  title="حذف نهائي من السجل وقاعدة البيانات"
                >
                  حذف
                </th>
                <th className="md:sticky md:right-[46px] md:z-30 bg-slate-900 px-3 py-2.5 text-xs sm:text-sm font-extrabold border-l border-slate-700 min-w-[190px]">
                  الاسم ({filteredMembers.length})
                </th>
                <th className="px-2.5 py-2.5 text-xs sm:text-sm font-extrabold border-l border-slate-700 min-w-[190px]">
                  رقم التليفون
                </th>
                <th className="px-2.5 py-2.5 text-xs sm:text-sm font-extrabold border-l border-slate-700 min-w-[135px]">
                  تاريخ الميلاد
                </th>
                <th className="px-2.5 py-2.5 text-xs sm:text-sm font-extrabold border-l border-slate-700 min-w-[145px]">
                  العنوان
                </th>
                <th className="px-2.5 py-2.5 text-xs sm:text-sm font-extrabold border-l border-slate-700 min-w-[160px]">
                  ملاحظات
                </th>
                <th className="px-2 py-2.5 text-xs sm:text-sm font-extrabold text-center border-l border-slate-700 bg-indigo-900 min-w-[78px]">
                  الحضور
                </th>
                <th className="px-2 py-2.5 text-xs sm:text-sm font-extrabold text-center border-l border-slate-700 min-w-[110px]">
                  آخر حضور
                </th>
                <th className="px-2 py-2.5 text-xs sm:text-sm font-extrabold text-center border-l border-slate-700 min-w-[88px]">
                  الإجمالي
                </th>
                {SPIRITUAL_ELEMENTS.map((el) => (
                  <th
                    key={el.key}
                    className="px-1.5 py-2.5 text-xs font-extrabold text-center border-l border-slate-700 min-w-[92px]"
                  >
                    {el.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center">
                    <p className="text-base font-extrabold text-slate-600">
                      لا توجد نتائج مطابقة للبحث «{searchQuery}»
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, index) => {
                  const mLogs = logsByMember.get(member.id) || [];
                  const isPresent = activeDateLogSet.has(`${member.id}__attendance`);
                  const lastAttendance = getLastAttendanceDate(member.id, mLogs);
                  const totalAttendance = getTotalAttendanceCount(member.id, mLogs);
                  const isHighlighted = highlightedMemberId === member.id;
                  const stickyCellBg = isHighlighted
                    ? 'bg-amber-100'
                    : isPresent
                    ? 'bg-emerald-50'
                    : index % 2 === 0
                    ? 'bg-white'
                    : 'bg-[#F8FAFC]';

                  return (
                    <tr
                      key={member.id}
                      data-member-row-id={member.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-100 ring-2 ring-inset ring-indigo-600'
                          : isPresent
                          ? 'bg-emerald-50/60 hover:bg-emerald-50'
                          : index % 2 === 0
                          ? 'bg-white hover:bg-indigo-50/35'
                          : 'bg-slate-50/50 hover:bg-indigo-50/35'
                      }`}
                    >
                      {/* 0. زر الحذف النهائي (خارج مربع الاسم على يمين الأسماء) */}
                      <td
                        className={`md:sticky md:right-0 md:z-10 px-1.5 py-2 border-l border-slate-200 text-center w-[46px] min-w-[46px] ${stickyCellBg}`}
                      >
                        <button
                          type="button"
                          onClick={() => setMemberToDelete(member)}
                          className="mx-auto inline-flex items-center justify-center p-1.5 rounded-lg text-rose-500 bg-rose-50/80 hover:bg-rose-600 hover:text-white border border-rose-200/80 hover:border-rose-600 transition-colors cursor-pointer"
                          title="حذف نهائي من السجل وقاعدة البيانات"
                          aria-label={`حذف نهائي ${member.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                      {/* 1. الاسم */}
                      <td
                        className={`md:sticky md:right-[46px] md:z-10 px-2.5 py-2 border-l border-slate-200 md:shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)] ${stickyCellBg}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-slate-200/80 text-slate-700 text-[11px] font-extrabold font-mono-num flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) =>
                              updateMemberField(groupId, member.id, { name: e.target.value })
                            }
                            aria-label={`اسم المخدوم ${member.name}`}
                            className="w-full min-w-[130px] bg-transparent hover:bg-white focus:bg-white px-1.5 py-1 rounded-md border border-transparent hover:border-slate-300 focus:border-indigo-500 font-extrabold text-sm text-slate-900 transition-colors"
                          />
                        </div>
                      </td>

                      {/* 2. رقم التليفون */}
                      <td className="px-2 py-2 border-l border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="tel"
                            dir="ltr"
                            value={member.phone}
                            onChange={(e) =>
                              updateMemberField(groupId, member.id, { phone: e.target.value })
                            }
                            placeholder="رقم..."
                            aria-label={`تليفون ${member.name}`}
                            className="w-28 bg-white/90 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-500 font-mono-num font-bold text-xs text-right text-slate-900"
                          />
                          <PhoneActions phone={member.phone} notes={member.notes} />
                        </div>
                      </td>

                      {/* 3. تاريخ الميلاد */}
                      <td className="px-2 py-2 border-l border-slate-200">
                        <input
                          type="date"
                          value={member.birthDate}
                          onChange={(e) =>
                            updateMemberField(
                              groupId,
                              member.id,
                              { birthDate: e.target.value },
                              false
                            )
                          }
                          aria-label={`تاريخ ميلاد ${member.name}`}
                          className="w-full bg-white/90 px-1.5 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-500 font-mono-num font-bold text-xs text-slate-800"
                        />
                      </td>

                      {/* 4. العنوان */}
                      <td className="px-2 py-2 border-l border-slate-200">
                        <input
                          type="text"
                          value={member.address}
                          onChange={(e) =>
                            updateMemberField(groupId, member.id, { address: e.target.value })
                          }
                          placeholder="العنوان..."
                          aria-label={`عنوان ${member.name}`}
                          className="w-full bg-white/90 px-2 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-500 font-semibold text-xs text-slate-800"
                        />
                      </td>

                      {/* 5. ملاحظات */}
                      <td className="px-2 py-2 border-l border-slate-200">
                        <input
                          type="text"
                          value={member.notes}
                          onChange={(e) =>
                            updateMemberField(groupId, member.id, { notes: e.target.value })
                          }
                          placeholder="ملاحظة..."
                          aria-label={`ملاحظات ${member.name}`}
                          className="w-full bg-amber-50/60 focus:bg-white px-2 py-1.5 rounded-lg border border-amber-200/80 focus:border-indigo-500 font-semibold text-xs text-slate-900"
                        />
                      </td>

                      {/* 6. الحضور — Strictly reflects activeDate in logs[] ONLY */}
                      <td className="px-2 py-2 border-l border-slate-200 text-center">
                        <button
                          key={`att_${member.id}_${activeDate}`}
                          type="button"
                          onClick={() =>
                            toggleLog(groupId, member.id, activeDate, 'attendance')
                          }
                          aria-pressed={isPresent}
                          aria-label={`تسجيل حضور ${member.name} بتاريخ ${activeDate}`}
                          className={`mx-auto w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                            isPresent
                              ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                              : 'bg-white border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50'
                          }`}
                        >
                          <Check className="w-5 h-5 stroke-[3]" />
                        </button>
                      </td>

                      {/* 7. آخر تاريخ حضور */}
                      <td className="px-2 py-2 border-l border-slate-200 text-center">
                        <span className="font-mono-num font-bold text-xs text-slate-800">
                          {lastAttendance}
                        </span>
                      </td>

                      {/* 8. إجمالي الحضور */}
                      <td className="px-2 py-2 border-l border-slate-200 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg font-mono-num font-extrabold text-sm border ${
                            totalAttendance > 0
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {totalAttendance}
                        </span>
                      </td>

                      {/* 9–13. الـ ٥ عناصر الروحية */}
                      {SPIRITUAL_ELEMENTS.map((el) => {
                        const checked = activeDateLogSet.has(`${member.id}__${el.key}`);
                        const reg = calculateElementRegularity(
                          member.id,
                          el.key as SpiritualElement,
                          mLogs,
                          activeDate
                        );
                        const regMeta = REGULARITY_META[reg.status];

                        return (
                          <td
                            key={el.key}
                            className="px-1.5 py-2 border-l border-slate-200 text-center"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <button
                                key={`el_${el.key}_${member.id}_${activeDate}`}
                                type="button"
                                onClick={() =>
                                  toggleLog(groupId, member.id, activeDate, el.key)
                                }
                                aria-pressed={checked}
                                aria-label={`${el.label} للمخدوم ${member.name} بتاريخ ${activeDate}`}
                                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                  checked
                                    ? `${el.checkboxActiveClass} shadow-xs`
                                    : 'bg-white border-slate-300 text-transparent hover:border-indigo-400 hover:bg-slate-50'
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>

                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold border whitespace-nowrap ${regMeta.badgeClass}`}
                                title={
                                  reg.lastDate
                                    ? `آخر تسجيل: ${reg.lastDate} (${reg.countLast7} في آخر 7 أيام)`
                                    : 'لم يتم التسجيل بعد'
                                }
                              >
                                {regMeta.label}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddMemberModal
        isOpen={isAddOpen}
        groupTitle={groupConfig.workspaceTitle}
        activeDate={activeDate}
        onAdd={(m, opts) => {
          const created = addMember(groupId, m, opts);
          onMemberAdded?.(created);
        }}
        onClose={() => setIsAddOpen(false)}
      />

      <ConfirmModal
        isOpen={!!memberToDelete}
        title="تأكيد الحذف النهائي للمخدوم"
        message={`هل أنت متأكد من الحذف النهائي للمخدوم «${memberToDelete?.name}» وجميع سجلات حضوره ومتابعته؟ سيتم مسح اسمه تماماً من السجل ومن قاعدة البيانات (Google Sheets) بدون رجعة.`}
        confirmLabel="نعم، احذف نهائياً"
        onConfirm={() => {
          if (memberToDelete) {
            deleteMember(groupId, memberToDelete.id);
          }
          setMemberToDelete(null);
        }}
        onCancel={() => setMemberToDelete(null)}
      />
    </div>
  );
};
