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

  it('renders craft ratings section', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByText('Craft Ratings *')).toBeInTheDocument();
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
      },
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    expect(screen.getByDisplayValue('A great film')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Detailed review content')).toBeInTheDocument();
  });

  it('calls updateField with title when title input changes', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    const titleInput = screen.getByPlaceholderText(
      'e.g. A visual masterpiece with a gripping narrative',
    );
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    expect(mockUpdateField).toHaveBeenCalledWith('title', 'New Title');
  });

  it('calls updateField with body when body textarea changes', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    const bodyTextarea = screen.getByPlaceholderText('Write the editorial review...');
    fireEvent.change(bodyTextarea, { target: { value: 'New body text' } });
    expect(mockUpdateField).toHaveBeenCalledWith('body', 'New body text');
  });

  it('calls updateField for craft rating when star button is clicked', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    // CraftRatingInput renders star buttons with aria-label "Rate {label} {n} stars"
    const star3Button = screen.getByRole('button', {
      name: 'Rate Story & Screenplay 3 stars',
    });
    fireEvent.click(star3Button);
    expect(mockUpdateField).toHaveBeenCalledWith('rating_story', 3);
  });

  it('calls updateField with toggled is_published when toggle is clicked', () => {
    render(<EditorialReviewSection movieId="movie-1" />);
    // The toggle button is the only button-type="button" element before the save button
    // It sits inside the "Draft"/"Published" row
    const draftText = screen.getByText('Draft');
    const toggleButton = draftText.closest('div')!.querySelector('button');
    fireEvent.click(toggleButton!);
    expect(mockUpdateField).toHaveBeenCalledWith('is_published', true);
  });

  it('calls updateField with false when published toggle is clicked while published', () => {
    mockedHook.mockReturnValue({
      ...defaultHookReturn,
      form: { ...defaultHookReturn.form, is_published: true },
    });
    render(<EditorialReviewSection movieId="movie-1" />);
    const publishedText = screen.getByText('Published');
    const toggleButton = publishedText.closest('div')!.querySelector('button');
    fireEvent.click(toggleButton!);
    expect(mockUpdateField).toHaveBeenCalledWith('is_published', false);
  });

  it('clears saveError before calling handleSave', async () => {
    // First call returns an error, second returns null
    mockHandleSave.mockResolvedValueOnce('First error').mockResolvedValueOnce(null);
    render(<EditorialReviewSection movieId="movie-1" />);

    fireEvent.click(screen.getByText('Create Review'));
    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    // Click again — the error should be cleared before the next save
    fireEvent.click(screen.getByText('Create Review'));
    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });
});
