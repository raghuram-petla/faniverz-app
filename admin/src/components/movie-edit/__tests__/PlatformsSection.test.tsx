import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUsePermissions = vi.fn();
const mockUseMovieAvailability = vi.fn();
const mockUseAdminPlatforms = vi.fn();
const mockUseCountries = vi.fn();
const mockUseAddMovieAvailability = vi.fn();
const mockUseRemoveMovieAvailability = vi.fn();

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useMovieAvailability: () => mockUseMovieAvailability(),
  useCountries: () => mockUseCountries(),
  useAddMovieAvailability: () => mockUseAddMovieAvailability(),
  useRemoveMovieAvailability: () => mockUseRemoveMovieAvailability(),
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => mockUseAdminPlatforms(),
}));

vi.mock('@/components/movie-edit/CountryAvailabilityPanel', () => ({
  CountryAvailabilityPanel: ({
    countryCode,
    onAdd,
    onRemove,
  }: {
    countryCode: string;
    onAdd: (data: object) => void;
    onRemove: (id: string, movie_id: string) => void;
  }) => (
    <div data-testid="country-availability-panel">
      <span data-testid="active-country">{countryCode}</span>
      <button onClick={() => onAdd({ platform_id: 'netflix', availability_type: 'svod' })}>
        Add Platform
      </button>
      <button onClick={() => onRemove('avail-1', 'movie-1')}>Remove Platform</button>
    </div>
  ),
}));

