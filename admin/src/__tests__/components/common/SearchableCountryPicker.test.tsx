import { render, screen, fireEvent } from '@testing-library/react';
import { SearchableCountryPicker } from '@/components/common/SearchableCountryPicker';

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockCountries = [
  { code: 'IN', name: 'India', display_order: 1 },
  { code: 'US', name: 'United States', display_order: 2 },
  { code: 'GB', name: 'United Kingdom', display_order: 3 },
  { code: 'JP', name: 'Japan', display_order: 4 },
];

describe('SearchableCountryPicker', () => {
  const onSelect = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    expect(screen.getByPlaceholderText('Search country...')).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows all countries initially', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    expect(screen.getByText('India')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.getByText('Japan')).toBeInTheDocument();
  });

  it('filters countries by search query', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.change(input, { target: { value: 'Japan' } });
    expect(screen.getByText('Japan')).toBeInTheDocument();
    expect(screen.queryByText('India')).not.toBeInTheDocument();
    expect(screen.queryByText('United States')).not.toBeInTheDocument();
  });

  it('filters by country code', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.change(input, { target: { value: 'JP' } });
    expect(screen.getByText('Japan')).toBeInTheDocument();
    expect(screen.queryByText('India')).not.toBeInTheDocument();
  });

  it('hides list when search returns no results', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.change(input, { target: { value: 'zzzzz' } });
    expect(screen.queryByText('India')).not.toBeInTheDocument();
    expect(screen.queryByText('Japan')).not.toBeInTheDocument();
  });

  it('calls onSelect when a country is clicked', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const buttons = screen.getAllByRole('button');
    const usOption = buttons.find((b) => b.textContent?.includes('United States'));
    fireEvent.click(usOption!);
    expect(onSelect).toHaveBeenCalledWith('US');
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('selects via Enter key on highlighted item', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    // First item is highlighted by default (India)
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('IN');
  });

  it('navigates with ArrowDown and selects with Enter', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('US');
  });

  it('navigates with ArrowUp', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('US');
  });

  it('does not go below last item', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    // Press ArrowDown more times than items
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('JP'); // last item
  });

  it('does not go above first item', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('IN'); // first item
  });

  it('renders empty list for empty countries array', () => {
    render(<SearchableCountryPicker countries={[]} onSelect={onSelect} onCancel={onCancel} />);
    expect(screen.getByPlaceholderText('Search country...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /India/ })).not.toBeInTheDocument();
  });

  it('updates highlight on mouseEnter', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    // Hover over the third item (United Kingdom at index 2)
    const buttons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent?.includes('United Kingdom'));
    fireEvent.mouseEnter(buttons[0]);
    // Now press Enter - should select United Kingdom
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('GB');
  });

  it('does not call onSelect when Enter is pressed with empty filtered list', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.change(input, { target: { value: 'zzzzz' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores unrecognized keys', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(input, { key: 'Tab' });
    // No action taken
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('focuses the input on mount', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    expect(document.activeElement).toBe(input);
  });

  it('resets highlight index when search query changes', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    // Move highlight to 2nd item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Change query - should reset highlight to 0
    fireEvent.change(input, { target: { value: 'Uni' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Should select the first filtered item
    expect(onSelect).toHaveBeenCalledWith('US'); // 'United States' matches first
  });

  it('calls scrollIntoView on highlighted item', () => {
    render(
      <SearchableCountryPicker countries={mockCountries} onSelect={onSelect} onCancel={onCancel} />,
    );
    const input = screen.getByPlaceholderText('Search country...');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
