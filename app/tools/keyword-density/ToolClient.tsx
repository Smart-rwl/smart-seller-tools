'use client';

import React, { useState } from 'react';

export default function KeywordDensity() {
  const [text, setText] = useState('');
  const [singleWords, setSingleWords] = useState<any[]>([]);
  const [doubleWords, setDoubleWords] = useState<any[]>([]);
  const [totalWordCount, setTotalWordCount] = useState(0);

  // Common stop words to ignore (add more as needed)
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'as', 'into', 'like',
    'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without',
    'before', 'under', 'around', 'among', 'this', 'that', 'these', 'those', 'it', 'its',
    'they', 'their', 'them', 'we', 'our', 'us', 'you', 'your', 'my', 'mine', 'me',
    'he', 'him', 'his', 'she', 'her', 'hers', 'which', 'who', 'whom', 'whose',
    'what', 'where', 'when', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
  ]);

  const analyzeText = () => {
    if (!text.trim()) return;

    // 1. Clean Text: Lowercase, remove special chars, extra spaces
    const cleanText = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Collapse spaces
      .trim();

    const words = cleanText.split(' ');
    setTotalWordCount(words.length);

    // 2. Count Single Words
    const singleMap: Record<string, number> = {};
    words.forEach(word => {
      if (!STOP_WORDS.has(word) && word.length > 2) { // Ignore short words
        singleMap[word] = (singleMap[word] || 0) + 1;
      }
    });

    // 3. Count 2-Word Phrases (Bi-grams)
    const doubleMap: Record<string, number> = {};
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      // Basic check: Don't count if both are stop words (e.g. "in the")
      if (!STOP_WORDS.has(words[i]) || !STOP_WORDS.has(words[i + 1])) {
         doubleMap[phrase] = (doubleMap[phrase] || 0) + 1;
      }
    }

    // 4. Sort and Top 10
    const sortedSingle = Object.entries(singleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count, density: ((count / words.length) * 100).toFixed(1) }));

    const sortedDouble = Object.entries(doubleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({ phrase, count }));

    setSingleWords(sortedSingle);
    setDoubleWords(sortedDouble);
  };

  const handleClear = () => {
    setText('');
    setSingleWords([]);
    setDoubleWords([]);
    setTotalWordCount(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="max-w-6xl w-full bg-white p-8 rounded-xl shadow-lg space-y-6">
        
        {/* Header */}
        <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Competitor Keyword Analyzer
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Paste competitor bullet points to see which keywords they use most.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* INPUT SECTION */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-bold text-gray-700">Paste Text Here</label>
              <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-700 font-bold">Clear All</button>
            </div>
            <textarea
              className="w-full h-80 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-800 shadow-inner bg-gray-50"
              placeholder="Paste description or bullets here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              onClick={analyzeText}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all"
            >
              Analyze Keywords
            </button>
          </div>

          {/* RESULTS SECTION */}
          <div className="space-y-6">
            
            {/* Stats Bar */}
            <div className="bg-slate-800 text-white p-4 rounded-lg flex justify-between items-center">
              <span className="font-bold text-sm">Analysis Result</span>
              <span className="text-xs bg-slate-700 px-3 py-1 rounded-full">Total Words: {totalWordCount}</span>
            </div>

            {singleWords.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Single Keywords */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 font-bold text-gray-700 text-xs border-b">
                    TOP 10 KEYWORDS (1-Word)
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                      <tr>
                        <th className="px-4 py-2">Word</th>
                        <th className="px-4 py-2 text-right">Count</th>
                        <th className="px-4 py-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {singleWords.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-blue-50 transition-colors">
                          <td className="px-4 py-2 font-medium text-gray-800">{item.word}</td>
                          <td className="px-4 py-2 text-right text-blue-600 font-bold">{item.count}</td>
                          <td className="px-4 py-2 text-right text-gray-400 text-xs">{item.density}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Phrases */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 font-bold text-gray-700 text-xs border-b">
                    TOP PHRASES (2-Word)
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                      <tr>
                        <th className="px-4 py-2">Phrase</th>
                        <th className="px-4 py-2 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doubleWords.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-green-50 transition-colors">
                          <td className="px-4 py-2 font-medium text-gray-800">{item.phrase}</td>
                          <td className="px-4 py-2 text-right text-green-600 font-bold">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <p>Results will appear here...</p>
              </div>
            )}

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
      <div className="mt-8 text-center text-gray-400 text-sm">Created by SmartRwl</div>
    </div>
    
  );
}