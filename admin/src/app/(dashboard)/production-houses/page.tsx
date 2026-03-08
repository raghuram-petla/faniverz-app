'use client';
import { useState, useEffect, useRef } from 'react';
import {
  useAdminProductionHouses,
  useCreateProductionHouse,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { usePermissions } from '@/hooks/usePermissions';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Plus, Trash2, Search, Loader2, Building2, Pencil, Upload, X } from 'lucide-react';
import Link from 'next/link';

const EMPTY_FORM = {
  name: '',
  logo_url: '',
  description: '',
};

export default function ProductionHousesPage() {
  const { isPHAdmin, productionHouseIds, canCreate, canDelete } = usePermissions();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminProductionHouses(debouncedSearch, isPHAdmin ? productionHouseIds : undefined);
  const houses = data?.pages.flat() ?? [];
  const createHouse = useCreateProductionHouse();
  const deleteHouse = useDeleteProductionHouse();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { upload, uploading } = useImageUpload('/api/upload/production-house-logo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((p) => ({ ...p, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  async function handleAdd() {
    if (!form.name.trim()) return;
    try {
      await createHouse.mutateAsync({
        name: form.name,
        logo_url: form.logo_url || null,
        description: form.description || null,
      });
      setForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Failed to add production house: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Production Houses</h1>
        {canCreate('production_house') && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
          >
            <Plus className="w-4 h-4" /> Add Production House
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-surface-card border border-outline rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                  e.target.value = '';
                }}
              />
              {form.logo_url ? (
                <div className="flex items-center gap-2 flex-1">
                  <img
                    src={form.logo_url}
                    alt=""
                    className="w-9 h-9 rounded object-cover border border-outline shrink-0"
                  />
                  <span className="text-xs text-on-surface-subtle truncate flex-1">
                    Logo uploaded
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, logo_url: '' }))}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-input rounded-lg px-4 py-2 text-sm text-on-surface-muted hover:bg-input-hover disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Logo (optional)'}
                </button>
              )}
            </div>
          </div>
          <div>
            <textarea
              placeholder="Description (optional)"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={createHouse.isPending}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {createHouse.isPending ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setForm(EMPTY_FORM);
              }}
              className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="text"
            placeholder="Search production houses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle animate-spin" />
          )}
        </div>
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && houses.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {houses.length} production house{houses.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {houses.map((house) => (
            <div
              key={house.id}
              className="bg-surface-card border border-outline rounded-xl p-4 flex items-center gap-4"
            >
              <Link
                href={'/production-houses/' + house.id}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="w-14 h-14 rounded-lg bg-input flex items-center justify-center overflow-hidden shrink-0">
                  {house.logo_url ? (
                    <img src={house.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-on-surface-subtle" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface truncate">{house.name}</p>
                  {house.description && (
                    <p className="text-xs text-on-surface-subtle truncate mt-0.5">
                      {house.description}
                    </p>
                  )}
                </div>
              </Link>
              {!isPHAdmin && (
                <>
                  <Link
                    href={'/production-houses/' + house.id}
                    className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  {canDelete('production_house') && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this production house?')) deleteHouse.mutate(house.id);
                      }}
                      className="p-2 rounded-lg text-on-surface-subtle hover:text-red-500 hover:bg-red-600/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          {houses.length === 0 && (
            <p className="text-on-surface-subtle col-span-full text-center py-10">
              No production houses found
            </p>
          )}
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 bg-input hover:bg-input-hover text-on-surface px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
