import { AllGroupsData, GroupConfig, GroupId, LogType, Member, SpiritualElement } from '../types';
import hsBoysYouthImg from '../assets/images/hs_boys_youth_1795126800578.jpg';
import hsGirlsYouthImg from '../assets/images/hs_girls_youth_1795126801870.jpg';
import msBoysYouthImg from '../assets/images/ms_boys_youth_1795126800396.jpg';
import msGirlsYouthImg from '../assets/images/ms_girls_youth_1795126799463.jpg';

const BASE_URL = import.meta.env.BASE_URL || './';
const ST_GEORGE_IMAGE = `${BASE_URL}assets/aistudio/image_f6a53e42.png`;
const ST_ABANOUB_IMAGE = `${BASE_URL}assets/aistudio/image_8b22e6be.png`;

export const GROUPS_CONFIG: GroupConfig[] = [
  {
    id: 'hs_boys',
    cardTitle: 'سجل حضور شباب ثانوي',
    workspaceTitle: 'أسرة الشهيد مارجرجس — شباب ثانوي',
    familyName: 'أسرة الشهيد مارجرجس',
    stageLabel: 'شباب ثانوي',
    subtitle: 'متابعة حضور وعناصر الروحية لشباب المرحلة الثانوية',
    accentHex: '#4338CA',
    gradientClass: 'from-indigo-600 via-indigo-700 to-blue-800',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    lightBgClass: 'bg-indigo-50/70',
    borderClass: 'border-indigo-200 hover:border-indigo-400',
    iconName: 'shield',
    saintImage: ST_GEORGE_IMAGE,
    saintAlt: 'الشهيد العظيم مارجرجس الروماني',
    groupImage: hsBoysYouthImg,
    groupAlt: 'شباب ثانوي أسرة الشهيد مارجرجس',
  },
  {
    id: 'hs_girls',
    cardTitle: 'سجل حضور شابات ثانوي',
    workspaceTitle: 'أسرة الشهيد مارجرجس — شابات ثانوي',
    familyName: 'أسرة الشهيد مارجرجس',
    stageLabel: 'شابات ثانوي',
    subtitle: 'متابعة حضور وعناصر الروحية لشابات المرحلة الثانوية',
    accentHex: '#BE185D',
    gradientClass: 'from-rose-600 via-pink-600 to-fuchsia-700',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    lightBgClass: 'bg-rose-50/70',
    borderClass: 'border-rose-200 hover:border-rose-400',
    iconName: 'crown',
    saintImage: ST_GEORGE_IMAGE,
    saintAlt: 'الشهيد العظيم مارجرجس الروماني',
    groupImage: hsGirlsYouthImg,
    groupAlt: 'شابات ثانوي أسرة الشهيد مارجرجس',
  },
  {
    id: 'ms_boys',
    cardTitle: 'سجل حضور شباب إعدادي',
    workspaceTitle: 'أسرة الفتى أبانوب — شباب إعدادي',
    familyName: 'أسرة الفتى أبانوب',
    stageLabel: 'شباب إعدادي',
    subtitle: 'متابعة حضور وعناصر الروحية لشباب المرحلة الإعدادية',
    accentHex: '#047857',
    gradientClass: 'from-emerald-600 via-teal-600 to-cyan-700',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    lightBgClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    iconName: 'flame',
    saintImage: ST_ABANOUB_IMAGE,
    saintAlt: 'الشهيد الفتى أبانوب النهيسي',
    groupImage: msBoysYouthImg,
    groupAlt: 'شباب إعدادي أسرة الفتى أبانوب',
  },
  {
    id: 'ms_girls',
    cardTitle: 'سجل حضور شابات إعدادي',
    workspaceTitle: 'أسرة الفتى أبانوب — شابات إعدادي',
    familyName: 'أسرة الفتى أبانوب',
    stageLabel: 'شابات إعدادي',
    subtitle: 'متابعة حضور وعناصر الروحية لشابات المرحلة الإعدادية',
    accentHex: '#B45309',
    gradientClass: 'from-amber-500 via-orange-500 to-rose-500',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    lightBgClass: 'bg-amber-50/70',
    borderClass: 'border-amber-200 hover:border-amber-400',
    iconName: 'sparkles',
    saintImage: ST_ABANOUB_IMAGE,
    saintAlt: 'الشهيد الفتى أبانوب النهيسي',
    groupImage: msGirlsYouthImg,
    groupAlt: 'شابات إعدادي أسرة الفتى أبانوب',
  },
];

