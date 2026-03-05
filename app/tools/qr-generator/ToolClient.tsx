'use client';

import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  QrCode, 
  Download, 
  Image as ImageIcon, 
  Link, 
  Settings, 
  Palette,
  Share2,
  BookOpen,
  MousePointerClick
} from 'lucide-react';

export default function SmartQRArchitect() {
  // --- STATE ---
  const [url, setUrl] = useState('https://smart-seller-tools.vercel.app/');
  const [size, setSize] = useState(300);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  
  // Advanced Features
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoSize, setLogoSize] = useState(20); // % of QR size
  const [includeUtm, setIncludeUtm] = useState(false);
  const [utmSource, setUtmSource] = useState('product_insert');

  const qrRef = useRef<HTMLDivElement>(null);

  // --- ENGINE ---
  const getFinalUrl = () => {
    if (!includeUtm || !url.startsWith('http')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}utm_source=${utmSource}&utm_medium=qr_code`;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setLogoUrl(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const downloadQr = (format: 'png' | 'jpeg') => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const image = canvas.toDataURL(`image/${format}`);
      const link = document.createElement('a');
      link.href = image;
      link.download = `smart-qr-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <QrCode className="w-8 h-8 text-indigo-500" />
              Smart QR Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Create branded, trackable QR codes for packaging & marketing.
            </p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => downloadQr('jpeg')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm border border-slate-700 transition"
             >
                <Download className="w-4 h-4" /> JPG
             </button>
             <button 
                onClick={() => downloadQr('png')}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-indigo-900/20"
             >
                <Download className="w-4 h-4" /> PNG
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Destination */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                  <Link className="w-4 h-4 text-blue-400" /> Destination
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Target URL</label>
                     <input 
                        type="text" 
                        value={url} 
                        onChange={e => setUrl(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-blue-500 outline-none"
                        placeholder="https://..."
                     />
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                     <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" checked={includeUtm} onChange={e => setIncludeUtm(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-blue-500" />
                        <span className="text-sm font-bold text-slate-300">Add Tracking (UTM)</span>
                     </label>
                     {includeUtm && (
                        <div className="pl-6">
                           <label className="text-[10px] text-slate-500 uppercase mb-1 block">Campaign Source</label>
                           <input 
                              type="text" 
                              value={utmSource} 
                              onChange={e => setUtmSource(e.target.value)} 
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                           />
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* 2. Design */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                  <Palette className="w-4 h-4 text-purple-400" /> Appearance
               </h3>
               
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foreground</label>
                        <div className="flex gap-2">
                           <input type="color" value={fgColor} onChange={e => setFgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                           <input type="text" value={fgColor} onChange={e => setFgColor(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono" />
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Background</label>
                        <div className="flex gap-2">
                           <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" />
                           <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono" />
                        </div>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                     <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex justify-between">
                        <span>Resolution</span>
                        <span>{size}px</span>
                     </label>
                     <input type="range" min="200" max="1000" step="50" value={size} onChange={e => setSize(Number(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
               </div>
            </div>

            {/* 3. Branding */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                  <ImageIcon className="w-4 h-4 text-emerald-400" /> Logo Embed
               </h3>
               
               <div className="space-y-4">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700" />
                  
                  {logoUrl && (
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex justify-between">
                           <span>Logo Size</span>
                           <span>{logoSize}%</span>
                        </label>
                        <input type="range" min="10" max="30" value={logoSize} onChange={e => setLogoSize(Number(e.target.value))} className="w-full accent-emerald-500" />
                        <p className="text-[10px] text-slate-500 mt-1">Keep under 30% to ensure scannability.</p>
                     </div>
                  )}
               </div>
            </div>

          </div>

          {/* --- RIGHT: PREVIEW (7 Cols) --- */}
          <div className="lg:col-span-7 flex flex-col justify-center items-center bg-slate-900/50 rounded-xl border border-slate-800 min-h-[500px] relative p-8">
             
             {/* The QR Code Canvas */}
             <div 
                ref={qrRef} 
                className="bg-white p-4 shadow-2xl rounded-lg"
                style={{ backgroundColor: bgColor }} // Match container to QR bg for clean look
             >
                <QRCodeCanvas
                   value={getFinalUrl()}
                   size={size}
                   fgColor={fgColor}
                   bgColor={bgColor}
                   level="H" // High error correction for logo support
                   imageSettings={logoUrl ? {
                      src: logoUrl,
                      height: size * (logoSize / 100),
                      width: size * (logoSize / 100),
                      excavate: true, // Digs a hole for the logo
                   } : undefined}
                />
             </div>

             <div className="mt-8 text-center max-w-md">
                <p className="text-sm font-mono text-indigo-300 break-all bg-indigo-900/20 p-2 rounded border border-indigo-900/50">
                   {getFinalUrl()}
                </p>
                <div className="flex gap-4 justify-center mt-4 text-xs text-slate-500">
                   <span className="flex items-center gap-1"><Settings className="w-3 h-3" /> Level H Correction</span>
                   <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> Trackable</span>
                </div>
             </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Usage Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <MousePointerClick className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Why use UTM?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    By enabling tracking, your URL becomes: <code>site.com?utm_source=qr</code>.
                    <br/>
                    This lets you see exactly how many people scanned your packaging in Google Analytics.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Logo Safety</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    We use <b>Level H (High)</b> error correction. This means 30% of the code can be covered by a logo or damaged, and it will still scan perfectly.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-purple-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Settings className="w-5 h-5 text-purple-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Print Resolution</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Always download at <b>1000px</b> or higher for print materials (Inserts, Boxes). For digital use (Email, Web), 300px is sufficient.
                 </p>
              </div>

           </div>
        </div>

{/* --- CREATOR FOOTER START --- */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            {/* Instagram Icon */}
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-pink-500 transition-colors"
              title="Instagram"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>

            {/* GitHub Icon */}
            <a
              href="https://github.com/Smart-rwl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white transition-colors"
              title="GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
        {/* --- CREATOR FOOTER END --- */}
      </div>
    </div>
  );
}