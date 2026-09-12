import React from 'react';
import { Award, Calendar, MapPin } from 'lucide-react';
import { DataSourceSettings } from '../types';

interface NavbarProps {
  logoUrl?: string | null;
  settings?: DataSourceSettings;
  onOpenSheetModal?: () => void;
  runnersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ logoUrl }) => {
  const [currentLogo, setCurrentLogo] = React.useState<string>(logoUrl || '/race_logo.png');

  // Sync logo when logoUrl prop updates
  React.useEffect(() => {
    setCurrentLogo(logoUrl || '/race_logo.png');
  }, [logoUrl]);

  const handleImgError = () => {
    if (currentLogo !== '/race_logo.png') {
      setCurrentLogo('/race_logo.png');
    } else {
      setCurrentLogo('');
    }
  };

  return (
    <header className="w-full bg-white/95 border-b border-stone-200/80 backdrop-blur-md sticky top-0 z-40 transition-colors" id="main-header">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Title */}
        <div className="flex items-center space-x-3.5">
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Logo giải chạy"
              className="h-10 w-auto max-w-[160px] object-contain"
              onError={handleImgError}
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-stone-900 flex items-center justify-center text-white">
              <Award className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight uppercase">
                VnExpress Marathon <span className="text-teal-700">Quy Nhơn 2026</span>
              </h1>
              <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                Chứng nhận Finisher
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-stone-500 mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-400" />
                TP. Quy Nhơn, Bình Định
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-stone-400" />
                13/09/2026
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