export const GROUP_CONFIG_MAP: Record<GroupId, GroupConfig> = {
  hs_boys: GROUPS_CONFIG[0],
  hs_girls: GROUPS_CONFIG[1],
  ms_boys: GROUPS_CONFIG[2],
  ms_girls: GROUPS_CONFIG[3],
};

export const SPIRITUAL_ELEMENTS: {
  key: SpiritualElement;
  label: string;
  shortLabel: string;
  colorClass: string;
  checkboxActiveClass: string;
}[] = [
  {
    key: 'church',
    label: 'الكنيسة',
    shortLabel: 'الكنيسة',
    colorClass: 'bg-sky-100 text-sky-900 border-sky-200',
    checkboxActiveClass: 'bg-sky-600 border-sky-600 text-white shadow-sky-200',
  },
  {
    key: 'confession',
    label: 'الاعتراف',
    shortLabel: 'الاعتراف',
    colorClass: 'bg-violet-100 text-violet-900 border-violet-200',
    checkboxActiveClass: 'bg-violet-600 border-violet-600 text-white shadow-violet-200',
  },
  {
    key: 'communion',
    label: 'التناول',
    shortLabel: 'التناول',
    colorClass: 'bg-amber-100 text-amber-900 border-amber-200',
    checkboxActiveClass: 'bg-amber-500 border-amber-500 text-white shadow-amber-200',
  },
  {
    key: 'prayer',
    label: 'الصلاة',
    shortLabel: 'الصلاة',
    colorClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    checkboxActiveClass: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200',
  },
  {
    key: 'bible',
    label: 'الكتاب المقدس',
    shortLabel: 'الكتاب المقدس',
    colorClass: 'bg-rose-100 text-rose-900 border-rose-200',
    checkboxActiveClass: 'bg-rose-600 border-rose-600 text-white shadow-rose-200',
  },
];

export const LOG_TYPE_META: Record<
  LogType,
  { label: string; badgeClass: string }
