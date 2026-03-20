'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  FileText,
  Play,
  Film,
  Tv,
  Building2,
  Users,
  Calendar,
  Plus,
} from 'lucide-react';
import { useMovieEditState } from '@/hooks/useMovieEditState';
import { usePermissions } from '@/hooks/usePermissions';
import { useMovieEditChanges } from '@/hooks/useMovieEditChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { Button } from '@/components/common/Button';
import {
  BasicInfoSection,
  VideosSection,
  PostersSection,
  PlatformsSection,
  ProductionHousesSection,
  CastSection,
  TheatricalRunsSection,
  SectionNav,
  SectionCard,
  PreviewPanel,
} from '@/components/movie-edit';
import type { MovieSectionId } from '@/components/movie-edit';

/** @contract resolve R2 bucket from the selected image's type in the gallery */
function getBucketForUrl(
  images: Array<{ image_url: string; image_type?: string }>,
  url: string,
  fallback: 'POSTERS' | 'BACKDROPS',
): 'POSTERS' | 'BACKDROPS' {
  const t = images.find((p) => p.image_url === url)?.image_type;
  return t === 'backdrop' ? 'BACKDROPS' : t === 'poster' ? 'POSTERS' : fallback;
}

// @coupling: entire edit state managed by useMovieEditState; 5 tabs with conditional rendering
export default function EditMoviePage() {
  const { isReadOnly } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<MovieSectionId>('basic-info');
  const [addFormOpen, setAddFormOpen] = useState<string | null>(null);
  // @contract tracks pending preview URL from the add-poster form (before gallery confirm)
  const [pendingPreviewPosterUrl, setPendingPreviewPosterUrl] = useState<string | null>(null);

  const editState = useMovieEditState(id);
  const { changes, changeCount, onRevertField, onDiscard } = useMovieEditChanges({
    form: editState.form,
    initialForm: editState.initialForm,
    setForm: editState.setForm,
    setInitialForm: editState.setInitialForm,
    pendingCastAdds: editState.pendingCastAdds,
    pendingCastRemoveIds: editState.pendingCastRemoveIds,
    localCastOrder: editState.localCastOrder,
    castData: editState.castData,
    setPendingCastAdds: editState.setPendingCastAdds,
    setPendingCastRemoveIds: editState.setPendingCastRemoveIds,
    setLocalCastOrder: editState.setLocalCastOrder,
    pendingVideoAdds: editState.pendingVideoAdds,
    pendingVideoRemoveIds: editState.pendingVideoRemoveIds,
    videosData: editState.videosData,
    setPendingVideoAdds: editState.setPendingVideoAdds,
    setPendingVideoRemoveIds: editState.setPendingVideoRemoveIds,
    pendingPosterAdds: editState.pendingPosterAdds,
    pendingPosterRemoveIds: editState.pendingPosterRemoveIds,
    pendingMainPosterId: editState.pendingMainPosterId,
    savedMainPosterId: editState.savedMainPosterId,
    postersData: editState.postersData,
    setPendingPosterAdds: editState.setPendingPosterAdds,
    setPendingPosterRemoveIds: editState.setPendingPosterRemoveIds,
    setPendingMainPosterId: editState.setPendingMainPosterId,
    pendingPlatformAdds: editState.pendingPlatformAdds,
    pendingPlatformRemoveIds: editState.pendingPlatformRemoveIds,
    moviePlatforms: editState.moviePlatforms,
    setPendingPlatformAdds: editState.setPendingPlatformAdds,
    setPendingPlatformRemoveIds: editState.setPendingPlatformRemoveIds,
    pendingPHAdds: editState.pendingPHAdds,
    pendingPHRemoveIds: editState.pendingPHRemoveIds,
    movieProductionHouses: editState.movieProductionHouses,
    setPendingPHAdds: editState.setPendingPHAdds,
    setPendingPHRemoveIds: editState.setPendingPHRemoveIds,
    pendingRunAdds: editState.pendingRunAdds,
    pendingRunRemoveIds: editState.pendingRunRemoveIds,
    pendingRunEndIds: editState.pendingRunEndIds,
    theatricalRuns: editState.theatricalRuns,
    setPendingRunAdds: editState.setPendingRunAdds,
    setPendingRunRemoveIds: editState.setPendingRunRemoveIds,
    setPendingRunEndIds: editState.setPendingRunEndIds,
    resetPendingState: editState.resetPendingState,
  });

  const dockSaveStatus = editState.isSaving ? ('saving' as const) : editState.saveStatus;
  // @contract renders a "+ Add" button for SectionCard action slot; controls which form is open
  function addButton(key: string, label: string) {
    if (addFormOpen === key || isReadOnly) return undefined;
    return (
      <Button
        size="sm"
        variant="primary"
        icon={<Plus className="w-3.5 h-3.5" />}
        onClick={() => setAddFormOpen(key)}
      >
        {label}
      </Button>
    );
  }
  const closeAdd = () => setAddFormOpen(null);

  if (editState.isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-status-red animate-spin" />
      </div>
    );

  return (
    <div className="max-w-6xl">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 backdrop-blur bg-surface/95 border-b border-outline -mx-4 px-4 py-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-input hover:bg-input-active"
          >
            <ArrowLeft className="w-4 h-4 text-on-surface" />
          </button>
          <h1 className="text-2xl font-bold text-on-surface">
            Edit Movie
            {editState.form.title && (
              <span className="text-on-surface-muted font-normal"> — {editState.form.title}</span>
            )}
          </h1>
        </div>
        {!isReadOnly && (
          <button
            onClick={editState.handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-status-red hover:bg-red-600/30 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>

      {/* ─── Section Nav (5 tabs) ─── */}
      <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className={`flex gap-8 mt-6${isReadOnly ? ' pointer-events-none opacity-70' : ''}`}>
        {/* Left column — Active tab content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeSection === 'basic-info' && (
            <SectionCard title="Basic Info" icon={FileText}>
              <BasicInfoSection
                form={editState.form}
                setForm={editState.setForm}
                updateField={editState.updateField}
                toggleGenre={editState.toggleGenre}
                onSubmit={editState.handleSubmit}
              />
            </SectionCard>
          )}

          {activeSection === 'posters' && (
            <SectionCard title="Posters" icon={Film}>
              <PostersSection
                visiblePosters={editState.visiblePosters}
                onAdd={(poster) => editState.setPendingPosterAdds((prev) => [...prev, poster])}
                onRemove={editState.handlePosterRemove}
                onSelectMainPoster={editState.handleSelectMainPoster}
                onSelectMainBackdrop={editState.handleSelectMainBackdrop}
                savedMainPosterId={editState.savedMainPosterId}
                onPendingMainChange={setPendingPreviewPosterUrl}
                form={editState.form}
                setForm={editState.setForm}
                updateField={editState.updateField}
              />
            </SectionCard>
          )}

          {activeSection === 'videos' && (
            <SectionCard title="Videos" icon={Play} action={addButton('videos', 'Add')}>
              <VideosSection
                visibleVideos={editState.visibleVideos}
                trailerUrl={editState.form.trailer_url}
                movieTitle={editState.form.title}
                onAdd={(video) => editState.setPendingVideoAdds((prev) => [...prev, video])}
                onRemove={editState.handleVideoRemove}
                onClearTrailerUrl={() => editState.updateField('trailer_url', '')}
                showAddForm={addFormOpen === 'videos'}
                onCloseAddForm={closeAdd}
              />
            </SectionCard>
          )}

          {activeSection === 'cast-crew' && (
            <>
              <SectionCard
                title="Production Houses"
                icon={Building2}
                action={addButton('ph', 'Add')}
              >
                <ProductionHousesSection
                  visibleProductionHouses={editState.visibleProductionHouses}
                  productionHouses={editState.phSearchResults}
                  searchQuery={editState.phSearchQuery}
                  onSearchChange={editState.setPHSearchQuery}
                  onAdd={(ph) => editState.setPendingPHAdds((prev) => [...prev, ph])}
                  onRemove={editState.handlePHRemove}
                  pendingPHAdds={editState.pendingPHAdds}
                  onQuickAdd={async (name) => {
                    const created = await editState.createProductionHouse.mutateAsync({
                      name,
                      logo_url: null,
                    });
                    editState.setPendingPHAdds((prev) => [
                      ...prev,
                      { production_house_id: created.id, _ph: created },
                    ]);
                    editState.setPHSearchQuery('');
                  }}
                  quickAddPending={editState.createProductionHouse.isPending}
                  showAddForm={addFormOpen === 'ph'}
                  onCloseAddForm={closeAdd}
                />
              </SectionCard>
              <SectionCard title="Cast & Crew" icon={Users} action={addButton('cast', 'Add')}>
                <CastSection
                  visibleCast={editState.visibleCast}
                  actors={editState.actors}
                  castSearchQuery={editState.castSearchQuery}
                  setCastSearchQuery={editState.setCastSearchQuery}
                  onAdd={(cast) => editState.setPendingCastAdds((prev) => [...prev, cast])}
                  onRemove={editState.handleCastRemove}
                  onReorder={(newOrder) => editState.setLocalCastOrder(newOrder)}
                  showAddForm={addFormOpen === 'cast'}
                  onCloseAddForm={closeAdd}
                />
              </SectionCard>
            </>
          )}

          {activeSection === 'releases' && (
            <>
              <SectionCard
                title="Theatrical Runs"
                icon={Calendar}
                action={addButton('runs', 'Add')}
              >
                <TheatricalRunsSection
                  visibleRuns={editState.visibleRuns}
                  onAdd={(run) => editState.setPendingRunAdds((prev) => [...prev, run])}
                  onRemove={editState.handleRunRemove}
                  onEndRun={editState.handleRunEnd}
                  pendingEndRunIds={new Set(editState.pendingRunEndIds.keys())}
                  showAddForm={addFormOpen === 'runs'}
                  onCloseAddForm={closeAdd}
                />
              </SectionCard>
              <SectionCard title="OTT Platforms" icon={Tv} action={addButton('platforms', 'Add')}>
                <PlatformsSection
                  visiblePlatforms={editState.visiblePlatforms}
                  allPlatforms={editState.allPlatforms}
                  onAdd={(p) => editState.setPendingPlatformAdds((prev) => [...prev, p])}
                  onRemove={editState.handlePlatformRemove}
                  pendingPlatformAdds={editState.pendingPlatformAdds}
                  showAddForm={addFormOpen === 'platforms'}
                  onCloseAddForm={closeAdd}
                />
              </SectionCard>
            </>
          )}
        </div>

        {/* Right column — Preview */}
        <PreviewPanel
          form={{
            ...editState.form,
            poster_url: pendingPreviewPosterUrl ?? editState.form.poster_url,
          }}
          posterBucket={getBucketForUrl(
            editState.visiblePosters,
            editState.form.poster_url,
            'POSTERS',
          )}
          backdropBucket={getBucketForUrl(
            editState.visiblePosters,
            editState.form.backdrop_url,
            'BACKDROPS',
          )}
        />
      </div>

      <FormChangesDock
        changes={changes}
        changeCount={changeCount}
        saveStatus={dockSaveStatus}
        onSave={() => editState.handleSubmit()}
        onDiscard={onDiscard}
        onRevertField={onRevertField}
      />
    </div>
  );
}
