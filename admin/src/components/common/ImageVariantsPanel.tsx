'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useImageVariants, type VariantInfo } from '@/hooks/useImageVariants';
import type { VariantType } from '@/lib/variant-config';

export interface ImageVariantsPanelProps {
  originalUrl: string | null;
  variantType: VariantType;
}

function StatusDot({ status }: { status: VariantInfo['status'] }) {
  if (status === 'checking') {
    return <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />;
  }
  if (status === 'ok') {
    return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  }
  if (status === 'missing') {
    return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
  }
  return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />;
}

function SummaryDot({
  readyCount,
  totalCount,
  isChecking,
}: {
  readyCount: number;
  totalCount: number;
  isChecking: boolean;
}) {
  if (isChecking) return <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />;
  if (readyCount === totalCount)
    return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  if (readyCount > 0) return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
      title="Copy URL"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

const LABEL_COLORS: Record<string, string> = {
  Original: 'bg-blue-600/20 text-blue-400',
  SM: 'bg-emerald-600/20 text-emerald-400',
  MD: 'bg-purple-600/20 text-purple-400',
  LG: 'bg-orange-600/20 text-orange-400',
};

function VariantRow({ variant, thumbnailUrl }: { variant: VariantInfo; thumbnailUrl: string }) {
  const specs = variant.width ? `${variant.width}px @ q${variant.quality}` : 'Full size';

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-800/50">
      <img
        src={thumbnailUrl}
        alt={variant.label}
        className="h-12 w-auto rounded bg-zinc-800 flex-shrink-0"
      />
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded ${LABEL_COLORS[variant.label] ?? 'bg-zinc-700 text-zinc-300'}`}
      >
        {variant.label}
      </span>
      <span className="text-xs text-zinc-400 w-24 flex-shrink-0">{specs}</span>
      <StatusDot status={variant.status} />
      <span className="text-xs text-zinc-500 truncate flex-1 min-w-0">{variant.url}</span>
      <CopyButton url={variant.url} />
    </div>
  );
}

export function ImageVariantsPanel({ originalUrl, variantType }: ImageVariantsPanelProps) {
  const [open, setOpen] = useState(false);
  const { variants, isChecking, readyCount, totalCount, recheck } = useImageVariants(
    originalUrl,
    variantType,
  );

  if (!originalUrl) return null;

  const summaryText = isChecking
    ? 'Checking variants...'
    : `${readyCount}/${totalCount} variants ready`;

  const thumbnailUrl = variants.find((v) => v.label === 'SM')?.url ?? variants[0]?.url;

  return (
    <div className="mt-2 border border-zinc-700/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800/50 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <SummaryDot readyCount={readyCount} totalCount={totalCount} isChecking={isChecking} />
        <span>Image Pipeline: {summaryText}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-700/50 px-1 py-1 space-y-0.5">
          {variants.map((v) => (
            <VariantRow key={v.label} variant={v} thumbnailUrl={thumbnailUrl} />
          ))}
          <div className="flex justify-end px-2 py-1">
            <button
              type="button"
              onClick={recheck}
              disabled={isChecking}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 px-2 py-1 rounded hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              Recheck
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
