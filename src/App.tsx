import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SearchRunner } from './components/SearchRunner';
import { CertificateCanvas } from './components/CertificateCanvas';
import { RunnerDetailsCard } from './components/RunnerDetailsCard';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { Runner, CertificateConfig, DataSourceSettings } from './types';
import { INITIAL_RUNNERS } from './data/mockRunners';
import {
  getSavedDataSourceSettings,
  saveDataSourceSettings,
  fetchRunnersFromSource,
} from './services/sheetService';
import { Award, Share2, FileSpreadsheet, Sparkles, AlertCircle, Info, ExternalLink } from 'lucide-react';

const DEFAULT_CONFIG: CertificateConfig = {
  bgMode: 'custom',
  customBgDataUrl: null,
  nameY: 34.0,
  distanceY: 38.0, // Default theo ảnh: 38.0%
  statsY: 47.5, // Default theo ảnh: 47.5%
  statsLayout: 'vertical',
  showStatsCard: false, // Bỏ background bao quanh phần thành tích
  statsLineSpacing: 1.25, // Default theo ảnh: 1.25x
  fontSizeMultiplier: 1.0,
  textColor: '#78ffd8',
  nameColor: '#78ffd8', // Tên thay màu text bằng : #78ffd8
  distanceColor: '#FFFFFF', // Chữ đã hoàn thành ... để màu trắng bình thường
  showDistanceUnderline: false, // Không có gạch dưới
  statsLabelColor: '#FFFFFF', // Thành tích chữ trắng
  statsValueColor: '#fddfac', // Số thì để màu : #fddfac
  accentColor: '#fddfac',
  uppercaseName: true,
};

