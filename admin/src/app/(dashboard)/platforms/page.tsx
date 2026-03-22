'use client';

import { useState } from 'react';
import {
  useAdminPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
} from '@/hooks/useAdminPlatforms';
import { usePermissions } from '@/hooks/usePermissions';
import type { OTTPlatform } from '@/lib/types';
import { Monitor, Plus, Pencil, Trash2, Loader2, Link2 } from 'lucide-react';
import { getImageUrl } from '@shared/imageUrl';
import { colors } from '@shared/colors';
import {
  PlatformFormDialog,
  type PlatformFormData,
} from '@/components/platforms/PlatformFormDialog';

// @contract parse comma-separated TMDB alias IDs into integer array
function parseAliasIds(input: string): number[] {
  return input
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

const emptyForm: PlatformFormData = { name: '', logo_url: '', tmdb_alias_ids: '' };

export default function PlatformsPage() {
  const { isReadOnly, canDeleteTopLevel } = usePermissions();
  const { data: platforms, isLoading } = useAdminPlatforms();
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<PlatformFormData>(emptyForm);

  const openAdd = () => {
    setEditingId(null);
    setInitialForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (platform: OTTPlatform) => {
    setEditingId(platform.id);
    setInitialForm({
      name: platform.name,
      logo_url: platform.logo_url ?? '',
      tmdb_alias_ids: (platform.tmdb_alias_ids ?? []).join(', '),
    });
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingId(null);
  };

  const handleSubmit = (form: PlatformFormData) => {
    const aliasIds = parseAliasIds(form.tmdb_alias_ids);
    const payload = { name: form.name, logo_url: form.logo_url || null, tmdb_alias_ids: aliasIds };
    if (editingId) {
      updatePlatform.mutate({ id: editingId, ...payload }, { onSuccess: handleClose });
    } else {
      createPlatform.mutate(
        {
          ...payload,
          logo: form.name.charAt(0).toUpperCase() || '?',
          color: colors.zinc900,
          display_order: 0,
        },
        { onSuccess: handleClose },
      );
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this platform? This will also remove all related OTT releases.')) return;
    deletePlatform.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex">
        {!isReadOnly && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium ml-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Platform
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !platforms?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">
          No platforms found. Sync movies from TMDB to auto-create platforms.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const aliases = platform.tmdb_alias_ids ?? [];
            return (
              <div
                key={platform.id}
                className="bg-surface-card border border-outline rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {platform.logo_url ? (
                      <img
                        src={getImageUrl(platform.logo_url, 'sm', 'PLATFORMS') ?? platform.logo_url}
                        alt={platform.name}
                        className="w-12 h-12 rounded-lg object-contain border border-outline"
                      />
                    ) : (
                      <span className="w-12 h-12 rounded-lg flex items-center justify-center bg-zinc-700">
                        <Monitor className="w-5 h-5 text-on-surface-subtle" />
                      </span>
                    )}
                    <h3 className="text-on-surface font-semibold text-lg truncate max-w-[180px]">
                      {platform.name}
                    </h3>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(platform)}
                        className="p-2 text-on-surface-subtle hover:text-status-blue transition-colors"
                        title="Edit platform"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDeleteTopLevel() && (
                        <button
                          onClick={() => handleDelete(platform.id)}
                          disabled={deletePlatform.isPending}
                          className="p-2 text-on-surface-subtle hover:text-status-red transition-colors disabled:opacity-50"
                          title="Delete platform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-on-surface-disabled space-y-1 border-t border-outline pt-2">
                  {platform.tmdb_provider_id && (
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3 h-3" />
                      <span>TMDB #{platform.tmdb_provider_id}</span>
                    </div>
                  )}
                  {aliases.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-on-surface-subtle">Aliases:</span>
                      <span>{aliases.map((id) => `#${id}`).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDialog && (
        <PlatformFormDialog
          editingId={editingId}
          initialData={initialForm}
          isSaving={createPlatform.isPending || updatePlatform.isPending}
          isError={createPlatform.isError || updatePlatform.isError}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
