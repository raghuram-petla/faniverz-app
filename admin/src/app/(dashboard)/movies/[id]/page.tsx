'use client';
import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  FileText,
  Play,
  Film,
  Tv,
  Building2,
  Users,
  Calendar,
  Plus,
  Database,
  RefreshCw,
} from 'lucide-react';
import { useMovieEditState } from '@/hooks/useMovieEditState';
import { usePermissions } from '@/hooks/usePermissions';
import { useMovieEditChanges } from '@/hooks/useMovieEditChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { Button } from '@/components/common/Button';
import {
  BasicInfoSection,
  TmdbMetadataSection,
  VideosSection,
  PostersSection,
  PlatformsSection,
  ProductionHousesSection,
  CastSection,
  TheatricalRunsSection,
  SectionNav,
  MOVIE_SECTIONS,
  SectionCard,
  PreviewPanel,
  SyncSection,
  MovieEditHeader,
} from '@/components/movie-edit';
import type { MovieSectionId, SyncSectionProps } from '@/components/movie-edit';

/** @contract resolve R2 bucket from the selected image's type in the gallery */
function getBucketForUrl(
  images: Array<{ image_url: string; image_type?: string }>,
  url: string,
  fallback: 'POSTERS' | 'BACKDROPS',
): 'POSTERS' | 'BACKDROPS' {
  const t = images.find((p) => p.image_url === url)?.image_type;
  return t === 'backdrop' ? 'BACKDROPS' : t === 'poster' ? 'POSTERS' : fallback;
}

// @coupling: edit state managed by useMovieEditState; changes tracked by useMovieEditChanges.
// @contract: 6 section tabs share a single pending state — switching tabs preserves unsaved edits.
export default function EditMoviePage() {
  const { isReadOnly, canDeleteTopLevel } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // @contract ?tab=tmdb-sync deep-links to the TMDB Sync tab; invalid values fall back to 'basic-info'
  const tabParam = searchParams.get('tab') as MovieSectionId | null;
  const validTab =
    tabParam && MOVIE_SECTIONS.some((s) => s.id === tabParam) ? tabParam : 'basic-info';
  const [activeSection, setActiveSection] = useState<MovieSectionId>(validTab);
  const [addFormOpen, setAddFormOpen] = useState<string | null>(null);
  const [pendingPreviewPosterUrl, setPendingPreviewPosterUrl] = useState<string | null>(null);
  const editState = useMovieEditState(id);
  const { changes, changeCount, onRevertField, onDiscard } = useMovieEditChanges(
    editState.changesParams,
  );

  /* v8 ignore start -- phantom else on ternary */
  const dockSaveStatus = editState.isSaving ? ('saving' as const) : editState.saveStatus;
  /* v8 ignore stop */
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
  /* v8 ignore start -- phantom else: isError early-return + string-error fallback unreachable */
  if (editState.isError)
    return (
      <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-status-red">
        Error loading movie:{' '}
        {editState.loadError instanceof Error ? editState.loadError.message : 'Unknown error'}
      </div>
    );
  /* v8 ignore stop */

  return (
    <div className="max-w-6xl">
      {/* ─── Sticky Header ─── */}
      <MovieEditHeader
        title={editState.form.title}
        onBack={() => router.back()}
        canDelete={canDeleteTopLevel()}
        onDelete={editState.handleDelete}
      />

      {/* ─── Section Nav (6 tabs — TMDB Sync hidden when no tmdb_id) ─── */}
      <SectionNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        hiddenSections={editState.movie?.tmdb_id ? [] : ['tmdb-sync']}
      />

      <div className={`flex gap-8 mt-6${isReadOnly ? ' pointer-events-none opacity-70' : ''}`}>
        {/* Left column — Active tab content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeSection === 'basic-info' && (
            <>
              <SectionCard title="Basic Info" icon={FileText}>
                <BasicInfoSection
                  form={editState.form}
                  setForm={editState.setForm}
                  updateField={editState.updateField}
                  toggleGenre={editState.toggleGenre}
                  onSubmit={editState.handleSubmit}
                />
              </SectionCard>
              {editState.movie?.tmdb_id && (
                <SectionCard title="TMDB Metadata" icon={Database}>
                  <TmdbMetadataSection
                    tmdbStatus={editState.movie.tmdb_status ?? null}
                    tmdbVoteAverage={editState.movie.tmdb_vote_average ?? null}
                    tmdbVoteCount={editState.movie.tmdb_vote_count ?? null}
                    budget={editState.movie.budget ?? null}
                    revenue={editState.movie.revenue ?? null}
                    collectionName={editState.movie.collection_name ?? null}
                    spokenLanguages={editState.movie.spoken_languages ?? null}
                    tmdbLastSyncedAt={editState.movie.tmdb_last_synced_at ?? null}
                  />
                </SectionCard>
              )}
            </>
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
                onAdd={(video) => editState.setPendingVideoAdds((prev) => [...prev, video])}
                onRemove={editState.handleVideoRemove}
                showAddForm={addFormOpen === 'videos'}
                onCloseAddForm={closeAdd}
                pendingIds={editState.pendingVideoIds}
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
                    try {
                      const created = await editState.createProductionHouse.mutateAsync({
                        name,
                        logo_url: null,
                      });
                      editState.setPendingPHAdds((prev) => [
                        ...prev,
                        { production_house_id: created.id, _ph: created },
                      ]);
                      editState.setPHSearchQuery('');
                    } catch (err) {
                      /* v8 ignore start -- phantom else on instanceof ternary */
                      alert(
                        err instanceof Error ? err.message : 'Failed to create production house',
                      );
                      /* v8 ignore stop */
                    }
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
                  pendingIds={editState.pendingCastIds}
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
                  pendingIds={editState.pendingRunIds}
                  showAddForm={addFormOpen === 'runs'}
                  onCloseAddForm={closeAdd}
                />
              </SectionCard>
              <SectionCard title="OTT Platforms" icon={Tv} action={addButton('ott', 'Add')}>
                <PlatformsSection
                  visibleAvailability={editState.visibleAvailability}
                  pendingIds={editState.pendingAvailabilityIds}
                  showAddForm={addFormOpen === 'ott'}
                  onCloseAddForm={closeAdd}
                  onAdd={(data) =>
                    editState.setPendingAvailabilityAdds(
                      /* v8 ignore start -- setState updater only runs in real React, mocked in tests */
                      (prev) => [...prev, { _id: crypto.randomUUID(), ...data }],
                      /* v8 ignore stop */
                    )
                  }
                  onRemove={editState.handleAvailabilityRemove}
                />
              </SectionCard>
            </>
          )}

          {activeSection === 'tmdb-sync' && editState.movie?.tmdb_id && (
            <SectionCard title="TMDB Sync" icon={RefreshCw}>
              <SyncSection
                movie={editState.movie as SyncSectionProps['movie']}
                onFieldsApplied={editState.patchFormFields}
              />
            </SectionCard>
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
