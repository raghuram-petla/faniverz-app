import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: vi.fn((url: string) => url || null),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

import { ProductionHousesSection } from '@/components/movie-edit/ProductionHousesSection';
import type { ProductionHouse } from '@/lib/types';

function makePH(overrides: Partial<ProductionHouse> = {}): ProductionHouse {
  return {
    id: 'ph-1',
    name: 'Arka Media Works',
    logo_url: null,
    description: null,
    origin_country: null,
    tmdb_company_id: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeVisiblePH(ph: ProductionHouse, movieId = 'movie-1') {
  return {
    movie_id: movieId,
    production_house_id: ph.id,
    production_house: ph,
  };
}

const defaultProps = {
  visibleProductionHouses: [],
  productionHouses: [
    makePH({ id: 'ph-1', name: 'Arka Media Works' }),
    makePH({ id: 'ph-2', name: 'Mythri Movie Makers' }),
  ],
  searchQuery: '',
  onSearchChange: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  pendingPHAdds: [],
  showAddForm: false,
  onCloseAddForm: vi.fn(),
};

describe('ProductionHousesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render add form when showAddForm is false', () => {
    render(<ProductionHousesSection {...defaultProps} />);
    expect(screen.queryByPlaceholderText('Type to search…')).not.toBeInTheDocument();
  });

  it('renders search input when showAddForm is true', () => {
    render(<ProductionHousesSection {...defaultProps} showAddForm={true} />);
    expect(screen.getByPlaceholderText('Type to search…')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn();
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        onSearchChange={onSearchChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Type to search…'), {
      target: { value: 'Arka' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('Arka');
  });

  it('shows dropdown when searchQuery >= 2 chars and input is focused', () => {
    render(<ProductionHousesSection {...defaultProps} showAddForm={true} searchQuery="Ar" />);
    const input = screen.getByPlaceholderText('Type to search…');
    fireEvent.focus(input);
    // Dropdown should show with both PHs (no filter match check since query is controlled externally)
    // dropdown appears when showDropdown is true (dropdownOpen && searchQuery.length >= 2)
    expect(screen.getByText('Arka Media Works')).toBeInTheDocument();
  });

  it('calls onAdd and closes form when a PH is selected from dropdown', () => {
    const onAdd = vi.fn();
    const onCloseAddForm = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        searchQuery="Ar"
        onAdd={onAdd}
        onCloseAddForm={onCloseAddForm}
        onSearchChange={onSearchChange}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    fireEvent.click(screen.getByText('Arka Media Works'));

    expect(onAdd).toHaveBeenCalledWith({
      production_house_id: 'ph-1',
      _ph: expect.objectContaining({ name: 'Arka Media Works' }),
    });
    expect(onCloseAddForm).toHaveBeenCalled();
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('calls onCloseAddForm when Cancel is clicked', () => {
    const onCloseAddForm = vi.fn();
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        onCloseAddForm={onCloseAddForm}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseAddForm).toHaveBeenCalled();
  });

  it('renders visible production houses', () => {
    const ph = makePH({ id: 'ph-1', name: 'Arka Media Works' });
    render(
      <ProductionHousesSection {...defaultProps} visibleProductionHouses={[makeVisiblePH(ph)]} />,
    );
    expect(screen.getByText('Arka Media Works')).toBeInTheDocument();
  });

  it('shows fallback production_house_id when production_house is missing', () => {
    const mph = {
      movie_id: 'movie-1',
      production_house_id: 'orphan-ph-id',
      production_house: undefined,
    };
    render(<ProductionHousesSection {...defaultProps} visibleProductionHouses={[mph as never]} />);
    expect(screen.getByText('orphan-ph-id')).toBeInTheDocument();
  });

  it('calls onRemove with isPending=false for non-pending PH', () => {
    const onRemove = vi.fn();
    const ph = makePH({ id: 'ph-1', name: 'Arka Media Works' });
    render(
      <ProductionHousesSection
        {...defaultProps}
        visibleProductionHouses={[makeVisiblePH(ph)]}
        onRemove={onRemove}
        pendingPHAdds={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove Arka Media Works/ }));
    expect(onRemove).toHaveBeenCalledWith('ph-1', false);
  });

  it('calls onRemove with isPending=true for pending PH', () => {
    const onRemove = vi.fn();
    const ph = makePH({ id: 'ph-1', name: 'Arka Media Works' });
    render(
      <ProductionHousesSection
        {...defaultProps}
        visibleProductionHouses={[makeVisiblePH(ph)]}
        onRemove={onRemove}
        pendingPHAdds={[{ production_house_id: 'ph-1', _ph: ph }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove Arka Media Works/ }));
    expect(onRemove).toHaveBeenCalledWith('ph-1', true);
  });

  it('filters already-added PHs from dropdown', () => {
    const ph1 = makePH({ id: 'ph-1', name: 'Arka Media Works' });
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        searchQuery="Med"
        visibleProductionHouses={[makeVisiblePH(ph1)]}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    // Arka is already added, should not appear in dropdown
    const dropdownItems = screen.queryAllByText('Arka Media Works');
    // It appears in the visible list below, but not in dropdown
    const phInDropdown = dropdownItems.filter((el) => el.closest('[data-dropdown-item]'));
    expect(phInDropdown).toHaveLength(0);
  });

  it('shows "No matching production houses" when filtered is empty', () => {
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        searchQuery="ZZZ"
        productionHouses={[]}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.getByText('No matching production houses')).toBeInTheDocument();
  });

  it('shows quick-add button when filtered is empty and onQuickAdd provided', () => {
    const onQuickAdd = vi.fn();
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        searchQuery="New Studio"
        productionHouses={[]}
        onQuickAdd={onQuickAdd}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.getByText(/Create "New Studio"/)).toBeInTheDocument();
  });

  it('calls onQuickAdd when Create button is clicked', () => {
    const onQuickAdd = vi.fn();
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        searchQuery="New Studio"
        productionHouses={[]}
        onQuickAdd={onQuickAdd}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    fireEvent.click(screen.getByText(/Create "New Studio"/));
    expect(onQuickAdd).toHaveBeenCalledWith('New Studio');
  });

  it('shows "Creating…" when quickAddPending is true', () => {
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        searchQuery="New Studio"
        productionHouses={[]}
        onQuickAdd={vi.fn()}
        quickAddPending={true}
      />,
    );
    fireEvent.focus(screen.getByPlaceholderText('Type to search…'));
    expect(screen.getByText('Creating…')).toBeInTheDocument();
  });

  it('does not show quick-add when searchQuery is < 2 chars', () => {
    render(
      <ProductionHousesSection
        {...defaultProps}
        showAddForm={true}
        searchQuery="N"
        productionHouses={[]}
        onQuickAdd={vi.fn()}
      />,
    );
    // Dropdown only shows when searchQuery >= 2
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
  });

  it('shows PH logo when logo_url is set', () => {
    const ph = makePH({ id: 'ph-1', name: 'Arka', logo_url: 'https://cdn/logo.png' });
    render(
      <ProductionHousesSection {...defaultProps} visibleProductionHouses={[makeVisiblePH(ph)]} />,
    );
    const imgs = document.querySelectorAll('img');
    const img = Array.from(imgs).find((i) => i.getAttribute('src') === 'https://cdn/logo.png');
    expect(img).toBeTruthy();
  });

  describe('keyboard navigation', () => {
    it('ArrowDown moves highlight down', () => {
      render(<ProductionHousesSection {...defaultProps} showAddForm={true} searchQuery="Ar" />);
      const input = screen.getByPlaceholderText('Type to search…');
      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // highlight should move to index 0
      const items = screen.getAllByRole('button', { hidden: true });
      const firstItem = items.find((b) => b.getAttribute('data-dropdown-item') !== null);
      expect(firstItem?.className).toContain('bg-input');
    });

    it('Escape closes dropdown', () => {
      render(<ProductionHousesSection {...defaultProps} showAddForm={true} searchQuery="Ar" />);
      const input = screen.getByPlaceholderText('Type to search…');
      fireEvent.focus(input);
      expect(screen.getByText('Arka Media Works')).toBeInTheDocument();
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByText('Arka Media Works')).not.toBeInTheDocument();
    });

    it('Enter selects highlighted item', () => {
      const onAdd = vi.fn();
      render(
        <ProductionHousesSection
          {...defaultProps}
          showAddForm={true}
          searchQuery="Ar"
          onAdd={onAdd}
        />,
      );
      const input = screen.getByPlaceholderText('Type to search…');
      fireEvent.focus(input);
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight index 0
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onAdd).toHaveBeenCalled();
    });
  });
});
