/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Volume2, VolumeX, ChevronUp, ChevronDown, Check, FolderOpen, Zap } from "lucide-react";
import { Section, Loop, StemType, Genre } from "../types";

interface ArrangementGridProps {
  genre: Genre;
  sections: Section[];
  loops: Loop[];
  assignments: Record<string, string>;
  energyLevels: Record<string, number>;
  onAssign: (sid: string, row: string, lid: string, energy?: number) => void;
  onEnergyChange: (sid: string, row: string, energy: number) => void;
  onOpenPianoRoll: (sid: string, stem: string) => void;
  mutes: Record<string, boolean>;
  onToggleMute: (row: string) => void;
  totalBars: number;
}

export function ArrangementGrid({
  genre,
  sections,
  loops,
  assignments,
  energyLevels,
  onAssign,
  onEnergyChange,
  onOpenPianoRoll,
  mutes,
  onToggleMute,
  totalBars
}: ArrangementGridProps) {
  const rows: StemType[] = ["Drums", "Bass", "Melody"];
  const [activeCellSelect, setActiveCellSelect] = React.useState<{ sid: string; row: string } | null>(null);

  const getEnergyColor = (row: string, energy: number, isMuted: boolean) => {
    if (isMuted) return "rgba(38, 38, 38, 0.9)";
    const colors: Record<string, string> = {
      Drums: "220, 38, 38",  // Crimson Red
      Bass: "37, 99, 235",   // Sophisticated Royal Blue
      Melody: "5, 150, 105"  // Sophisticated Emerald Green
    };
    const rgb = colors[row] || "220, 38, 38";
    const opacities = [0.15, 0.35, 0.55, 0.75, 1.0];
    return `rgba(${rgb}, ${opacities[energy - 1] || 0.55})`;
  };

  const cycleEnergy = (sid: string, row: string, currentEnergy: number) => {
    const newEnergy = currentEnergy >= 5 ? 1 : currentEnergy + 1;
    onEnergyChange(sid, row, newEnergy);
  };

  return (
    <div className="flex flex-col gap-1 w-full overflow-x-auto custom-scrollbar pb-3">
      {/* Section Headers */}
      <div className="flex ml-28 mb-1.5 min-w-[800px]">
        {sections.map((section) => (
          <div
            key={section.id}
            style={{ width: `${((section.end - section.start + 1) / totalBars) * 100}%` }}
            className="py-2.5 px-3 border-r border-white/5 bg-[#0F1115] text-[10px] text-neutral-300 font-bold uppercase tracking-wider shadow-lg flex items-center justify-between min-w-[120px]"
          >
            <span className="truncate">{section.label}</span>
            <span className="opacity-40 font-mono text-[9px]">B{section.start}-{section.end}</span>
          </div>
        ))}
      </div>

      {/* Grid Rows */}
      <div className="flex flex-col gap-1 min-w-[800px]">
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-3 h-24 group relative">
            
            {/* Stem Track Controller Label */}
            <div className="w-28 flex items-center justify-between bg-[#0F1115]/80 border border-white/5 rounded-xl px-3 py-2 shrink-0 shadow-md">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${mutes[row] ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>
                {row}
              </span>
              <button
                onClick={() => onToggleMute(row)}
                className={`transition-all duration-200 cursor-pointer ${mutes[row] ? 'text-zinc-600 hover:text-zinc-400' : 'text-red-500 hover:text-red-400'}`}
              >
                {mutes[row] ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>

            {/* Timeline Blocks */}
            <div className={`flex-1 flex h-full border border-white/5 bg-[#0A0A0B] rounded-xl overflow-hidden relative ${mutes[row] ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
              {sections.map((section) => {
                const key = `${section.id}-${row}`;
                const energy = energyLevels[key] || 3;
                const assignedLoopId = assignments[key];
                
                // Find loop if assigned by ID, otherwise fallback search by type or name
                const assignedLoop = loops.find(l => l.id === assignedLoopId || l.name === assignedLoopId);
                const hasAssigned = !!assignedLoopId;

                return (
                  <div
                    key={section.id}
                    style={{
                      width: `${((section.end - section.start + 1) / totalBars) * 100}%`,
                      backgroundColor: hasAssigned ? getEnergyColor(row, energy, false) : 'transparent'
                    }}
                    onDoubleClick={() => onOpenPianoRoll(section.id, row)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCellSelect(activeCellSelect?.sid === section.id && activeCellSelect?.row === row ? null : { sid: section.id, row });
                    }}
                    className={`h-full border-r-4 border-[#080808] flex flex-col items-center justify-center px-1.5 cursor-pointer transition-all hover:bg-zinc-800/10 group/cell relative min-w-[120px] ${hasAssigned ? 'shadow-inner' : 'border-dashed border-zinc-800/20'}`}
                  >
                    {!hasAssigned ? (
                      <div className="flex flex-col items-center gap-1 opacity-20 group-hover/cell:opacity-60 transition-opacity">
                        <FolderOpen size={14} className="text-zinc-600" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500">Empty Grid</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-black text-white uppercase tracking-tight text-center truncate max-w-full px-1 filter drop-shadow">
                          {assignedLoop ? assignedLoop.name : row}
                        </span>
                        
                        {/* Energy Multipliers Badge */}
                        <div className="flex items-center gap-0.5 mt-1 bg-black/45 border border-white/5 rounded pl-1 pr-1.5 py-0.5 select-none hover:bg-black/60 transition-colors">
                          <Zap size={8} className="text-red-400 fill-red-400" />
                          <span className="text-[8px] font-bold text-red-200 font-mono">{energy} / 5</span>
                        </div>

                        {/* Energy Level Controls */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleEnergy(section.id, row, energy);
                          }}
                          className="absolute bottom-1.5 right-1.5 opacity-0 group-hover/cell:opacity-100 transition-all duration-200 bg-black/80 border border-white/10 hover:bg-neutral-800 rounded p-1 flex items-center gap-0.5 cursor-pointer shadow-lg"
                          title="Click to cycle energy"
                        >
                          <ChevronUp size={8} className="text-red-400" />
                        </button>
                      </>
                    )}

                    {/* Popover selector to assign a loaded loop to this section cell */}
                    {activeCellSelect?.sid === section.id && activeCellSelect?.row === row && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-[#0F1115] border border-white/10 rounded-xl p-2 z-20 shadow-2xl shadow-black/80 text-left animate-fade-in"
                      >
                        <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1.5 pb-1 border-b border-white/10 px-1">
                          Assign {row} Loop:
                        </div>
                        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto scrollbar-thin">
                          
                          {/* Option to clear assignment */}
                          <button
                            onClick={() => {
                              onAssign(section.id, row, "");
                              setActiveCellSelect(null);
                            }}
                            className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded transition-colors text-left w-full cursor-pointer hover:bg-white/5 ${!assignedLoopId ? 'text-red-400 font-bold bg-red-950/20 border border-red-500/30' : 'text-neutral-400'}`}
                          >
                            <span>[ None / Silence ]</span>
                            {!assignedLoopId && <Check size={10} className="text-red-400" />}
                          </button>

                          {/* Predefined synthesis track */}
                          <button
                            onClick={() => {
                              onAssign(section.id, row, row); // Default programmatic synthesizer
                              setActiveCellSelect(null);
                            }}
                            className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded transition-colors text-left w-full cursor-pointer hover:bg-white/5 ${assignedLoopId === row ? 'text-red-400 font-bold bg-red-950/20 border border-red-500/30' : 'text-neutral-200'}`}
                          >
                            <span className="truncate">🎯 MIDI Synth Patterns</span>
                            {assignedLoopId === row && <Check size={10} className="text-red-400" />}
                          </button>

                          {/* List of custom uploaded loops matching this stem type */}
                          {loops.filter(l => l.type === row).map(l => (
                            <button
                              key={l.id}
                              onClick={() => {
                                onAssign(section.id, row, l.id);
                                setActiveCellSelect(null);
                              }}
                              className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded transition-colors text-left w-[#16161a] cursor-pointer hover:bg-white/5 ${assignedLoopId === l.id ? 'text-red-400 font-bold bg-red-950/20 border border-red-500/30' : 'text-neutral-250'}`}
                            >
                              <span className="truncate">{l.name}</span>
                              {assignedLoopId === l.id && <Check size={10} className="text-red-400" />}
                            </button>
                          ))}
                        </div>
                        <div className="text-[8px] text-neutral-500 text-center mt-1.5 pt-1 border-t border-white/5">
                          Double click cell to preview midi notes
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
