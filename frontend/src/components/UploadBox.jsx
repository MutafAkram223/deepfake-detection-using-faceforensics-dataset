"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

export default function UploadBox({ onUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please upload a valid video file.");
      return;
    }

    console.log("Uploading:", file.name);
    onUpload(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    onUpload(file);
    e.target.value = ""; // Reset input
  };

  return (
    <div 
      className={`relative w-full max-w-2xl mx-auto p-12 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer backdrop-blur-sm
        ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/80'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
        ref={fileInputRef}
      />
      
      <div className={`p-5 rounded-full mb-6 transition-colors duration-300 ${isDragging ? 'bg-emerald-500/20' : 'bg-slate-800/80 shadow-inner'}`}>
        <UploadCloud size={44} className={isDragging ? 'text-emerald-400' : 'text-emerald-500/80'} strokeWidth={1.5} />
      </div>
      
      <h3 className="text-2xl font-semibold mb-2 text-slate-200 tracking-tight">
        Drag & Drop Media
      </h3>
      <p className="text-slate-400 mb-8 text-center max-w-md text-sm leading-relaxed">
        Upload your video file for forensic analysis. Our engine extracts frames and processes them against the TCNSC architecture.
      </p>
      
      <button className="px-6 py-2.5 bg-slate-800 text-slate-200 font-medium rounded-full hover:bg-slate-700 transition-colors border border-slate-700 hover:border-slate-600 shadow-sm">
        Browse Files
      </button>
    </div>
  );
}