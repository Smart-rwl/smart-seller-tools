'use client';

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  Images, 
  UploadCloud, 
  Download, 
  FileImage, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  BookOpen,
  Info,
  Maximize,
  FileType,
  Cpu,
  Trash2
} from 'lucide-react';

// Amazon Standard Image Variants
const IMAGE_VARIANTS = [
  { code: 'MAIN', label: 'Main Image (White BG)' },
  { code: 'PT01', label: 'Part 1 (Side/Angle)' },
  { code: 'PT02', label: 'Part 2 (Lifestyle)' },
  { code: 'PT03', label: 'Part 3 (Interior)' },
  { code: 'PT04', label: 'Part 4 (Use Case)' },
  { code: 'PT05', label: 'Part 5 (Dimensions)' },
  { code: 'PT06', label: 'Part 6 (Packaging)' },
  { code: 'SWATCH', label: 'Color Swatch' },
];

export default function BulkAssetManager() {
  // --- STATE ---
  const [asins, setAsins] = useState<string>('');
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [suffix, setSuffix] = useState<string>('MAIN'); 
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Advanced Metrics
  const [imgDimensions, setImgDimensions] = useState<{w:number, h:number} | null>(null);
  const [isZoomCompliant, setIsZoomCompliant] = useState(true);
  const [uniqueCount, setUniqueCount] = useState(0);

  // --- ENGINE ---
  
  // 1. File Processor & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMasterFile(file);
      
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Check Dimensions for Amazon Zoom (1000px+)
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setImgDimensions({ w: img.width, h: img.height });
        if (img.width < 1000 && img.height < 1000) {
          setIsZoomCompliant(false);
        } else {
          setIsZoomCompliant(true);
        }
      };
    }
  };

  // 2. ASIN Parser
  useEffect(() => {
    const count = asins.split(/[\n,]+/).map(s => s.trim()).filter(s => s).length;
    // Simple deduplication check for display
    const unique = new Set(asins.split(/[\n,]+/).map(s => s.trim()).filter(s => s)).size;
    setUniqueCount(unique);
  }, [asins]);

  // 3. Generation Logic
  const handleGenerate = async () => {
    if (!masterFile) {
      setStatus('⚠ Please upload a Master Image first.');
      return;
    }
    if (!asins.trim()) {
      setStatus('⚠ Please enter at least one ASIN.');
      return;
    }

    setIsLoading(true);
    setStatus('Initializing compression engine...');

    try {
      const zip = new JSZip();
      
      // Parse & Clean ASINs
      const asinList = asins
        .split(/[\n,]+/) 
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const uniqueAsins = [...new Set(asinList)];

      setStatus(`Processing ${uniqueAsins.length} unique files...`);

      // Add to Zip
      // We reuse the single file binary to save memory
      const fileExt = masterFile.name.split('.').pop() || 'jpg';
      
      uniqueAsins.forEach((asin) => {
        // Remove accidental spaces inside ASIN
        const cleanAsin = asin.replace(/\s/g, '');
        // Amazon Naming: ASIN.VARIANT.ext
        const filename = `${cleanAsin}.${suffix}.${fileExt}`;
        zip.file(filename, masterFile);
      });

      // Generate
      setStatus('Zipping assets...');
      const content = await zip.generateAsync({ type: 'blob' });

      // Download
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(content, `amazon-assets-${suffix}-${timestamp}.zip`);

      setStatus(`✅ Success! ${uniqueAsins.length} images bundled.`);
    } catch (error) {
      console.error(error);
      setStatus('❌ Error: Failed to generate zip.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Images className="w-8 h-8 text-indigo-500" />
              Bulk Asset Command Center
            </h1>
            <p className="text-slate-400 mt-2">
              Mass-replicate product images for Amazon listing uploads.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
             <Layers className="w-4 h-4 text-emerald-500" />
             <span>Output: Optimized .zip</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Master Asset Upload */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                  <UploadCloud className="w-4 h-4 text-blue-400" /> Master Asset
               </h3>
               
               <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  masterFile ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-slate-700 bg-slate-950 hover:bg-slate-900 hover:border-slate-600'
               }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                     {previewUrl ? (
                        <div className="relative">
                           <img src={previewUrl} alt="Preview" className="h-32 object-contain rounded shadow-lg" />
                           {!isZoomCompliant && (
                              <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
                                 <AlertTriangle className="w-3 h-3" /> Low Res
                              </div>
                           )}
                        </div>
                     ) : (
                        <>
                           <FileImage className="w-10 h-10 mb-3 text-slate-500" />
                           <p className="text-sm text-slate-400"><span className="font-bold text-white">Click to upload</span> master file</p>
                           <p className="text-xs text-slate-600 mt-1">JPG or PNG (Max 10MB)</p>
                        </>
                     )}
                  </div>
                  <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={handleFileChange} />
               </label>

               {/* File Stats */}
               {masterFile && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                     <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                        <FileType className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-300 uppercase">{masterFile.name.split('.').pop()}</span>
                     </div>
                     <div className={`bg-slate-950 p-2 rounded border flex items-center gap-2 ${isZoomCompliant ? 'border-emerald-900/50 text-emerald-400' : 'border-red-900/50 text-red-400'}`}>
                        <Maximize className="w-3 h-3" />
                        <span>{imgDimensions ? `${imgDimensions.w} x ${imgDimensions.h}` : 'Loading...'}</span>
                     </div>
                  </div>
               )}
            </div>

            {/* 2. Naming Rules */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                  <Cpu className="w-4 h-4 text-purple-400" /> Configuration
               </h3>
               
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Image Slot (Variant)</label>
                  <select 
                     value={suffix}
                     onChange={(e) => setSuffix(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none"
                  >
                     {IMAGE_VARIANTS.map(v => (
                        <option key={v.code} value={v.code}>{v.label} ({v.code})</option>
                     ))}
                  </select>
               </div>
            </div>

          </div>

          {/* --- RIGHT: BATCH PROCESSOR (7 Cols) --- */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Input ASINs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-1 flex flex-col h-[400px]">
               <div className="p-3 border-b border-slate-800 bg-slate-950 rounded-t-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target ASINs</span>
                     {uniqueCount > 0 && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">{uniqueCount} Unique</span>}
                  </div>
                  <button onClick={() => setAsins('')} className="text-slate-500 hover:text-white transition">
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               <textarea 
                  value={asins}
                  onChange={e => setAsins(e.target.value)}
                  className="flex-1 w-full bg-slate-900 border-none p-4 text-sm font-mono text-slate-300 focus:ring-0 outline-none resize-none leading-relaxed placeholder-slate-700"
                  placeholder="Paste ASINs here (One per line)...&#10;B08XXXXXXX&#10;B09XXXXXXX&#10;B07XXXXXXX"
               />
               <div className="p-3 border-t border-slate-800 bg-slate-950 rounded-b-lg flex justify-between items-center">
                  <div className="text-xs text-slate-500">
                     Preview: <span className="text-slate-300 font-mono">{asins.split('\n')[0].substring(0,10) || 'ASIN'}</span>.{suffix}.{masterFile?.name.split('.').pop() || 'jpg'}
                  </div>
                  <button 
                     onClick={handleGenerate}
                     disabled={isLoading}
                     className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold text-white transition ${
                        isLoading ? 'bg-slate-700 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'
                     }`}
                  >
                     {isLoading ? 'Zipping...' : <>Generate & Download <Download className="w-4 h-4" /></>}
                  </button>
               </div>
            </div>

            {/* Status Output */}
            {status && (
               <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  status.includes('Success') ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400' : 
                  status.includes('Error') || status.includes('Please') ? 'bg-red-950/30 border-red-900 text-red-400' :
                  'bg-blue-950/30 border-blue-900 text-blue-400'
               }`}>
                  {status.includes('Success') ? <CheckCircle2 className="w-5 h-5" /> : 
                   status.includes('Error') || status.includes('Please') ? <AlertTriangle className="w-5 h-5" /> : 
                   <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                  <span className="text-sm font-medium">{status}</span>
               </div>
            )}

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Workflow Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">When to use?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Perfect for <b>Variation Listings</b>. 
                    <br/>
                    If you have 50 shirts (different sizes/colors) that all share the same "Sizing Chart" image (PT05), use this tool to clone that chart 50 times with the correct ASIN names in seconds.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-purple-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Layers className="w-5 h-5 text-purple-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Naming Standard</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Amazon requires: <code>ASIN.VARIANT.jpg</code>.
                    <br/>
                    Example: <code>B081234567.MAIN.jpg</code> or <code>B081234567.PT01.jpg</code>.
                    <br/>
                    We automate this so you don't have to rename files manually.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <UploadCloud className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Bulk Upload</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    
                    <br/>
                    Once you download the ZIP, extract it. Go to <b>Catalog &gt; Upload Images &gt; Bulk Image Upload</b> in Seller Central and drag-and-drop your files.
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