'use client';

import React, { useState, useRef, useEffect } from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  Printer, 
  Download, 
  Settings, 
  Barcode as BarcodeIcon, 
  Copy, 
  CheckCircle2, 
  BookOpen, 
  Info, 
  Package, 
  Layers,
  Move,
  FileText,
  AlertOctagon,
  CalendarClock,
  Factory
} from 'lucide-react';

// FIX: We will import html2canvas and jsPDF dynamically inside the function
// import html2canvas from 'html2canvas'; 
// import jsPDF from 'jspdf';

export default function AdvancedBarcodeGenerator() {
  // --- STATE: DATA ---
  const [value, setValue] = useState('X001234567'); 
  const [title, setTitle] = useState('Wireless Headphones - Noise Cancelling - Black'); 
  const [condition, setCondition] = useState('New'); 
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierCode, setSupplierCode] = useState('FAC-A1');

  const [batchNumber, setBatchNumber] = useState('BATCH-2024-Q1');
  const [manufactureDate, setManufactureDate] = useState('2024-01-15');
  const [countryOfOrigin, setCountryOfOrigin] = useState('CN');
  const [weight, setWeight] = useState('250');
  const [dimensions, setDimensions] = useState({ length: '15', width: '10', height: '5' });

  // --- STATE: CONFIG ---
  const [format, setFormat] = useState('CODE128');
  const [width, setWidth] = useState(1.5);
  const [height, setHeight] = useState(50);
  const [fontSize, setFontSize] = useState(11);
  const [showText, setShowText] = useState(true);
  
  // --- STATE: LAYOUT & PRINT ---
  const [quantity, setQuantity] = useState(30); 
  const [layoutMode, setLayoutMode] = useState<'single' | 'sheet'>('sheet');
  const [pageSize, setPageSize] = useState<'a4' | 'a5' | 'letter'>('a4');
  const [gridConfig, setGridConfig] = useState({ cols: 3, rows: 10 });
  const [marginTop, setMarginTop] = useState(10);
  const [marginLeft, setMarginLeft] = useState(5);
  const [gapX, setGapX] = useState(5);

  const [useQRCode, setUseQRCode] = useState(false);
  const [qrData, setQrData] = useState('https://www.amazon.com/dp/B08N5WRWNW');
  const [batchSKUs, setBatchSKUs] = useState([
    { id: 1, value: 'X001234567', title: 'Wireless Headphones', quantity: 10 },
    { id: 2, value: 'X002345678', title: 'USB-C Cable', quantity: 20 }
  ]);

  const [template, setTemplate] = useState('standard');
  const labelTemplates = {
    standard: { name: 'Standard FBA', settings: { format: 'CODE128', width: 1.5, height: 50, fontSize: 11 } },
    small: { name: 'Small Item', settings: { format: 'CODE128', width: 1, height: 30, fontSize: 9 } },
    clothing: { name: 'Clothing Tag', settings: { format: 'CODE128', width: 1.2, height: 40, fontSize: 10 } },
  };

  const [amazonCategory, setAmazonCategory] = useState('electronics');
  const [categoryWarnings, setCategoryWarnings] = useState<string[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<string[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState('');

  const barcodeRef = useRef<HTMLDivElement>(null);

  const isAsin = value.startsWith('B0');

  useEffect(() => {
    const issues = [];
    if (amazonCategory === 'supplements' && !expiryDate) {
      issues.push('Supplements require an expiry date.');
    }
    if (amazonCategory === 'electronics' && !batchNumber) {
      issues.push('Electronics should include a batch/lot number for warranty tracking.');
    }
    setCategoryWarnings(issues);
  }, [amazonCategory, expiryDate, batchNumber]);

  // --- ACTIONS ---

  const handlePrint = () => {
    const sizeMap = { a4: '210mm 297mm', a5: '148mm 210mm', letter: '8.5in 11in' };
    const win = window.open('', '', 'height=900,width=800');
    if (!win) return;

    win.document.write('<html><head><title>FBA Print Job</title>');
    win.document.write(`
      <style>
        @page { size: ${sizeMap[pageSize]}; margin: 0; }
        body { margin: 0; padding: 0; font-family: sans-serif; }
        .print-container { padding-top: ${marginTop}mm; padding-left: ${marginLeft}mm; width: 100%; box-sizing: border-box; }
        .label-grid { display: grid; grid-template-columns: repeat(${gridConfig.cols}, 1fr); column-gap: ${gapX}mm; row-gap: 5mm; }
        .label-item { border: 1px dashed #ccc; padding: 5px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 140px; page-break-inside: avoid; }
        .label-title { font-size: 10px; margin-bottom: 2px; max-width: 95%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
        .label-meta { font-size: 9px; font-weight: bold; margin-top: 2px; }
        .label-supplier { font-size: 8px; color: #666; margin-top: 2px; }
        .label-expiry { font-size: 10px; font-weight: bold; margin-top: 2px; }
        @media print { .label-item { border: none; } }
      </style>
    `);
    win.document.write('</head><body><div class="print-container"><div class="label-grid">');

    let labelHtml = '';
    for (const sku of batchSKUs) {
      if (sku.quantity <= 0) continue;
      for (let i = 0; i < sku.quantity; i++) {
        labelHtml += `
          <div class="label-item">
            <div class="label-title">${sku.title}</div>
            <svg class="barcode" value="${sku.value}" format="CODE128" width="1.2" height="40" fontoptions="font-size: 11px"></svg>
            <div class="label-meta">${condition}</div>
            ${supplierCode ? `<div class="label-supplier">${supplierCode}</div>` : ''}
          </div>
        `;
      }
    }
    win.document.write(labelHtml);
    
    win.document.write('</div></div></body></html>');
    win.document.close();

    win.onload = () => {
      // @ts-ignore
      JsBarcode(".barcode").init();
      setTimeout(() => win.print(), 500);
    };
  };

  const handleDownloadSVG = () => {
    const svg = barcodeRef.current?.querySelector('svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${value}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // FIX: Use dynamic import for html2canvas to avoid server-side errors
  const handleDownloadPNG = async () => {
    const element = barcodeRef.current;
    if (!element) return;

    // Dynamically import html2canvas
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element);
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${value}.png`;
    link.href = dataURL;
    link.click();
  };

    // FIX: Use a more robust dynamic import for jsPDF
  const handleDownloadPDF = async () => {
    const element = barcodeRef.current;
    if (!element) return;

    try {
      // Dynamically import both libraries
      const html2canvas = (await import('html2canvas')).default;
      // Use destructuring to get the jsPDF constructor
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'landscape', // Optional: good for wide barcodes
        unit: 'px', // Use pixels for consistency with canvas
        format: [canvas.width, canvas.height] // Optional: match PDF size to canvas
      });

      // --- DEBUGGING STEP ---
      // Check your browser's developer console (F12).
      // It should log the jsPDF object and show that it has the 'addImage' function.
      console.log('jsPDF object:', pdf); 
      // --------------------

      // Add the image to the PDF
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${value}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Could not generate PDF. See console for details.");
    }
  };

  const checkCompliance = () => {
    const issues = [];
    if (!value.startsWith('X0')) issues.push('FNSKU should start with "X0" to avoid commingling.');
    if (title.length > 80) issues.push('Title exceeds Amazon\'s 80 character limit.');
    if (width < 1 || width > 2) issues.push('Barcode width should be between 1.0 and 2.0 for optimal scanning.');
    if (fontSize < 10) issues.push('Font size should be at least 10pt for readability.');
    setComplianceIssues(issues);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarcodeIcon className="w-8 h-8 text-indigo-500" />
              Next-Gen FBA Label Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Strategic inventory tagging with Paper Sizing, Margin Control, Batch Printing, and Compliance Checks.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
             <button onClick={handleDownloadSVG} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm border border-slate-700 transition">
                <Download className="w-4 h-4" /> SVG
             </button>
             <button onClick={handleDownloadPNG} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm border border-slate-700 transition">
                <Download className="w-4 h-4" /> PNG
             </button>
             <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm border border-slate-700 transition">
                <Download className="w-4 h-4" /> PDF
             </button>
             <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-indigo-900/20">
                <Printer className="w-4 h-4" /> Print Batch
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIGURATION (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Smart Data Input */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Settings className="w-4 h-4 text-indigo-400" /> Smart Data
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">FNSKU / SKU</label>
                     <div className="relative">
                        <input type="text" value={value} onChange={e => setValue(e.target.value)} className={`w-full bg-slate-950 border rounded p-2 text-white font-mono focus:outline-none ${isAsin ? 'border-red-500' : 'border-slate-700 focus:border-indigo-500'}`} />
                        {value.startsWith('X0') && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />}
                     </div>
                     {isAsin && (<div className="flex items-center gap-2 mt-2 text-[10px] text-red-400 bg-red-900/20 p-2 rounded"><AlertOctagon className="w-3 h-3" /><span><b>Warning:</b> Using ASIN (B0...) risks commingling. Use FNSKU (X0...).</span></div>)}
                  </div>
                  
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Title</label>
                     <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Condition</label><select value={condition} onChange={e => setCondition(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none"><option value="New">New</option><option value="Used">Used</option></select></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Expiry (Opt)</label><input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none" /></div>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><Factory className="w-3 h-3" /> Supplier Code</label>
                     <input type="text" value={supplierCode} onChange={e => setSupplierCode(e.target.value)} placeholder="e.g. FAC-A1" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Batch/Lot</label><input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" /></div>
                      <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">MFG Date</label><input type="date" value={manufactureDate} onChange={e => setManufactureDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" /></div>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Country of Origin</label><select value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"><option value="CN">China</option><option value="US">United States</option><option value="VN">Vietnam</option></select></div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amazon Category</label>
                    <select value={amazonCategory} onChange={e => setAmazonCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm">
                        <option value="electronics">Electronics</option><option value="supplements">Supplements</option><option value="clothing">Clothing</option>
                    </select>
                    {categoryWarnings.length > 0 && (<div className="mt-2 p-2 bg-amber-900/20 border border-amber-500/30 rounded text-xs text-amber-400">{categoryWarnings.map((w,i)=> <div key={i} className="flex items-start gap-2"><AlertOctagon className="w-3 h-3 mt-0.5" /><span>{w}</span></div>)}</div>)}
                  </div>

                  <div className="flex items-center gap-2"><input type="checkbox" id="useQRCode" checked={useQRCode} onChange={e => setUseQRCode(e.target.checked)} className="rounded" /><label htmlFor="useQRCode" className="text-sm text-slate-300">Use QR Code</label></div>
                  {useQRCode && (<div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">QR Code Data</label><textarea value={qrData} onChange={e => setQrData(e.target.value)} placeholder="URL or text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm h-20" /></div>)}
                  
                  <div className="border-t border-slate-800 pt-4">
                    <button onClick={checkCompliance} className="w-full py-2 bg-blue-600/20 border border-blue-500/30 rounded text-sm text-blue-400 hover:bg-blue-600/30 transition">Check Amazon Compliance</button>
                    {complianceIssues.length > 0 && (<div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400"><div className="font-bold mb-1">Issues:</div>{complianceIssues.map((issue,i)=> <div key={i} className="flex items-start gap-2 mt-1"><AlertOctagon className="w-3 h-3 mt-0.5" /><span>{issue}</span></div>)}</div>)}
                    {complianceIssues.length === 0 && amazonCategory && (<div className="mt-2 p-2 bg-emerald-900/20 border border-emerald-500/30 rounded text-xs text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /><span>No compliance issues detected</span></div>)}
                  </div>
               </div>
            </div>

            {/* 2. Paper & Layout Engineering */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Move className="w-4 h-4 text-emerald-400" /> Paper Engineering
               </h3>
               
               <div className="space-y-4">
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Paper Size</label><div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">{['a4', 'a5', 'letter'].map((size) => (<button key={size} onClick={() => setPageSize(size as any)} className={`flex-1 py-1.5 text-xs font-medium rounded uppercase ${pageSize === size ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>{size}</button>))}</div></div>

                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Label Template</label><div className="grid grid-cols-2 gap-2">{Object.entries(labelTemplates).map(([key, tmpl]) => (<button key={key} onClick={() => { setTemplate(key); setFormat(tmpl.settings.format as any); setWidth(tmpl.settings.width); setHeight(tmpl.settings.height); setFontSize(tmpl.settings.fontSize); }} className={`py-2 text-xs font-medium rounded border ${template === key ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-700 text-slate-400'}`}>{tmpl.name}</button>))}</div></div>

                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Grid Layout</label><div className="flex gap-2"><button onClick={() => { setGridConfig({ cols: 3, rows: 10 }); setQuantity(30); }} className={`flex-1 py-2 text-xs font-medium rounded border ${gridConfig.cols === 3 ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-700 text-slate-400'}`}>3 x 10 (30-up)</button><button onClick={() => { setGridConfig({ cols: 4, rows: 5 }); setQuantity(20); }} className={`flex-1 py-2 text-xs font-medium rounded border ${gridConfig.cols === 4 ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-700 text-slate-400'}`}>4 x 5 (20-up)</button></div></div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800"><div><label className="text-[10px] text-slate-500 block mb-1">Top (mm)</label><input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-center text-sm" /></div><div><label className="text-[10px] text-slate-500 block mb-1">Left (mm)</label><input type="number" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-center text-sm" /></div><div><label className="text-[10px] text-slate-500 block mb-1">Gap X (mm)</label><input type="number" value={gapX} onChange={e => setGapX(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-white text-center text-sm" /></div></div>
               </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4"><Layers className="w-4 h-4 text-purple-400" /> Batch Printing</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {batchSKUs.map((sku) => (<div key={sku.id} className="flex items-center gap-2 bg-slate-950 p-2 rounded"><input type="checkbox" checked={sku.quantity > 0} onChange={(e) => { const updated = batchSKUs.map(s => s.id === sku.id ? {...s, quantity: e.target.checked ? 10 : 0} : s); setBatchSKUs(updated); }} className="rounded" /><input type="text" value={sku.value} onChange={(e) => { const updated = batchSKUs.map(s => s.id === sku.id ? {...s, value: e.target.value} : s); setBatchSKUs(updated); }} className="flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" /><input type="text" value={sku.title} onChange={(e) => { const updated = batchSKUs.map(s => s.id === sku.id ? {...s, title: e.target.value} : s); setBatchSKUs(updated); }} className="flex-2 bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs" /><input type="number" value={sku.quantity} onChange={(e) => { const updated = batchSKUs.map(s => s.id === sku.id ? {...s, quantity: parseInt(e.target.value) || 0} : s); setBatchSKUs(updated); }} className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs text-center" /></div>))}
              </div>
              <button onClick={() => setBatchSKUs([...batchSKUs, { id: Date.now(), value: '', title: '', quantity: 0 }])} className="mt-2 w-full py-1 bg-purple-600/20 border border-purple-500/30 rounded text-xs text-purple-400 hover:bg-purple-600/30 transition">Add SKU</button>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4"><CheckCircle2 className="w-4 h-4 text-green-400" /> Label Verification</h3>
              <button onClick={() => setShowScanner(!showScanner)} className="w-full py-2 bg-green-600/20 border border-green-500/30 rounded text-sm text-green-400 hover:bg-green-600/30 transition">{showScanner ? 'Hide Scanner' : 'Scan Barcode to Verify'}</button>
              {showScanner && (
                <div className="mt-4">
                  {/* FIX: Removed the 'components' prop to resolve the 'audio' error */}
                  <Scanner 
                    onScan={(result) => { 
                      setScanResult(result[0].rawValue); 
                      setShowScanner(false); 
                    }} 
                  />
                </div>
              )}
              {scanResult && (<div className="mt-4 p-2 bg-slate-950 rounded text-sm"><div className="text-slate-400">Scanned Value:</div><div className="text-white font-mono">{scanResult}</div><div className="mt-2 text-xs">{scanResult === value ? (<span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Match! Barcode is correct.</span>) : (<span className="text-red-400 flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Mismatch! Check your label.</span>)}</div></div>)}
            </div>

          </div>

          {/* --- RIGHT: LIVE PREVIEW (8 Cols) --- */}
          <div className="lg:col-span-8">
            <div className="bg-slate-200 rounded-xl border-4 border-slate-800 p-8 min-h-[600px] flex justify-center overflow-auto shadow-inner relative">
               <div className="bg-white shadow-2xl relative transition-all duration-300" style={{ width: pageSize === 'a4' ? '210mm' : pageSize === 'a5' ? '148mm' : '215.9mm', minHeight: pageSize === 'a4' ? '297mm' : pageSize === 'a5' ? '210mm' : '279.4mm', paddingTop: `${marginTop}mm`, paddingLeft: `${marginLeft}mm`, boxSizing: 'border-box' }}>
                   <div className="absolute top-0 left-0 w-full border-b border-blue-400/30 text-[8px] text-blue-400" style={{ height: `${marginTop}mm` }}></div>
                   <div className="absolute top-0 left-0 h-full border-r border-blue-400/30" style={{ width: `${marginLeft}mm` }}></div>
                   <div id="printable-area" ref={barcodeRef}>
                       <div className="grid" style={{ gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`, columnGap: `${gapX}mm`, rowGap: '5mm' }}>
                           {Array.from({ length: quantity }).map((_, i) => (
                               <div key={i} className="border border-dashed border-gray-300 p-2 flex flex-col items-center justify-center text-center h-[140px] relative overflow-hidden">
                                   {title && <div className="text-black text-[10px] font-sans mb-1 w-full overflow-hidden text-ellipsis whitespace-nowrap">{title}</div>}
                                   {useQRCode ? <QRCode value={qrData || value} size={80} /> : <Barcode value={value} format={format as any} width={1.2} height={40} fontSize={11} displayValue={showText} margin={0} />}
                                   <div className="flex justify-between w-full px-1 mt-1">{condition && <span className="text-black text-[9px] font-bold uppercase">{condition}</span>}{expiryDate && <span className="text-black text-[9px] font-bold">{expiryDate}</span>}</div>
                                   {batchNumber && <div className="text-gray-400 text-[7px] mt-0.5">LOT: {batchNumber}</div>}
                                   {supplierCode && <div className="text-gray-400 text-[7px]">{supplierCode}</div>}
                               </div>
                           ))}
                       </div>
                   </div>
               </div>
            </div>
            <div className="flex justify-center mt-4 gap-6"><div className="flex items-center gap-2 text-xs text-slate-500"><FileText className="w-3 h-3" />Preview: {pageSize.toUpperCase()} Paper</div><div className="flex items-center gap-2 text-xs text-slate-500"><Move className="w-3 h-3" />Margins Active</div></div>
          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><BookOpen className="w-6 h-6 text-indigo-500" />FBA Labelling Strategy</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4"><Package className="w-5 h-5 text-indigo-400" /></div><h3 className="font-bold text-white mb-2">The Commingling Trap</h3><p className="text-sm text-slate-400 leading-relaxed"><b>Never use ASIN (B0...) on labels.</b> Amazon treats ASIN inventory as "identical". If a hijacker sends fakes, Amazon might ship their fake item to your customer. Always use FNSKU (X0...).</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4"><Factory className="w-5 h-5 text-emerald-400" /></div><h3 className="font-bold text-white mb-2">Supplier & Batch Codes</h3><p className="text-sm text-slate-400 leading-relaxed">Use "Supplier Code" and "Batch/Lot" fields to track inventory sources. If a customer complains about quality, you can identify the exact factory or batch that failed.</p></div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><div className="bg-purple-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4"><Layers className="w-5 h-5 text-purple-400" /></div><h3 className="font-bold text-white mb-2">Batch Printing Power</h3><p className="text-sm text-slate-400 leading-relaxed">Instead of one-at-a-time, add multiple SKUs and quantities to the "Batch Printing" list. Click "Print Batch" to generate a single, correctly formatted sheet with all your labels.</p></div>
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