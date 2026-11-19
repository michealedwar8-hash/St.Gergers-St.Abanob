import React, { useMemo, useRef, useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  FilterX,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { GroupData, GroupId, LogEntry, LogType, Member } from '../../types';
import { GROUP_CONFIG_MAP, LOG_TYPE_META } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import {
  exportJSONBackup,
  exportRowsToCSV,
  exportRowsToExcel,
  formatFullUTCTimestamp,
  formatLogRowsForExport,
  normalizeArabic,
} from '../../utils/helpers';
import { ConfirmModal } from '../ConfirmModal';

interface MasterDatabaseTabProps {
  groupId: GroupId;
  searchQuery: string;
}

export const MasterDatabaseTab: React.FC<MasterDatabaseTabProps> = ({
  groupId,
  searchQuery,
}) => {
  const { groupsData, todayUTC, deleteLog, restoreGroupData, addToast } = useApp();
  const { members, logs } = groupsData[groupId];
  const groupConfig = GROUP_CONFIG_MAP[groupId];

  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LogType>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [logToDelete, setLogToDelete] = useState<LogEntry | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const membersMap = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const filteredLogs = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    return logs
      .filter((log) => {
        if (memberFilter !== 'all' && log.memberId !== memberFilter) return false;
        if (typeFilter !== 'all' && log.type !== typeFilter) return false;
        if (dateFrom && log.date < dateFrom) return false;
        if (dateTo && log.date > dateTo) return false;
        if (q) {
          const m = membersMap.get(log.memberId);
          const matchName = m ? normalizeArabic(m.name).includes(q) : false;
          const matchNotes = m ? normalizeArabic(m.notes).includes(q) : false;
          if (!matchName && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => (a.timestampUTC > b.timestampUTC ? -1 : 1));
  }, [logs, memberFilter, typeFilter, dateFrom, dateTo, searchQuery, membersMap]);

  const hasFilters =
    memberFilter !== 'all' || typeFilter !== 'all' || dateFrom !== '' || dateTo !== '';

  const resetFilters = () => {
    setMemberFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleExportExcel = () => {
    const rows = formatLogRowsForExport(filteredLogs, membersMap);
    if (rows.length === 0) {
      addToast('لا توجد سجلات لتصديرها حالياً', 'info');
      return;
    }
    exportRowsToExcel(
      rows,
      'قاعدة_البيانات',
      `قاعدة_بيانات_${groupConfig.stageLabel}_${todayUTC}.xlsx`
    );
    addToast('تم تصدير قاعدة البيانات إلى Excel بنجاح', 'success');
  };

  const handleExportCSV = () => {
    const rows = formatLogRowsForExport(filteredLogs, membersMap);
    if (rows.length === 0) {
      addToast('لا توجد سجلات لتصديرها حالياً', 'info');
      return;
    }
    exportRowsToCSV(
      rows,
      `قاعدة_بيانات_${groupConfig.stageLabel}_${todayUTC}.csv`
    );
    addToast('تم تصدير قاعدة البيانات إلى CSV بنجاح', 'success');
  };

  const handleBackupJSON = () => {
    exportJSONBackup(
      {
        groupId,
        title: groupConfig.workspaceTitle,
        exportedAtUTC: new Date().toISOString(),
        data: groupsData[groupId],
      },
      `نسخة_احتياطية_كاملة_${groupId}_${todayUTC}.json`
    );
    addToast('تم تنزيل النسخة الاحتياطية الكاملة (JSON) بنجاح', 'success');
  };

  const handleRestoreJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { data?: GroupData } & Partial<GroupData>;
      const targetData: GroupData | null =
        parsed.data && Array.isArray(parsed.data.members)
          ? parsed.data
          : Array.isArray(parsed.members)
          ? { members: parsed.members, logs: Array.isArray(parsed.logs) ? parsed.logs : [] }
          : null;

      if (!targetData) {
        addToast('ملف JSON غير متوافق مع صيغة النسخة الاحتياطية', 'error');
      } else {
        restoreGroupData(groupId, targetData);
      }
    } catch {
      addToast('تعذر قراءة ملف النسخة الاحتياطية JSON', 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Export & Backup Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">
              بيانات سجل الحضور (قاعدة البيانات الشاملة)
            </h3>
            <p className="text-sm font-bold text-slate-600">
              إجمالي السجلات المحفوظة:{' '}
              <span className="font-mono-num text-indigo-700 font-black">
                {logs.length}
              </span>{' '}
              — المعروض حالياً:{' '}
              <span className="font-mono-num text-emerald-700 font-black">
                {filteredLogs.length}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير قاعدة البيانات (Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={handleBackupJSON}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>نسخ احتياطي (JSON)</span>
          </button>

          <input
            ref={restoreInputRef}
            type="file"
            accept=".json"
            onChange={handleRestoreJSON}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-sm transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>استعادة (JSON)</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
            تصفية بالمخدوم
          </label>
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-sm text-slate-900 cursor-pointer"
          >
            <option value="all">جميع المخدومين ({members.length})</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
            نوع التسجيل
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | LogType)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-sm text-slate-900 cursor-pointer"
          >
            <option value="all">كل الأنواع</option>
            {(Object.keys(LOG_TYPE_META) as LogType[]).map((key) => (
              <option key={key} value={key}>
                {LOG_TYPE_META[key].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
            من تاريخ
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-mono-num font-bold text-sm text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-600 mb-1.5">
            إلى تاريخ
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-mono-num font-bold text-sm text-slate-900"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-45 text-slate-800 font-extrabold text-sm transition-colors cursor-pointer"
          >
            {hasFilters ? <FilterX className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
            <span>مسح التصفية</span>
          </button>
        </div>
      </div>

      {/* Master Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-2">
            <p className="text-xl font-extrabold text-slate-700">
              {logs.length === 0
                ? 'لا توجد أي سجلات محفوظة حتى الآن'
                : 'لا توجد سجلات مطابقة لمعايير التصفية الحالية'}
            </p>
            <p className="text-base font-semibold text-slate-500">
              كل عملية تسجيل حضور أو عنصر روحي في «السجل الرئيسي» تُحفظ هنا تلقائياً بالتوقيت الدقيق.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full text-right border-collapse min-w-[920px]">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-4 font-extrabold text-base">التاريخ</th>
                  <th className="px-4 py-4 font-extrabold text-base">
                    التوقيت الدقيق (UTC)
                  </th>
                  <th className="px-4 py-4 font-extrabold text-base">اسم المخدوم</th>
                  <th className="px-4 py-4 font-extrabold text-base text-center">
                    نوع التسجيل
                  </th>
                  <th className="px-4 py-4 font-extrabold text-base">ملاحظات (مباشر)</th>
                  <th className="px-4 py-4 font-extrabold text-base text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => {
                  const member = membersMap.get(log.memberId);
                  const typeMeta = LOG_TYPE_META[log.type];
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono-num font-extrabold text-sm text-slate-900 whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="px-4 py-3.5 font-mono-num font-bold text-xs text-slate-600 whitespace-nowrap">
                        {formatFullUTCTimestamp(log.timestampUTC)}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-base text-slate-900">
                        {member?.name || (
                          <span className="text-slate-400">مخدوم محذوف</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold border whitespace-nowrap ${typeMeta.badgeClass}`}
                        >
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-amber-950">
                        {member?.notes ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                            {member.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setLogToDelete(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!logToDelete}
        title="تأكيد حذف سجل من قاعدة البيانات"
        message={
          logToDelete
            ? `هل تريد حذف سجل "${LOG_TYPE_META[logToDelete.type].label}" للمخدوم "${
                membersMap.get(logToDelete.memberId)?.name || 'غير معروف'
              }" بتاريخ ${logToDelete.date}؟ سيتم تحديث جميع اللوحات تلقائياً.`
            : ''
        }
        confirmLabel="نعم، احذف السجل"
        onConfirm={() => {
          if (logToDelete) {
            deleteLog(groupId, logToDelete.id);
          }
          setLogToDelete(null);
        }}
        onCancel={() => setLogToDelete(null)}
      />
    </div>
  );
};
