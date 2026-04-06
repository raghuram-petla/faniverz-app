'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-browser';
import type { EditorialReview } from '@shared/types';

// @contract editorial review form state — mirrors DB columns except overall_rating (GENERATED)
export interface EditorialReviewForm {
  title: string;
  body: string;
  verdict: string;
  rating_story: number;
  rating_direction: number;
  rating_technical: number;
  rating_music: number;
  rating_performances: number;
  is_published: boolean;
}

const EMPTY_FORM: EditorialReviewForm = {
  title: '',
  body: '',
  verdict: '',
  rating_story: 0,
  rating_direction: 0,
  rating_technical: 0,
  rating_music: 0,
  rating_performances: 0,
  is_published: false,
};

// @contract standalone hook — not woven into useMovieEditState because editorial reviews
// are a separate entity with their own save lifecycle
export function useEditorialReviewState(movieId: string) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EditorialReviewForm>(EMPTY_FORM);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const initialRef = useRef<EditorialReviewForm>(EMPTY_FORM);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // @sideeffect cleanup save status timer on unmount
  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  // @boundary fetch existing editorial review for this movie
  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin', 'editorial-review', movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editorial_reviews')
        .select('*')
        .eq('movie_id', movieId)
        .maybeSingle();
      if (error) throw error;
      return data as EditorialReview | null;
    },
    enabled: !!movieId,
  });

  // @sideeffect hydrate form when server data loads
  useEffect(() => {
    if (existing) {
      const hydrated: EditorialReviewForm = {
        title: existing.title,
        body: existing.body,
        verdict: existing.verdict ?? '',
        rating_story: existing.rating_story,
        rating_direction: existing.rating_direction,
        rating_technical: existing.rating_technical,
        rating_music: existing.rating_music,
        rating_performances: existing.rating_performances,
        is_published: existing.is_published,
      };
      setForm(hydrated);
      initialRef.current = hydrated;
    }
  }, [existing]);

  const updateField = useCallback(
    <K extends keyof EditorialReviewForm>(field: K, value: EditorialReviewForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // @contract isDirty compares current form to initial hydrated state
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialRef.current);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // @contract uses beforeunload only (not useUnsavedChangesWarning) because that hook
  // calls history.back() when isDirty transitions false, which navigates away from the page.
  // This section has its own save button, so simple beforeunload is sufficient.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const computedOverall =
    form.rating_story &&
    form.rating_direction &&
    form.rating_technical &&
    form.rating_music &&
    form.rating_performances
      ? (
          (form.rating_story +
            form.rating_direction +
            form.rating_technical +
            form.rating_music +
            form.rating_performances) /
          5
        ).toFixed(1)
      : null;

  // @contract validate — all 5 craft ratings required (1-5), title and body required
  const validate = useCallback((): string | null => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.body.trim()) return 'Review body is required';
    const crafts = [
      form.rating_story,
      form.rating_direction,
      form.rating_technical,
      form.rating_music,
      form.rating_performances,
    ];
    if (crafts.some((r) => r < 1 || r > 5)) return 'All 5 craft ratings are required (1-5)';
    return null;
  }, [form]);

  // @sideeffect save — upsert editorial review (insert if new, update if exists)
  // @edge omits overall_rating (GENERATED column) from payload
  const handleSave = useCallback(async () => {
    const error = validate();
    if (error) {
      setSaveStatus('error');
      return error;
    }

    setSaveStatus('saving');

    try {
      // @contract use getSession (cached) instead of getUser (network call) to avoid
      // triggering auth redirect when JWT is near expiry with autoRefreshToken: false
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // @contract omit author_id on update to preserve original author
      const basePayload = {
        movie_id: movieId,
        title: form.title.trim(),
        body: form.body.trim(),
        verdict: form.verdict.trim() || null,
        rating_story: form.rating_story,
        rating_direction: form.rating_direction,
        rating_technical: form.rating_technical,
        rating_music: form.rating_music,
        rating_performances: form.rating_performances,
        is_published: form.is_published,
        published_at: form.is_published
          ? (existing?.published_at ?? new Date().toISOString())
          : null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('editorial_reviews')
          .update(basePayload)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('editorial_reviews')
          .insert({ ...basePayload, author_id: session.user.id });
        if (insertError) throw insertError;
      }

      setSaveStatus('success');
      initialRef.current = { ...form };
      queryClient.invalidateQueries({ queryKey: ['admin', 'editorial-review', movieId] });
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
      return null;
    } catch (err) {
      setSaveStatus('error');
      return err instanceof Error ? err.message : 'Save failed';
    }
  }, [form, movieId, existing, validate, queryClient]);

  return {
    form,
    updateField,
    isDirty,
    isLoading,
    hasExisting: !!existing,
    computedOverall,
    saveStatus,
    handleSave,
  };
}
