import { Runner, DataSourceSettings } from '../types';
import { INITIAL_RUNNERS } from '../data/mockRunners';
import { getRunnerSplitData } from '../utils/runnerSplits';

const SETTINGS_KEY = 'vm_quynhon_datasource_settings';
const RUNNERS_CACHE_KEY = 'vm_quynhon_runners_cache';

export const USER_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwvqwP__bXjxWG8WgH_Qjy8ypBztY8P2bAaQDdLvVckyA-KQtoJ7Hyzk8E-6WpTlrR1/exec';

export const getSavedDataSourceSettings = (): DataSourceSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading datasource settings:', e);
  }
  return {
    type: 'appsScript',
    url: USER_APPS_SCRIPT_URL,
  };
};

export const saveDataSourceSettings = (settings: DataSourceSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving datasource settings:', e);
  }
};

export const parseCSV = (csvText: string): Runner[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const findIdx = (names: string[], defIdx: number) => {
    for (let i = 0; i < headers.length; i++) {
      if (names.some((name) => headers[i].includes(name))) {
        return i;
      }
    }
    return defIdx;
  };

  const bibIdx = findIdx(['bib'], 0);
  const nameIdx = findIdx(['tên', 'name', 'athlete', 'vdv'], 1);
  const genderIdx = findIdx(['giới tính', 'gender', 'sex'], 2);
  const distIdx = findIdx(['cự ly', 'dist'], 3);
  const overallRankIdx = findIdx(['overall', 'chung'], 4);
  const genderRankIdx = findIdx(['gender rank', 'giới tính rank', 'hạng giới tính'], 5);
  const agIdx = findIdx(['ag', 'age group', 'nhóm tuổi', 'lứa tuổi'], 6);
  const agRankIdx = findIdx(['age group rank', 'hạng lứa tuổi', 'hạng ag'], 7);
  const gunIdx = findIdx(['gun'], 8);
  const chipIdx = findIdx(['chip', 'net'], 9);
  const photoIdx = findIdx(['ảnh', 'photo', 'image', 'avatar'], 10);
  const startIdx = findIdx(['start', 'xuất phát', 'bắt đầu'], -1);
  const cp1Idx = findIdx(['cp1', 'cp 1', 'checkpoint 1'], -1);
  const cp1PaceIdx = findIdx(['cp1.pace', 'cp1 pace', 'pace cp1', 'cp1_pace'], -1);
  const cp2Idx = findIdx(['cp2', 'cp 2', 'checkpoint 2'], -1);
  const cp2PaceIdx = findIdx(['cp2.pace', 'cp2 pace', 'pace cp2', 'cp2_pace'], -1);
  const cp3Idx = findIdx(['cp3', 'cp 3', 'checkpoint 3'], -1);
  const cp3PaceIdx = findIdx(['cp3.pace', 'cp3 pace', 'pace cp3', 'cp3_pace'], -1);
  const avgPaceIdx = findIdx(['average pace', 'avg pace', 'pace tb', 'pace'], -1);

  const runners: Runner[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // basic CSV split handling quoted commas if any
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((col) => col.trim().replace(/^"|"$/g, ''));

    const bib = cols[bibIdx] || '';
    const name = cols[nameIdx] || '';
    if (!bib && !name) continue;

    const rawGender = cols[genderIdx] || 'M';
    const gUpper = rawGender.trim().toUpperCase();
    const gender = gUpper.startsWith('F') || gUpper.includes('NỮ') ? 'F' : 'M';

    const distance = cols[distIdx] || 'Half Marathon';
    const gunTime = cols[gunIdx] || '--:--:--';
    const chipTime = cols[chipIdx] || '--:--:--';

    const baseRunner: Runner = {
      bib,
      name,
      gender,
      distance,
      distanceDisplay: `Đã hoàn thành | Has Completed ${distance}`,
      overallRank: cols[overallRankIdx] || '-',
      genderRank: cols[genderRankIdx] || '-',
      ag: cols[agIdx] || '-',
      ageGroupRank: cols[agRankIdx] || '-',
      gunTime,
      chipTime,
      date: '13/09/2026',
      photoUrl: cols[photoIdx] || undefined,
      startTime: startIdx !== -1 ? cols[startIdx] : undefined,
      cp1: cp1Idx !== -1 ? cols[cp1Idx] : undefined,
      cp1Pace: cp1PaceIdx !== -1 ? cols[cp1PaceIdx] : undefined,
      cp2: cp2Idx !== -1 ? cols[cp2Idx] : undefined,
      cp2Pace: cp2PaceIdx !== -1 ? cols[cp2PaceIdx] : undefined,
      cp3: cp3Idx !== -1 ? cols[cp3Idx] : undefined,
      cp3Pace: cp3PaceIdx !== -1 ? cols[cp3PaceIdx] : undefined,
      avgPace: avgPaceIdx !== -1 ? cols[avgPaceIdx] : undefined,
    };

    // Calculate CP splits if missing
    const splits = getRunnerSplitData(baseRunner);
    baseRunner.startTime = baseRunner.startTime || splits.startTime;
    baseRunner.cp1 = baseRunner.cp1 || splits.cp1;
    baseRunner.cp1Pace = baseRunner.cp1Pace || splits.cp1Pace;
    baseRunner.cp2 = baseRunner.cp2 || splits.cp2;
    baseRunner.cp2Pace = baseRunner.cp2Pace || splits.cp2Pace;
    baseRunner.cp3 = baseRunner.cp3 || splits.cp3;
    baseRunner.cp3Pace = baseRunner.cp3Pace || splits.cp3Pace;
    baseRunner.avgPace = baseRunner.avgPace || splits.avgPace;
    baseRunner.finishPace = baseRunner.finishPace || splits.finishPace;

    runners.push(baseRunner);
  }

  return runners;
};

