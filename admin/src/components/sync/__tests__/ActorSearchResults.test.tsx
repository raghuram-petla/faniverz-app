import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockLookupMutate = vi.fn();
const mockLookupReset = vi.fn();
const mockImportActorMutateAsync = vi.fn();
const mockRefreshActorMutateAsync = vi.fn();

const mockUseTmdbLookup = vi.fn();
const mockUseImportActor = vi.fn();
const mockUseRefreshActor = vi.fn();

vi.mock('@/hooks/useSync', () => ({
  useTmdbLookup: () => mockUseTmdbLookup(),
  useImportActor: () => mockUseImportActor(),
  useRefreshActor: () => mockUseRefreshActor(),
}));

vi.mock('@/components/sync/PersonPreview', () => ({
  PersonPreview: ({
    result,
    onClose,
    onImport,
    onRefresh,
    isPending,
  }: {
    result: { data: { name: string; tmdbPersonId: number }; existsInDb?: boolean };
    onClose: () => void;
    onImport?: () => void;
    onRefresh: () => void;
    isPending: boolean;
  }) => (
    <div data-testid="person-preview">
      <span data-testid="preview-name">{result.data.name}</span>
      <span data-testid="exists-in-db">{result.existsInDb ? 'true' : 'false'}</span>
      <span data-testid="is-pending">{isPending ? 'true' : 'false'}</span>
      <button onClick={onClose} data-testid="close-preview">
        Close
      </button>
      {onImport && (
        <button onClick={onImport} data-testid="import-btn">
          Import
        </button>
      )}
      <button onClick={onRefresh} data-testid="refresh-btn">
        Refresh
      </button>
    </div>
  ),
}));

import { ActorSearchResults } from '@/components/sync/ActorSearchResults';

const makeActor = (id: number, name: string, profilePath: string | null = null) => ({
  id,
  name,
  profile_path: profilePath,
  known_for_department: 'Acting',
});

