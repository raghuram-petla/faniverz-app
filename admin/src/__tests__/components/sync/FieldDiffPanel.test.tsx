import { render, screen, fireEvent } from '@testing-library/react';
import { FieldDiffPanel } from '@/components/sync/FieldDiffPanel';
import type { ExistingMovieData } from '@/hooks/useSync';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

const makeMovie = (overrides: Partial<ExistingMovieData> = {}): ExistingMovieData => ({
  id: 'uuid-1',
  tmdb_id: 101,
  title: 'Baahubali',
  synopsis: null,
  poster_url: null,
  backdrop_url: null,
  trailer_url: null,
  director: null,
  runtime: null,
  genres: null,
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  certification: null,
  spoken_languages: null,
  ...overrides,
});

const makeTmdb = (overrides = {}) => ({
  tmdbId: 101,
  title: 'Baahubali: The Beginning',
  overview: 'An epic tale',
  releaseDate: '2015-07-10',
  runtime: 159,
  genres: ['Action', 'Drama'],
  posterUrl: '/p.jpg',
  backdropUrl: '/b.jpg',
  director: 'S. S. Rajamouli',
  trailerUrl: 'https://www.youtube.com/watch?v=sOEg_YZQsTI',
  castCount: 15,
  crewCount: 5,
  posterCount: 0,
  backdropCount: 0,
  videoCount: 0,
  providerNames: [],
  keywordCount: 0,
  imdbId: null,
  titleTe: null,
  synopsisTe: null,
  tagline: null,
  tmdbStatus: null,
  tmdbVoteAverage: null,
  tmdbVoteCount: null,
  budget: null,
  revenue: null,
  certification: null,
  spokenLanguages: [],
  productionCompanyCount: 0,
  ...overrides,
});

