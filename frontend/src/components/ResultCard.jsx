"use client";

import { motion } from "framer-motion";

export default function ResultCard({ result }) {
  // Safe Fallbacks
  const isFake = result.final_result?.toUpperCase() === "FAKE";
  const confidencePercent = result.confidence !== undefined ? (result.confidence * 100).toFixed(1) : "0.0";
  
  // Safe extraction for key metrics
  const binaryProbValue = isFake ? result.binary_fake_probability : result.binary_real_probability;
  const binaryProb = binaryProbValue !== undefined ? (binaryProbValue * 100).toFixed(1) : confidencePercent;
  const classProb = result.confidence !== undefined ? (result.confidence * 100).toFixed(1) : "0.0";

  // Theme mapping
  const colorHex = isFake ? "#f43f5e" : "#10b981"; // rose-500 vs emerald-500
  const textColor = isFake ? "text-rose-500" : "text-emerald-500";
  const glowColor = isFake ? "bg-rose-500" : "bg-emerald-500";
  const badgeBg = isFake ? "bg-rose-950/30 border-rose-900/50" : "bg-emerald-950/30 border-emerald-900/50";

  // Circular Gauge Calculations
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const safeConfidence = result.confidence !== undefined ? Math.min(Math.max(result.confidence, 0), 1) : 0;
  const strokeDashoffset = circumference - (safeConfidence * circumference);

  return (
    <div className="flex-1 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 shadow-2xl h-full flex flex-col relative overflow-hidden">
      
      {/* Subtle background glow */}
      <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-15 pointer-events-none ${glowColor}`} />

      <div className="flex items-start justify-between mb-10 relative z-10">
        <div>
          <h2 className="text-slate-400 text-xs font-semibold tracking-widest uppercase mb-2">
            Forensic Verdict
          </h2>
          <div className="flex items-center gap-3">
            <h3 className={`text-4xl font-black tracking-tight ${textColor}`}>
              {result.final_result || "UNKNOWN"}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeBg} ${textColor}`}>
              {classProb}% Confidence
            </span>
          </div>
        </div>

        {/* Circular Confidence Gauge */}
        <div className="relative w-24 h-24 flex items-center justify-center bg-slate-950/50 rounded-full shadow-inner border border-slate-800/50 shrink-0">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
            <motion.circle
              cx="48"
              cy="48"
              r={radius}
              stroke={colorHex}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-base font-bold text-slate-200">{Math.round(safeConfidence * 100)}</span>
          </div>
        </div>
      </div>

      <div className="mb-8 relative z-10">
        <h4 className="text-slate-300 font-medium mb-2">Analysis Summary</h4>
        <p className="text-slate-500 text-sm leading-relaxed">
          {isFake 
            ? `Our engine detected manipulation artifacts consistent with ${result.fake_type || 'Deepfake'}. The frame aggregation strongly indicates synthetic alteration.`
            : "No significant manipulation artifacts were detected across the sampled temporal space. The extracted frames are consistent with authentic media generation."}
        </p>
      </div>

      {/* Grid mapping actual backend values smoothly */}
      <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
          <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Type / Class</div>
          <div className="text-lg font-semibold text-slate-200">{result.fake_type || "Authentic"}</div>
        </div>
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
          <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Frames Sampled</div>
          <div className="text-lg font-semibold text-slate-200">{result.num_frames_used || 10}</div>
        </div>
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
          <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Binary Prob.</div>
          <div className="text-lg font-semibold text-slate-200">{binaryProb}%</div>
        </div>
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
          <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">Class Prob.</div>
          <div className="text-lg font-semibold text-slate-200">{classProb}%</div>
        </div>
      </div>
    </div>
  );
}