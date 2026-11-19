Build a complete, production-ready, 100% bug-free, Arabic RTL (`dir="rtl"`) interactive web application for Sunday School attendance and spiritual follow-up using React, TypeScript, Tailwind CSS, and Lucide icons.

### CRITICAL INSTRUCTION REGARDING THE 4 UPLOADED FILES
I have attached 4 attendance files representing the 4 Sunday School groups:
1. High School Boys (`سجل حضور شباب ثانوي`)
2. High School Girls (`سجل حضور شابات ثانوي`)
3. Middle School Boys (`سجل حضور شباب إعدادي`)
4. Middle School Girls (`سجل حضور شابات إعدادي`)

Extract ALL member names, phone numbers, and any existing data (like birthdates or notes if present) from the 4 attached files and embed them accurately as the initial dataset for each corresponding record. Also include an easy "Import Excel/CSV" and "Export Backup (Excel/JSON)" button inside each record so data can be updated or backed up anytime.

---

### 1. DESIGN SYSTEM & SENIOR-FRIENDLY UX (CRITICAL)
- **DO NOT** use a plain, generic, dark/gray standard template. Create a **vibrant, joyful, warm, high-contrast, modern professional theme** with soft gradients, rich jewel-tone accents (Royal Indigo, Warm Gold, Emerald Green, Coral, Sky Blue), clean white/warm-cream cards, soft shadows, and crisp visual hierarchy.
- **Arabic Typography:** Load Google Font `Cairo` (or `Tajawal`) for ultra-clear Arabic readability.
- **Built for Older Adults (Senior-Friendly):**
  - Large, clear text everywhere (minimum 16px–18px body/table text, bold high-contrast headings).
  - Add a persistent **Font Size Control (`تكبير / تصغير الخط`: A- / A / A+)** in the top bar.
  - Extra-large, easy-to-tap checkboxes (at least 28x28px) with instant colorful visual feedback and a friendly Arabic toast notification upon every action (e.g., `"تم تسجيل حضور [الاسم] بنجاح"`).
  - Simple, large, color-coded navigation tabs with clear icons + Arabic text labels. No hidden menus or confusing UI clutter.
  - Every button, filter, calendar, search box, and edit action MUST be 100% functional with zero placeholders and zero console errors.

---

### 2. LANDING PAGE (HOME SCREEN)
- Main Title: **`أسرة مدارس الأحد إعدادي وثانوي`**
- Display 4 large, colorful, inviting interactive cards (2x2 grid) with distinct accent colors, icons, and live member/attendance summary counters:
  1. **`سجل حضور شباب ثانوي`** → Opens workspace titled: **`أسرة الشهيد مارجرجس — شباب ثانوي`**
  2. **`سجل حضور شابات ثانوي`** → Opens workspace titled: **`أسرة الشهيد مارجرجس — شابات ثانوي`**
  3. **`سجل حضور شباب إعدادي`** → Opens workspace titled: **`أسرة الفتى أبانوب — شباب إعدادي`**
  4. **`سجل حضور شابات إعدادي`** → Opens workspace titled: **`أسرة الفتى أبانوب — شابات إعدادي`**
- Each of the 4 records operates with its own isolated data & 6 synced sub-dashboards, persisted reliably in `localStorage`.
- Include a prominent `"العودة للقائمة الرئيسية"` button in the top bar of every record.

---

