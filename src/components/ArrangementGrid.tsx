/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Section, Loop, StemType, Genre, ArrangementClip } from "../types";

interface ArrangementGridProps {
  genre: Genre;
  sections: Section[];
  clips: ArrangementClip[];
  loops: Loop[];
  mutes: Record<string, boolean>;
  onToggleMute: (row: string) => void;
  totalBars: number;
}

export function ArrangementGrid({
  genre,
  sections,
  clips,
  loops,
  mutes,
  onToggleMute,
  totalBars,
}: ArrangementGridProps) {
  const rows: StemType[] = ["Drums", "Bass", "Melody", "FX"];

  const getEnergyColor = (row: string, energy: number, isMuted: boolean) => {
    if (isMuted) return "rgba(38, 38, 38, 0.9)";
    const colors: Record<string, string> = {
      Drums: "220, 38, 38",  // Crimson Red
      Bass: "37, 99, 235",   // Royal Blue
      Melody: "5, 150, 105", // Emerald Green
      FX: "147, 51, 234",    // Deep Purple
      Full: "80, 80, 80"
    };
    const rgb = colors[row] || "220, 38, 38";
    const opacities = [0.25, 0.45, 0.65, 0.85, 1.0];
    return `rgba(${rgb}, ${opacities[energy - 1] || 0.65})`;
  };

  const renderClipBackgroundTexture = () => {
    // Return subtle tick marks for sub-bar visibility
    return {
      backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      backgroundSize: "25% 100%" // Assuming 4 beats per bar
    };
  };

  return (
    <div className="flex flex-col gap-1 w-full overflow-x-auto custom-scrollbar pb-3">
      {/* Container holding the tracks and timeline */}
      <div className="relative min-w-[800px] flex flex-col">
        
        {/* Timeline Ruler / Section Headers */}
        <div className="flex mb-1 relative ml-28 border-b border-white/10 h-8 font-mono">
          {sections.map((section) => {
            const leftPct = ((section.start - 1) / totalBars) * 100;
            const widthPct = ((section.end - section.start + 1) / totalBars) * 100;
            return (
              <div
                key={section.id}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                className="absolute top-0 h-full border-r border-white/5 bg-[#17191E] flex items-center justify-between px-2 text-[10px] shadow-lg text-neutral-300 font-bold uppercase tracking-wider"
              >
                <span className="truncate text-red-500">{section.label}</span>
                <span className="opacity-40 text-[9px]">{section.start}</span>
              </div>
            );
          })}
        </div>

        {/* Global Grid Lines underlying all lanes */}
        <div className="absolute top-8 bottom-0 left-28 right-0 pointer-events-none flex opacity-10">
          {Array.from({ length: totalBars }).map((_, i) => (
             <div key={i} className="h-full border-r border-white" style={{ width: `${100 / totalBars}%` }} />
          ))}
        </div>

        {/* Stem Lanes */}
        <div className="flex flex-col gap-2 relative">
          {rows.map((row) => {
            const rowClips = clips.filter(c => c.stem === row);
            const sortedClips = [...rowClips].sort((a, b) => a.startBar - b.startBar);
            const silenceClips: { startBar: number; endBar: number }[] = [];
            let currentBar = 0;
            sortedClips.forEach(clip => {
              if (clip.startBar > currentBar) {
                silenceClips.push({ startBar: currentBar, endBar: clip.startBar });
              }
              currentBar = Math.max(currentBar, clip.endBar);
            });
            if (currentBar < totalBars) {
              silenceClips.push({ startBar: currentBar, endBar: totalBars });
            }
            
            return (
              <div key={row} className="flex items-stretch gap-3 h-[72px] group relative transition-all duration-300 w-full">
                
                {/* Stem Track Controller Label */}
                <div className="w-28 flex items-center justify-between bg-[#0F1115] border border-transparent group-hover:border-white/5 rounded-none px-3 py-2 shrink-0 shadow z-10 self-center h-full">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${mutes[row] ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
                    {row}
                  </span>
                  <button
                    onClick={() => onToggleMute(row)}
                    className={`transition-all duration-200 cursor-pointer ${mutes[row] ? 'text-zinc-600 hover:text-zinc-400' : 'text-red-500 hover:text-red-400'}`}
                  >
                    {mutes[row] ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </div>

                {/* Timeline Lane */}
                <div className={`flex-1 relative bg-[#0D0E12] rounded-r-md ${mutes[row] ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                  
                  {/* Silence Segments */}
                  {silenceClips.map((sClip, idx) => {
                    const leftPct = (sClip.startBar / totalBars) * 100;
                    const widthPct = ((sClip.endBar - sClip.startBar) / totalBars) * 100;
                    return (
                      <div
                        key={`silence-${idx}`}
                        className="absolute top-0.5 bottom-0.5 rounded border-t border-b border-white/5 overflow-hidden flex flex-col justify-between opacity-30 select-none pointer-events-none"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)",
                          backgroundSize: "25% 100%"
                        }}
                      >
                         <div className="flex justify-between items-start pt-1 px-1 w-full opacity-60 grayscale filter mix-blend-overlay">
                            <div className="flex-1 flex justify-between px-2 text-[10px] font-mono text-white/10 font-black overflow-hidden translate-y-0.5">
                              <span>→</span>
                              <div className="flex-1 flex justify-evenly mx-2 overflow-hidden items-center">
                                {Array.from({ length: Math.max(1, sClip.endBar - sClip.startBar - 2) }).map((_, i) => (
                                   <span key={i}>{i + 2}</span>
                                ))}
                              </div>
                              <span>←</span>
                            </div>
                         </div>
                      </div>
                    );
                  })}

                  {/* Active Clips */}
                  {sortedClips.map((clip) => {
                    const leftPct = (clip.startBar / totalBars) * 100;
                    const widthPct = ((clip.endBar - clip.startBar) / totalBars) * 100;

                    return (
                      <div
                        key={clip.id}
                        className="absolute top-0.5 bottom-0.5 rounded shadow-md border-t border-white/20 border-b border-black/50 overflow-hidden flex flex-col justify-between"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: getEnergyColor(row, clip.energy, false),
                          ...renderClipBackgroundTexture()
                        }}
                      >
                         <div className="flex justify-between items-start pt-1 px-1 w-full">
                            <span className="text-[10px] font-black text-white/90 uppercase tracking-tight truncate drop-shadow filter whitespace-nowrap z-10 w-1/3">
                              {clip.stem}
                            </span>
                            <div className="flex-1 flex justify-between px-2 text-[10px] font-mono text-black/40 font-black overflow-hidden select-none translate-y-0.5 pointer-events-none">
                              <span>→</span>
                              <div className="flex-1 flex justify-evenly mx-2 overflow-hidden items-center opacity-50">
                                {/* Dynamically generate numbers based on horizontal space - simplest static approach for visual approximation: */}
                                {Array.from({ length: Math.max(1, clip.endBar - clip.startBar - 2) }).map((_, i) => (
                                   <span key={i}>{i + 2}</span>
                                ))}
                              </div>
                              <span>←</span>
                            </div>
                         </div>
                         <div className="flex justify-between items-end pb-1 px-1 w-full">
                            <span className="text-[8px] font-bold text-white/60 font-mono bg-black/40 px-1 rounded-sm z-10">
                              +{clip.energy}/5
                            </span>
                            <span className="text-[8px] text-black/30 font-bold truncate">
                               {clip.assignedLoopId && clip.assignedLoopId !== clip.stem ? "Custom" : "Synth"}
                            </span>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
