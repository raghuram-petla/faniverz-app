'use client';

import { useState } from 'react';
import { useAdminMovie, useUpdateMovie, useDeleteMovie } from '@/hooks/useAdminMovies';
import {
  useMovieCast,
  useAdminActors,
  useAddCast,
  useRemoveCast,
  useUpdateCastOrder,
} from '@/hooks/useAdminCast';
import {
  useMovieTheatricalRuns,
  useAddTheatricalRun,
  useUpdateTheatricalRun,
  useRemoveTheatricalRun,
} from '@/hooks/useAdminTheatricalRuns';
import { useMovieVideos, useAddVideo, useRemoveVideo } from '@/hooks/useAdminVideos';
import {
  useMoviePosters,
  useAddPoster,
  useRemovePoster,
  useSetMainPoster,
  useSetMainBackdrop,
} from '@/hooks/useAdminPosters';
import {
  useMovieProductionHouses,
  useAddMovieProductionHouse,
  useRemoveMovieProductionHouse,
} from '@/hooks/useMovieProductionHouses';
import {
  useAdminProductionHouses,
  useCreateProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import {
  useMoviePlatforms,
  useAddMoviePlatform,
  useRemoveMoviePlatform,
} from '@/hooks/useAdminOtt';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import {
  useMovieAvailability,
  useAddMovieAvailability,
  useRemoveMovieAvailability,
} from '@/hooks/useAdminMovieAvailability';

// @contract Centralizes all data-fetching hooks for the movie edit page
// @coupling Each hook maps 1:1 to a Supabase table or RPC; composed by useMovieEditState
export function useMovieEditData(id: string) {
  const { data: movie, isLoading, isError, error } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();

  const { data: rawCastData } = useMovieCast(id);
  /* v8 ignore start */
  const castData = rawCastData ?? [];
  /* v8 ignore stop */
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const { data: actorsData } = useAdminActors(castSearchQuery.trim());
  // @edge pages.flat() — actors from createCrudHooks use infinite query; empty search returns all actors
  /* v8 ignore start */
  const actors = actorsData?.pages.flat() ?? [];
  /* v8 ignore stop */
  const addCast = useAddCast();
  const removeCast = useRemoveCast();
  const updateCastOrder = useUpdateCastOrder();

  const { data: rawTheatricalRuns } = useMovieTheatricalRuns(id);
  /* v8 ignore start */
  const theatricalRuns = rawTheatricalRuns ?? [];
  /* v8 ignore stop */
  const addTheatricalRun = useAddTheatricalRun();
  const updateTheatricalRun = useUpdateTheatricalRun();
  const removeTheatricalRun = useRemoveTheatricalRun();

  const { data: rawVideosData } = useMovieVideos(id);
  /* v8 ignore start */
  const videosData = rawVideosData ?? [];
  /* v8 ignore stop */
  const addVideo = useAddVideo();
  const removeVideo = useRemoveVideo();

  const { data: rawPostersData } = useMoviePosters(id);
  /* v8 ignore start */
  const postersData = rawPostersData ?? [];
  /* v8 ignore stop */
  const addPoster = useAddPoster();
  const removePoster = useRemovePoster();
  const setMainPoster = useSetMainPoster();
  const setMainBackdrop = useSetMainBackdrop();

  const { data: rawMovieProductionHouses } = useMovieProductionHouses(id);
  /* v8 ignore start */
  const movieProductionHouses = rawMovieProductionHouses ?? [];
  /* v8 ignore stop */
  const addMovieProductionHouse = useAddMovieProductionHouse();
  const removeMovieProductionHouse = useRemoveMovieProductionHouse();
  const [phSearchQuery, setPHSearchQuery] = useState('');
  const { data: phSearchData } = useAdminProductionHouses(phSearchQuery.trim());
  /* v8 ignore start */
  const phSearchResults = phSearchData?.pages.flat() ?? [];
  /* v8 ignore stop */
  const createProductionHouse = useCreateProductionHouse();

  const { data: rawMoviePlatforms } = useMoviePlatforms(id);
  /* v8 ignore start */
  const moviePlatforms = rawMoviePlatforms ?? [];
  /* v8 ignore stop */
  const { data: rawAllPlatforms } = useAdminPlatforms();
  /* v8 ignore start */
  const allPlatforms = rawAllPlatforms ?? [];
  /* v8 ignore stop */
  const addMoviePlatform = useAddMoviePlatform();
  const removeMoviePlatform = useRemoveMoviePlatform();

  const { data: rawAvailabilityData } = useMovieAvailability(id);
  /* v8 ignore start */
  const availabilityData = rawAvailabilityData ?? [];
  /* v8 ignore stop */
  const addMovieAvailability = useAddMovieAvailability();
  const removeMovieAvailability = useRemoveMovieAvailability();

  return {
    movie,
    isLoading,
    isError,
    error,
    updateMovie,
    deleteMovie,
    castData,
    castSearchQuery,
    setCastSearchQuery,
    actors,
    addCast,
    removeCast,
    updateCastOrder,
    theatricalRuns,
    addTheatricalRun,
    updateTheatricalRun,
    removeTheatricalRun,
    videosData,
    addVideo,
    removeVideo,
    postersData,
    addPoster,
    removePoster,
    setMainPoster,
    setMainBackdrop,
    movieProductionHouses,
    addMovieProductionHouse,
    removeMovieProductionHouse,
    phSearchQuery,
    setPHSearchQuery,
    phSearchResults,
    createProductionHouse,
    moviePlatforms,
    allPlatforms,
    addMoviePlatform,
    removeMoviePlatform,
    availabilityData,
    addMovieAvailability,
    removeMovieAvailability,
  };
}
