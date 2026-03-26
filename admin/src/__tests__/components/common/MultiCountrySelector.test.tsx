import { render, screen, fireEvent } from '@testing-library/react';
import { MultiCountrySelector } from '@/components/common/MultiCountrySelector';
import type { Country } from '@shared/types';

vi.mock('@/components/common/CountryDropdown', () => ({
  countryFlag: (code: string) => `[${code}]`,
}));

const countries: Country[] = [
  { code: 'IN', name: 'India', display_order: 1 },
  { code: 'US', name: 'United States', display_order: 2 },
  { code: 'GB', name: 'United Kingdom', display_order: 3 },
];

describe('MultiCountrySelector', () => {
  it('renders all countries with checkboxes', () => {
    render(
      <MultiCountrySelector countries={countries} selectedCodes={new Set()} onChange={vi.fn()} />,
    );
    expect(screen.getByText(/India/)).toBeInTheDocument();
    expect(screen.getByText(/United States/)).toBeInTheDocument();
    expect(screen.getByText(/United Kingdom/)).toBeInTheDocument();
  });

  it('shows "All" checkbox with country count', () => {
    render(
      <MultiCountrySelector countries={countries} selectedCodes={new Set()} onChange={vi.fn()} />,
    );
    expect(screen.getByText('All (3)')).toBeInTheDocument();
  });

  it('toggles "All" checkbox to select all countries', () => {
    const onChange = vi.fn();
    render(
      <MultiCountrySelector countries={countries} selectedCodes={new Set()} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText('All (3)'));
    expect(onChange).toHaveBeenCalledWith(new Set(['IN', 'US', 'GB']));
  });

  it('toggles "All" checkbox to deselect when all selected', () => {
    const onChange = vi.fn();
    render(
      <MultiCountrySelector
        countries={countries}
        selectedCodes={new Set(['IN', 'US', 'GB'])}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('All (3)'));
    expect(onChange).toHaveBeenCalledWith(new Set());
  });

  it('toggles individual country checkbox', () => {
    const onChange = vi.fn();
    render(
      <MultiCountrySelector
        countries={countries}
        selectedCodes={new Set(['IN'])}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText(/United States/));
    expect(onChange).toHaveBeenCalledWith(new Set(['IN', 'US']));
  });

  it('deselects individual country checkbox', () => {
    const onChange = vi.fn();
    render(
      <MultiCountrySelector
        countries={countries}
        selectedCodes={new Set(['IN', 'US'])}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText(/India/));
    expect(onChange).toHaveBeenCalledWith(new Set(['US']));
  });

  it('filters countries by search query', () => {
    render(
      <MultiCountrySelector countries={countries} selectedCodes={new Set()} onChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'united' } });
    expect(screen.queryByText(/India/)).not.toBeInTheDocument();
    expect(screen.getByText(/United States/)).toBeInTheDocument();
    expect(screen.getByText(/United Kingdom/)).toBeInTheDocument();
  });

  it('shows selected count when not all selected', () => {
    render(
      <MultiCountrySelector
        countries={countries}
        selectedCodes={new Set(['IN', 'US'])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('does not show selected count when all selected', () => {
    render(
      <MultiCountrySelector
        countries={countries}
        selectedCodes={new Set(['IN', 'US', 'GB'])}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('shows empty message when search finds nothing', () => {
    render(
      <MultiCountrySelector countries={countries} selectedCodes={new Set()} onChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'zzz' } });
    expect(screen.getByText('No countries found')).toBeInTheDocument();
  });
});
