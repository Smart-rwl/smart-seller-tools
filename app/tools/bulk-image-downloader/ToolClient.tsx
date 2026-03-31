'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function BulkImageDownloader() {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [failed, setFailed] = useState(0);

  const parseUrls = (input: string) => {
    return input
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u);
  };

  const handleDownload = async () => {
    const urlList = parseUrls(urls);

    if (urlList.length === 0) {
      alert('Please enter at least one URL');
      return;
    }

    setLoading(true);
    setProgress(0);
    setDownloaded(0);
    setFailed(0);
    setTotal(urlList.length);

    const zip = new JSZip();

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];

      try {
        const response = await fetch(url);
        const blob = await response.blob();

        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const baseName = pathname.split('/').pop() || `image-${i}`;

        let extension = '';
        if (blob.type.includes('jpeg')) extension = '.jpg';
        else if (blob.type.includes('png')) extension = '.png';
        else if (blob.type.includes('webp')) extension = '.webp';
        else if (blob.type.includes('avif')) extension = '.avif';
        else extension = '.jpg';

        zip.file(`${baseName}${extension}`, blob);

        setDownloaded((prev) => prev + 1);
      } catch (err) {
        console.error('Failed:', url);
        setFailed((prev) => prev + 1);
      }

      setProgress(Math.round(((i + 1) / urlList.length) * 100));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'images.zip');

    setLoading(false);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const extracted = text
        .split(/,|\n/)
        .filter((item) => item.startsWith('http'));

      setUrls(extracted.join('\n'));
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Bulk Image Downloader Pro
        </h1>

        {/* CSV Upload */}
        <div className="mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="mb-2"
          />
          <p className="text-sm text-gray-400">
            Upload CSV (auto-detects image URLs)
          </p>
        </div>

        {/* Text Area */}
        <textarea
          placeholder="Paste image URLs (one per line)..."
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          className="w-full h-64 p-4 rounded-xl bg-gray-900 border border-gray-700 focus:outline-none"
        />

        {/* Button */}
        <button
          onClick={handleDownload}
          disabled={loading}
          className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
        >
          {loading ? 'Downloading...' : 'Download All as ZIP'}
        </button>

        {/* Progress Section */}
        {loading && (
          <div className="mt-6">
            <div className="w-full bg-gray-800 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3 text-sm text-gray-300">
              <p>Total: {total}</p>
              <p>Downloaded: {downloaded}</p>
              <p>Failed: {failed}</p>
              <p>Progress: {progress}%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
