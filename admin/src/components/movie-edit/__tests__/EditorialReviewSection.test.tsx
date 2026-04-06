import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// @contract mock the hook to isolate component rendering from data fetching
const mockHandleSave = vi.fn().mockResolvedValue(null);
const mockUpdateField = vi.fn();

const defaultHookReturn = {
  form: {
    title: '',
    body: '',
    verdict: '',
    rating_story: 0,
    rating_direction: 0,
    rating_technical: 0,
    rating_music: 0,
    rating_performances: 0,
    is_published: false,
  },
  updateField: mockUpdateField,
  isDirty: false,
  isLoading: false,
  hasExisting: false,
  computedOverall: null,
  saveStatus: 'idle' as const,
  handleSave: mockHandleSave,
};

vi.mock('@/hooks/useEditorialReviewState', () => ({
  useEditorialReviewState: vi.fn(() => defaultHookReturn),
}));

vi.mock('@shared/constants', () => ({
  CRAFT_NAMES: ['story', 'direction', 'performances', 'music', 'technical'] as const,
  CRAFT_LABELS: {
    story: 'Story & Screenplay',
    direction: 'Direction',
    technical: 'Technical',
    music: 'Music',
    performances: 'Performances',
  },
}));

import { EditorialReviewSection } from '@/components/movie-edit/EditorialReviewSection';
import { useEditorialReviewState } from '@/hooks/useEditorialReviewState';

const mockedHook = vi.mocked(useEditorialReviewState);

describe('EditorialReviewSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHook.mockReturnValue({ ...defaultHookReturn });
  });

  it('renders loading state with spinner', () => {
    mockedHook.mockReturnValue({ ...defaultHookReturn, isLoading: true });
    const { container } = render(<EditorialReviewSection movieId="movie-1" />);

    expect(screen.getByText('Editorial Review')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the section title', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Editorial Review')).toBeInTheDocument();
  });

  it('renders review title input', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Review Title *')).toBeInTheDocument();
  });

  it('renders review body textarea', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Review Body *')).toBeInTheDocument();
  });

  it('renders verdict input', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Verdict (one-liner)')).toBeInTheDocument();
  });

  it('renders all 5 craft rating inputs', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Craft Ratings *')).toBeInTheDocument();
    expect(screen.getByText('Story & Screenplay')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Performances')).toBeInTheDocument();
  });

  it('renders the published toggle in Draft state', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders Published when is_published is true', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      form: { ...defaultHookReturn.form, is_published: true },
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders "Create Review" button when no existing review', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Create Review')).toBeInTheDocument();
  });

  it('renders "Update Review" button when an existing review exists', () => {
    mockedHook.mockReturnValue({ ...defaultHookReturn, hasExisting: true });
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Update Review')).toBeInTheDocument();
  });

  it('disables save button when not dirty and has existing review', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      hasExisting: true,
      isDirty: false,
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    const button = screen.getByText('Update Review');
    expect(button.closest('button')).toBeDisabled();
  });

  it('enables save button when form is dirty', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      hasExisting: true,
      isDirty: true,
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    const button = screen.getByText('Update Review');
    expect(button.closest('button')).not.toBeDisabled();
  });

  it('shows "Saving..." text during save', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      saveStatus: 'saving',
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Saved" after successful save', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      saveStatus: 'success',
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('calls handleSave when save button is clicked', async () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    const button = screen.getByText('Create Review');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockHandleSave).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error message when handleSave returns an error', async () => {
    mockHandleSave.mockResolvedValueOnce('Title is required');
    render(<EditorialReviewSection movieId="movie-1" />);

    fireEvent.click(screen.getByText('Create Review'));

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('shows overall rating when all craft ratings are set', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      computedOverall: '4.2',
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Overall')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('/ 5')).toBeInTheDocument();
  });

  it('does not show overall rating when computedOverall is null', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.queryByText('Overall')).not.toBeInTheDocument();
  });

  it('passes movieId to the hook', () => {
    render(<EditorialReviewSection movieId="movie-abc" />);
    expect(mockedHook).toHaveBeenCalledWith('movie-abc');
  });

  it('renders form values from hook state', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      form: {
        ...defaultHookReturn.form,
        title: 'A great film',
        body: 'Detailed review content',
        verdict: 'Must watch',
      },
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByDisplayValue('A great film')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Detailed review content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Must watch')).toBeInTheDocument();
  });
});
