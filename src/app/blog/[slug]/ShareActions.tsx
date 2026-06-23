"use client";

export default function ShareActions({ title }: { title: string }) {
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="flex items-center gap-3 mt-10 pt-8 border-t border-gray-100 flex-wrap">
      <span className="text-sm font-semibold text-gray-600">Share:</span>
      <button onClick={copyLink} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors border-none">Copy link</button>
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors">Twitter</a>
      <a href={`https://linkedin.com/sharing/share-offsite/`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors">LinkedIn</a>
    </div>
  );
}

