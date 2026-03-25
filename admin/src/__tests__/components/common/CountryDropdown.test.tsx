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

  it('navigates up with ArrowUp key', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    // Go down twice, then up once
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    // Should select the second item (US) since we went down 2 and up 1
    expect(onChange).toHaveBeenCalledWith('US');
  });

  it('closes dropdown on outside click', () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Search country...')).toBeInTheDocument();
    // Click outside the dropdown
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByPlaceholderText('Search country...')).not.toBeInTheDocument();
  });

  it('highlights option on mouse enter', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    // Find the US option button
    const allButtons = screen.getAllByRole('button');
    const usOption = allButtons.find((b) => b.textContent?.includes('United States'));
    expect(usOption).toBeTruthy();
    fireEvent.mouseEnter(usOption!);
    // After hover, pressing Enter should select the hovered item
    const searchInput = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('US');
  });

  it('uses renderIcon when provided', () => {
    render(
      <CountryDropdown
        countries={mockCountries}
        value="IN"
        onChange={onChange}
        renderIcon={(c) => <span data-testid={`icon-${c.code}`}>*</span>}
      />,
    );
    expect(screen.getByTestId('icon-IN')).toBeInTheDocument();
  });

  it('does not call onChange on Enter when no item is highlighted', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    // Filter to empty list
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } });
    // Press Enter with no valid highlight
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses formatLabel in dropdown list items', () => {
    render(
      <CountryDropdown
        countries={mockCountries}
        value="IN"
        onChange={onChange}
        formatLabel={(c) => `${c.name} (${c.code})`}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('United States (US)')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom (GB)')).toBeInTheDocument();
  });

  it('does not crash when outside click handler fires and dropdown is open', () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />
      </div>,
    );
    // Open dropdown then click outside
    fireEvent.click(screen.getByRole('button'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByPlaceholderText('Search country...')).not.toBeInTheDocument();
  });

  it('does not close dropdown when clicking inside the container', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    // Click inside the search input (inside the container) — should NOT close
    fireEvent.mouseDown(searchInput);
    expect(screen.getByPlaceholderText('Search country...')).toBeInTheDocument();
  });

  it('handles non-matching keyboard keys without error', () => {
    render(<CountryDropdown countries={mockCountries} value="IN" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search country...');
    // A random key should not throw or trigger selection
    fireEvent.keyDown(searchInput, { key: 'Tab' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