> = {
  attendance: {
    label: 'حضور',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  },
  church: {
    label: 'الكنيسة',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  confession: {
    label: 'الاعتراف',
    badgeClass: 'bg-violet-100 text-violet-900 border-violet-200',
  },
  communion: {
    label: 'التناول',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  prayer: {
    label: 'الصلاة',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  bible: {
    label: 'الكتاب المقدس',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-200',
  },
  visitation: {
    label: 'تم الافتقاد',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-300',
  },
};

function makeMembers(
  groupId: GroupId,
  rows: Array<[string, string, string?]>
): Member[] {
  return rows.map(([name, phone, notes], idx) => ({
    id: `${groupId}_${idx + 1}`,
    name: name.trim(),
    phone: phone.trim(),
    birthDate: '',
    address: '',
    notes: notes ? notes.trim() : '',
    visitationNotes: '',
  }));
}

// Extracted accurately from كشف حضور اولاد ثانوي.xml (55 unique members)
const HS_BOYS_RAW: Array<[string, string, string?]> = [
  ['اسطفانوس مينا سوريال', '01227525420'],
  ['ابادير الفي', ''],
  ['ابانوب مرقس هلال', '01275042062'],
  ['ابانوب جورج حبيب', '01276276193'],
  ['ابرام ايوب بشاي', '01550399042'],
  ['ابرام عماد ثروت', '01503500567'],
  ['ابانوب رضا وليم', '01155849825'],
  ['انطوني مينا إدور', '01505484664'],
  ['ابانوب زغلول شحاته', '01080915450'],
  ['استيفن سليمان ميشيل', '01207461599'],
  ['استيفن إيهاب شايب', '01225484330'],
  ['استيفن عادل يوسف', '01501408048'],
  ['إسطفانوس مينا منير', '01228884905'],
  ['انجيليوس رمسيس', '01274508808'],
  ['أنطوني رضا يعقوب', '01113622047'],
  ['باخوميوس جمال رياض', '01155484619'],
  ['بيشوي هاني سيفين', '01515911509'],
  ['بيشوي جرجس ميلاد', '01501676797'],
  ['بيتر إسحق غنامي', '01032865130'],
  ['بيتر عاطف أنيس', '01129953673'],
  ['جميل مكرم', '01201780442'],
  ['تادرس نادر', '01551882151'],
  ['تادرس جرجس فيليب', '00249915201459'],
  ['تادرس نصور نبيل', '01557003947'],
  ['توماس انطونيوس صفوت', '01222531688'],
  ['جميل مكرم عبد ربو', '01201780443'],
  ['جورج اشرف إميل', '01550058145'],
  ['جورج ناصر فتحي', '01125672149'],
  ['صرابامون يوحنا حشمت', '01032675845'],
  ['فيلوباتير مايكل كمال', '01557664295'],
  ['فيلوباتير أنور البدري', '01229995012'],
  ['فادي جورج جابر', '01501123357'],
  ['فيلوباتير أيمن جوده', '01021539971'],
  ['كيرلس عادل رؤوف', '01227752156'],
  ['كيرلس كمال بدري', '01271321059'],
  ['كاراس اسعد شوقي', '01559550738'],
  ['كاراس مبارك', '01557454546'],
  ['كيرلس أشرف سلطان', '01515638032'],
  ['كيرياكوس جمال البدري', '01280258204'],
  ['كيرلس هاني فيليب', '01067709840'],
  ['كيرلس مرقس عبد الملاك', '01221098014'],
  ['ماريو إبراهيم رياض', '01508881241'],
  ['موسيس يوسف عباس', '01559967917'],
  ['مركيانوس ميخائيل هلال', '01507562966'],
  ['مينا ميشيل وديع', '01552913004'],
  ['مارين عماد فاروق', '01505803810'],
  ['مكاريوس سامح هلال', '01093801360'],
  ['مايكل عادل البدري', '01500673011'],
  ['ماكس ميخائيل هلال', '01508266441'],
  ['يوأنس سامح سيف', '01223728773'],
  ['يوسف مينا جورج', '01505515404'],
  ['ميتا مجدي لمعي', '01501568538'],
  ['مايكل ناجي الياس', '01130424529'],
  ['اسطفانوس فيليب سليمان', '01551130059'],
  ['مينا ميلاد انيس', '0115259660', 'رقم سوداني'],
];

// Extracted accurately from كشف حضور بنات ثانوي.xml (15 members)
const HS_GIRLS_RAW: Array<[string, string, string?]> = [
  ['أربسيما مدحت', '01501033749'],
  ['إيرائي مدحت', '01551434007'],
  ['جومانا ناصر عادل', '01557433946'],
  ['جيسيكا نشأت', '00249124027739'],
  ['ساندي رضا', '01155849668'],
  ['كلارا أيمن زغلول', '01202198434'],
  ['ميرنا أيمن', '01118586752'],
  ['ميرنا أمير', '01555866026'],
  ['مريم مينا هلال', '01208556738'],
  ['مارينا هاني', '00249100980644'],
  ['مريم أشرف', '01228876169'],
  ['نورهان حافظ', '01552258035'],
  ['وداد لويس', '01503773005'],
  ['هيلانة كمال', '01150300953'],
  ['بريسكيلا يوحنا', '01153079489'],
];

// Extracted accurately from كشف حضور اولاد إعدادي.xml (45 members)
const MS_BOYS_RAW: Array<[string, string, string?]> = [
  ['ابانوب مدحت مكرم', '01205897172'],
  ['ابانوب مرقس شكرالله', '01275042062'],
  ['أبرام عماد ثروت', '01503500567'],
  ['أبانوب مكين جرجس', ''],
  ['أبانوب أشرف سلطان', '01555803604'],
  ['إيليا جرجس فيليب', '', 'له رقم بالقروب'],
  ['افرايم روماني', ''],
  ['افرايم جورج غالي', '01276094252'],
  ['اسطفانوس أيمن حشمت', '01279198445'],
  ['انجيلوس رميس عزيز', '01274508808'],
  ['اندريانو أبادير طلعت', '01214960207'],
  ['ألكسندروس دانيال شكري', '01515828756'],
  ['أبانوب عاطف أنيس', '', 'له رقم بالقروب'],
  ['أيزك أيمن', ''],
  ['باخوميوس جمال رياض', '01155484619'],
  ['بيشوي هاني سيفين', ''],
  ['توماس رأفت', '01203795070'],
  ['تادرس مدحت هلال', '01288731391'],
  ['توماس أنطونيوس صفوت', '01039262214'],
  ['تادرس نادر نصري', '01551982101'],
  ['توماس يوحنا أمين', '01505814884'],
  ['تواضروس كمال عادل', '01150300953'],
  ['جوفاني مرقس فهيم', '01228310526'],
  ['جيوفاني يوسف', '01503005951'],
  ['جورج أشرف إميل', ''],
  ['حنا أمجد صبحي', '01284843867'],
  ['داني جوزيف', ''],
  ['شنوده هاني سيفين', '01507048661'],
  ['شنوده ناصرعادل', '01279347433'],
  ['شنوده مينا عابدين', '01507138631'],
  ['روفائيل فايز عابدين', ''],
  ['فيلوباتير أنور', '01229995012'],
  ['فيلوباتير أمير', '01515757752'],
  ['فادي روماني خلف', '01125024425'],
  ['كيرلس إيليا مرقس', '01151844088'],
  ['روفائيل روميل وليم', '01508620270'],
  ['كيرلس عادل رؤوف', '01227752156'],
  ['كيرلس عياد كيرلس', '01553772201'],
  ['مكاريوس روماني شحاته', '01557055915'],
  ['مكاريوس امير فتحي', ''],
  ['مارين عماد', ''],
  ['مارتن مينا طلعت', '01553556214'],
  ['ماريوس مينا طلعت', '01503155855'],
  ['يوحنا فتحي عزمي', '01557082313'],
  ['يوساب اتونوس', '01039262214'],
];

// Extracted accurately from كشف حضور بنات إعدادي.xml (37 members)
const MS_GIRLS_RAW: Array<[string, string, string?]> = [
  ['اغابي القس كيرلس', ''],
  ['انجلا فام', ''],
  ['انسطاسيا زغلول', '01080915450'],
  ['انسطاسيا عاصم', '01207894225'],
  ['ايلاريا زكريا', '01553115518'],
  ['بريسكيلا عمانوئيل فوزي', '01550035761'],
  ['بديعه روماني', ''],
  ['تريزا برسوم', '01276262823'],
  ['ثيؤكليا مكاريوس', '01557760738'],
  ['جويس ناصر عادل', '01559274456'],
  ['دميانه ميخائيل', '01208002623'],
  ['فيبي أشرف حلمي', '01515462792'],
  ['فيرونيا ماهر', '01044532696'],
  ['فيرينيا جرجس', '01505833068'],
  ['كارن عاصم سمير', '01286554890'],
  ['مارلين مراد طلعت', ''],
  ['مارينا سامح سيف', '01228873413'],
  ['مارينا منتصر عادل', ''],
  ['مارينا أشرف بساده', '01228794271'],
  ['ماروسكا كيرلس', '01507321899'],
  ['ماروسكا أمير', '01147752547'],
  ['مادونا أيمن حشمت', '01143615742'],
  ['ميرفت عماد', ''],
  ['ميرفت روماني', ''],
  ['مهرائيل أشرف', '01553313931'],
  ['مهرائيل ميخائيل جمال', '01275669652'],
  ['ميرنا ماهر', '01044532696'],
  ['مارتا مكين', '01500072174'],
  ['مهرائيل مينا', '01226637356'],
  ['مارفينا كمال', '01552797725'],
  ['ماريان منتصر', '01147752541'],
  ['مارلي مينا', '01272928798'],
  ['مادونا أيمن هلال', '01550926277'],
  ['مارفل بنيامين', '01116061785'],
  ['مايفن منتصر', '01125024425'],
  ['ماري ممدوح منير', '01507733292'],
  ['مونيكا أيمن', '01559682068'],
];

export function createInitialSeedData(): AllGroupsData {
  return {
    hs_boys: {
      members: makeMembers('hs_boys', HS_BOYS_RAW),
      logs: [],
    },
    hs_girls: {
      members: makeMembers('hs_girls', HS_GIRLS_RAW),
      logs: [],
    },
    ms_boys: {
      members: makeMembers('ms_boys', MS_BOYS_RAW),
      logs: [],
    },
    ms_girls: {
      members: makeMembers('ms_girls', MS_GIRLS_RAW),
      logs: [],
    },
  };
}
