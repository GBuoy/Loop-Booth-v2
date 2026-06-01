/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from "react";
import { Upload, Loader2 } from "lucide-react";
import { Loop, StemType } from "../types";

interface LoopUploaderProps {
  onAdd: (l: Loop) => void;
  sessionBpm: number;
}

export function LoopUploader({ onAdd, sessionBpm }: LoopUploaderProps) {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<StemType>("Melody");
  const [isDragActive, setIsDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const analyzeAudio = async (file: File) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const arrayBuffer = await file.arrayBuffer();

      // Safari compliance: decodeAudioData might not return a Promise
      let audioBuffer: AudioBuffer;
      try {
        audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          const promise = audioCtx.decodeAudioData(
            arrayBuffer,
            (buffer) => resolve(buffer),
            (err) => reject(err)
          );
          if (promise && typeof promise.then === "function") {
            promise.then(resolve).catch(reject);
          }
        });
      } catch (decodeErr) {
        console.warn("Standard decode failed, trying raw decode parser fallback:", decodeErr);
        throw decodeErr;
      } finally {
        if (audioCtx.state !== 'closed') {
          await audioCtx.close();
        }
      }

      const duration = audioBuffer.length / audioBuffer.sampleRate;
      const beats = (sessionBpm * duration) / 60;
      const rawBars = beats / 4;
      
      const standardBars = [1, 2, 4, 8, 16, 24, 32];
      const bars = standardBars.reduce((prev, curr) => 
        Math.abs(curr - rawBars) < Math.abs(prev - rawBars) ? curr : prev
      ) || 4;

      onAdd({
        id: Math.random().toString(36).substring(2, 11),
        name: file.name.replace(/\.[^/.]+$/, ""),
        type: selectedType,
        duration,
        bpm: sessionBpm,
        bars,
        url: URL.createObjectURL(file)
      });
    } catch (e: any) {
      console.error("Audio Web Context analysis failed:", e);
      setErrorMsg(`Failed to decode audio file (${file.name}). Format may be unsupported or file corrupted.`);
    } finally {
      setLoading(false);
      // Clear file input so same file can be re-selected/uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      analyzeAudio(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-[#0F1115]/60 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center gap-4 transition-all hover:border-red-500/20 shadow-lg">
      <div className="flex gap-2.5 flex-wrap justify-center">
        {(["Drums", "Bass", "Melody", "Full"] as StemType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              selectedType === type
                ? type === "Drums"
                  ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                  : type === "Bass"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
                  : type === "Melody"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full flex flex-col items-center justify-center cursor-pointer py-6 rounded-lg transition-all border border-dashed text-center ${
          isDragActive
            ? "border-red-500/60 bg-red-500/5 scale-[1.01]"
            : "border-white/5 hover:border-white/10"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              analyzeAudio(e.target.files[0]);
            }
          }}
          className="hidden"
          accept="audio/*"
        />
        {loading ? (
          <Loader2 className="animate-spin text-red-500" size={24} />
        ) : (
          <div className="bg-white/5 p-3 rounded-full border border-white/10 shadow-md shadow-black/50 hover:bg-white/10 hover:border-white/20 transition-all">
            <Upload className="text-neutral-300" size={18} />
          </div>
        )}
        <span className="text-[10px] font-bold text-neutral-400 uppercase mt-3 tracking-widest hover:text-white transition-all">
          {loading ? "Analyzing Loop Signal..." : `Upload or Drag ${selectedType} Loop`}
        </span>
        <span className="text-[8px] text-neutral-550 font-mono mt-1 block mb-2">
          Accepts WAV, MP3, AIFF, OGG
        </span>
        {errorMsg && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-md">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
