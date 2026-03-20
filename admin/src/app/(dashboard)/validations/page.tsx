'use client';

import { useCallback } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useValidations, hasIssue } from '@/hooks/useValidations';
import { ValidationsSummary } from '@/components/validations/ValidationsSummary';
import { ValidationsScanPanel } from '@/components/validations/ValidationsScanPanel';
import type { ScanResult, ScanEntity } from '@/hooks/useValidationTypes';
import { supabase } from '@/lib/supabase-browser';

// @boundary: admin validations page — scans image URLs and fixes issues
export default function ValidationsPage() {
  const { isReadOnly } = usePermissions();
  const {
    summary,
    isSummaryLoading,
    scanResults,
    allScanResults,
    scanProgress,
    fixProgress,
    selectedItems,
    activeFilter,
    setActiveFilter,
    startScan,
    fixSelected,
    toggleItem,
    selectAllIssues,
    deselectAll,
  } = useValidations();

  // @sideeffect: sequential scan of all entity types (DB-only, fast)
  const handleScanAll = useCallback(async () => {
    const entities: ScanEntity[] = [
      'movies',
      'movie_images',
      'actors',
      'platforms',
      'production_houses',
      'profiles',
    ];
    for (const entity of entities) {
      await startScan(entity);
    }
  }, [startScan]);

  // @sideeffect: deep scan with R2 HeadObject checks for variant verification
  const handleDeepScan = useCallback(
    async (entity: ScanEntity) => {
      await startScan(entity, true);
    },
    [startScan],
  );

  // @sideeffect: fixes a single item via the fix API
  const handleFixSingle = useCallback(
    async (item: ScanResult) => {
      if (!hasIssue(item)) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      };
      await fetch('/api/validations/fix', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          items: [
            {
              id: item.id,
              entity: item.entity,
              field: item.field,
              currentUrl: item.currentUrl,
              fixType: item.urlType === 'external' ? 'migrate_external' : 'regenerate_variants',
              tmdbId: item.tmdbId ?? undefined,
            },
          ],
        }),
      });
      // Re-scan to see updated state
      if (scanProgress?.entity) await startScan(scanProgress.entity);
    },
    [scanProgress, startScan],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Image Validations</h1>

      <ValidationsSummary
        summary={summary}
        isLoading={isSummaryLoading}
        onScan={startScan}
        onDeepScan={handleDeepScan}
        onScanAll={handleScanAll}
        isScanning={scanProgress?.isScanning ?? false}
        activeScanEntity={scanProgress?.entity ?? null}
      />

      <ValidationsScanPanel
        results={scanResults}
        totalResultCount={allScanResults.length}
        selectedItems={selectedItems}
        onToggle={toggleItem}
        onSelectAllIssues={selectAllIssues}
        onDeselectAll={deselectAll}
        onFix={fixSelected}
        onFixSingle={handleFixSingle}
        fixProgress={fixProgress}
        scanProgress={scanProgress}
        isReadOnly={isReadOnly}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
    </div>
  );
}
