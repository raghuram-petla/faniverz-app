'use client';
import { useState, useRef } from 'react';
import {
  useAdminProductionHouses,
  useCreateProductionHouse,
  useDeleteProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { usePermissions } from '@/hooks/usePermissions';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Plus, Trash2, Loader2, Building2, Pencil, Upload, X } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadMoreButton } from '@/components/common/LoadMoreButton';
import Link from 'next/link';
import { getImageUrl } from '@shared/imageUrl';

const EMPTY_FORM = {
  name: '',
  logo_url: '',
  description: '',
};

export default function ProductionHousesPage() {
  // @boundary: PH admins are scoped to their assigned houses via productionHouseIds filter
  const { isPHAdmin, productionHouseIds, canCreate, canDeleteTopLevel } = usePermissions();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  // @coupling: passes productionHouseIds to restrict query results for PH admins; null for super_admin/admin
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminProductionHouses(debouncedSearch, isPHAdmin ? productionHouseIds : undefined);
  const houses = data?.pages.flat() ?? [];
  const createHouse = useCreateProductionHouse();
  const deleteHouse = useDeleteProductionHouse();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const { upload, uploading } = useImageUpload('/api/upload/production-house-logo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @sideeffect: uploads to Supabase Storage via /api/upload/production-house-logo, returns public URL
  async function handleLogoUpload(file: File) {
    try {
      const url = await upload(file);
      setForm((p) => ({ ...p, logo_url: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  // @sideeffect: inserts into production_houses table, resets inline form on success
  // @edge: empty logo_url/description coerced to null
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
                    src={getImageUrl(form.logo_url, 'sm', 'PRODUCTION_HOUSES') ?? form.logo_url}
                    alt=""
                    className="w-9 h-9 rounded object-cover border border-outline shrink-0"
                  />
                  <span className="text-xs text-on-surface-subtle truncate flex-1">
                    Logo uploaded
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, logo_url: '' }))}
                    className="p-1 text-status-red hover:text-status-red-hover"
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
        <div className="flex gap-3 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search production houses..."
            isLoading={isFetching}
          />
          {canCreate('production_house') && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 ml-auto shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Production House
            </button>
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
          <Loader2 className="w-8 h-8 text-status-red animate-spin" />
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
                    <img
                      // @nullable: getImageUrl returns null if variant not found — falls back to original URL
                      src={getImageUrl(house.logo_url, 'sm', 'PRODUCTION_HOUSES') ?? house.logo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
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
              {/* @invariant: PH admins see read-only cards — edit/delete actions hidden via permission check */}
              {!isPHAdmin && (
                <>
                  <Link
                    href={'/production-houses/' + house.id}
                    className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  {canDeleteTopLevel() && (
                    <button
                      onClick={() => {
                        if (confirm('Delete this production house?')) deleteHouse.mutate(house.id);
                      }}
                      className="p-2 rounded-lg text-on-surface-subtle hover:text-status-red hover:bg-red-600/10"
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
      <LoadMoreButton
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  );
}
