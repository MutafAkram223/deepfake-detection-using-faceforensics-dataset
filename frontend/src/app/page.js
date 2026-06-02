"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, ShieldCheck, Activity, BarChart3 } from "lucide-react";

import UploadBox from "../components/UploadBox";
import LoadingSpinner from "../components/LoadingSpinner";
import ResultCard from "../components/ResultCard";

const API_BASE = "http://127.0.0.1:8000";

export default function Home() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const workspaceRef = useRef(null);
  const advancedRef = useRef(null);

  const scrollToWorkspace = () => workspaceRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleUpload = (selectedFile) => {
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setResult(null);
    setShowAdvanced(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setResult(null);
      setShowAdvanced(false);

      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(`${API_BASE}/predict`, { method: "POST", body: formData });

      if (!response.ok) throw new Error("HTTP Network Error: Prediction request failed");

      const prediction = await response.json();

      if (prediction.error) throw new Error(prediction.error);

      setResult(prediction);
    } catch (error) {
      alert(error.message || "Failed to process the video. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetWorkspace = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setShowAdvanced(false);
    setLoading(false);
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
    if (!showAdvanced) {
      setTimeout(() => advancedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  };

  // Helper for Advanced Telemetry
  const realProb = result?.binary_real_probability !== undefined ? (result.binary_real_probability * 100).toFixed(1) : "0.0";
  const fakeProb = result?.binary_fake_probability !== undefined ? (result.binary_fake_probability * 100).toFixed(1) : "0.0";
  const classProbs = result?.average_probabilities || {};

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 selection:bg-emerald-500/30 selection:text-emerald-200 font-sans">
      
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-950 z-0" />
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} transition={{ duration: 2 }}
            className="absolute inset-0 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] z-0" 
          />
          <motion.div
            animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] bg-emerald-600/30 rounded-full blur-[130px] z-0"
          />
        </div>

        <div className="z-10 text-center max-w-5xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300 tracking-wide uppercase">Trust & Verification Engine</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-sm"
          >
            Deepfake Detection
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto font-light tracking-wide leading-relaxed"
          >
            Powered by the <span className="font-semibold text-emerald-400">Xception + TCNSC</span> Framework.
            Upload media to verify authenticity with image-level precision.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            onClick={scrollToWorkspace}
            className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-500 text-slate-950 rounded-full font-bold text-lg hover:bg-emerald-400 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
          >
            Start Analysis
            <ChevronDown className="group-hover:translate-y-1 transition-transform text-slate-900" strokeWidth={3} />
          </motion.button>
        </div>
      </section>

      {/* Workspace Section */}
      <section ref={workspaceRef} className="min-h-screen py-24 px-6 bg-slate-950 relative z-10">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <UploadBox onUpload={handleUpload} />
              </motion.div>
            ) : (
              <motion.div key="workspace" className="flex flex-col gap-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                
                {/* TOP GRID: Video & Basic Results */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  
                  {/* Left Column: Media Preview */}
                  <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-end px-2">
                      <h3 className="text-xl font-medium text-slate-200 tracking-tight">Target Media</h3>
                      <button onClick={resetWorkspace} disabled={loading} className="text-sm font-medium text-slate-500 hover:text-emerald-400 transition-colors">
                        Upload New File
                      </button>
                    </div>

                    <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-video border border-slate-800 shadow-2xl">
                      <video src={previewUrl} controls className="w-full h-full object-contain" />
                      <AnimatePresence>
                        {loading && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={loading || result !== null}
                      className="w-full py-5 bg-emerald-500 text-slate-950 font-bold text-lg rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] disabled:shadow-none"
                    >
                      {loading ? <><Loader2 className="animate-spin" size={24} /> Extracting Frames...</> : result ? "Analysis Complete" : "Run Detection Engine"}
                    </button>
                  </div>

                  {/* Right Column: Status / ResultCard */}
                  <div className="flex flex-col h-full">
                    <AnimatePresence mode="wait">
                      {!loading && !result && (
                        <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 border border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center bg-slate-900/50 backdrop-blur-md min-h-[400px]">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                            <ShieldCheck size={28} className="text-emerald-400" />
                          </div>
                          <h4 className="text-xl font-medium text-slate-300 mb-2">Ready for Analysis</h4>
                          <p className="text-slate-500 max-w-xs text-sm">Engine is standing by. Click run to verify authenticity.</p>
                        </motion.div>
                      )}
                      {loading && <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LoadingSpinner /></motion.div>}
                      {result && !loading && <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full"><ResultCard result={result} /></motion.div>}
                    </AnimatePresence>
                  </div>
                </div>

                {/* BOTTOM SECTION: Full Width Advanced Telemetry */}
                {result && !loading && (
                  <div className="w-full flex flex-col items-center mt-4">
                    <button 
                      onClick={toggleAdvanced}
                      className="group flex items-center gap-3 px-8 py-3 bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 rounded-full transition-all shadow-lg"
                    >
                      <Activity size={18} className="text-emerald-500" />
                      <span className="font-semibold text-slate-300">View Advanced Telemetry</span>
                      {showAdvanced ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                    </button>

                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          ref={advancedRef}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="w-full overflow-hidden mt-8"
                        >
                          <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 shadow-2xl">
                            
                            <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
                              <BarChart3 className="text-emerald-500" size={24} />
                              <h3 className="text-2xl font-semibold text-slate-200 tracking-tight">Full Probability Distribution</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                              
                              {/* Left Panel: Binary Distribution */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Overall Binary Distribution</h4>
                                <div className="space-y-6">
                                  {/* Authentic Bar */}
                                  <div>
                                    <div className="flex justify-between items-end mb-2">
                                      <span className="text-lg font-medium text-slate-300">Authentic (Real)</span>
                                      <span className="text-2xl font-mono font-bold text-emerald-400">{realProb}%</span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800/50 overflow-hidden">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${realProb}%` }} transition={{ duration: 1 }} className="bg-emerald-500 h-full rounded-full" />
                                    </div>
                                  </div>
                                  
                                  {/* Manipulated Bar */}
                                  <div>
                                    <div className="flex justify-between items-end mb-2">
                                      <span className="text-lg font-medium text-slate-300">Manipulated (Fake)</span>
                                      <span className="text-2xl font-mono font-bold text-rose-400">{fakeProb}%</span>
                                    </div>
                                    <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800/50 overflow-hidden">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${fakeProb}%` }} transition={{ duration: 1 }} className="bg-rose-500 h-full rounded-full" />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right Panel: Class breakdown */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6">Multi-Class Breakdown (Softmax)</h4>
                                <div className="space-y-4">
                                  {Object.entries(classProbs).map(([className, probValue]) => {
                                    const probPercent = (probValue * 100).toFixed(2);
                                    // Highlight original/real differently than fake classes
                                    const isRealClass = className.toLowerCase() === 'original' || className.toLowerCase() === 'real';
                                    const barColor = isRealClass ? 'bg-emerald-500' : 'bg-rose-500';
                                    
                                    return (
                                      <div key={className} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                                        <div className="flex justify-between text-sm mb-2.5 items-center">
                                          <span className="text-slate-300 font-medium text-base">{className}</span>
                                          <span className="font-mono text-slate-400 font-semibold">{probPercent}%</span>
                                        </div>
                                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                          <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${probPercent}%` }} 
                                            transition={{ duration: 1, delay: 0.2 }}
                                            className={`h-full rounded-full ${barColor}`} 
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}