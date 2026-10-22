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
export type ThemeId = 'emerald' | 'midnight' | 'ivory'
export type Language = 'en' | 'ar' | 'both'
export type TimeDisplay = 'iqamah' | 'adhan' | 'both'
export type PrayerSetting = { enabled: boolean; iqamahMode: 'fixed' | 'after'; fixed: string; delay: number; adjustment: number; showRelative: boolean }
export type CustomRow = { id: string; en: string; ar: string; time: string; enabled: boolean }
export type Settings = {
  version: 1; name: string; nameAr: string; location: string;
  latitude: number; longitude: number; timezone: string;
  method: 'NorthAmerica' | 'MuslimWorldLeague' | 'Egyptian' | 'UmmAlQura' | 'Karachi' | 'MoonsightingCommittee';
  madhab: 'standard' | 'hanafi'; date: string; language: Language;
  theme: ThemeId; timeDisplay: TimeDisplay; use24Hour: boolean;
  confirmed: boolean; footer: string;
  prayers: Record<PrayerId, PrayerSetting>; customRows: CustomRow[];
}
export type DisplayRow = { id: string; en: string; ar: string; adhan: string; iqamah: string; relativeMinutes?: number }
export const MAX_ROWS = 8
