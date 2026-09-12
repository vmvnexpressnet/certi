export interface Runner {
  bib: string;
  name: string;
  gender: 'M' | 'F' | string;
  distance: string; // e.g. 'Half Marathon' or 'Full Marathon' or '10KM' or '5KM'
  distanceDisplay?: string; // e.g. 'Đã hoàn thành | Has Completed Half Marathon'
  overallRank: number | string;
  genderRank: number | string;
  ag: string; // Age Group, e.g. '30-39'
  ageGroupRank: number | string;
  gunTime: string; // e.g. '01:45:20'
  chipTime: string; // e.g. '01:44:12'
  pace?: string;
  date?: string; // default '13/09/2026'
}

export interface CertificateConfig {
  bgMode: 'official' | 'generated' | 'custom';
  customBgDataUrl: string | null;
  nameY: number; // percentage from top (e.g. 33%)
  distanceY: number; // percentage from top (e.g. 38%)
  statsY: number; // percentage from top (e.g. 43%)
  statsLayout: 'vertical' | 'horizontal'; // 'vertical' (dạng dọc) | 'horizontal' (dạng lưới ngang)
  showStatsCard?: boolean; // khung mờ nền phía sau (mặc định bật)
  statsLineSpacing?: number; // khoảng cách dòng trong dạng dọc (0.8 -> 1.5)
  fontSizeMultiplier: number;
  textColor: string; // e.g. '#ffffff'
  nameColor?: string; // default '#78ffd8'
  distanceColor?: string; // default '#ffffff'
  showDistanceUnderline?: boolean; // default false
  statsLabelColor?: string; // default '#ffffff'
  statsValueColor?: string; // default '#fddfac'
  accentColor: string; // e.g. '#2dd4bf' (mint teal) or '#facc15' (gold)
  uppercaseName: boolean;
}

export interface DataSourceSettings {
  type: 'mock' | 'appsScript' | 'csvUrl';
  url: string;
  lastSyncedAt?: string;
}
