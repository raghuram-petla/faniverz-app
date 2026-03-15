'use client';
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
} from 'lucide-react';
import Link from 'next/link';
import { useMovieAddState } from '@/hooks/useMovieAddState';
import { BasicInfoSection } from '@/components/movie-edit/BasicInfoSection';
import { PreviewPanel } from '@/components/movie-edit/PreviewPanel';
import {
  VideosSection,
  PostersSection,
  PlatformsSection,
  ProductionHousesSection,
  CastSection,
  TheatricalRunsSection,
  SectionNav,
  MOVIE_SECTIONS,
  useActiveSection,
} from '@/components/movie-edit';

// @coupling: useMovieAddState manages identical section state as useMovieEditState but without server-load; both share movie-edit components
export default function NewMoviePage() {
  const {
    form,
    setForm,
    updateField,
    toggleGenre,
    uploadingPoster,
    setUploadingPoster,
    uploadingBackdrop,
    setUploadingBackdrop,
    posterInputRef,
    backdropInputRef,
    handleImageUpload,
    setPendingVideoAdds,
    setPendingPosterAdds,
    setPendingPlatformAdds,
    setPendingPHAdds,
    setPendingCastAdds,
    setPendingRunAdds,
    setPendingMainPosterId,
    setLocalCastOrder,
    handleVideoRemove,
    handlePosterRemove,
    handlePlatformRemove,
    handlePHRemove,
    handleCastRemove,
    handleRunRemove,
    visibleCast,
    visibleVideos,
    visiblePosters,
    visiblePlatforms,
    visibleProductionHouses,
    visibleRuns,
    actors,
    castSearchQuery,
    setCastSearchQuery,
    allPlatforms,
    phSearchResults,
    phSearchQuery,
    setPHSearchQuery,
    createProductionHouse,
    pendingPlatformAdds,
    pendingPHAdds,
    isDirty,
    isSaving,
    handleSubmit,
  } = useMovieAddState();

  // @sync: useActiveSection uses IntersectionObserver to highlight the section nav based on scroll position
  const { activeId: activeSection, scrollTo } = useActiveSection(MOVIE_SECTIONS.map((s) => s.id));

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
            {isDirty && (
              <span className="text-xs bg-amber-500/20 text-status-amber px-2.5 py-0.5 rounded-full font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          {/* @sideeffect: handleSubmit creates the movie row + all related join records (cast, platforms, posters, etc.) in a single batch */}
          {/* @invariant: button disabled until at least one field is filled (isDirty) */}
          <button
            onClick={() => handleSubmit()}
            disabled={!isDirty || isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
              isDirty && !isSaving
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25'
                : 'bg-surface-elevated text-on-surface-disabled cursor-not-allowed'
            }`}
          >
            {isSaving ? (
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

      {/* ─── Section Nav ─── */}
      <SectionNav activeSection={activeSection} onScrollTo={scrollTo} />

      <div className="flex gap-8 mt-6">
        {/* Left column — Form */}
        <div className="flex-1 min-w-0 space-y-6">
          <div
            id="basic-info"
            className="scroll-mt-[100px] bg-surface-muted border border-outline-subtle rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" /> Basic Info
            </h2>
            <BasicInfoSection
              form={form}
              setForm={setForm}
              updateField={updateField}
              toggleGenre={toggleGenre}
              uploadingPoster={uploadingPoster}
              uploadingBackdrop={uploadingBackdrop}
              posterInputRef={posterInputRef}
              backdropInputRef={backdropInputRef}
              handleImageUpload={handleImageUpload}
              setUploadingPoster={setUploadingPoster}
              setUploadingBackdrop={setUploadingBackdrop}
              onSubmit={handleSubmit}
            />
          </div>

          <div
            id="videos"
            className="scroll-mt-[100px] bg-surface-muted border border-outline-subtle rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <Play className="w-5 h-5" /> Videos
            </h2>
            <VideosSection
              visibleVideos={visibleVideos}
              trailerUrl={form.trailer_url}
              movieTitle={form.title}
              onAdd={(video) => setPendingVideoAdds((prev) => [...prev, video])}
              onRemove={handleVideoRemove}
            />
          </div>

          <div
            id="posters"
            className="scroll-mt-[100px] bg-surface-muted border border-outline-subtle rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <Film className="w-5 h-5" /> Poster Gallery
            </h2>
            <PostersSection
              visiblePosters={visiblePosters}
              posterUrl={form.poster_url}
              onAdd={(poster) => setPendingPosterAdds((prev) => [...prev, poster])}
              onRemove={handlePosterRemove}
              onSetMain={(posterId) => setPendingMainPosterId(posterId)}
            />
          </div>

          <div
            id="platforms"
            className="scroll-mt-[100px] bg-surface-muted border border-outline-subtle rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <Tv className="w-5 h-5" /> OTT Platforms
            </h2>
            <PlatformsSection
              visiblePlatforms={visiblePlatforms}
              allPlatforms={allPlatforms}
              onAdd={(platform) => setPendingPlatformAdds((prev) => [...prev, platform])}
              onRemove={handlePlatformRemove}
              pendingPlatformAdds={pendingPlatformAdds}
            />
          </div>

          <div
            id="production-houses"
            className="scroll-mt-[100px] bg-surface-muted border border-outline-subtle rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5" /> Production Houses
            </h2>
            <ProductionHousesSection
              visibleProductionHouses={visibleProductionHouses}
              productionHouses={phSearchResults}
              searchQuery={phSearchQuery}
              onSearchChange={setPHSearchQuery}
              onAdd={(ph) => setPendingPHAdds((prev) => [...prev, ph])}
              onRemove={handlePHRemove}
              pendingPHAdds={pendingPHAdds}
              onQuickAdd={async (name) => {
                const created = await createProductionHouse.mutateAsync({
                  name,
                  logo_url: null,
                });
                setPendingPHAdds((prev) => [
                  ...prev,
                  { production_house_id: created.id, _ph: created },
                ]);
                setPHSearchQuery('');
              }}
              quickAddPending={createProductionHouse.isPending}
            />
          </div>

          <div
            id="cast-crew"
            className="scroll-mt-[100px] bg-surface-muted border border-outline-subtle rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" /> Cast & Crew
            </h2>
            <CastSection
              visibleCast={visibleCast}
              actors={actors}
              castSearchQuery={castSearchQuery}
              setCastSearchQuery={setCastSearchQuery}
              onAdd={(cast) => setPendingCastAdds((prev) => [...prev, cast])}
              onRemove={handleCastRemove}
              onReorder={(newOrder) => setLocalCastOrder(newOrder)}
            />
          </div>

          <div
            id="theatrical-runs"
            className="scroll-mt-[100px] bg-surface-muted border border-outline-subtle rounded-xl p-6"
          >
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" /> Theatrical Runs
            </h2>
            <TheatricalRunsSection
              visibleRuns={visibleRuns}
              onAdd={(run) => setPendingRunAdds((prev) => [...prev, run])}
              onRemove={handleRunRemove}
            />
          </div>
        </div>

        {/* Right column — Preview */}
        {/* @coupling: PreviewPanel renders a device-framed mobile movie detail preview, mirrors the mobile MovieDetail screen */}
        <PreviewPanel form={form} />
      </div>
    </div>
  );
}
