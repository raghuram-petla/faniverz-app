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

// @contract Centralizes all data-fetching hooks for the movie edit page
// @coupling Each hook maps 1:1 to a Supabase table or RPC; composed by useMovieEditState
export function useMovieEditData(id: string) {
  const { data: movie, isLoading } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();

  const { data: castData = [] } = useMovieCast(id);
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const { data: actorsData } = useAdminActors(castSearchQuery.trim());
  // @edge pages.flat() — actors from createCrudHooks use infinite query; empty search returns all actors
  const actors = actorsData?.pages.flat() ?? [];
  const addCast = useAddCast();
  const removeCast = useRemoveCast();
  const updateCastOrder = useUpdateCastOrder();

  const { data: theatricalRuns = [] } = useMovieTheatricalRuns(id);
  const addTheatricalRun = useAddTheatricalRun();
  const updateTheatricalRun = useUpdateTheatricalRun();
  const removeTheatricalRun = useRemoveTheatricalRun();

  const { data: videosData = [] } = useMovieVideos(id);
  const addVideo = useAddVideo();
  const removeVideo = useRemoveVideo();

  const { data: postersData = [] } = useMoviePosters(id);
  const addPoster = useAddPoster();
  const removePoster = useRemovePoster();
  const setMainPoster = useSetMainPoster();
  const setMainBackdrop = useSetMainBackdrop();

  const { data: movieProductionHouses = [] } = useMovieProductionHouses(id);
  const addMovieProductionHouse = useAddMovieProductionHouse();
  const removeMovieProductionHouse = useRemoveMovieProductionHouse();
  const [phSearchQuery, setPHSearchQuery] = useState('');
  const { data: phSearchData } = useAdminProductionHouses(phSearchQuery.trim());
  const phSearchResults = phSearchData?.pages.flat() ?? [];
  const createProductionHouse = useCreateProductionHouse();

  const { data: moviePlatforms = [] } = useMoviePlatforms(id);
  const { data: allPlatforms = [] } = useAdminPlatforms();
  const addMoviePlatform = useAddMoviePlatform();
  const removeMoviePlatform = useRemoveMoviePlatform();

  return {
    movie,
    isLoading,
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
  };
}
