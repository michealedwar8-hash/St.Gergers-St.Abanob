import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CloudUpload,
  Code2,
  Copy,
  Database,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DEFAULT_SHEETS_API_URL,
  isValidSheetsUrl,
  testSheetsConnection,
} from '../services/sheetsApi';

interface SheetsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APPS_SCRIPT_SNIPPET = `// Google Apps Script Web App Code (Deploy as Web App: Execute as Me, Anyone has access)
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getAllData';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var groups = ['hs_boys', 'hs_girls', 'ms_boys', 'ms_girls'];
  var out = {};
  if (action === 'getGroupData' && e.parameter.groupId) {
    return jsonResponse({ ok: true, data: readGroup(ss, e.parameter.groupId) });
  }
  groups.forEach(function(g) { out[g] = readGroup(ss, g); });
  return jsonResponse({ ok: true, data: out });
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var gid = payload.groupId;
    if (payload.action === 'toggleLog') handleToggleLog(ss, gid, payload);
    else if (payload.action === 'upsertMember') handleUpsertMember(ss, gid, payload.member);
    else if (payload.action === 'deleteLog') handleDeleteRow(ss, gid + '_logs', payload.logId);
    else if (payload.action === 'deleteMember') handleDeleteRow(ss, gid + '_members', payload.memberId);
    else if (payload.action === 'bulkImportMembers') handleBulkImport(ss, gid, payload.members || []);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function ensureSheet(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); }
  return sh;
}

function readGroup(ss, gid) {
  var mSh = ensureSheet(ss, gid + '_members', ['id','name','phone','birthDate','address','notes','visitationNotes']);
  var lSh = ensureSheet(ss, gid + '_logs', ['id','memberId','date','timestampUTC','type']);
  var mRows = mSh.getDataRange().getValues().slice(1);
  var lRows = lSh.getDataRange().getValues().slice(1);
  return {
    members: mRows.filter(function(r){ return r[0]; }).map(function(r){
      return { id: String(r[0]), name: String(r[1]), phone: String(r[2]), birthDate: String(r[3]), address: String(r[4]), notes: String(r[5]), visitationNotes: String(r[6] || '') };
    }),
    logs: lRows.filter(function(r){ return r[0]; }).map(function(r){
      return { id: String(r[0]), memberId: String(r[1]), date: String(r[2]), timestampUTC: String(r[3]), type: String(r[4]) };
    })
  };
}

function handleUpsertMember(ss, gid, m) {
  var sh = ensureSheet(ss, gid + '_members', ['id','name','phone','birthDate','address','notes','visitationNotes']);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]) === String(m.id)) {
      sh.getRange(i + 1, 1, 1, 7).setValues([[m.id, m.name, m.phone, m.birthDate, m.address, m.notes, m.visitationNotes || '']]);
      return;
    }
  }
  sh.appendRow([m.id, m.name, m.phone, m.birthDate, m.address, m.notes, m.visitationNotes || '']);
}

function handleBulkImport(ss, gid, members) {
  var sh = ensureSheet(ss, gid + '_members', ['id','name','phone','birthDate','address','notes','visitationNotes']);
  var existing = {};
  sh.getDataRange().getValues().slice(1).forEach(function(r){ existing[String(r[1]).trim()] = true; });
  var rows = [];
  members.forEach(function(m) {
    if (!existing[String(m.name).trim()]) {
      existing[String(m.name).trim()] = true;
      rows.push([m.id, m.name, m.phone, m.birthDate, m.address, m.notes, m.visitationNotes || '']);
    }
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
}

function handleToggleLog(ss, gid, p) {
  var sh = ensureSheet(ss, gid + '_logs', ['id','memberId','date','timestampUTC','type']);
  var vals = sh.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][1]) === String(p.memberId) && String(vals[i][2]) === String(p.date) && String(vals[i][4]) === String(p.type)) {
      if (!p.checked) sh.deleteRow(i + 1);
      return;
    }
  }
  if (p.checked) sh.appendRow([p.id, p.memberId, p.date, p.timestampUTC, p.type]);
}

function handleDeleteRow(ss, sheetName, id) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return;
  var vals = sh.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][0]) === String(id)) { sh.deleteRow(i + 1); break; }
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

export const SheetsSettingsModal: React.FC<SheetsSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    sheetsApiUrl,
    setSheetsApiUrl,
    isSheetsOnline,
    setIsSheetsOnline,
    refreshAllFromSheets,
    seedAllGroupsToSheets,
    addToast,
  } = useApp();

  const [draftUrl, setDraftUrl] = useState(sheetsApiUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [showScriptCode, setShowScriptCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftUrl(sheetsApiUrl);
      setStatusMessage(null);
    }
  }, [isOpen, sheetsApiUrl]);

  if (!isOpen) return null;

  const handleSave = () => {
    setSheetsApiUrl(draftUrl);
    if (isValidSheetsUrl(draftUrl)) {
      setStatusMessage({ ok: true, text: 'تم حفظ الرابط. يمكنك الآن اختبار الاتصال أو تحديث البيانات.' });
      addToast('تم حفظ رابط Google Sheets بنجاح', 'success');
    } else {
      setIsSheetsOnline(false);
      setStatusMessage({ ok: true, text: 'تم تفعيل الوضع المحلي (بدون رابط سحابي).' });
      addToast('تم التبديل إلى الوضع المحلي', 'info');
    }
  };

  const handleTest = async () => {
    setSheetsApiUrl(draftUrl);
    setIsTesting(true);
    setStatusMessage(null);
    const result = await testSheetsConnection(draftUrl);
    setIsTesting(false);
    setIsSheetsOnline(result.ok);
    setStatusMessage({ ok: result.ok, text: result.message });
    if (result.ok) {
      addToast('تم الاتصال بـ Google Sheets بنجاح', 'success');
    } else {
      addToast(result.message, 'error');
    }
  };

  const handleSeedAll = async () => {
    setSheetsApiUrl(draftUrl);
    setIsSeeding(true);
    setStatusMessage(null);
    const res = await seedAllGroupsToSheets();
    setIsSeeding(false);
    if (res.ok) {
      setStatusMessage({
        ok: true,
        text: `تم رفع ${res.totalSent} اسم من الملفات الأربعة إلى Google Sheets بنجاح (بدون تكرار)!`,
      });
    } else {
      setStatusMessage({
        ok: false,
        text: res.error || 'تعذر رفع الأسماء إلى Google Sheets',
      });
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
      addToast('تم نسخ كود Google Apps Script بنجاح', 'success');
    } catch {
      addToast('تعذر النسخ التلقائي — يمكنك تحديد الكود ونسخه يدوياً', 'warning');
    }
  };

  const urlLooksValid = isValidSheetsUrl(draftUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[95vw] sm:max-w-xl max-h-[92dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-emerald-700 via-teal-700 to-indigo-700 text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold truncate">
                إعدادات الربط بـ Google Sheets
              </h3>
              <p className="text-emerald-100 text-xs font-semibold truncate">
                مزامنة سحابية فورية مع حفظ محلي سريع
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Live Status Banner */}
          <div
            className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${
              isSheetsOnline && urlLooksValid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-3">
              {isSheetsOnline && urlLooksValid ? (
                <Wifi className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <WifiOff className="w-6 h-6 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-extrabold text-base">
                  {isSheetsOnline && urlLooksValid
                    ? 'متصل بـ Google Sheets 🟢'
                    : 'وضع محلي 🟡'}
                </p>
                <p className="text-sm font-semibold opacity-85">
                  {isSheetsOnline && urlLooksValid
                    ? 'جميع التعديلات تُحفظ محلياً وتُزامن تلقائياً مع Google Sheets.'
                    : 'البيانات محفوظة بأمان على هذا الجهاز (localStorage). أضف رابط Apps Script للمزامنة السحابية.'}
                </p>
              </div>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-base font-extrabold text-slate-800 mb-2">
              رابط Google Apps Script Web App API
            </label>
            <input
              type="url"
              dir="ltr"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder={DEFAULT_SHEETS_API_URL}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-indigo-500 text-sm font-mono-num text-left text-slate-900 bg-slate-50 focus:bg-white transition-colors"
            />
            <p className="text-xs font-semibold text-slate-500 mt-1.5">
              يتم إرسال جميع الطلبات بصيغة <code className="font-mono-num">text/plain;charset=utf-8</code> لضمان التوافق التام مع سياسة CORS في Google Apps Script.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ الرابط</span>
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-xs transition-colors cursor-pointer"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              <span>اختبار الاتصال</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSheetsApiUrl(draftUrl);
                void refreshAllFromSheets(false);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-800 font-extrabold text-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <span>تحديث البيانات من السحابة</span>
            </button>
          </div>

          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border font-bold text-sm ${
                statusMessage.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* One-Click Seed to Google Sheets */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
            <div className="flex items-start gap-3">
              <CloudUpload className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-base text-indigo-950">
                  التهيئة الأولية لقاعدة البيانات السحابية
                </h4>
                <p className="text-sm font-semibold text-indigo-900/80 mt-1">
                  يرسل جميع الأسماء وأرقام التليفونات المستخرجة من الملفات الأربعة (152 مخدوم ومخدومة) إلى Google Sheets تلقائياً بدون تكرار أي أسماء موجودة.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSeedAll}
              disabled={isSeeding}
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white font-extrabold text-base shadow-sm transition-colors cursor-pointer"
            >
              {isSeeding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CloudUpload className="w-5 h-5" />
              )}
              <span>
                {isSeeding
                  ? 'جاري رفع الأسماء إلى Google Sheets...'
                  : 'رفع الأسماء من الملفات الأربعة إلى Google Sheets لأول مرة'}
              </span>
            </button>
          </div>

          {/* Expandable Reference Apps Script Code */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScriptCode((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-extrabold text-sm transition-colors cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600" />
                <span>عرض كود Google Apps Script الجاهز للنسخ (للمشرف)</span>
              </span>
              <span className="text-indigo-600 text-xs">{showScriptCode ? 'إخفاء' : 'عرض'}</span>
            </button>
            {showScriptCode && (
              <div className="p-4 bg-slate-900 text-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    انسخ الكود في Extensions → Apps Script ثم اختر Deploy → Web App
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الكود</span>
                  </button>
                </div>
                <pre
                  dir="ltr"
                  className="text-xs font-mono-num overflow-x-auto max-h-60 p-3 rounded-xl bg-slate-950 text-emerald-300 leading-relaxed"
                >
                  {APPS_SCRIPT_SNIPPET}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