export default function App() {
  const [runners, setRunners] = useState<Runner[]>(INITIAL_RUNNERS);
  const [selectedRunner, setSelectedRunner] = useState<Runner>(INITIAL_RUNNERS[0]); // Default to Phùng Hữu Thanh - 90110
  const [config, setConfig] = useState<CertificateConfig>(() => {
    try {
      const saved = localStorage.getItem('vm_certificate_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          nameY: typeof parsed.nameY === 'number' ? parsed.nameY : 34.0,
          distanceY: typeof parsed.distanceY === 'number' && parsed.distanceY !== 47.0 && parsed.distanceY !== 39.0 ? parsed.distanceY : 38.0,
          statsY: typeof parsed.statsY === 'number' && parsed.statsY !== 40.5 && parsed.statsY !== 45.0 ? parsed.statsY : 47.5,
          statsLineSpacing: typeof parsed.statsLineSpacing === 'number' && parsed.statsLineSpacing !== 1.0 ? parsed.statsLineSpacing : 1.25,
          nameColor: '#78ffd8', // Cập nhật màu tên theo yêu cầu mới
          distanceColor: '#FFFFFF', // Cập nhật màu chữ hoàn thành trắng
          showDistanceUnderline: false, // Bỏ gạch dưới
          statsLabelColor: '#FFFFFF', // Nhãn thành tích chữ trắng
          statsValueColor: '#fddfac', // Số thành tích màu #fddfac
          showStatsCard: false, // Bỏ background bao quanh
          statsLayout: 'vertical',
        };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_CONFIG;
  });

  const [dataSourceSettings, setDataSourceSettings] = useState<DataSourceSettings>(getSavedDataSourceSettings);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('vm_quynhon_logo_url') || null;
    } catch {
      return null;
    }
  });

  // Check if server already has a cached race logo on disk
  useEffect(() => {
    fetch('/api/logo-status')
      .then((r) => r.json())
      .then((d) => {
        if (d.exists && d.url) {
          setLogoUrl((prev) => prev || d.url);
        }
      })
      .catch(() => {});
  }, []);

  // Save config on changes
  useEffect(() => {
    try {
      localStorage.setItem('vm_certificate_config', JSON.stringify(config));
    } catch (e) {
      // ignore
    }
  }, [config]);

  // Load runners from data source
  const loadRunners = useCallback(async (settings: DataSourceSettings) => {
    const res = await fetchRunnersFromSource(settings);
    if (res.backgroundUrl) {
      const proxiedBg = `/api/proxy-image?url=${encodeURIComponent(res.backgroundUrl)}&type=background`;
      setConfig((prev) => ({
        ...prev,
        bgMode: 'custom',
        customBgDataUrl: proxiedBg,
      }));
    }
    if (res.logoUrl) {
      const proxiedLogo = `/api/proxy-image?url=${encodeURIComponent(res.logoUrl)}&type=logo`;
      setLogoUrl(proxiedLogo);
      try {
        localStorage.setItem('vm_quynhon_logo_url', proxiedLogo);
      } catch (e) {
        // ignore
      }
    }
    if (res.runners && res.runners.length > 0) {
      setRunners(res.runners);
      // If current selected runner is in new list, keep or update it
      const found = res.runners.find((r) => r.bib === selectedRunner?.bib);
      if (found) {
        setSelectedRunner(found);
      } else {
        setSelectedRunner(res.runners[0]);
      }
    }
    if (res.error) {
      setSyncError(res.error);
    } else {
      setSyncError(null);
    }
  }, [selectedRunner?.bib]);

  useEffect(() => {
    loadRunners(dataSourceSettings);
  }, []);

  // Handle URL query parameters (e.g. ?bib=88881)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bibParam = urlParams.get('bib');
    if (bibParam && runners.length > 0) {
      const match = runners.find((r) => r.bib.toLowerCase() === bibParam.toLowerCase());
      if (match) {
        setSelectedRunner(match);
      }
    }
  }, [runners]);

  const handleSaveDataSource = async (newSettings: DataSourceSettings) => {
    saveDataSourceSettings(newSettings);
    setDataSourceSettings(newSettings);
    await loadRunners(newSettings);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        logoUrl={logoUrl}
        settings={dataSourceSettings}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        runnersCount={runners.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Sync Warning Banner if error */}
        {syncError && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{syncError}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => loadRunners(dataSourceSettings)}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-xs font-semibold cursor-pointer"
              >
                Tải lại ngay
              </button>
              <button
                type="button"
                onClick={() => setIsSheetModalOpen(true)}
                className="text-amber-800 font-semibold underline hover:text-amber-950 cursor-pointer"
              >
                Cấu hình
              </button>
            </div>
          </div>
        )}

        {/* Search Bar Section */}
        <section className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Tra cứu kết quả & Chứng nhận Vận động viên
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Tìm kiếm theo số BIB hoặc Họ tên để tự động nạp dữ liệu vào chứng nhận Finisher
              </p>
            </div>
          </div>

          <SearchRunner
            runners={runners}
            selectedRunner={selectedRunner}
            onSelectRunner={(runner) => setSelectedRunner(runner)}
          />
        </section>

        {/* Certificate Display & Runner Details Section */}
        <section className="w-full max-w-5xl mx-auto space-y-5">
          {/* The Certificate Preview with Canvas & Download */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Bản xem trước chứng nhận & Ảnh ghép Finisher
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold border border-stone-200">
                  Chuẩn in 300 DPI
                </span>
              </div>
            </div>

            <CertificateCanvas
              runner={selectedRunner}
              config={config}
              onChangeConfig={setConfig}
            />
          </div>

          {/* Runner Details Breakdown: Hàng ngang nằm dưới hình ảnh Certificate */}
          <RunnerDetailsCard runner={selectedRunner} />
        </section>
      </main>

      {/* Google Sheet Modal */}
      <GoogleSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        settings={dataSourceSettings}
        onSaveSettings={handleSaveDataSource}
        runnersCount={runners.length}
      />

      {/* Footer */}
      <footer className="w-full border-t border-stone-200 bg-white py-5 text-center text-xs text-stone-500">
        <p>© 2026 VnExpress Marathon Quy Nhơn • Tra cứu kết quả & Chứng nhận điện tử</p>
      </footer>
    </div>
  );
}
