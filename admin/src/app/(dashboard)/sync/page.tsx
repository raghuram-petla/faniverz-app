'use client';

import { useState } from 'react';
import { Search, Zap, Clock } from 'lucide-react';
import { DiscoverTab } from '@/components/sync/DiscoverTab';
import { BulkTab } from '@/components/sync/BulkTab';
import { HistoryTab } from '@/components/sync/HistoryTab';

// @contract Tab components are lazy-rendered — only the active tab mounts
const TABS = [
  { id: 'Discover', label: 'Discover', icon: Search },
  { id: 'Bulk', label: 'Bulk', icon: Zap },
  { id: 'History', label: 'History', icon: Clock },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function SyncPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Discover');

  return (
    <div className="space-y-6">
      <div className="inline-flex gap-0.5 bg-surface-card border border-outline rounded-lg p-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive ? 'bg-red-600 text-white' : 'text-on-surface-muted hover:text-on-surface'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* @coupling Each tab component manages its own data fetching and state */}
      {activeTab === 'Discover' && <DiscoverTab />}
      {activeTab === 'Bulk' && <BulkTab />}
      {activeTab === 'History' && <HistoryTab />}
    </div>
  );
}
