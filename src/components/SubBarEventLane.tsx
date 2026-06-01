import React, { useRef, useState } from "react";
import { SubBarEvent, SubBarEventType } from "../types";

interface SubBarEventLaneProps {
  events: SubBarEvent[];
  onChange: (events: SubBarEvent[]) => void;
  sectionBars: number;
  isExpanded: boolean;
  onToggleExpand?: (e: React.MouseEvent) => void;
}

const EVENT_TYPES: SubBarEventType[] = [
  "Note On", "Sweep", "Chop", "Dropout", "Fill", "Re-entry", "Silence"
];

export function SubBarEventLane({
  events,
  onChange,
  sectionBars,
  isExpanded,
  onToggleExpand
}: SubBarEventLaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionBeats = sectionBars * 4;
  const SUBDIV = 0.5; // eighth notes
  const totalSubdivs = sectionBeats / SUBDIV;

  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number, y: number, eventId: string } | null>(null);

  const getSubdivFromMouse = (e: React.MouseEvent) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    return Math.floor(ratio * totalSubdivs);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded) {
      if (onToggleExpand) onToggleExpand(e);
      return;
    }
    setContextMenuPos(null);
    const pos = getSubdivFromMouse(e);
    setDragStart(pos);
    setDragCurrent(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isExpanded) return;
    if (dragStart !== null) {
      e.stopPropagation();
      setDragCurrent(getSubdivFromMouse(e));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isExpanded) return;
    if (dragStart !== null && dragCurrent !== null) {
      e.stopPropagation();
      const start = Math.min(dragStart, dragCurrent);
      const end = Math.max(dragStart, dragCurrent);
      const startBeat = start * SUBDIV;
      const endBeat = (end + 1) * SUBDIV;

      // Create a default event
      const newEvent: SubBarEvent = {
        id: Math.random().toString(36).substring(2, 9),
        type: "Note On",
        startBeat,
        endBeat,
      };

      onChange([...events, newEvent]);
      setDragStart(null);
      setDragCurrent(null);
    }
  };

  const getEventAt = (pos: number) => {
    const beat = pos * SUBDIV;
    return events.find(ev => beat >= ev.startBeat && beat < ev.endBeat);
  };

  const handleEventClick = (e: React.MouseEvent, evId: string) => {
    e.stopPropagation();
    if (!isExpanded) return;
    setContextMenuPos({ x: e.clientX, y: e.clientY, eventId: evId });
  };

  const changeEventType = (type: SubBarEventType, id: string) => {
    onChange(events.map(ev => ev.id === id ? { ...ev, type } : ev));
    setContextMenuPos(null);
  };

  const deleteEvent = (id: string) => {
    onChange(events.filter(ev => ev.id !== id));
    setContextMenuPos(null);
  };

  const dragPreviewStart = dragStart !== null && dragCurrent !== null ? Math.min(dragStart, dragCurrent) * SUBDIV : null;
  const dragPreviewEnd = dragStart !== null && dragCurrent !== null ? (Math.max(dragStart, dragCurrent) + 1) * SUBDIV : null;

  return (
    <div 
      className={`relative w-full flex flex-col ${isExpanded ? "h-20 bg-[#0A0A0B]/80 mt-2 rounded border border-white/10" : "h-6 mt-1 opacity-80"}`}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div 
        ref={containerRef}
        className="relative w-full h-full flex"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background Grid */}
        {Array.from({ length: totalSubdivs }).map((_, i) => {
          const isBarStart = i % (4 / SUBDIV) === 0;
          const isBeatStart = i % (1 / SUBDIV) === 0;
          return (
            <div 
              key={i} 
              className={`h-full border-r ${isBarStart ? "border-white/20" : isBeatStart ? "border-white/10" : "border-white/5"} ${!isExpanded ? "border-transparent" : ""} box-border`}
              style={{ width: `${100 / totalSubdivs}%` }}
            />
          );
        })}

        {/* Existing Events */}
        {events.map((ev) => {
          const leftPct = (ev.startBeat / sectionBeats) * 100;
          const widthPct = ((ev.endBeat - ev.startBeat) / sectionBeats) * 100;
          const totalEvSubdivs = Math.round((ev.endBeat - ev.startBeat) / SUBDIV);
          const isSilence = ev.type === "Silence" || ev.type === "Dropout";

          return (
            <div
              key={ev.id}
              onClick={(e) => handleEventClick(e, ev.id)}
              className={`absolute top-0 h-full flex overflow-hidden cursor-pointer ${isSilence ? "bg-black/60 opacity-80" : "bg-red-500/80"} 
                          ${isExpanded ? "border border-white/20 hover:border-white/50" : "border border-t-0 border-b-0 border-black/50"}`}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            >
              {Array.from({ length: totalEvSubdivs }).map((_, i) => {
                let content = "";
                let style = "flex items-center justify-center font-mono font-bold select-none";
                style += isExpanded ? " text-[10px]" : " text-[6px]";
                
                if (isSilence) {
                  style += " text-neutral-500 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwTDIgMk0yIDBMMCAyIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjAuNSIvPgo8L3N2Zz4=')]";
                } else {
                  style += " text-white";
                }

                if (totalEvSubdivs === 1) {
                  content = "→←";
                } else if (i === 0) {
                  content = "→";
                } else if (i === totalEvSubdivs - 1) {
                  content = "←";
                } else {
                  content = (i + 1).toString();
                }

                return (
                  <div key={i} className={style} style={{ width: `${100 / totalEvSubdivs}%` }}>
                    {content}
                  </div>
                );
              })}
              {isExpanded && (
                <div className="absolute top-0 left-1 text-[8px] font-bold text-white/50 uppercase truncate max-w-full">
                  {ev.type}
                </div>
              )}
            </div>
          );
        })}

        {/* Drag Preview */}
        {dragPreviewStart !== null && dragPreviewEnd !== null && (
          <div
            className="absolute top-0 h-full bg-blue-500/30 border border-blue-400 border-dashed pointer-events-none"
            style={{
              left: `${(dragPreviewStart / sectionBeats) * 100}%`,
              width: `${((dragPreviewEnd - dragPreviewStart) / sectionBeats) * 100}%`
            }}
          />
        )}
      </div>

      {contextMenuPos && (
        <div 
          className="fixed bg-[#0F1115] border border-white/10 rounded-xl p-1 z-50 shadow-2xl animate-fade-in"
          style={{ top: contextMenuPos.y + 5, left: contextMenuPos.x + 5 }}
        >
          <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1 px-2 py-1">
            Event Type
          </div>
          {EVENT_TYPES.map(t => (
            <button
              key={t}
              className="block w-full text-left text-[10px] px-2 py-1.5 rounded transition-colors text-neutral-200 hover:bg-white/10 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); changeEventType(t, contextMenuPos.eventId); }}
            >
              {t}
            </button>
          ))}
          <div className="h-px bg-white/10 my-1" />
          <button
            className="block w-full text-left text-[10px] px-2 py-1.5 rounded transition-colors text-red-400 hover:bg-red-500/20 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); deleteEvent(contextMenuPos.eventId); }}
          >
            Delete Event
          </button>
        </div>
      )}
    </div>
  );
}
