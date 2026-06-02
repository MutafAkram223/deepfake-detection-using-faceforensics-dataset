"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="flex-1 border border-slate-800 rounded-3xl p-8 bg-slate-900/50 backdrop-blur-md min-h-[400px] flex flex-col justify-between overflow-hidden relative shadow-2xl">
      
      {/* Animated glowing scanning line background */}
      <motion.div 
        animate={{ y: ["-100%", "200%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 w-full h-1/2 bg-gradient-to-b from-transparent via-emerald-500/[0.07] to-transparent pointer-events-none"
      />

      {/* Top Skeleton Layout */}
      <div className="space-y-5 w-full relative z-10">
        <motion.div 
          animate={{ opacity: [0.3, 0.7, 0.3] }} 
          transition={{ duration: 2, repeat: Infinity }}
          className="h-5 w-32 bg-slate-700/50 rounded-md"
        />
        <div className="flex items-center gap-5">
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2] }} 
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            className="h-16 w-16 bg-slate-700/50 rounded-full"
          />
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2] }} 
            transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
            className="h-12 w-48 bg-slate-700/50 rounded-md"
          />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3 w-full mt-12 relative z-10">
        {[1, 2, 3, 4].map((i) => (
          <motion.div 
            key={i}
            animate={{ opacity: [0.15, 0.4, 0.15] }} 
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
            className="h-20 bg-slate-800/60 rounded-2xl border border-slate-700/30"
          />
        ))}
      </div>

      {/* Status Text */}
      <div className="mt-8 flex items-center gap-3 text-emerald-400 font-medium text-sm tracking-wide bg-emerald-950/30 w-fit px-4 py-2 rounded-full border border-emerald-900/50 relative z-10">
        <Loader2 size={16} className="animate-spin" />
        Performing deep forensic inference...
      </div>
    </div>
  );
}