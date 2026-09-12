import React from 'react';
import { Runner } from '../types';
import { Trophy, Timer, User, Flag, Calendar, Hash, Medal, Award } from 'lucide-react';

interface RunnerDetailsCardProps {
  runner: Runner;
}

export const RunnerDetailsCard: React.FC<RunnerDetailsCardProps> = ({ runner }) => {
  return (
    <div className="w-full bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs text-stone-800" id="runner-details-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5 mb-3.5">
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
            FINISH TIME
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
    </div>
  );
};