describe('ActorSearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: undefined,
      isPending: false,
    });
    mockUseImportActor.mockReturnValue({
      mutateAsync: mockImportActorMutateAsync,
      isPending: false,
      isSuccess: false,
      data: undefined,
    });
    mockUseRefreshActor.mockReturnValue({
      mutateAsync: mockRefreshActorMutateAsync,
      isPending: false,
      isSuccess: false,
      data: undefined,
    });
  });

  it('renders section heading with actor count', () => {
    const actors = [makeActor(1, 'Actor One'), makeActor(2, 'Actor Two')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    expect(screen.getByText('Actors (2)')).toBeInTheDocument();
  });

  it('renders all actors by name', () => {
    const actors = [makeActor(1, 'Alice'), makeActor(2, 'Bob')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows "In DB" badge for actors in existingSet', () => {
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set([1])} />);
    expect(screen.getByText('In DB')).toBeInTheDocument();
  });

  it('shows "Not in DB" badge for actors not in existingSet', () => {
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    expect(screen.getByText('Not in DB')).toBeInTheDocument();
  });

  it('shows profile image when profile_path is present', () => {
    const actors = [makeActor(1, 'Alice', '/path.jpg')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    expect(screen.getByAltText('Alice')).toBeInTheDocument();
  });

  it('shows placeholder icon when profile_path is null', () => {
    const actors = [makeActor(1, 'Alice', null)];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    // no img tag rendered for Alice
    expect(screen.queryByAltText('Alice')).not.toBeInTheDocument();
  });

  it('shows known_for_department for each actor', () => {
    const actors = [{ ...makeActor(1, 'Alice'), known_for_department: 'Directing' }];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    expect(screen.getByText('Directing')).toBeInTheDocument();
  });

  it('shows "Unknown" when known_for_department is missing', () => {
    const actors = [
      {
        id: 1,
        name: 'Alice',
        profile_path: null,
        known_for_department: undefined as unknown as string,
      },
    ];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('calls lookup.mutate when Details is clicked', () => {
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(mockLookupMutate).toHaveBeenCalledWith({ tmdbId: 1, type: 'person' });
  });

  it('shows Loading... when lookup is pending for the selected actor', async () => {
    // We need to simulate: actor is selected (selectedTmdbId=1) AND lookup.isPending=true
    // This is achieved by first clicking when not pending to set selectedTmdbId,
    // then re-rendering with isPending=true. We use a re-render approach.
    let isPending = false;
    mockUseTmdbLookup.mockImplementation(() => ({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: undefined,
      isPending,
    }));
    const actors = [makeActor(1, 'Alice')];
    const { rerender } = render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    // Click "Details" to set selectedTmdbId=1
    fireEvent.click(screen.getByText('Details'));
    // Now simulate pending=true
    isPending = true;
    rerender(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows "Hide" button for selected actor', () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });

  it('hides PersonPreview and resets lookup when Hide/close is clicked', () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByTestId('person-preview')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide'));
    expect(screen.queryByTestId('person-preview')).not.toBeInTheDocument();
    expect(mockLookupReset).toHaveBeenCalled();
  });

  it('renders PersonPreview when actor is selected and lookupResult type is person', () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByTestId('person-preview')).toBeInTheDocument();
    expect(screen.getByTestId('preview-name').textContent).toBe('Alice');
  });

  it('calls importActor.mutateAsync on import and marks actor as In DB', async () => {
    mockImportActorMutateAsync.mockResolvedValue({});
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    fireEvent.click(screen.getByTestId('import-btn'));
    await waitFor(() => {
      expect(mockImportActorMutateAsync).toHaveBeenCalledWith(1);
    });
  });

  it('after import, PersonPreview receives existsInDb: true', async () => {
    mockImportActorMutateAsync.mockResolvedValue({});
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    fireEvent.click(screen.getByTestId('import-btn'));
    await waitFor(() => {
      // After import, importedIds includes tmdbPersonId=1, so preview passes existsInDb: true
      expect(screen.getByTestId('exists-in-db').textContent).toBe('true');
    });
  });

  it('handleRefresh skips when lookupResult is missing', async () => {
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: undefined,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    // No panel open, so refresh button is not rendered — just ensure no crash
    expect(screen.queryByTestId('refresh-btn')).not.toBeInTheDocument();
  });

  it('calls refreshActor.mutateAsync with existingId when refresh is clicked', async () => {
    mockRefreshActorMutateAsync.mockResolvedValue({});
    const lookupResult = {
      type: 'person' as const,
      existsInDb: true,
      existingId: 'actor-db-uuid',
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    fireEvent.click(screen.getByTestId('refresh-btn'));
    await waitFor(() => {
      expect(mockRefreshActorMutateAsync).toHaveBeenCalledWith('actor-db-uuid');
    });
  });

  it('shows import success banner when importActor.isSuccess is true', () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    mockUseImportActor.mockReturnValue({
      mutateAsync: mockImportActorMutateAsync,
      isPending: false,
      isSuccess: true,
      data: { result: { name: 'Alice' } },
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByText(/Actor imported: Alice/)).toBeInTheDocument();
  });

  it('shows refresh success banner when refreshActor.isSuccess is true', () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: true,
      existingId: 'actor-db-uuid',
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    mockUseRefreshActor.mockReturnValue({
      mutateAsync: mockRefreshActorMutateAsync,
      isPending: false,
      isSuccess: true,
      data: { result: { fields: ['name', 'photo'] } },
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByText(/Actor refreshed/)).toBeInTheDocument();
    expect(screen.getByText(/name, photo/)).toBeInTheDocument();
  });

  it('shows "none" in refresh banner when fields array is empty', () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: true,
      existingId: 'actor-db-uuid',
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    mockUseRefreshActor.mockReturnValue({
      mutateAsync: mockRefreshActorMutateAsync,
      isPending: false,
      isSuccess: true,
      data: { result: { fields: [] } },
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(screen.getByText(/none/)).toBeInTheDocument();
  });

  it('highlights selected actor card with red border', () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    const { container } = render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    const cards = container.querySelectorAll('.border-red-600');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('does not show PersonPreview when lookupResult type is movie', () => {
    const lookupResult = {
      type: 'movie' as const,
      existsInDb: false,
      existingId: null,
      data: {},
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    expect(screen.queryByTestId('person-preview')).not.toBeInTheDocument();
  });

  it('handleRefresh skips when lookupResult type is not person', async () => {
    const lookupResult = {
      type: 'person' as const,
      existsInDb: false,
      existingId: null,
      data: {
        name: 'Alice',
        tmdbPersonId: 1,
        photoUrl: null,
        biography: null,
        birthday: null,
        placeOfBirth: null,
      },
    };
    mockUseTmdbLookup.mockReturnValue({
      mutate: mockLookupMutate,
      reset: mockLookupReset,
      data: lookupResult,
      isPending: false,
    });
    const actors = [makeActor(1, 'Alice')];
    render(<ActorSearchResults actors={actors} existingSet={new Set()} />);
    fireEvent.click(screen.getByText('Details'));
    fireEvent.click(screen.getByTestId('refresh-btn'));
    // existingId is null → handleRefresh returns early
    expect(mockRefreshActorMutateAsync).not.toHaveBeenCalled();
  });
});
