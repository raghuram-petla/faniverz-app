import { render, screen, fireEvent } from '@testing-library/react';
import { SectionNav, MOVIE_SECTIONS } from '@/components/movie-edit/SectionNav';

const defaultProps = { activeSection: 'basic-info', onSectionChange: vi.fn() };

describe('SectionNav', () => {
  it('renders all section pills', () => {
    render(<SectionNav {...defaultProps} />);
    MOVIE_SECTIONS.forEach((section) => {
      expect(screen.getByText(section.label)).toBeInTheDocument();
    });
  });

  it('highlights the active section pill', () => {
    render(<SectionNav {...defaultProps} activeSection="videos" />);
    const videosBtn = screen.getByText('Videos');
    expect(videosBtn.closest('button')?.className).toContain('bg-red-600');
  });

  it('does not highlight inactive pills', () => {
    render(<SectionNav {...defaultProps} activeSection="videos" />);
    const basicBtn = screen.getByText('Basic Info');
    expect(basicBtn.closest('button')?.className).not.toContain('bg-red-600');
  });

  it('calls onSectionChange when a pill is clicked', () => {
    const onSectionChange = vi.fn();
    render(<SectionNav {...defaultProps} onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByText('Releases'));
    expect(onSectionChange).toHaveBeenCalledWith('releases');
  });

  it('renders 7 section pills', () => {
    render(<SectionNav {...defaultProps} />);
    expect(MOVIE_SECTIONS).toHaveLength(7);
  });

  it('hides sections listed in hiddenSections', () => {
    render(<SectionNav {...defaultProps} hiddenSections={['tmdb-sync']} />);
    expect(screen.queryByText('TMDB Sync')).not.toBeInTheDocument();
    // Other sections still visible
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
  });

  it('shows all sections when hiddenSections is empty', () => {
    render(<SectionNav {...defaultProps} hiddenSections={[]} />);
    expect(screen.getByText('TMDB Sync')).toBeInTheDocument();
  });
});
