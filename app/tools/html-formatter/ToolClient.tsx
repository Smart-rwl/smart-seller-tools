'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Smartphone, 
  Monitor, 
  Bold, 
  List, 
  Eraser, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  FileCode,
  BookOpen,
  Info
} from 'lucide-react';

const ALLOWED_TAGS = ['<b>', '</b>', '<br>', '<br/>', '<p>', '</p>', '<ul>', '</ul>', '<li>', '</li>'];

export default function AmazonHtmlEditor() {
  // --- STATE ---
  const [rawText, setRawText] = useState<string>('');
  const [htmlOutput, setHtmlOutput] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [validationMsg, setValidationMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- ACTIONS ---

  // 1. Text Transformation Logic
  const processText = (text: string) => {
    setRawText(text);
    
    // Auto-convert line breaks to <br> for the HTML output view
    // But we keep the raw text clean for editing
    let processed = text
      .replace(/\n/g, '<br>\n')
      .replace(/\*(.*?)\*/g, '<b>$1</b>');
      
    setHtmlOutput(processed);
    validateHtml(processed);
  };

  // 2. Insert Formatting at Cursor
  const insertTag = (tagStart: string, tagEnd: string = '') => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = rawText;
    
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = before + tagStart + selection + tagEnd + after;
    
    setRawText(newText);
    processText(newText);
    
    // Restore focus
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + tagStart.length, end + tagStart.length);
    }, 0);
  };

  // 3. Validation Logic (Amazon Compliance)
  const validateHtml = (html: string) => {
    // Check for banned tags (script, iframe, style, a href, img)
    const bannedPatterns = [/<script/i, /<iframe/i, /<style/i, /<a\s/i, /<img/i, /<h[1-6]/i, /<div/i, /<span/i];
    const foundBanned = bannedPatterns.find(p => p.test(html));

    if (foundBanned) {
      setValidationMsg({ type: 'error', text: 'Warning: Contains forbidden HTML tags (like scripts, links, or headers) which Amazon bans.' });
    } else {
      setValidationMsg(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlOutput);
    setValidationMsg({ type: 'success', text: 'HTML copied to clipboard!' });
    setTimeout(() => setValidationMsg(null), 3000);
  };

  const handleClean = () => {
    // Remove extra whitespace
    const cleaned = rawText.replace(/\s+/g, ' ').trim();
    processText(cleaned);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Code2 className="w-8 h-8 text-indigo-500" />
              Amazon HTML Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Write compliant product descriptions with live preview and validation.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
             <span>Amazon Compliant Output</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          
          {/* --- LEFT: EDITOR --- */}
          <div className="flex flex-col h-full space-y-4">
            
            {/* Toolbar */}
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl flex gap-2">
               <button onClick={() => insertTag('<b>', '</b>')} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition" title="Bold">
                  <Bold className="w-4 h-4" />
               </button>
               <button onClick={() => insertTag('<ul>\n<li>', '</li>\n</ul>')} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition" title="List">
                  <List className="w-4 h-4" />
               </button>
               <button onClick={() => insertTag('<br>\n')} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition text-xs font-mono font-bold">
                  BR
               </button>
               <div className="w-px bg-slate-800 mx-1"></div>
               <button onClick={handleClean} className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition" title="Clean Spacing">
                  <Eraser className="w-4 h-4" />
               </button>
            </div>

            {/* Input Area */}
            <div className="flex-1 relative">
               <textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={(e) => processText(e.target.value)}
                  className="w-full h-[500px] bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                  placeholder="Start typing your product description here...&#10;&#10;Use the toolbar above to add bold text or lists."
               />
               <div className="absolute bottom-4 right-4 text-xs text-slate-600">
                  {rawText.length} chars
               </div>
            </div>

            {/* HTML Output (Read Only) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
               <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Generated HTML Code</span>
                  <button onClick={handleCopy} className="flex items-center gap-1 hover:text-white transition">
                     <Copy className="w-3 h-3" /> Copy
                  </button>
               </div>
               <pre className="text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-32 scrollbar-thin">
                  {htmlOutput || '<HTML code will appear here>'}
               </pre>
            </div>
          </div>

          {/* --- RIGHT: PREVIEW & VALIDATION --- */}
          <div className="flex flex-col h-full space-y-6">
            
            {/* Validation Message */}
            {validationMsg && (
               <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  validationMsg.type === 'error' ? 'bg-red-950/30 border-red-900 text-red-200' : 'bg-emerald-950/30 border-emerald-900 text-emerald-200'
               }`}>
                  {validationMsg.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  <p className="text-sm">{validationMsg.text}</p>
               </div>
            )}

            {/* Preview Window */}
            <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
               {/* Browser Header */}
               <div className="bg-slate-100 border-b border-slate-200 p-3 flex justify-between items-center">
                  <div className="flex gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-red-400"></div>
                     <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                     <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex bg-slate-200 rounded-lg p-1 gap-1">
                     <button 
                        onClick={() => setPreviewMode('desktop')}
                        className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        <Monitor className="w-4 h-4" />
                     </button>
                     <button 
                        onClick={() => setPreviewMode('mobile')}
                        className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        <Smartphone className="w-4 h-4" />
                     </button>
                  </div>
               </div>

               {/* Simulated Amazon Page */}
               <div className="flex-1 overflow-y-auto bg-white">
                  <div className={`mx-auto transition-all duration-300 ${previewMode === 'mobile' ? 'max-w-[375px] border-x border-slate-200 min-h-full' : 'w-full'}`}>
                     
                     {/* Fake Amazon Header */}
                     <div className="border-b border-slate-100 p-4 mb-4">
                        <div className="h-4 w-24 bg-slate-200 rounded mb-2"></div>
                        <div className="h-8 w-3/4 bg-slate-100 rounded"></div>
                     </div>

                     <div className="p-6">
                        <h3 className="text-[#c45500] font-bold text-lg mb-4 border-b border-slate-100 pb-2">Product Description</h3>
                        
                        {/* THE RENDERED CONTENT */}
                        <div 
                           className="prose prose-sm max-w-none text-[#333333] leading-relaxed font-sans amazon-preview"
                           dangerouslySetInnerHTML={{ __html: htmlOutput }}
                        />
                        
                        {!htmlOutput && (
                           <p className="text-slate-300 italic text-center py-10">Preview area...</p>
                        )}
                     </div>

                  </div>
               </div>
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              HTML Compliance Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Allowed Tags</h3>
                 <p className="text-sm text-slate-400 leading-relaxed font-mono">
                    &lt;b&gt;, &lt;br&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;
                 </p>
                 <p className="text-xs text-slate-500 mt-2">
                    Amazon allows very basic formatting. Anything else is stripped or causes errors.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-red-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Forbidden Tags</h3>
                 <p className="text-sm text-slate-400 leading-relaxed font-mono">
                    &lt;h1&gt;, &lt;img&gt;, &lt;a href&gt;, &lt;iframe&gt;
                 </p>
                 <p className="text-xs text-slate-500 mt-2">
                    Never use headings or links. Amazon wants the user to stay on the page.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Mobile Optimization</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Over 70% of shoppers are on mobile. Large blocks of text look terrible on small screens. 
                    <br/>
                    <b>Tip:</b> Use short paragraphs (2-3 lines max) and bullet points.
                 </p>
              </div>

           </div>
        </div>

      </div>
      
      {/* Custom Styles for Preview */}
      <style jsx global>{`
        .amazon-preview b { font-weight: 700; color: #111; }
        .amazon-preview ul { list-style-type: disc; padding-left: 20px; margin-bottom: 10px; }
        .amazon-preview p { margin-bottom: 10px; }
        .amazon-preview br { content: ""; display: block; margin-bottom: 10px; }
      `}</style>

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
  );
}