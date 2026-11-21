export const PRAYERS = [
  { id: 'fajr', en: 'Fajr', ar: 'الفجر' },
  { id: 'sunrise', en: 'Sunrise', ar: 'الشروق' },
  { id: 'dhuhr', en: 'Dhuhr', ar: 'الظهر' },
  { id: 'asr', en: 'Asr', ar: 'العصر' },
  { id: 'maghrib', en: 'Maghrib', ar: 'المغرب' },
  { id: 'isha', en: 'Isha', ar: 'العشاء' },
  { id: 'jumuah', en: "Jumu‘ah", ar: 'الجمعة' },
] as const
export type PrayerId = typeof PRAYERS[number]['id']
export const THEME_IDS = ['emerald', 'midnight', 'ivory', 'plum', 'rose', 'charcoal'] as const
export type ThemeId = typeof THEME_IDS[number]
export type Language = 'en' | 'ar' | 'both'
export type TimeDisplay = 'iqamah' | 'adhan' | 'both'
export type PrayerSetting = { enabled: boolean; iqamahMode: 'fixed' | 'after'; fixed: string; delay: number; adjustment: number; showRelative: boolean }
export type CustomRow = { id: string; en: string; ar: string; time: string; enabled: boolean }
export type Settings = {
  version: 1; name: string; nameAr: string; location: string;
  latitude: number; longitude: number; timezone: string;
  method: 'NorthAmerica' | 'MuslimWorldLeague' | 'Egyptian' | 'UmmAlQura' | 'Karachi' | 'MoonsightingCommittee';
  madhab: 'standard' | 'hanafi'; date: string; endDate: string; language: Language;
  theme: ThemeId | 'custom'; customColor: string; customAccent: string; timeDisplay: TimeDisplay; use24Hour: boolean;
  textSize: 'standard' | 'large' | 'extra';
  tableWidth: 'standard' | 'wide';
  footer: string;
  prayers: Record<PrayerId, PrayerSetting>; customRows: CustomRow[];
}
export type DisplayRow = { id: string; en: string; ar: string; adhan: string; iqamah: string; relativeMinutes?: number }
export const MAX_ROWS = 8
// Extra Jumu‘ah rows are custom rows named "Jumu‘ah 2", "Jumu‘ah 3"…; index n-1 holds the Arabic ordinal for Jumu‘ah n.
export const JUMUAH_AR = ['الجمعة الأولى', 'الجمعة الثانية', 'الجمعة الثالثة', 'الجمعة الرابعة', 'الجمعة الخامسة', 'الجمعة السادسة', 'الجمعة السابعة', 'الجمعة الثامنة']
export const isExtraJumuah = (en: string) => /^Jumu‘ah \d+$/.test(en)
