import { render, screen, fireEvent } from '@testing-library/react';
import { SectionNav, MOVIE_SECTIONS } from '@/components/movie-edit/SectionNav';

const defaultProps = { activeSection: 'basic-info', onScrollTo: vi.fn() };

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

  it('calls onScrollTo when a pill is clicked', () => {
    const onScrollTo = vi.fn();
    render(<SectionNav {...defaultProps} onScrollTo={onScrollTo} />);
    fireEvent.click(screen.getByText('Posters'));
    expect(onScrollTo).toHaveBeenCalledWith('posters');
  });

  it('renders 7 section pills', () => {
    render(<SectionNav {...defaultProps} />);
    expect(MOVIE_SECTIONS).toHaveLength(7);
  });
});