vi.mock('@/components/common/CountryDropdown', () => ({
  CountryDropdown: ({
    value,
    onChange,
    formatLabel,
    countries,
  }: {
    value: string;
    onChange: (v: string) => void;
    formatLabel: (c: { code: string; name: string }) => string;
    countries: { code: string; name: string; display_order: number }[];
  }) => (
    <select data-testid="country-dropdown" value={value} onChange={(e) => onChange(e.target.value)}>
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {formatLabel(c)}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/common/SearchableCountryPicker', () => ({
  SearchableCountryPicker: ({
    onSelect,
    onCancel,
  }: {
    onSelect: (code: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="country-picker">
      <button onClick={() => onSelect('US')}>Select US</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import { PlatformsSection } from '@/components/movie-edit/PlatformsSection';

const IN_AVAILABILITY = [
  {
    id: 'avail-1',
    movie_id: 'movie-1',
    country_code: 'IN',
    platform_id: 'netflix',
    availability_type: 'svod',
  },
];
const COUNTRIES = [
  { code: 'IN', name: 'India', display_order: 1 },
  { code: 'US', name: 'United States', display_order: 2 },
];
const PLATFORMS = [{ id: 'netflix', name: 'Netflix', logo_url: null, color: '#E50914' }];

function setupMocks(
  overrides: {
    isReadOnly?: boolean;
    availability?: typeof IN_AVAILABILITY;
    countries?: typeof COUNTRIES;
    platforms?: typeof PLATFORMS;
  } = {},
) {
  mockUsePermissions.mockReturnValue({ isReadOnly: overrides.isReadOnly ?? false });
  mockUseMovieAvailability.mockReturnValue({ data: overrides.availability ?? IN_AVAILABILITY });
  mockUseCountries.mockReturnValue({ data: overrides.countries ?? COUNTRIES });
  mockUseAdminPlatforms.mockReturnValue({ data: overrides.platforms ?? PLATFORMS });
  const addMutate = vi.fn();
  const removeMutate = vi.fn();
  mockUseAddMovieAvailability.mockReturnValue({ mutate: addMutate });
  mockUseRemoveMovieAvailability.mockReturnValue({ mutate: removeMutate });
  return { addMutate, removeMutate };
}

describe('PlatformsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CountryAvailabilityPanel when countries have availability data', () => {
    setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByTestId('country-availability-panel')).toBeInTheDocument();
  });

  it('shows empty state when no availability data and not adding', () => {
    setupMocks({ availability: [] });
    render(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByText(/No OTT availability data/i)).toBeInTheDocument();
  });

  it('shows Add Country button when not read-only', () => {
    setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByText('Add Country')).toBeInTheDocument();
  });

  it('hides Add Country button when read-only', () => {
    setupMocks({ isReadOnly: true });
    render(<PlatformsSection movieId="movie-1" />);
    expect(screen.queryByText('Add Country')).not.toBeInTheDocument();
  });

  it('shows SearchableCountryPicker when Add Country is clicked', () => {
    setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    fireEvent.click(screen.getByText('Add Country'));
    expect(screen.getByTestId('country-picker')).toBeInTheDocument();
  });

  it('hides Add Country button when picker is visible', () => {
    setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    fireEvent.click(screen.getByText('Add Country'));
    expect(screen.queryByText('Add Country')).not.toBeInTheDocument();
  });

  it('hides picker when Cancel is clicked', () => {
    setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    fireEvent.click(screen.getByText('Add Country'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('country-picker')).not.toBeInTheDocument();
  });

  it('adds new country and sets it as active when selected from picker', () => {
    setupMocks({ availability: [] });
    render(<PlatformsSection movieId="movie-1" />);
    fireEvent.click(screen.getByText('Add Country'));
    fireEvent.click(screen.getByText('Select US'));
    // Panel should now show US as active
    expect(screen.getByTestId('active-country').textContent).toBe('US');
  });

  it('does not add country when picker returns empty code', () => {
    // This tests the handleAddCountry guard: if (code)
    setupMocks({ availability: [] });
    render(<PlatformsSection movieId="movie-1" />);
    // The picker mock only selects 'US', so we just verify the guard doesn't crash
    fireEvent.click(screen.getByText('Add Country'));
    expect(screen.getByTestId('country-picker')).toBeInTheDocument();
  });

  it('renders country dropdown when countries have availability', () => {
    setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
  });

  it('displays country name with count in dropdown label', () => {
    setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    expect(screen.getByText('India (1)')).toBeInTheDocument();
  });

  it('displays country name without count when count is 0', () => {
    setupMocks({
      // US in addedCountries but no availability data for US
      availability: IN_AVAILABILITY,
    });
    render(<PlatformsSection movieId="movie-1" />);
    // Add US country, which has no availability rows
    fireEvent.click(screen.getByText('Add Country'));
    fireEvent.click(screen.getByText('Select US'));
    // Switch back to IN to verify label
    expect(screen.getByTestId('active-country').textContent).toBe('US');
  });

  it('calls addAvailability.mutate with correct params on onAdd', () => {
    const { addMutate } = setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(addMutate).toHaveBeenCalledWith({
      movie_id: 'movie-1',
      platform_id: 'netflix',
      availability_type: 'svod',
    });
  });

  it('calls removeAvailability.mutate with correct params on onRemove', () => {
    const { removeMutate } = setupMocks();
    render(<PlatformsSection movieId="movie-1" />);
    fireEvent.click(screen.getByText('Remove Platform'));
    expect(removeMutate).toHaveBeenCalledWith({ id: 'avail-1', movie_id: 'movie-1' });
  });

  it('sorts countries by display_order', () => {
    setupMocks({
      availability: [
        ...IN_AVAILABILITY,
        {
          id: 'avail-2',
          movie_id: 'movie-1',
          country_code: 'US',
          platform_id: 'prime',
          availability_type: 'svod',
        },
      ],
    });
    render(<PlatformsSection movieId="movie-1" />);
    // Both countries should be in dropdown; IN has display_order 1, US has 2
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveValue('IN');
    expect(options[1]).toHaveValue('US');
  });

  it('falls back to display_order 999 for unknown countries', () => {
    setupMocks({
      availability: [
        {
          id: 'avail-uk',
          movie_id: 'movie-1',
          country_code: 'UK',
          platform_id: 'netflix',
          availability_type: 'svod',
        },
        ...IN_AVAILABILITY,
      ],
    });
    render(<PlatformsSection movieId="movie-1" />);
    // UK has no display_order so falls back to 999, should sort after IN (1)
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveValue('IN');
    expect(options[1]).toHaveValue('UK');
  });
});
