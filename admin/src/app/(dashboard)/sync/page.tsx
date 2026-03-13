'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DiscoverTab } from '@/components/sync/DiscoverTab';
import { ImportTab } from '@/components/sync/ImportTab';
import { RefreshTab } from '@/components/sync/RefreshTab';
import { BulkTab } from '@/components/sync/BulkTab';
import { HistoryTab } from '@/components/sync/HistoryTab';

// @contract Tab components are lazy-rendered — only the active tab mounts
const TABS = ['Discover', 'Import', 'Refresh', 'Bulk', 'History'] as const;
type Tab = (typeof TABS)[number];

export default function SyncPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Discover');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Sync Command Center</h1>
          <p className="text-sm text-on-surface-muted">Import and refresh data from TMDB</p>
        </div>
      </div>

      <div className="flex gap-1 bg-surface-card border border-outline rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-red-600 text-white'
                : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-elevated'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* @coupling Each tab component manages its own data fetching and state */}
      {activeTab === 'Discover' && <DiscoverTab />}
      {activeTab === 'Import' && <ImportTab />}
      {activeTab === 'Refresh' && <RefreshTab />}
      {activeTab === 'Bulk' && <BulkTab />}
      {activeTab === 'History' && <HistoryTab />}
    </div>
  );
}
