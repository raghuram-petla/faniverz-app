import { render, screen, fireEvent } from '@testing-library/react';
import { FieldDiffRow } from '@/components/sync/FieldDiffRow';

vi.mock('./fieldDiffHelpers', () => ({
  extractYouTubeId: (url: string | null) => {
    if (!url) return null;
    const m = url.match(/[?&]v=([^&]+)/);
    return m ? m[1] : null;
  },
}));

const defaultProps = {
  fieldKey: 'title' as const,
  label: 'Title',
  dbDisplay: 'DB Title',
  tmdbDisplay: 'TMDB Title',
  status: 'changed' as const,
  isApplied: false,
  isSelected: false,
  isSaving: false,
  rowBg: '',
  onToggle: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('FieldDiffRow', () => {
  it('renders field label and values', () => {
    render(
      <table>
        <tbody>
          <FieldDiffRow {...defaultProps} />
        </tbody>
      </table>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('DB Title')).toBeInTheDocument();
    expect(screen.getByText('TMDB Title')).toBeInTheDocument();
  });

  it('renders status text for non-applied fields', () => {
    render(
      <table>
        <tbody>
          <FieldDiffRow {...defaultProps} status="missing" />
        </tbody>
      </table>,
    );
    expect(screen.getByText('missing')).toBeInTheDocument();
  });

  it('shows checkbox as checked when isSelected', () => {
    render(
      <table>
        <tbody>
          <FieldDiffRow {...defaultProps} isSelected />
        </tbody>
      </table>,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('disables checkbox when isApplied', () => {
    render(
      <table>
        <tbody>
          <FieldDiffRow {...defaultProps} isApplied />
        </tbody>
      </table>,
    );
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('calls onToggle when checkbox clicked', () => {
    render(
      <table>
        <tbody>
          <FieldDiffRow {...defaultProps} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(defaultProps.onToggle).toHaveBeenCalledWith('title');
  });

  it('renders dash when dbDisplay is empty', () => {
    render(
      <table>
        <tbody>
          <FieldDiffRow {...defaultProps} dbDisplay="" />
        </tbody>
      </table>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders poster thumbnail when poster_url has dbMediaUrl', () => {
    const { container } = render(
      <table>
        <tbody>
          <FieldDiffRow
            {...defaultProps}
            fieldKey="poster_url"
            dbMediaUrl="https://example.com/poster.jpg"
          />
        </tbody>
      </table>,
    );
    const img = container.querySelector('img[src="https://example.com/poster.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('renders backdrop thumbnail when backdrop_url has dbMediaUrl', () => {
    const { container } = render(
      <table>
        <tbody>
          <FieldDiffRow
            {...defaultProps}
            fieldKey="backdrop_url"
            dbMediaUrl="https://example.com/backdrop.jpg"
          />
        </tbody>
      </table>,
    );
    const img = container.querySelector('img[src="https://example.com/backdrop.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('shows line-through styling when isApplied', () => {
    render(
      <table>
        <tbody>
          <FieldDiffRow {...defaultProps} isApplied />
        </tbody>
      </table>,
    );
    const labelCell = screen.getByText('Title');
    expect(labelCell.className).toContain('line-through');
  });
});
