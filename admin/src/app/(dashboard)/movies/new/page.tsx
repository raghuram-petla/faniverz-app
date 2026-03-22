'use client';
import { useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  FileText,
  Play,
  Film,
  Tv,
  Building2,
  Users,
  Calendar,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useMovieAddState } from '@/hooks/useMovieAddState';
import { Button } from '@/components/common/Button';
import {
  BasicInfoSection,
  VideosSection,
  PostersSection,
  ProductionHousesSection,
  CastSection,
  TheatricalRunsSection,
  SectionNav,
  SectionCard,
  PreviewPanel,
} from '@/components/movie-edit';
import type { MovieSectionId } from '@/components/movie-edit';

// @coupling: useMovieAddState manages identical section state as useMovieEditState but without server-load
export default function NewMoviePage() {
  const [activeSection, setActiveSection] = useState<MovieSectionId>('basic-info');
  const [addFormOpen, setAddFormOpen] = useState<string | null>(null);
  // @contract tracks pending preview URL from the add-poster form (before gallery confirm)
  const [pendingPreviewPosterUrl, setPendingPreviewPosterUrl] = useState<string | null>(null);
  const s = useMovieAddState();

  function addButton(key: string, label: string) {
    if (addFormOpen === key) return undefined;
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

  return (
    <div className="max-w-6xl">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 backdrop-blur bg-surface/95 border-b border-outline -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/movies" className="p-2 rounded-lg bg-input hover:bg-input-active">
              <ArrowLeft className="w-4 h-4 text-on-surface" />
            </Link>
            <h1 className="text-2xl font-bold text-on-surface">Add Movie</h1>
            {s.isDirty && (
              <span className="text-xs bg-amber-500/20 text-status-amber px-2.5 py-0.5 rounded-full font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          <button
            onClick={() => s.handleSubmit()}
            disabled={!s.isDirty || s.isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
              s.isDirty && !s.isSaving
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25'
                : 'bg-surface-elevated text-on-surface-disabled cursor-not-allowed'
            }`}
          >
            {s.isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create Movie'
            )}
          </button>
        </div>
      </div>

      <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="flex gap-8 mt-6">
        <div className="flex-1 min-w-0 space-y-6">
          {activeSection === 'basic-info' && (
            <SectionCard title="Basic Info" icon={FileText}>
              <BasicInfoSection
                form={s.form}
                setForm={s.setForm}
                updateField={s.updateField}
                toggleGenre={s.toggleGenre}
                onSubmit={s.handleSubmit}
              />
            </SectionCard>
          )}

          {activeSection === 'posters' && (
            <SectionCard title="Posters" icon={Film}>
              <PostersSection
                visiblePosters={s.visiblePosters}
                onAdd={(poster) => s.setPendingPosterAdds((prev) => [...prev, poster])}
                onRemove={s.handlePosterRemove}
                onSelectMainPoster={(posterId) => s.setPendingMainPosterId(posterId)}
                onSelectMainBackdrop={() => {
                  /* no-op for new movie */
                }}
                savedMainPosterId={s.savedMainPosterId}
                onPendingMainChange={setPendingPreviewPosterUrl}
                form={s.form}
                setForm={s.setForm}
                updateField={s.updateField}
              />
            </SectionCard>
          )}

          {activeSection === 'videos' && (
            <SectionCard title="Videos" icon={Play} action={addButton('videos', 'Add')}>
              <VideosSection
                visibleVideos={s.visibleVideos}
                trailerUrl={s.form.trailer_url}
                movieTitle={s.form.title}
                onAdd={(video) => s.setPendingVideoAdds((prev) => [...prev, video])}
                onRemove={s.handleVideoRemove}
                onClearTrailerUrl={() => s.updateField('trailer_url', '')}
                showAddForm={addFormOpen === 'videos'}
                onCloseAddForm={closeAdd}
                pendingIds={s.pendingVideoIds}
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
                  visibleProductionHouses={s.visibleProductionHouses}
                  productionHouses={s.phSearchResults}
                  searchQuery={s.phSearchQuery}
                  onSearchChange={s.setPHSearchQuery}
                  onAdd={(ph) => s.setPendingPHAdds((prev) => [...prev, ph])}
                  onRemove={s.handlePHRemove}
                  pendingPHAdds={s.pendingPHAdds}
                  onQuickAdd={async (name) => {
                    const created = await s.createProductionHouse.mutateAsync({
                      name,
                      logo_url: null,
                    });
                    s.setPendingPHAdds((prev) => [
                      ...prev,
                      { production_house_id: created.id, _ph: created },
                    ]);
                    s.setPHSearchQuery('');
                  }}
                  quickAddPending={s.createProductionHouse.isPending}
                  showAddForm={addFormOpen === 'ph'}
                  onCloseAddForm={closeAdd}
                />
              </SectionCard>
              <SectionCard title="Cast & Crew" icon={Users} action={addButton('cast', 'Add')}>
                <CastSection
                  visibleCast={s.visibleCast}
                  actors={s.actors}
                  castSearchQuery={s.castSearchQuery}
                  setCastSearchQuery={s.setCastSearchQuery}
                  onAdd={(cast) => s.setPendingCastAdds((prev) => [...prev, cast])}
                  onRemove={s.handleCastRemove}
                  onReorder={(newOrder) => s.setLocalCastOrder(newOrder)}
                  showAddForm={addFormOpen === 'cast'}
                  onCloseAddForm={closeAdd}
                  pendingIds={s.pendingCastIds}
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
                  visibleRuns={s.visibleRuns}
                  onAdd={(run) => s.setPendingRunAdds((prev) => [...prev, run])}
                  onRemove={s.handleRunRemove}
                  pendingIds={s.pendingRunIds}
                  showAddForm={addFormOpen === 'runs'}
                  onCloseAddForm={closeAdd}
                />
              </SectionCard>
              <SectionCard title="OTT Platforms" icon={Tv}>
                <p className="text-sm text-on-surface-subtle">
                  Save the movie first, then manage OTT availability from the edit page.
                </p>
              </SectionCard>
            </>
          )}
        </div>

        {/* @contract pendingPreviewPosterUrl overrides when add-form "Set as main" is checked + image uploaded */}
        <PreviewPanel
          form={{
            ...s.form,
            poster_url: pendingPreviewPosterUrl ?? s.form.poster_url,
          }}
        />
      </div>
    </div>
  );
}
