import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { PersonPreview } from '@/components/sync/PersonPreview';
import type { PersonPreviewProps } from '@/components/sync/PersonPreview';
import type { LookupResult } from '@/hooks/useSync';

const baseResult = {
  type: 'person' as const,
  existsInDb: false,
  existingId: null,
  data: {
    tmdbPersonId: 500,
    name: 'Test Actor',
    photoUrl: 'https://image.tmdb.org/t/p/w185/photo.jpg',
    biography: 'A famous actor.',
    birthday: '1990-01-01',
    placeOfBirth: 'Mumbai, India',
    gender: 2,
  },
} as LookupResult & { type: 'person' };

function makeProps(overrides: Partial<PersonPreviewProps> = {}): PersonPreviewProps {
  return {
    result: baseResult,
    isPending: false,
    onRefresh: vi.fn(),
    onImport: vi.fn(),
    ...overrides,
  };
}

describe('PersonPreview', () => {
  it('renders person name', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.getByText('Test Actor')).toBeInTheDocument();
  });

  it('renders photo', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.getByAltText('Test Actor')).toBeInTheDocument();
  });

  it('renders placeholder when photoUrl is null', () => {
    const result = { ...baseResult, data: { ...baseResult.data, photoUrl: null } } as typeof baseResult;
    render(<PersonPreview {...makeProps({ result })} />);
    expect(screen.queryByAltText('Test Actor')).not.toBeInTheDocument();
  });

  it('renders birthday', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.getByText('1990-01-01')).toBeInTheDocument();
  });

  it('renders place of birth', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.getByText('Mumbai, India')).toBeInTheDocument();
  });

  it('renders biography', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.getByText('A famous actor.')).toBeInTheDocument();
  });

  it('shows "Not in database" when existsInDb is false', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.getByText('Not in database')).toBeInTheDocument();
  });

  it('shows "In database" when existsInDb is true', () => {
    const result = { ...baseResult, existsInDb: true, existingId: 'actor-1' } as typeof baseResult;
    render(<PersonPreview {...makeProps({ result })} />);
    expect(screen.getByText('In database')).toBeInTheDocument();
  });

  it('shows Import Actor button when not in DB', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.getByText('Import Actor')).toBeInTheDocument();
  });

  it('shows Refresh from TMDB button when in DB', () => {
    const result = { ...baseResult, existsInDb: true, existingId: 'actor-1' } as typeof baseResult;
    render(<PersonPreview {...makeProps({ result })} />);
    expect(screen.getByText('Refresh from TMDB')).toBeInTheDocument();
  });

  it('calls onImport when import button clicked', () => {
    const onImport = vi.fn();
    render(<PersonPreview {...makeProps({ onImport })} />);
    fireEvent.click(screen.getByText('Import Actor'));
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn();
    const result = { ...baseResult, existsInDb: true, existingId: 'actor-1' } as typeof baseResult;
    render(<PersonPreview {...makeProps({ result, onRefresh })} />);
    fireEvent.click(screen.getByText('Refresh from TMDB'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isPending', () => {
    const result = { ...baseResult, existsInDb: true, existingId: 'actor-1' } as typeof baseResult;
    render(<PersonPreview {...makeProps({ result, isPending: true })} />);
    expect(screen.getByText('Refresh from TMDB').closest('button')).toBeDisabled();
  });

  it('renders close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<PersonPreview {...makeProps({ onClose })} />);
    fireEvent.click(screen.getByLabelText('Close details'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(<PersonPreview {...makeProps()} />);
    expect(screen.queryByLabelText('Close details')).not.toBeInTheDocument();
  });

  describe('isReadOnly', () => {
    it('hides Import Actor button when isReadOnly', () => {
      render(<PersonPreview {...makeProps({ isReadOnly: true })} />);
      expect(screen.queryByText('Import Actor')).not.toBeInTheDocument();
    });

    it('hides Refresh from TMDB button when isReadOnly', () => {
      const result = { ...baseResult, existsInDb: true, existingId: 'actor-1' } as typeof baseResult;
      render(<PersonPreview {...makeProps({ result, isReadOnly: true })} />);
      expect(screen.queryByText('Refresh from TMDB')).not.toBeInTheDocument();
    });

    it('still shows database status when isReadOnly', () => {
      render(<PersonPreview {...makeProps({ isReadOnly: true })} />);
      expect(screen.getByText('Not in database')).toBeInTheDocument();
    });

    it('shows buttons when isReadOnly is false', () => {
      render(<PersonPreview {...makeProps({ isReadOnly: false })} />);
      expect(screen.getByText('Import Actor')).toBeInTheDocument();
    });
  });
});
