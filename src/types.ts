export type GroupId = 'hs_boys' | 'hs_girls' | 'ms_boys' | 'ms_girls';

export type SpiritualElement = 'church' | 'confession' | 'communion' | 'prayer' | 'bible';

export type LogType = 'attendance' | SpiritualElement | 'visitation';

export type RegularityStatus = 'regular' | 'intermittent' | 'irregular';

export type FontScale = 'normal' | 'large' | 'xlarge';

export type TabId =
  | 'main'
  | 'visitation'
  | 'birthdays'
  | 'today'
  | 'by_date'
  | 'database';

export interface Member {
  id: string;
  name: string;
  phone: string;
  birthDate: string; // YYYY-MM-DD or ''
  address: string;
  notes: string;
  visitationNotes?: string; // Dedicated permanent visitation follow-up notes
}

export interface LogEntry {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  timestampUTC: string; // ISO string
  type: LogType;
}

export interface GroupData {
  members: Member[];
  logs: LogEntry[];
}

export type AllGroupsData = Record<GroupId, GroupData>;

export interface GroupConfig {
  id: GroupId;
  cardTitle: string;
  workspaceTitle: string;
  familyName: string;
  stageLabel: string;
  subtitle: string;
  accentHex: string;
  gradientClass: string;
  badgeClass: string;
  lightBgClass: string;
  borderClass: string;
  iconName: 'shield' | 'crown' | 'flame' | 'sparkles';
  saintImage: string;
  saintAlt: string;
  groupImage: string;
  groupAlt: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  variant: 'success' | 'info' | 'warning' | 'error';
}

export type SyncSaveState = 'idle' | 'saving' | 'saved' | 'error';