export const fetchRunnersFromSource = async (
  settings: DataSourceSettings
): Promise<{ runners: Runner[]; error?: string; backgroundUrl?: string | null; logoUrl?: string | null }> => {
  if (settings.type === 'mock' || !settings.url.trim()) {
    return { runners: INITIAL_RUNNERS };
  }

  try {
    const url = settings.url.trim();

    // Check if it's CSV
    if (settings.type === 'csvUrl' || url.includes('format=csv') || url.endsWith('.csv')) {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} khi tải file CSV`);
      }
      const text = await resp.text();
      const runners = parseCSV(text);
      if (runners.length === 0) {
        throw new Error('File CSV không có bản ghi hợp lệ nào.');
      }
      localStorage.setItem(RUNNERS_CACHE_KEY, JSON.stringify(runners));
      return { runners };
    }

    // Otherwise treat as Apps Script or JSON API
    let data: any = null;
    let fetchErrorMsg = '';

    // First try proxy endpoint to safely bypass browser CORS and follow Google redirects
    try {
      const proxyResp = await fetch(`/api/proxy-sheet?url=${encodeURIComponent(url)}`);
      const text = await proxyResp.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (
          text.includes('accounts.google.com/ServiceLogin') ||
          text.includes('需要存取權') ||
          text.includes('action="https://accounts.google.com')
        ) {
          throw new Error('Google Apps Script cần mở quyền "Bất kỳ ai" (Anyone). Hiện script đang đặt "Chỉ mình tôi".');
        }
        throw new Error('Dữ liệu trả về không phải định dạng JSON hợp lệ.');
      }
    } catch (proxyErr: any) {
      fetchErrorMsg = proxyErr.message || '';
      // Fallback to direct fetch
      try {
        const resp = await fetch(url);
        const text = await resp.text();
        try {
          data = JSON.parse(text);
        } catch {
          if (
            text.includes('accounts.google.com/ServiceLogin') ||
            text.includes('需要存取權') ||
            text.includes('action="https://accounts.google.com')
          ) {
            throw new Error('Google Apps Script cần mở quyền "Bất kỳ ai" (Anyone). Xem hướng dẫn ở nút "Nối Google Sheet" để mở.');
          }
          throw new Error(fetchErrorMsg || 'Không thể phân tích dữ liệu JSON từ Google Sheet.');
        }
      } catch (directErr: any) {
        throw new Error(directErr.message || fetchErrorMsg);
      }
    }

    let list: Runner[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && Array.isArray(data.data)) {
      list = data.data;
    } else if (data && data.runners) {
      list = data.runners;
    } else {
      throw new Error('Định dạng dữ liệu JSON không đúng cấu trúc danh sách vận động viên.');
    }

    const normalizeDistance = (dist: string, bib: string): string => {
      const d = (dist || '').trim();
      const upper = d.toUpperCase();
      if (upper === 'M' || upper === 'F') {
        const firstDigit = bib.trim().charAt(0);
        if (firstDigit === '9') return 'Full Marathon';
        if (firstDigit === '8') return 'Half Marathon';
        if (firstDigit === '6' || firstDigit === '1') return '10KM';
        if (firstDigit === '5') return '5KM';
        return 'Full Marathon';
      }
      if (upper.includes('HALF') || upper === 'HM' || upper === '21K' || upper === '21KM') return 'Half Marathon';
      if (upper.includes('FULL') || upper === 'FM' || upper === '42K' || upper === '42KM') return 'Full Marathon';
      if (upper === '10K' || upper === '10KM') return '10KM';
      if (upper === '5K' || upper === '5KM') return '5KM';
      return d || 'Half Marathon';
    };

    // Format & normalize fields
    const formatted: Runner[] = list.map((r: any, idx) => {
      const bibStr = String(r.bib || idx + 1000).trim();
      const distClean = normalizeDistance(String(r.distance || ''), bibStr);

      const rawRunner: Runner = {
        bib: bibStr,
        name: String(r.name || 'Vận động viên').trim(),
        gender: String(r.gender || 'M').toUpperCase().includes('F') ? 'F' : 'M',
        distance: distClean,
        distanceDisplay: `Đã hoàn thành | Has Completed ${distClean}`,
        overallRank: r.overallRank ?? '-',
        genderRank: r.genderRank ?? '-',
        ag: String(r.ag ?? '-').trim(),
        ageGroupRank: r.ageGroupRank ?? '-',
        gunTime: String(r.gunTime || '--:--:--').trim(),
        chipTime: String(r.chipTime || '--:--:--').trim(),
        date: r.date || '13/09/2026',
        photoUrl: r.photoUrl || r.photo || r.image || undefined,
        startTime: r.startTime || r.start || r['xuất phát'] || r['bắt đầu'] || undefined,
        cp1: r.cp1 || r['cp 1'] || r.checkpoint1 || undefined,
        cp1Pace: r.cp1Pace || r['cp1.pace'] || r['cp1 pace'] || r['pace cp1'] || r.cp1_pace || undefined,
        cp2: r.cp2 || r['cp 2'] || r.checkpoint2 || undefined,
        cp2Pace: r.cp2Pace || r['cp2.pace'] || r['cp2 pace'] || r['pace cp2'] || r.cp2_pace || undefined,
        cp3: r.cp3 || r['cp 3'] || r.checkpoint3 || undefined,
        cp3Pace: r.cp3Pace || r['cp3.pace'] || r['cp3 pace'] || r['pace cp3'] || r.cp3_pace || undefined,
        avgPace: r.avgPace || r.averagePace || r['avg pace'] || r['average pace'] || r['average.pace'] || r.pace || undefined,
        finishPace: r.finishPace || r['finish pace'] || r['pace finish'] || undefined,
      };

      // Fill in CP calculations if any were missing
      const splits = getRunnerSplitData(rawRunner);
      rawRunner.startTime = rawRunner.startTime || splits.startTime;
      rawRunner.cp1 = rawRunner.cp1 || splits.cp1;
      rawRunner.cp1Pace = rawRunner.cp1Pace || splits.cp1Pace;
      rawRunner.cp2 = rawRunner.cp2 || splits.cp2;
      rawRunner.cp2Pace = rawRunner.cp2Pace || splits.cp2Pace;
      rawRunner.cp3 = rawRunner.cp3 || splits.cp3;
      rawRunner.cp3Pace = rawRunner.cp3Pace || splits.cp3Pace;
      rawRunner.avgPace = rawRunner.avgPace || splits.avgPace;
      rawRunner.finishPace = rawRunner.finishPace || splits.finishPace;

      return rawRunner;
    });

    localStorage.setItem(RUNNERS_CACHE_KEY, JSON.stringify(formatted));
    const bgUrl = data && data.backgroundUrl ? String(data.backgroundUrl).trim() : null;
    const logoUrl = data && (data.logoUrl || data.logo) ? String(data.logoUrl || data.logo).trim() : null;
    return { runners: formatted, backgroundUrl: bgUrl, logoUrl };
  } catch (err: any) {
    console.error('Error fetching runners:', err);
    // Try reading cached runners
    try {
      const cached = localStorage.getItem(RUNNERS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { runners: parsed, error: `Dùng dữ liệu cache tạm thời: ${err.message}` };
        }
      }
    } catch {
      // ignore
    }
    return { runners: INITIAL_RUNNERS, error: err.message || 'Lỗi kết nối nguồn dữ liệu' };
  }
};
