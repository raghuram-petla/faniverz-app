import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (_url: string, _size: string, _bucket: string) => `https://cdn.example.com/img.jpg`,
}));

vi.mock('@/lib/utils', () => ({
  formatDate: (d: string) => d,
}));

import { PendingChangesDock } from '../PendingChangesSection';
import type { PendingChangeItem } from '../PendingChangesSection';

const makeChange = (overrides: Partial<PendingChangeItem> = {}): PendingChangeItem => ({
  movieId: 'movie-1',
  title: 'Test Movie',
  posterUrl: null,
  inTheaters: true,
  date: '2025-06-01',
  releaseDate: '2025-08-01',
  dateAction: 'none',
  ...overrides,
});

describe('PendingChangesDock — empty', () => {
  it('renders nothing when no changes', () => {
    const { container } = render(
      <PendingChangesDock
        changes={[]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('PendingChangesDock — additions', () => {
  it('shows "Adding to theaters" label for inTheaters items', () => {
    render(
      <PendingChangesDock
        changes={[makeChange({ inTheaters: true })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    expect(screen.getByText(/Adding to theaters/i)).toBeTruthy();
  });

  it('shows movie title', () => {
    render(
      <PendingChangesDock
        changes={[makeChange({ title: 'My Film' })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    expect(screen.getByText('My Film')).toBeTruthy();
  });

  it('calls onRemove when undo button clicked', () => {
    const onRemove = vi.fn();
    render(
      <PendingChangesDock
        changes={[makeChange()]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={onRemove}
        today="2025-06-01"
      />,
    );
    fireEvent.click(screen.getByLabelText('Undo Test Movie'));
    expect(onRemove).toHaveBeenCalledWith('movie-1');
  });

  it('calls onDateChange when date input changes', () => {
    const onDateChange = vi.fn();
    render(
      <PendingChangesDock
        changes={[makeChange()]}
        onDateChange={onDateChange}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    const input = screen.getByDisplayValue('2025-06-01');
    fireEvent.change(input, { target: { value: '2025-07-01' } });
    expect(onDateChange).toHaveBeenCalledWith('movie-1', '2025-07-01');
  });
});

describe('PendingChangesDock — removals', () => {
  it('shows "Removing from theaters" label for non-inTheaters items', () => {
    render(
      <PendingChangesDock
        changes={[makeChange({ inTheaters: false })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    expect(screen.getByText(/Removing from theaters/i)).toBeTruthy();
  });
});

describe('PendingChangesDock — poster fallback', () => {
  it('shows poster image when posterUrl is set', () => {
    render(
      <PendingChangesDock
        changes={[makeChange({ posterUrl: '/poster.jpg' })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
  });

  it('shows Film icon placeholder when posterUrl is null', () => {
    const { container } = render(
      <PendingChangesDock
        changes={[makeChange({ posterUrl: null })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    // No img tag for null posterUrl
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('PendingChangesDock — early start date action picker', () => {
  it('shows DateActionPicker when inTheaters=true and date < releaseDate', () => {
    render(
      <PendingChangesDock
        changes={[makeChange({ inTheaters: true, date: '2025-06-01', releaseDate: '2025-08-01' })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    expect(screen.getByText(/Before release date:/i)).toBeTruthy();
    expect(screen.getByText(/No date update/i)).toBeTruthy();
  });

  it('does not show DateActionPicker when date >= releaseDate', () => {
    render(
      <PendingChangesDock
        changes={[makeChange({ inTheaters: true, date: '2025-10-01', releaseDate: '2025-08-01' })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-10-01"
      />,
    );
    expect(screen.queryByText(/Before release date:/i)).toBeNull();
  });

  it('does not show DateActionPicker when releaseDate is null', () => {
    render(
      <PendingChangesDock
        changes={[makeChange({ inTheaters: true, date: '2025-06-01', releaseDate: null })]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    expect(screen.queryByText(/Before release date:/i)).toBeNull();
  });

  it('calls onDateActionChange when radio option selected', () => {
    const onDateActionChange = vi.fn();
    render(
      <PendingChangesDock
        changes={[
          makeChange({
            inTheaters: true,
            date: '2025-06-01',
            releaseDate: '2025-08-01',
            dateAction: 'none',
          }),
        ]}
        onDateChange={vi.fn()}
        onDateActionChange={onDateActionChange}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    // Find the "Update release date to match" radio
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]); // release_changed option
    expect(onDateActionChange).toHaveBeenCalledWith('movie-1', 'release_changed');
  });
});

describe('PendingChangesDock — multiple changes', () => {
  it('shows both additions and removals sections', () => {
    render(
      <PendingChangesDock
        changes={[
          makeChange({ movieId: 'm1', title: 'Movie A', inTheaters: true }),
          makeChange({ movieId: 'm2', title: 'Movie B', inTheaters: false }),
        ]}
        onDateChange={vi.fn()}
        onDateActionChange={vi.fn()}
        onRemove={vi.fn()}
        today="2025-06-01"
      />,
    );
    expect(screen.getByText(/Adding to theaters/i)).toBeTruthy();
    expect(screen.getByText(/Removing from theaters/i)).toBeTruthy();
    expect(screen.getByText('Movie A')).toBeTruthy();
    expect(screen.getByText('Movie B')).toBeTruthy();
  });
});
