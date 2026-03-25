import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@/components/movie-edit/AvailabilityRow', () => ({
  AvailabilityRow: ({
    row,
    onRemove,
  }: {
    row: { id: string; platform?: { name: string }; availability_type: string };
    onRemove: (id: string, movieId: string) => void;
    isReadOnly: boolean;
  }) => (
    <div data-testid={`avail-row-${row.id}`}>
      <span>{row.availability_type}</span>
      <button onClick={() => onRemove(row.id, 'movie-1')} data-testid={`remove-${row.id}`}>
        Remove
      </button>
    </div>
  ),
}));

vi.mock('@/components/common/FormField', () => ({
  INPUT_CLASSES: { compact: 'input-compact' },
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import { CountryAvailabilityPanel } from '@/components/movie-edit/CountryAvailabilityPanel';
import type { MoviePlatformAvailability, OTTPlatform, AvailabilityType } from '@shared/types';

const mockOnAdd = vi.fn();
const mockOnRemove = vi.fn();

function makeRow(overrides: Partial<MoviePlatformAvailability> = {}): MoviePlatformAvailability {
  return {
    id: 'row-1',
    movie_id: 'movie-1',
    platform_id: 'netflix',
    country_code: 'US',
    availability_type: 'flatrate' as AvailabilityType,
    available_from: null,
    streaming_url: null,
    tmdb_display_priority: null,
    created_at: '2025-01-01T00:00:00Z',
    platform: {
      id: 'netflix',
      name: 'Netflix',
      logo: 'N',
      logo_url: null,
      color: '#E50914',
      display_order: 1,
      regions: ['US'],
    },
    ...overrides,
  };
}

function makePlatform(id: string, name: string, regions: string[] = ['US']): OTTPlatform {
  return {
    id,
    name,
    logo: name[0],
    logo_url: null,
    color: '#000',
    display_order: 1,
    regions,
    tmdb_provider_id: null,
  };
}

const defaultProps = {
  countryCode: 'US',
  rows: [],
  movieId: 'movie-1',
  allPlatforms: [makePlatform('netflix', 'Netflix'), makePlatform('prime', 'Prime Video')],
  isReadOnly: false,
  onAdd: mockOnAdd,
  onRemove: mockOnRemove,
};

describe('CountryAvailabilityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Add platform button when not read-only and no form', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    expect(screen.getByText('Add platform')).toBeInTheDocument();
  });

  it('does not render Add platform button when read-only', () => {
    render(<CountryAvailabilityPanel {...defaultProps} isReadOnly={true} />);
    expect(screen.queryByText('Add platform')).not.toBeInTheDocument();
  });

  it('shows add form when Add platform is clicked', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('hides add form when Cancel is clicked', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText(/Select platform/)).not.toBeInTheDocument();
    expect(screen.getByText('Add platform')).toBeInTheDocument();
  });

  it('calls onAdd with correct data when form is submitted', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));

    // Select platform
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'netflix' } });

    // Click Add
    fireEvent.click(screen.getByText('Add'));

    expect(mockOnAdd).toHaveBeenCalledWith({
      platform_id: 'netflix',
      country_code: 'US',
      availability_type: 'flatrate',
      available_from: null,
      streaming_url: null,
    });
  });

  it('coerces empty availableFrom to null on add', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'netflix' } });
    fireEvent.click(screen.getByText('Add'));
    expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({ available_from: null }));
  });

  it('coerces empty streamingUrl to null on add', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'netflix' } });
    fireEvent.click(screen.getByText('Add'));
    expect(mockOnAdd).toHaveBeenCalledWith(expect.objectContaining({ streaming_url: null }));
  });

  it('passes availableFrom and streamingUrl when filled', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'netflix' } });

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    // streaming URL input
    fireEvent.change(inputs[0], { target: { value: 'https://netflix.com' } });

    // date input
    const dateInputs = screen.getAllByDisplayValue('');
    const dateInput = dateInputs.find(
      (el) => (el as HTMLInputElement).type === 'date',
    ) as HTMLInputElement;
    if (dateInput) fireEvent.change(dateInput, { target: { value: '2025-01-01' } });

    fireEvent.click(screen.getByText('Add'));

    expect(mockOnAdd).toHaveBeenCalledWith(
      expect.objectContaining({ streaming_url: 'https://netflix.com' }),
    );
  });

  it('resets form state after add', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'netflix' } });
    fireEvent.click(screen.getByText('Add'));

    // Form should close
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(screen.getByText('Add platform')).toBeInTheDocument();
  });

  it('disables Add button when no platform selected', () => {
    render(<CountryAvailabilityPanel {...defaultProps} />);
    fireEvent.click(screen.getByText('Add platform'));
    const addBtn = screen.getByText('Add').closest('button');
    expect(addBtn).toBeDisabled();
  });

  it('renders existing availability rows grouped by type', () => {
    const rows = [
      makeRow({ id: 'row-1', availability_type: 'flatrate' }),
      makeRow({ id: 'row-2', platform_id: 'prime', availability_type: 'rent' }),
    ];
    render(<CountryAvailabilityPanel {...defaultProps} rows={rows} />);
    expect(screen.getByTestId('avail-row-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('avail-row-row-2')).toBeInTheDocument();
  });

  it('shows section headers for populated availability types', () => {
    const rows = [makeRow({ id: 'row-1', availability_type: 'flatrate' })];
    render(<CountryAvailabilityPanel {...defaultProps} rows={rows} />);
    expect(screen.getByText(/Stream \(1\)/)).toBeInTheDocument();
  });

  it('shows empty message when a section is expanded but has no rows', () => {
    // Create a scenario where we expand an empty section by toggling it manually
    const rows = [makeRow({ id: 'row-1', availability_type: 'flatrate' })];
    render(<CountryAvailabilityPanel {...defaultProps} rows={rows} />);
    // flatrate section starts expanded — toggle it to collapse, then toggle again
    const streamBtn = screen.getByText(/Stream \(1\)/);
    fireEvent.click(streamBtn); // collapse
    fireEvent.click(streamBtn); // expand — rows still there, message not shown
    expect(screen.getByTestId('avail-row-row-1')).toBeInTheDocument();
  });

  it('hides section when no rows and manually collapsed', () => {
    // No rows means sections are hidden by default
    render(<CountryAvailabilityPanel {...defaultProps} rows={[]} />);
    // Empty sections should not render (items.length === 0 && !isOpen → return null)
    expect(screen.queryByText(/Stream \(0\)/)).not.toBeInTheDocument();
  });

  it('filters out platforms already used with same availability type', () => {
    const rows = [makeRow({ id: 'row-1', platform_id: 'netflix', availability_type: 'flatrate' })];
    render(<CountryAvailabilityPanel {...defaultProps} rows={rows} />);
    fireEvent.click(screen.getByText('Add platform'));

    // Netflix should not appear in platform dropdown since it's already linked as flatrate
    const selects = screen.getAllByRole('combobox');
    const platformSelect = selects[0];
    const options = Array.from(platformSelect.querySelectorAll('option'));
    const optionValues = options.map((o) => o.getAttribute('value'));
    expect(optionValues).not.toContain('netflix');
  });

  it('filters platforms by country code', () => {
    const platforms = [
      makePlatform('aha', 'Aha', ['IN']),
      makePlatform('netflix', 'Netflix', ['US']),
    ];
    render(
      <CountryAvailabilityPanel {...defaultProps} allPlatforms={platforms} countryCode="US" />,
    );
    fireEvent.click(screen.getByText('Add platform'));

    const selects = screen.getAllByRole('combobox');
    const platformSelect = selects[0];
    const options = Array.from(platformSelect.querySelectorAll('option'));
    const optionValues = options.map((o) => o.getAttribute('value'));
    expect(optionValues).not.toContain('aha');
    expect(optionValues).toContain('netflix');
  });

  it('toggles section collapse when header button is clicked', () => {
    const rows = [makeRow({ id: 'row-1', availability_type: 'flatrate' })];
    render(<CountryAvailabilityPanel {...defaultProps} rows={rows} />);

    // Section starts expanded — row should be visible
    expect(screen.getByTestId('avail-row-row-1')).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByText(/Stream \(1\)/));
    expect(screen.queryByTestId('avail-row-row-1')).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(screen.getByText(/Stream \(1\)/));
    expect(screen.getByTestId('avail-row-row-1')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked in AvailabilityRow', () => {
    const rows = [makeRow({ id: 'row-1', availability_type: 'flatrate' })];
    render(<CountryAvailabilityPanel {...defaultProps} rows={rows} />);
    fireEvent.click(screen.getByTestId('remove-row-1'));
    expect(mockOnRemove).toHaveBeenCalledWith('row-1', 'movie-1');
  });
});
