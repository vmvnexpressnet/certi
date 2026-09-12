import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, FileSpreadsheet, Code2, HelpCircle, CheckCircle2, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE, SAMPLE_SHEET_CSV_TEMPLATE } from '../data/googleAppsScript';
import { DataSourceSettings } from '../types';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DataSourceSettings;
  onSaveSettings: (settings: DataSourceSettings) => Promise<void>;
  runnersCount: number;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  runnersCount,
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'guide' | 'connect' | 'template'>('script');
  const [copied, setCopied] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  
  const [urlInput, setUrlInput] = useState(settings.url);
  const [typeInput, setTypeInput] = useState<DataSourceSettings['type']>(settings.type);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_SHEET_CSV_TEMPLATE);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  const handleDownloadCSV = () => {
    const blob = new Blob([SAMPLE_SHEET_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'VnExpress_Marathon_QuyNhon_Mau_Du_Lieu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await onSaveSettings({
        type: typeInput,
        url: urlInput.trim(),
      });
      setTestResult({
        success: true,
        message: 'Kết nối thành công! Đã đồng bộ dữ liệu vào ứng dụng.',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Lỗi kết nối: ${err.message || 'Không thể lấy dữ liệu từ URL'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div
        id="google-sheet-modal"
        className="bg-white border border-stone-200 w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden text-stone-800 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Nguồn dữ liệu Google Sheets
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium border border-stone-200">
                  {runnersCount} VĐV hiện tại
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Script và kết nối đồng bộ danh sách vận động viên & phôi chứng nhận tự động
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-sheet-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50/70 px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'script'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Mã Google Apps Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'connect'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Cấu hình & Kết nối URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Hướng dẫn cài đặt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'template'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Cột chuẩn & File mẫu
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm bg-white">
          {/* TAB 1: SCRIPT */}
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-600">
                  Dán đoạn mã này vào Google Sheets qua <strong className="text-stone-900">Tiện ích mở rộng &gt; Apps Script</strong>:
                </p>
                <button
                  type="button"
                  id="copy-script-btn"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã sao chép mã!' : 'Sao chép toàn bộ mã'}
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-900 font-mono text-xs">
                <div className="px-4 py-2 bg-stone-950 border-b border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                  <span>Code.gs</span>
                  <span>Google Apps Script (JavaScript)</span>
                </div>
                <pre className="p-4 overflow-x-auto text-emerald-400/90 leading-relaxed max-h-[380px] select-all">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECT */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wide">
                  Chọn phương thức kết nối dữ liệu:
                </label>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTypeInput('mock')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      typeInput === 'mock'
                        ? 'bg-white border-stone-900 text-stone-900 shadow-xs font-semibold'
                        : 'bg-white/60 border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-bold">1. Dữ liệu mẫu (Demo)</div>
                    <div className="text-[11px] text-stone-500 mt-1">Đầy đủ VĐV Bùi Minh Đức - 88881 và các cự ly</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTypeInput('appsScript')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      typeInput === 'appsScript'
                        ? 'bg-white border-stone-900 text-stone-900 shadow-xs font-semibold'
                        : 'bg-white/60 border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-bold">2. Apps Script Web App</div>
                    <div className="text-[11px] text-stone-500 mt-1">Link dạng script.google.com/.../exec</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTypeInput('csvUrl')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      typeInput === 'csvUrl'
                        ? 'bg-white border-stone-900 text-stone-900 shadow-xs font-semibold'
                        : 'bg-white/60 border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-bold">3. Link Google Sheet CSV</div>
                    <div className="text-[11px] text-stone-500 mt-1">Link Xuất bản lên web định dạng CSV trực tiếp</div>
                  </button>
                </div>
              </div>

              {typeInput !== 'mock' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    {typeInput === 'appsScript' ? 'Google Apps Script Web App URL:' : 'Google Sheet Published CSV URL:'}
                  </label>
                  <input
                    type="url"
                    id="sheet-url-input"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={
                      typeInput === 'appsScript'
                        ? 'https://script.google.com/macros/s/AKfycb.../exec'
                        : 'https://docs.google.com/spreadsheets/d/e/.../pub?output=csv'
                    }
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:bg-white focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 text-xs font-mono"
                  />
                  <p className="text-[11px] text-stone-500">
                    Hệ thống sẽ gọi trực tiếp URL này khi người dùng tìm kiếm hoặc mở trang chứng nhận.
                  </p>
                </div>
              )}

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  id="save-datasource-btn"
                  onClick={handleSaveAndTest}
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isTesting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isTesting ? 'Đang kiểm tra kết nối...' : 'Lưu & Kiểm tra kết nối'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: STEP BY STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center">1</span>
                    Chuẩn bị Sheet VĐV & Sheet Setup ảnh nền
                  </div>
                  <div className="text-xs text-stone-600 mt-1.5 pl-7 space-y-1.5">
                    <p>• <strong>Sheet VĐV:</strong> Dòng 1 chứa các cột: <code className="text-stone-900 bg-white border border-stone-200 px-1 py-0.5 rounded">BIB, Name, Gender, Distance, OverallRank, GenderRank, AG, AgeGroupRank, GunTime, ChipTime</code>.</p>
                    <p>• <strong>Sheet "Setup" (Ảnh nền tự động):</strong> Tạo 1 tab sheet mới đặt tên là <code className="text-stone-900 bg-white border border-stone-200 px-1 py-0.5 rounded">Setup</code>. Ở ô <strong>A1</strong> ghi <code className="text-stone-900 bg-white border border-stone-200 px-1 py-0.5 rounded">Background</code>, ô <strong>A2</strong> dán link ảnh (link Google Drive hoặc link ảnh trực tiếp). Hệ thống sẽ tự động lấy ảnh này làm phôi chứng nhận!</p>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center">2</span>
                    Mở Apps Script & Dán mã
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5 pl-7">
                    Tại menu của Google Sheet, bấm <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                    Xóa đoạn mã mặc định và dán toàn bộ mã ở tab <strong>Mã Google Apps Script</strong> vào file <code>Code.gs</code>. Bấm nút Lưu (Save).
                  </p>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-stone-900 text-white text-xs flex items-center justify-center">3</span>
                    Triển khai Web App & Cấp quyền
                  </div>
                  <div className="text-xs text-stone-600 mt-1.5 pl-7 space-y-1">
                    <p>• Bấm nút <strong>Triển khai (Deploy)</strong> ở góc trên bên phải &gt; chọn <strong>Tùy chọn triển khai mới (New deployment)</strong>.</p>
                    <p>• Bấm vào biểu tượng bánh răng bên cạnh "Chọn loại", chọn <strong>Ứng dụng web (Web App)</strong>.</p>
                    <p>• <strong>Ai có quyền truy cập (Who has access)</strong>: BẮT BUỘC chọn <strong>Bất kỳ ai (Anyone)</strong> để ứng dụng có thể đọc dữ liệu.</p>
                    <p>• Bấm <strong>Triển khai</strong>, cấp quyền truy cập tài khoản, sau đó copy đường dẫn <strong>URL ứng dụng web</strong> và dán vào tab <strong>Cấu hình & Kết nối URL</strong>!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEMPLATE */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Cấu trúc 10 cột dữ liệu chuẩn</h3>
                  <p className="text-xs text-stone-500">Đảm bảo tên cột ở Dòng 1 (Header row) của Google Sheet chứa các trường sau:</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium flex items-center gap-1.5 border border-stone-200 shadow-xs cursor-pointer"
                  >
                    {copiedTemplate ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-500" />}
                    {copiedTemplate ? 'Đã chép CSV!' : 'Sao chép CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Tải file mẫu CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Tên cột (Header)</th>
                      <th className="py-2.5 px-3 font-semibold">Mô tả</th>
                      <th className="py-2.5 px-3 font-semibold">Ví dụ mẫu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">BIB</td>
                      <td className="py-2 px-3">Số BIB của VĐV</td>
                      <td className="py-2 px-3 font-mono">88881</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">Name</td>
                      <td className="py-2 px-3">Họ và tên Vận động viên</td>
                      <td className="py-2 px-3">Bùi Minh Đức</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">Gender</td>
                      <td className="py-2 px-3">Giới tính (M / F hoặc Nam / Nữ)</td>
                      <td className="py-2 px-3 font-mono">M</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">Distance</td>
                      <td className="py-2 px-3">Cự ly chạy (Full Marathon / Half Marathon / 10KM / 5KM)</td>
                      <td className="py-2 px-3">Half Marathon</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">OverallRank</td>
                      <td className="py-2 px-3">Hạng toàn đoàn / chung cuộc</td>
                      <td className="py-2 px-3 font-mono">128</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">GenderRank</td>
                      <td className="py-2 px-3">Hạng theo giới tính</td>
                      <td className="py-2 px-3 font-mono">94</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">AG</td>
                      <td className="py-2 px-3">Nhóm tuổi (Age Group)</td>
                      <td className="py-2 px-3 font-mono">30-39</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">AgeGroupRank</td>
                      <td className="py-2 px-3">Hạng trong lứa tuổi</td>
                      <td className="py-2 px-3 font-mono">32</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">GunTime</td>
                      <td className="py-2 px-3">Thời gian Gun Time (hh:mm:ss)</td>
                      <td className="py-2 px-3 font-mono">01:45:20</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">ChipTime</td>
                      <td className="py-2 px-3">Thời gian Chip Time (hh:mm:ss)</td>
                      <td className="py-2 px-3 font-mono">01:44:12</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-100 bg-stone-50/70 flex items-center justify-between text-xs text-stone-500">
          <div>
            Nguồn hiện tại: <strong className="text-stone-800 capitalize">{settings.type}</strong>
            {settings.url && ` (${settings.url.substring(0, 35)}...)`}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors font-medium cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
