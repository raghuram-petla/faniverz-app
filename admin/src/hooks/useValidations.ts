'use client';
import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type {
  ScanEntity,
  ScanResult,
  ScanResponse,
  SummaryEntry,
  FixItem,
  FixResult,
  ScanProgress,
  FixProgress,
} from './useValidationTypes';

// @contract: returns auth header for API calls
async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

async function fetchSummary(): Promise<SummaryEntry[]> {
  const headers = await getAuthHeader();
  const res = await fetch('/api/validations/summary', { headers });
  if (!res.ok) throw new Error('Failed to fetch summary');
  const data = await res.json();
  return data.entities;
}

// @contract: main hook for the validations page — manages scan, fix, and selection state
export function useValidations() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [fixProgress, setFixProgress] = useState<FixProgress | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'external' | 'missing' | 'ok'>('all');
  const abortRef = useRef(false);

  const summaryQuery = useQuery({
    queryKey: ['validations', 'summary'],
    queryFn: fetchSummary,
  });

  // @sideeffect: paginated scan — fetches batches until all rows processed
  const startScan = useCallback(async (entity: ScanEntity) => {
    abortRef.current = false;
    setScanResults([]);
    setSelectedItems(new Set());
    setScanProgress({ entity, scanned: 0, total: 0, isScanning: true });

    const headers = await getAuthHeader();
    let cursor: number | null = 0;
    const allResults: ScanResult[] = [];

    while (cursor !== null && !abortRef.current) {
      const res = await fetch('/api/validations/scan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ entity, cursor, limit: 50 }),
      });

      if (!res.ok) {
        setScanProgress((p) => (p ? { ...p, isScanning: false } : null));
        throw new Error('Scan failed');
      }

      const data: ScanResponse = await res.json();
      allResults.push(...data.results);
      setScanResults([...allResults]);
      setScanProgress({
        entity,
        scanned: allResults.length,
        total: data.total,
        isScanning: data.nextCursor !== null,
      });
      cursor = data.nextCursor;
    }

    setScanProgress((p) => (p ? { ...p, isScanning: false } : null));
  }, []);

  const stopScan = useCallback(() => {
    abortRef.current = true;
  }, []);

  // @sideeffect: sends selected items to fix endpoint in batches
  const fixSelected = useCallback(async () => {
    const items = getSelectedFixItems(scanResults, selectedItems);
    if (items.length === 0) return;

    setFixProgress({ fixed: 0, failed: 0, total: items.length, isFixing: true });
    const headers = await getAuthHeader();
    const batchSize = 10;
    let fixed = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const res = await fetch('/api/validations/fix', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: batch }),
      });

      if (res.ok) {
        const data: { results: FixResult[] } = await res.json();
        for (const r of data.results) {
          if (r.status === 'fixed') {
            fixed++;
            updateResultAfterFix(setScanResults, r);
          } else {
            failed++;
          }
        }
      } else {
        failed += batch.length;
      }

      setFixProgress({ fixed, failed, total: items.length, isFixing: true });
    }

    setFixProgress({ fixed, failed, total: items.length, isFixing: false });
    setSelectedItems(new Set());
  }, [scanResults, selectedItems]);

  const toggleItem = useCallback((key: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllIssues = useCallback(() => {
    const keys = new Set<string>();
    for (const r of scanResults) {
      if (hasIssue(r)) keys.add(itemKey(r));
    }
    setSelectedItems(keys);
  }, [scanResults]);

  const deselectAll = useCallback(() => setSelectedItems(new Set()), []);

  const filteredResults = filterResults(scanResults, activeFilter);

  return {
    summary: summaryQuery.data,
    isSummaryLoading: summaryQuery.isLoading,
    refetchSummary: summaryQuery.refetch,
    scanResults: filteredResults,
    allScanResults: scanResults,
    scanProgress,
    fixProgress,
    selectedItems,
    activeFilter,
    setActiveFilter,
    startScan,
    stopScan,
    fixSelected,
    toggleItem,
    selectAllIssues,
    deselectAll,
  };
}

// --- Helpers ---

export function itemKey(r: ScanResult): string {
  return `${r.id}-${r.field}`;
}

export function hasIssue(r: ScanResult): boolean {
  if (r.urlType === 'external') return true;
  if (r.originalExists === false) return true;
  const { sm, md, lg } = r.variants;
  return sm === false || md === false || lg === false;
}

function filterResults(
  results: ScanResult[],
  filter: 'all' | 'external' | 'missing' | 'ok',
): ScanResult[] {
  if (filter === 'all') return results;
  if (filter === 'external') return results.filter((r) => r.urlType === 'external');
  if (filter === 'missing') return results.filter((r) => hasIssue(r) && r.urlType !== 'external');
  return results.filter((r) => !hasIssue(r));
}

function getSelectedFixItems(results: ScanResult[], selected: Set<string>): FixItem[] {
  return results
    .filter((r) => selected.has(itemKey(r)) && hasIssue(r))
    .map((r) => ({
      id: r.id,
      entity: r.entity,
      field: r.field,
      currentUrl: r.currentUrl,
      fixType:
        r.urlType === 'external' ? ('migrate_external' as const) : ('regenerate_variants' as const),
      tmdbId: r.tmdbId ?? undefined,
    }));
}

function updateResultAfterFix(
  setScanResults: React.Dispatch<React.SetStateAction<ScanResult[]>>,
  fixResult: FixResult,
): void {
  setScanResults((prev) =>
    prev.map((r) => {
      if (r.id === fixResult.id && r.field === fixResult.field) {
        return {
          ...r,
          currentUrl: fixResult.newUrl ?? r.currentUrl,
          urlType: 'local' as const,
          originalExists: true,
          variants: { sm: true, md: true, lg: true },
        };
      }
      return r;
    }),
  );
}