### 3. TOP WORKSPACE HEADER & GLOBAL LIVE UTC CALENDAR (INSIDE EACH RECORD)
- **Topmost Banner:** Shows the family name + group (e.g., `أسرة الشهيد مارجرجس — شباب ثانوي`), quick stats badges, font size toggle, and Back button.
- **Control Bar directly below the title:**
  - **Live Name Search Bar (`بحث بالاسم...`):** Instant filtering with Arabic normalization (treat `أ / إ / آ / ا`, `ة / ه`, and `ى / ي` as equivalent so searching is effortless).
  - **Live UTC Date Pill (`التاريخ النشط بالتوقيت العالمي`):**
    - Defaults to the **actual current UTC date** (`YYYY-MM-DD` calculated from UTC clock and updated automatically every day).
    - Clicking this date opens a **vibrant, colorful, interactive custom Calendar Popup** (in Arabic with Arabic month/day names, highlighted today, and colored dots on dates that have recorded attendance).
    - Selecting any date activates that date across the entire open record (all attendance and 5-element checkboxes reflect and save to that selected date).
    - **Auto-Reset Rule:** Whenever the user exits the record (returns to the Home Screen, switches to another of the 4 records, or closes/reopens the app), the active date **automatically resets back to today's actual UTC date**.

---

### 4. ARCHITECTURE: SINGLE SOURCE OF TRUTH & 100% REAL-TIME SYNC
Use a centralized state store (React Context + `localStorage` persistence per record) with two linked collections:
1. **`members[]`**: `{ id, name, phone, birthDate, address, notes }`
2. **`logs[]`** (The Master Database): `{ id, memberId, date (YYYY-MM-DD), timestampUTC (ISO string), type: 'attendance' | 'church' | 'confession' | 'communion' | 'prayer' | 'bible' }`

