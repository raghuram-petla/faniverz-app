import { render, screen, fireEvent } from '@testing-library/react';
import { CountryDropdown } from '@/components/common/CountryDropdown';

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockCountries = [
  { code: 'IN', name: 'India', display_order: 1 },
  { code: 'US', name: 'United States', display_order: 2 },
  { code: 'GB', name: 'United Kingdom', display_order: 3 },
];

describe('CountryDropdown', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with selected country name', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    expect(screen.getByText(/India/)).toBeInTheDocument();
  });

  it('shows placeholder when no country is selected', () => {
    render(<CountryDropdown countries={mockCountries} value="" onChange={onChange} />);
    expect(screen.getByText('Select country\u2026')).toBeInTheDocument();
  });

  it('opens dropdown on button click', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Search country...')).toBeInTheDocument();
  });

  it('shows all countries when dropdown is open', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
  });

  it('filters countries by search query', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    fireEvent.change(searchInput, { target: { value: 'United' } });
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.queryByText('India')).not.toBeInTheDocument();
  });

  it('filters countries by country code', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    fireEvent.change(searchInput, { target: { value: 'GB' } });
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.queryByText('India')).not.toBeInTheDocument();
  });

  it('shows "No countries found" when search has no match', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } });
    expect(screen.getByText('No countries found')).toBeInTheDocument();
  });

  it('calls onChange when a country is clicked', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    // Click "United States" option
    const usButtons = screen.getAllByRole('button');
    const usOption = usButtons.find((b) => b.textContent?.includes('United States'));
    fireEvent.click(usOption!);
    expect(onChange).toHaveBeenCalledWith('US');
  });

  it('closes dropdown after selection', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const usButtons = screen.getAllByRole('button');
    const usOption = usButtons.find((b) => b.textContent?.includes('United States'));
    fireEvent.click(usOption!);
    expect(screen.queryByPlaceholderText('Search country...')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search country...')).not.toBeInTheDocument();
  });

  it('uses formatLabel when provided', () => {
    render(
      <CountryDropdown
        countries={mockCountries}
        value="IN"
        onChange={onChange}
        formatLabel={(c) => `${c.name} (5)`}
      />,
    );
    expect(screen.getByText(/India \(5\)/)).toBeInTheDocument();
  });

  it('navigates with arrow keys', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('US');
  });
});
