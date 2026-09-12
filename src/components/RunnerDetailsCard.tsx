import React from 'react';
import { Runner } from '../types';
import { Trophy, Timer, User, Flag, Calendar, Hash, Medal, Award, TrendingUp, Zap, Gauge } from 'lucide-react';
import { getRunnerSplitData } from '../utils/runnerSplits';

interface RunnerDetailsCardProps {
  runner: Runner;
}

export const RunnerDetailsCard: React.FC<RunnerDetailsCardProps> = ({ runner }) => {
  const splits = getRunnerSplitData(runner);

  return (
    <div className="w-full bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs text-stone-800 space-y-4" id="runner-details-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
        <div className="flex items-center gap-3">
          {runner.photoUrl ? (
            <img
              src={runner.photoUrl}
              alt={runner.name}
              className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-xs"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 font-bold text-base">
              {runner.gender === 'F' ? '♀' : '♂'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                {runner.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono font-semibold border border-stone-200">
                BIB: {runner.bib}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
              <span className="text-teal-700 font-semibold">{runner.distance}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                {runner.date || '13/09/2026'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            Finisher chính thức
          </span>
        </div>
      </div>

      {/* 7 Key Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* 1. BIB NUMBER */}
        <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200/70 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-stone-500" />
            BIB NUMBER
          </span>
          <span className="text-base sm:text-lg font-bold text-stone-900 mt-1 font-mono">
            {runner.bib}
          </span>
        </div>

        {/* 2. CHIPTIME */}
        <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200/70 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 text-teal-600" />
            CHIPTIME
          </span>
          <span className="text-base sm:text-lg font-extrabold text-teal-900 mt-1 font-mono">
            {runner.chipTime}
          </span>
        </div>

        {/* 3. FINISH TIME (Gun Time) */}
        <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200/70 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
            <Flag className="w-3.5 h-3.5 text-indigo-500" />
            GUN TIME
          </span>
          <span className="text-base sm:text-lg font-bold text-stone-800 mt-1 font-mono">
            {runner.gunTime}
          </span>
        </div>

        {/* 4. OVERALL RANK */}
        <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200/70 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            OVERALL RANK
          </span>
          <span className="text-base sm:text-lg font-bold text-stone-900 mt-1">
            #{runner.overallRank}
          </span>
        </div>

        {/* 5. GENDER RANK */}
        <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200/70 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-sky-600" />
            GENDER RANK
          </span>
          <span className="text-base sm:text-lg font-bold text-stone-900 mt-1">
            #{runner.genderRank}
          </span>
        </div>

        {/* 6. AG */}
        <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200/70 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-stone-500" />
            AG
          </span>
          <span className="text-base sm:text-lg font-bold text-stone-900 mt-1">
            {runner.ag}
          </span>
        </div>

        {/* 7. AGE GROUP RANK */}
        <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200/70 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
            <Medal className="w-3.5 h-3.5 text-orange-500" />
            AGE GROUP RANK
          </span>
          <span className="text-base sm:text-lg font-bold text-stone-900 mt-1">
            #{runner.ageGroupRank}
          </span>
        </div>
      </div>

      {/* Checkpoints & Split Pace Detail Row (Start, CP1, CP2, CP3, Avg Pace, GunTime, ChipTime) */}
      <div className="bg-stone-900 text-white rounded-xl p-3.5 sm:p-4 border border-stone-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span className="text-xs sm:text-sm font-bold text-stone-100 uppercase tracking-wide">
              Thông số Checkpoints (CP) & Tốc độ Pace từng đoạn
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-stone-400">
              Avg Pace:{' '}
              <strong className="text-amber-300 font-mono">{splits.avgPace}</strong>
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400">
              GunTime: <strong className="text-stone-200 font-mono">{splits.gunTime}</strong>
            </span>
            <span className="text-stone-500">•</span>
            <span className="text-stone-400">
              ChipTime: <strong className="text-teal-300 font-mono">{splits.chipTime}</strong>
            </span>
          </div>
        </div>

        {/* Checkpoint Nodes Timeline Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {splits.checkpoints.map((cp, idx) => (
            <div
              key={cp.id}
              className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                idx === 0
                  ? 'bg-stone-800/80 border-stone-700'
                  : idx === splits.checkpoints.length - 1
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  : 'bg-stone-800/60 border-stone-700/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                  {cp.label} ({cp.km}K)
                </span>
                {idx > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-400/10 text-teal-300 border border-teal-400/20 font-mono">
                    {cp.pace}/km
                  </span>
                )}
              </div>
              <div className="mt-2">
                <span className="text-xs text-stone-400 block text-[10px]">Thời gian mốc:</span>
                <span className="text-sm font-bold font-mono text-white">{cp.time}</span>
              </div>
              <div className="mt-1 pt-1 border-t border-stone-700/50 text-[10px] text-stone-400 flex items-center justify-between">
                <span>{idx === 0 ? 'Xuất phát' : `Tốc độ đoạn:`}</span>
                <span className="font-semibold text-stone-300 font-mono">
                  {idx === 0 ? cp.time : `${cp.pace} /km`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
