'use client';
import { useParams } from 'next/navigation';
import { ArrowLeft, Check, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMovieEditState } from '@/hooks/useMovieEditState';
import { BasicInfoSection } from '@/components/movie-edit/BasicInfoSection';
import { PreviewPanel } from '@/components/movie-edit/PreviewPanel';
import {
  VideosSection,
  PostersSection,
  PlatformsSection,
  ProductionHousesSection,
  CastSection,
  TheatricalRunsSection,
} from '@/components/movie-edit';

export default function EditMoviePage() {
  const { id } = useParams<{ id: string }>();

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
    handleBackdropClick,
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
    allProductionHouses,
    pendingPlatformAdds,
    pendingPHAdds,
    isDirty,
    isSaving,
    saveStatus,
    handleSubmit,
    handleDelete,
  } = useMovieEditState(id);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );

  return (
    <div className="max-w-6xl">
      {/* ─── Sticky Header ─── */}
      <div className="sticky top-0 z-30 backdrop-blur bg-zinc-950/95 border-b border-white/10 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/movies" className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Edit Movie</h1>
            {saveStatus === 'success' && (
              <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full font-medium">
                <Check className="w-3 h-3" /> Saved successfully
              </span>
            )}
            {isDirty && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-medium">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSubmit()}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all ${
                isDirty && !isSaving
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/25'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-sm"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left column — Edit form */}
        <div className="flex-1 min-w-0 space-y-6">
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
            handleBackdropClick={handleBackdropClick}
            setUploadingPoster={setUploadingPoster}
            setUploadingBackdrop={setUploadingBackdrop}
            onSubmit={handleSubmit}
          />

          <VideosSection
            visibleVideos={visibleVideos}
            trailerUrl={form.trailer_url}
            movieTitle={form.title}
            onAdd={(video) => setPendingVideoAdds((prev) => [...prev, video])}
            onRemove={handleVideoRemove}
          />

          <PostersSection
            visiblePosters={visiblePosters}
            posterUrl={form.poster_url}
            onAdd={(poster) => setPendingPosterAdds((prev) => [...prev, poster])}
            onRemove={handlePosterRemove}
            onSetMain={(posterId) => setPendingMainPosterId(posterId)}
          />

          <PlatformsSection
            visiblePlatforms={visiblePlatforms}
            allPlatforms={allPlatforms}
            onAdd={(platform) => setPendingPlatformAdds((prev) => [...prev, platform])}
            onRemove={handlePlatformRemove}
            pendingPlatformAdds={pendingPlatformAdds}
          />

          <ProductionHousesSection
            visibleProductionHouses={visibleProductionHouses}
            allProductionHouses={allProductionHouses}
            onAdd={(ph) => setPendingPHAdds((prev) => [...prev, ph])}
            onRemove={handlePHRemove}
            pendingPHAdds={pendingPHAdds}
          />

          <CastSection
            visibleCast={visibleCast}
            actors={actors}
            castSearchQuery={castSearchQuery}
            setCastSearchQuery={setCastSearchQuery}
            onAdd={(cast) => setPendingCastAdds((prev) => [...prev, cast])}
            onRemove={handleCastRemove}
            onReorder={(newOrder) => setLocalCastOrder(newOrder)}
          />

          <TheatricalRunsSection
            visibleRuns={visibleRuns}
            onAdd={(run) => setPendingRunAdds((prev) => [...prev, run])}
            onRemove={handleRunRemove}
          />
        </div>

        {/* Right column — Preview */}
        <PreviewPanel form={form} setForm={setForm} />
      </div>
    </div>
  );
}