**Synchronization Rules (Zero Desync Guaranteed):**
- Every dashboard reads dynamically from `members[]` and `logs[]`.
- **`ملاحظات` (Notes):** Editable directly in Dashboard 1. Whenever a member appears in ANY other dashboard (Visitation, Birthdays, Today's Attendance, Date Log, Master Database), their live `notes` MUST appear alongside their name and update instantaneously whenever edited in Dashboard 1.
- **`آخر تاريخ حضور` (Last Attendance Date):** Dynamically computed as the most recent `date` in `logs[]` where `type === 'attendance'`. If the member has NO attendance records, this cell MUST remain completely empty/blank (`""`).
- **`إجمالي الحضور` (Total Attendance):** Dynamically computed as the total count of unique dates in `logs[]` where `type === 'attendance'` for that member.
- Checking or unchecking `الحضور` or any of the 5 elements in Dashboard 1 immediately inserts or removes the corresponding record in `logs[]` (recording the exact UTC timestamp at the moment of checking) and immediately updates all 6 dashboards.

---

### 5. REGULARITY LOGIC FOR THE 5 SPIRITUAL ELEMENTS (الـ ٥ عناصر الروحية)
The 5 elements are:
1. **`الكنيسة`** (Church)
2. **`الاعتراف`** (Confession)
3. **`التناول`** (Communion)
4. **`الصلاة`** (Prayer)
5. **`الكتاب المقدس`** (Bible Reading)

For EVERY member and for EACH of the 5 elements, dynamically calculate their regularity status from `logs[]` relative to today's UTC date:
- **`منتظم` (Regular — Vibrant Green Badge):** Logged daily / frequently (e.g., logged 4+ times in the last 7 days, OR logged within the last 2 days with regular activity).
- **`متقطع` (Intermittent — Warm Amber/Orange Badge):** Logged around once a week (e.g., last logged between 3 and 14 days ago, or 1–3 times within the last 14 days).
- **`غير منتظم` (Irregular — Soft Red Badge):** More than 2 weeks (> 14 days) since last logged, OR never logged.

Display these clear color-coded regularity badges (`منتظم` / `متقطع` / `غير منتظم`) for all 5 elements in **both Dashboard 1 (Main Record)** and **Dashboard 2 (Visitation & Spiritual Follow-up)**.

---

### 6. THE 6 INTERACTIVE DASHBOARDS (TABS INSIDE EACH RECORD)

#### Tab 1: `السجل الرئيسي` (Main Attendance & Spiritual Tracking)
- Add a clean `"+ إضافة مخدوم جديد"` button.
- Interactive, spacious, senior-friendly table with sticky header and these exact columns in order (RTL):
  1. **`الاسم`** (Name)
  2. **`رقم التليفون`** (Phone — editable + quick WhatsApp & Call action icons)
  3. **`تاريخ الميلاد`** (Birthdate — easy date picker/input)
  4. **`العنوان`** (Address — newly added editable field for residential address)
  5. **`ملاحظات`** (Notes — inline editable, synced live to all other dashboards)
  6. **`الحضور`** (Large colorful checkbox for the active selected date)
  7. **`آخر تاريخ حضور`** (Auto-computed from Database; completely blank if never attended)
  8. **`إجمالي الحضور`** (Auto-computed count badge from Database)
  9. **`الكنيسة`** (Checkbox for active date + live regularity badge below it)
  10. **`الاعتراف`** (Checkbox for active date + live regularity badge below it)
  11. **`التناول`** (Checkbox for active date + live regularity badge below it)
  12. **`الصلاة`** (Checkbox for active date + live regularity badge below it)
  13. **`الكتاب المقدس`** (Checkbox for active date + live regularity badge below it)

#### Tab 2: `لوحة الافتقاد والمتابعة` (Visitation & Spiritual Elements Dashboard)
- **Top Summary Cards:** Display **Total Members Count (`إجمالي عدد المخدومين`)**, total needing visitation, and visual breakdowns.
- **Section A — Absence Visitation Filter (`افتقاد الغائبين`):**
  - Quick duration buttons: `أسبوعين (14 يوم)`، `3 أسابيع`، `شهر`، `شهرين`، `3 شهور`، `لم يحضر أبداً`.
  - **Unlimited Custom Duration Selector:** A numeric input (`المدة`) + unit dropdown (`أيام` / `أسابيع` / `شهور` / `سنوات`) allowing ANY duration to infinity (e.g., 5 weeks, 4 months, 10 months, etc.).
  - Filtered Table below showing every member whose absence meets/exceeds the selected period: Name, Phone (with 1-click WhatsApp/Call), Address, Last Attendance Date, Duration Absent, Live Synced Notes, and their 5 Spiritual Elements status badges.
- **Section B — 5 Spiritual Elements Follow-up (`متابعة الـ ٥ عناصر الروحية`):**
  - Filter by element (`الكل` / `الكنيسة` / `الاعتراف` / `التناول` / `الصلاة` / `الكتاب المقدس`) AND filter by status (`الكل` / `منتظم` / `متقطع` / `غير منتظم`).
  - Displays a clean table of matching members with their color-coded badges, phone, address, and live synced Notes.

#### Tab 3: `أعياد الميلاد` (Birthdays Dashboard — right after Visitation)
- Powered automatically by the `تاريخ الميلاد` column from Tab 1.
- Celebratory highlight card for **Today's Birthdays (`أعياد ميلاد اليوم`)** and **Upcoming This Week/Month (`أعياد الميلاد القادمة`)**.
- Interactive Month Filter (`الكل` + `يناير` through `ديسمبر`).
- Displays Name, Birthdate, Upcoming Age, Days Remaining, Phone (with a 1-click WhatsApp birthday greeting button!), Address, and live synced Notes.

#### Tab 4: `حضور اليوم` (Today's Attendance Dashboard)
- Automatically filtered to the **actual real-world current UTC date** (independent of any past date picked in Tab 1).
- Lists every member marked present today with: Name, Phone, Address, **Exact Check-in Time (`وقت تسجيل الحضور` formatted clearly with timezone)**, which of the 5 elements were checked today, and live synced Notes.
- Shows live attendance percentage progress bar (Present Today / Total Members).

#### Tab 5: `سجل الحضور بالتاريخ` (Attendance Log by Date)
- Defaults to today's live UTC date (updates daily).
- Clicking the date opens the colorful interactive calendar to choose ANY date.
- Displays the complete attendance list for that selected date: Name, Phone, Address, Exact Check-in Timestamp, 5 elements logged on that date, and live synced Notes, plus an option to export/print that day's sheet.

#### Tab 6: `بيانات سجل الحضور` (Master Database)
- Full transparent log table showing EVERY saved event (Attendance + all 5 Spiritual Elements) powering the entire app.
- Columns: Date, Exact UTC Timestamp, Member Name, Record Type (colored pill: حضور / الكنيسة / الاعتراف / التناول / الصلاة / الكتاب المقدس), and live synced Notes.
- Includes filters by Member, Record Type, and Date Range, plus a safe Delete button (with confirmation modal) that deletes a mistaken entry and immediately recalculates all dashboards.
- Includes **"تصدير قاعدة البيانات (Excel / CSV)"** and **"نسخ احتياطي / استعادة (JSON)"**.

---

### 7. FINAL QUALITY CHECKLIST BEFORE OUTPUT
- Verify zero TypeScript or runtime errors.
- Verify all 4 records load cleanly with the real names and phones from the 4 uploaded files.
- Verify changing `ملاحظات` in Tab 1 immediately updates Tabs 2, 3, 4, 5, and 6.
- Verify checking/unchecking attendance immediately updates `آخر تاريخ حضور`, `إجمالي الحضور`, Tab 2, Tab 4, Tab 5, and Tab 6.
- Verify leaving a record resets the active calendar date back to today's actual UTC date.


### DATABASE BACKEND: GOOGLE SHEETS VIA APPS SCRIPT API (CRITICAL)
Instead of relying only on `localStorage`, connect the entire application to my Google Apps Script Web App API for live, multi-device cloud synchronization (while keeping `localStorage` as an instant offline cache so the UI stays super fast).

- **Default API URL:** `"PASTE_YOUR_WEB_APP_URL_HERE"` (Also add a clean `"إعدادات الربط بـ Google Sheets"` button in the Home Screen header so the admin can update/test the Apps Script URL anytime and see a live connection status badge: `متصل بـ Google Sheets 🟢` or `وضع محلي 🟡`).
- **Group IDs Mapping:**
  - High School Boys (`شباب ثانوي`) → `groupId: "hs_boys"`
  - High School Girls (`شابات ثانوي`) → `groupId: "hs_girls"`
  - Middle School Boys (`شباب إعدادي`) → `groupId: "ms_boys"`
  - Middle School Girls (`شابات إعدادي`) → `groupId: "ms_girls"`

- **CORS-Safe Fetch Implementation (MANDATORY FOR GOOGLE APPS SCRIPT):**
  - **GET requests:** `fetch(\`${API_URL}?action=getAllData\`)` (on app load and via a `"تحديث البيانات 🔄"` button) or `fetch(\`${API_URL}?action=getGroupData&groupId=${groupId}\`)`.
  - **POST requests:** ALWAYS send `headers: { "Content-Type": "text/plain;charset=utf-8" }` and `body: JSON.stringify(payload)` (NEVER use `application/json` header, because Google Apps Script blocks CORS preflight `OPTIONS` requests).
  - **Supported POST Payloads:**
    1. Toggle attendance / 5 elements: `{ action: "toggleLog", groupId, memberId, date, type, checked, timestampUTC, id }`
    2. Add or edit member (including address, birthdate, notes): `{ action: "upsertMember", groupId, member: { id, name, phone, birthDate, address, notes } }` (debounce inline text edits like `notes` and `address` by 600ms before sending to Sheets, with a subtle `"جاري الحفظ..."` → `"تم الحفظ في Google Sheets ✓"` indicator).
    3. Delete log in Tab 6: `{ action: "deleteLog", groupId, logId }`
    4. Delete member: `{ action: "deleteMember", groupId, memberId }`
    5. Initial seed button: `{ action: "bulkImportMembers", groupId, members }` — Include a one-click button inside the Settings modal: `"رفع الأسماء من الملفات الأربعة إلى Google Sheets لأول مرة"` that sends the extracted members for all 4 groups to Google Sheets automatically without duplicating existing names.

- **Optimistic UI Updates:** When a user checks a box or edits a note, update the React state immediately so the app feels instantaneous for older users, send the request to Google Apps Script in the background, and show an error toast + revert only if the API returns `{ ok: false }` or fails.

