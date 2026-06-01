/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { Section, SectionLabel } from "../types";

interface SectionEditorProps {
  key?: React.Key;
  section: Section;
  onEndChange: (v: number) => void;
  onLabelChange: (v: SectionLabel) => void;
  onRemove: () => void;
  isLast: boolean;
}

export function SectionEditor({
  section,
  onEndChange,
  onLabelChange,
  onRemove,
  isLast
}: SectionEditorProps) {
  const labels: SectionLabel[] = ["Intro", "Verse", "Pre-Hook", "Hook", "Bridge", "Outro"];

  return (
    <div className="w-[125px] shrink-0 bg-[#0F1115]/90 p-2.5 rounded-lg border border-white/5 flex flex-col gap-2 transition-all hover:border-red-500/30 relative group shadow-md shadow-black/40">
      {/* Delete button (only show if not the last section remaining, or just general) */}
      {!isLast && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove section"
          className="absolute -top-1.5 -right-1.5 bg-red-950/90 text-red-400 border border-red-800/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer hover:bg-red-900"
        >
          <Trash2 size={10} />
        </button>
      )}

      {/* Label selector */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Type</label>
        <select
          value={section.label}
          onChange={(e) => onLabelChange(e.target.value as SectionLabel)}
          className="bg-[#0A0A0B] border border-white/5 rounded px-1.5 py-0.5 text-[10px] text-neutral-200 font-bold focus:outline-none focus:border-red-500/50 cursor-pointer"
        >
          {labels.map((lbl) => (
            <option key={lbl} value={lbl}>
              {lbl}
            </option>
          ))}
        </select>
      </div>

      {/* Bar boundaries info */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Start</label>
          <div className="bg-[#0A0A0B]/50 border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 text-center">
            {section.start}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">End</label>
          <input
            type="number"
            min={section.start}
            max={64}
            value={section.end}
            onChange={(e) => onEndChange(Math.max(section.start, parseInt(e.target.value) || section.start))}
            className="bg-[#0A0A0B] border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-center text-red-400 focus:outline-none focus:border-red-500/50"
          />
        </div>
      </div>
    </div>
  );
}
