import { render, screen, fireEvent } from '@testing-library/react';
import { ProductionHousesSection } from '@/components/movie-edit/ProductionHousesSection';
import type { ProductionHouse } from '@/lib/types';

const mockPH: ProductionHouse = {
  id: 'ph1',
  name: 'Mythri Movie Makers',
  logo_url: 'https://example.com/mythri.png',
  description: null,
  created_at: '2026-01-01',
};

const mockPHNoLogo: ProductionHouse = {
  id: 'ph2',
  name: 'Haarika & Hassine',
  logo_url: null,
  description: null,
  created_at: '2026-01-01',
};

const searchResults: ProductionHouse[] = [mockPH, mockPHNoLogo];

describe('ProductionHousesSection', () => {
  const defaultProps = {
    visibleProductionHouses: [] as {
      movie_id: string;
      production_house_id: string;
      production_house?: ProductionHouse;
    }[],
    productionHouses: searchResults,
    searchQuery: '',
    onSearchChange: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    pendingPHAdds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Add Production House" section', () => {
    render(<ProductionHousesSection {...defaultProps} />);
    expect(screen.getByText('Add Production House')).toBeInTheDocument();
  });

  it('renders search input with placeholder', () => {
    render(<ProductionHousesSection {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type to search…')).toBeInTheDocument();
  });

  it('calls onSearchChange when user types', () => {
    const onSearchChange = vi.fn();
    render(<ProductionHousesSection {...defaultProps} onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByPlaceholderText('Type to search…'), {
      target: { value: 'My' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('My');
  });

  it('shows dropdown with PH names when query >= 2 chars', () => {
    render(<ProductionHousesSection {...defaultProps} searchQuery="My" />);
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.getByText('Mythri Movie Makers')).toBeInTheDocument();
    expect(screen.getByText('Haarika & Hassine')).toBeInTheDocument();
  });

  it('does not show dropdown when query < 2 chars', () => {
    render(<ProductionHousesSection {...defaultProps} searchQuery="M" />);
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.queryByText('Mythri Movie Makers')).not.toBeInTheDocument();
  });

  it('shows "No matching production houses" when query >= 2 and no results', () => {
    render(<ProductionHousesSection {...defaultProps} productionHouses={[]} searchQuery="Xy" />);
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.getByText('No matching production houses')).toBeInTheDocument();
  });

  it('calls onAdd when a PH is clicked in dropdown', () => {
    const onAdd = vi.fn();
    render(<ProductionHousesSection {...defaultProps} onAdd={onAdd} searchQuery="My" />);
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    fireEvent.click(screen.getByText('Mythri Movie Makers'));
    expect(onAdd).toHaveBeenCalledWith({
      production_house_id: 'ph1',
      _ph: mockPH,
    });
  });

  it('clears search and closes dropdown after selection', () => {
    const onSearchChange = vi.fn();
    render(
      <ProductionHousesSection
        {...defaultProps}
        onSearchChange={onSearchChange}
        searchQuery="My"
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    fireEvent.click(screen.getByText('Mythri Movie Makers'));
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('renders visible PH with logo', () => {
    const { container } = render(
      <ProductionHousesSection
        {...defaultProps}
        visibleProductionHouses={[
          { movie_id: 'm1', production_house_id: 'ph1', production_house: mockPH },
        ]}
      />,
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'https://example.com/mythri_sm.png');
  });

  it('renders Building2 icon fallback when logo_url is null', () => {
    const { container } = render(
      <ProductionHousesSection
        {...defaultProps}
        visibleProductionHouses={[
          { movie_id: 'm1', production_house_id: 'ph2', production_house: mockPHNoLogo },
        ]}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Haarika & Hassine')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', () => {
    const onRemove = vi.fn();
    render(
      <ProductionHousesSection
        {...defaultProps}
        onRemove={onRemove}
        visibleProductionHouses={[
          { movie_id: 'm1', production_house_id: 'ph1', production_house: mockPH },
        ]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Mythri Movie Makers'));
    expect(onRemove).toHaveBeenCalledWith('ph1', false);
  });

  it('passes isPending=true for pending PH removes', () => {
    const onRemove = vi.fn();
    render(
      <ProductionHousesSection
        {...defaultProps}
        onRemove={onRemove}
        visibleProductionHouses={[
          { movie_id: 'm1', production_house_id: 'ph1', production_house: mockPH },
        ]}
        pendingPHAdds={[{ production_house_id: 'ph1', _ph: mockPH }]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Mythri Movie Makers'));
    expect(onRemove).toHaveBeenCalledWith('ph1', true);
  });

  it('excludes already-added PHs from dropdown', () => {
    render(
      <ProductionHousesSection
        {...defaultProps}
        searchQuery="My"
        visibleProductionHouses={[
          { movie_id: 'm1', production_house_id: 'ph1', production_house: mockPH },
        ]}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    // Mythri shows in the visible list but NOT as a dropdown button
    const dropdownButtons = screen.getAllByRole('button');
    const dropdownPHButtons = dropdownButtons.filter(
      (b) => b.textContent?.includes('Mythri Movie Makers') && b.hasAttribute('data-dropdown-item'),
    );
    expect(dropdownPHButtons).toHaveLength(0);
  });

  it('shows quick-add button when no results and onQuickAdd provided', () => {
    render(
      <ProductionHousesSection
        {...defaultProps}
        productionHouses={[]}
        searchQuery="New Studio"
        onQuickAdd={vi.fn()}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.getByText('Create "New Studio"')).toBeInTheDocument();
  });

  it('does not show quick-add when onQuickAdd is not provided', () => {
    render(
      <ProductionHousesSection {...defaultProps} productionHouses={[]} searchQuery="New Studio" />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
  });

  it('calls onQuickAdd with trimmed name', () => {
    const onQuickAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductionHousesSection
        {...defaultProps}
        productionHouses={[]}
        searchQuery="  New Studio  "
        onQuickAdd={onQuickAdd}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    fireEvent.click(screen.getByText('Create "New Studio"'));
    expect(onQuickAdd).toHaveBeenCalledWith('New Studio');
  });

  it('shows "Creating…" when quickAddPending is true', () => {
    render(
      <ProductionHousesSection
        {...defaultProps}
        productionHouses={[]}
        searchQuery="New Studio"
        onQuickAdd={vi.fn()}
        quickAddPending={true}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.getByText('Creating…')).toBeInTheDocument();
  });

  it('selects PH with ArrowDown + Enter', () => {
    const onAdd = vi.fn();
    render(<ProductionHousesSection {...defaultProps} onAdd={onAdd} searchQuery="My" />);
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAdd).toHaveBeenCalledWith({
      production_house_id: 'ph1',
      _ph: mockPH,
    });
  });

  it('navigates to second PH with two ArrowDown presses', () => {
    const onAdd = vi.fn();
    render(<ProductionHousesSection {...defaultProps} onAdd={onAdd} searchQuery="My" />);
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAdd).toHaveBeenCalledWith({
      production_house_id: 'ph2',
      _ph: mockPHNoLogo,
    });
  });

  it('wraps around with ArrowUp from top', () => {
    const onAdd = vi.fn();
    render(<ProductionHousesSection {...defaultProps} onAdd={onAdd} searchQuery="My" />);
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAdd).toHaveBeenCalledWith({
      production_house_id: 'ph2',
      _ph: mockPHNoLogo,
    });
  });

  it('closes dropdown on Escape', () => {
    render(<ProductionHousesSection {...defaultProps} searchQuery="My" />);
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    expect(screen.getByText('Mythri Movie Makers')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Mythri Movie Makers')).not.toBeInTheDocument();
  });

  it('selects quick-add with keyboard when no results', () => {
    const onQuickAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductionHousesSection
        {...defaultProps}
        productionHouses={[]}
        searchQuery="New Studio"
        onQuickAdd={onQuickAdd}
      />,
    );
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onQuickAdd).toHaveBeenCalledWith('New Studio');
  });
});
