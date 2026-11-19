'use client';
// Contract address that copies on tap (people buy from their phones).
import { useState } from 'react';
import { site } from '@/lib/site';

export default function CopyCA({ className = '', soon = 'CA: soon on Pons' }) {
  const [copied, setCopied] = useState(false);
  if (!site.contract) return soon ? <span className={`${className} mono`}>{soon}</span> : null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(site.contract); } catch {
      const t = document.createElement('textarea'); t.value = site.contract; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch { /* ignore */ } t.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button type="button" className={`copy-ca mono ${className}`} onClick={copy} title="Copy contract address">
      <span className="copy-ca-label">CA</span>
      <span className="copy-ca-addr">{site.contract}</span>
      <span className="copy-ca-btn">{copied ? 'Copied ✓' : 'Copy'}</span>
    </button>
  );
}