describe('FieldDiffPanel', () => {
  it('renders table headers', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getAllByText('In Faniverz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In TMDB').length).toBeGreaterThan(0);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('pre-checks missing fields (synopsis, poster, etc.)', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // synopsis is missing → checkbox pre-checked
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // At least some checkboxes should be checked (missing fields)
    expect(checkboxes.some((c) => c.checked)).toBe(true);
  });

  it('hides rows with "same" status (only actionable rows shown)', () => {
    const movie = makeMovie({ title: 'Baahubali: The Beginning' });
    const tmdb = makeTmdb({ title: 'Baahubali: The Beginning' });
    render(
      <FieldDiffPanel
        movie={movie}
        tmdb={tmdb}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // Title is identical — its row should not appear
    expect(screen.queryByText('same')).not.toBeInTheDocument();
  });

  it('shows "changed" status when DB and TMDB differ', () => {
    const movie = makeMovie({ title: 'Old Title', director: 'Wrong Director' });
    render(
      <FieldDiffPanel
        movie={movie}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    const changedLabels = screen.getAllByText('changed');
    expect(changedLabels.length).toBeGreaterThan(0);
  });

  it('shows "missing" status label for null DB fields', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    const missingLabels = screen.getAllByText('missing');
    expect(missingLabels.length).toBeGreaterThan(0);
  });

  it('shows TMDB director value in table', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('S. S. Rajamouli')).toBeInTheDocument();
  });

  it('shows cast count from TMDB', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('15 cast · 5 crew from TMDB')).toBeInTheDocument();
  });

  it('calls onApply with selected fields when Apply button is clicked', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));
    expect(onApply).toHaveBeenCalled();
    const [fields, forceResyncCast] = onApply.mock.calls[0];
    expect(Array.isArray(fields)).toBe(true);
    expect(forceResyncCast).toBe(false);
  });

  it('disables Apply button when no fields are selected', () => {
    // All fields filled → all "same" → nothing pre-checked → button disabled
    const full = makeMovie({
      title: 'Baahubali: The Beginning',
      synopsis: 'An epic tale',
      poster_url: '/r2/poster.jpg',
      backdrop_url: '/r2/backdrop.jpg',
      trailer_url: 'https://youtu.be/yt',
      director: 'S. S. Rajamouli',
      runtime: 159,
      genres: ['Action', 'Drama'],
      certification: 'UA',
    });
    const tmdb = makeTmdb({
      title: 'Baahubali: The Beginning',
      overview: 'An epic tale',
      runtime: 159,
      genres: ['Action', 'Drama'],
      director: 'S. S. Rajamouli',
    });
    render(
      <FieldDiffPanel
        movie={full}
        tmdb={tmdb}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // Apply button is hidden entirely when no fields are actionable
    expect(screen.queryByRole('button', { name: /Apply/i })).not.toBeInTheDocument();
  });

  it('passes forceResyncCast=true when cast re-sync checkbox is checked', () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={onApply}
      />,
    );
    // Find and check the cast re-sync checkbox
    const castCheckbox = screen.getByRole('checkbox', {
      name: /Re-sync cast/i,
    }) as HTMLInputElement;
    fireEvent.click(castCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));
    expect(onApply).toHaveBeenCalled();
    const [, forceResyncCast] = onApply.mock.calls[0];
    expect(forceResyncCast).toBe(true);
  });

  it('shows applied fields with strikethrough and checkmark', () => {
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={['synopsis']}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // Synopsis label should have line-through class
    const synopsisLabel = screen.getByText('Synopsis');
    expect(synopsisLabel.className).toContain('line-through');
  });

  it('toggles a field checkbox selection on and off', () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <FieldDiffPanel
        movie={makeMovie()}
        tmdb={makeTmdb()}
        appliedFields={[]}
        isSaving={false}
        onApply={onApply}
      />,
    );
    // Find checkboxes — missing fields are pre-checked
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // The non-resync checkboxes (all except last which is "Re-sync cast & crew")
    const fieldCheckboxes = checkboxes.filter((c) => !c.id.startsWith('cast-resync'));
    // Find a pre-checked one and uncheck it
    const checkedBox = fieldCheckboxes.find((c) => c.checked);
    if (checkedBox) {
      fireEvent.click(checkedBox);
      expect(checkedBox.checked).toBe(false);
      // Toggle back on
      fireEvent.click(checkedBox);
      expect(checkedBox.checked).toBe(true);
    }
  });

  it('shows unchanged fields when "Show N unchanged fields" is clicked', () => {
    // Create a movie where title matches TMDB, so it's "same"
    const movie = makeMovie({ title: 'Baahubali: The Beginning' });
    const tmdb = makeTmdb({ title: 'Baahubali: The Beginning' });
    render(
      <FieldDiffPanel
        movie={movie}
        tmdb={tmdb}
        appliedFields={[]}
        isSaving={false}
        onApply={vi.fn()}
      />,
    );
    // There should be a "Show N unchanged fields" button
    const showBtn = screen.getByText(/Show.*unchanged field/);
    expect(showBtn).toBeInTheDocument();
    fireEvent.click(showBtn);
    // Now it should say "Hide N unchanged fields"
    expect(screen.getByText(/Hide.*unchanged field/)).toBeInTheDocument();
  });

  it('does not call onApply when no fields selected and forceResyncCast is false', () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    // All fields are same — no pre-checked checkboxes
    const full = makeMovie({
      title: 'Baahubali: The Beginning',
      synopsis: 'An epic tale',
      poster_url: '/r2/poster.jpg',
      backdrop_url: '/r2/backdrop.jpg',
      trailer_url: 'https://youtu.be/yt',
      director: 'S. S. Rajamouli',
      runtime: 159,
      genres: ['Action', 'Drama'],
    });
    const tmdb = makeTmdb({
      title: 'Baahubali: The Beginning',
      overview: 'An epic tale',
      runtime: 159,
      genres: ['Action', 'Drama'],
      director: 'S. S. Rajamouli',
    });
    render(
      <FieldDiffPanel
        movie={full}
        tmdb={tmdb}
        appliedFields={[]}
        isSaving={false}
        onApply={onApply}
      />,
    );
    // Apply button should not be visible since nothing is selectable
    expect(screen.queryByRole('button', { name: /Apply/i })).not.toBeInTheDocument();
  });
});
