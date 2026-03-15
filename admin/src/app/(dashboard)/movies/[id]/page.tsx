'use client';
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
} from 'lucide-react';
import { useMovieEditState } from '@/hooks/useMovieEditState';
import { useMovieEditChanges } from '@/hooks/useMovieEditChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
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

// @coupling: entire edit state (form, pending adds/removes, dirty tracking, save) is managed by useMovieEditState hook
// @coupling: seven sub-sections (BasicInfo, Videos, Posters, Platforms, ProductionHouses, Cast, TheatricalRuns) extracted to movie-edit components
export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const {
    isLoading,
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
    handleRunEnd,
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
    allProductionHouses,
    pendingPlatformAdds,
    pendingPHAdds,
    pendingRunEndIds,
    isSaving,
    saveStatus,
    handleSubmit,
    handleDelete,
    // FormChangesDock integration
    initialForm,
    setInitialForm,
    pendingCastAdds,
    pendingCastRemoveIds,
    localCastOrder,
    pendingVideoAdds,
    pendingVideoRemoveIds,
    pendingPosterAdds,
    pendingPosterRemoveIds,
    pendingMainPosterId,
    pendingPlatformRemoveIds,
    pendingPHRemoveIds,
    pendingRunAdds,
    pendingRunRemoveIds,
    castData,
    videosData,
    postersData,
    moviePlatforms,
    movieProductionHouses,
    theatricalRuns,
    resetPendingState,
    setPendingCastRemoveIds,
    setPendingVideoRemoveIds,
    setPendingPosterRemoveIds,
    setPendingPlatformRemoveIds,
    setPendingPHRemoveIds,
    setPendingRunRemoveIds,
    setPendingRunEndIds,
  } = useMovieEditState(id);

  const { changes, changeCount, onRevertField, onDiscard } = useMovieEditChanges({
    form,
    initialForm,
    setForm,
    setInitialForm,
    pendingCastAdds,
    pendingCastRemoveIds,
    localCastOrder,
    castData,
    setPendingCastAdds,
    setPendingCastRemoveIds,
    setLocalCastOrder,
    pendingVideoAdds,
    pendingVideoRemoveIds,
    videosData,
    setPendingVideoAdds,
    setPendingVideoRemoveIds,
    pendingPosterAdds,
    pendingPosterRemoveIds,
    pendingMainPosterId,
    postersData,
    setPendingPosterAdds,
    setPendingPosterRemoveIds,
    setPendingMainPosterId,
    pendingPlatformAdds,
    pendingPlatformRemoveIds,
    moviePlatforms,
    setPendingPlatformAdds,
    setPendingPlatformRemoveIds,
    pendingPHAdds,
    pendingPHRemoveIds,
    movieProductionHouses,
    setPendingPHAdds,
    setPendingPHRemoveIds,
    pendingRunAdds,
    pendingRunRemoveIds,
    pendingRunEndIds,
    theatricalRuns,
    setPendingRunAdds,
    setPendingRunRemoveIds,
    setPendingRunEndIds,
    resetPendingState,
  });

  const dockSaveStatus = isSaving ? ('saving' as const) : saveStatus;

  // @sync: useActiveSection uses IntersectionObserver to highlight the section nav based on scroll position
  const { activeId: activeSection, scrollTo } = useActiveSection(MOVIE_SECTIONS.map((s) => s.id));

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );

  return (
    <div className="max-w-6xl">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-input hover:bg-input-active"
          >
            <ArrowLeft className="w-4 h-4 text-on-surface" />
          </button>
          <h1 className="text-2xl font-bold text-on-surface">Edit Movie</h1>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>

      {/* ─── Section Nav ─── */}
      <SectionNav activeSection={activeSection} onScrollTo={scrollTo} />

      <div className="flex gap-8 mt-6">
        {/* Left column — Edit form */}
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
              allProductionHouses={allProductionHouses}
              onAdd={(ph) => setPendingPHAdds((prev) => [...prev, ph])}
              onRemove={handlePHRemove}
              pendingPHAdds={pendingPHAdds}
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
              onEndRun={handleRunEnd}
              pendingEndRunIds={new Set(pendingRunEndIds.keys())}
            />
          </div>
        </div>

        {/* Right column — Preview */}
        {/* @coupling: PreviewPanel renders a device-framed mobile movie detail preview, mirrors the mobile MovieDetail screen */}
        <PreviewPanel form={form} />
      </div>

      <FormChangesDock
        changes={changes}
        changeCount={changeCount}
        saveStatus={dockSaveStatus}
        onSave={() => handleSubmit()}
        onDiscard={onDiscard}
        onRevertField={onRevertField}
      />
    </div>
  );
}
