import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckboxListField } from '../CheckboxListField';

const ITEMS = [
  { id: 'lang-1', name: 'Telugu' },
  { id: 'lang-2', name: 'Tamil' },
  { id: 'lang-3', name: 'Hindi' },
];

describe('CheckboxListField', () => {
  it('renders label text', () => {
    render(
      <CheckboxListField
        label="Assign Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages available"
      />,
    );
    expect(screen.getByText('Assign Languages')).toBeInTheDocument();
  });

  it('renders hint when provided', () => {
    render(
      <CheckboxListField
        label="Assign Languages"
        hint="(at least one required)"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages available"
      />,
    );
    expect(screen.getByText('(at least one required)')).toBeInTheDocument();
  });

  it('does not render hint when not provided', () => {
    render(
      <CheckboxListField
        label="Assign Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages available"
      />,
    );
    expect(screen.queryByText('(at least one required)')).not.toBeInTheDocument();
  });

  it('renders all items as checkboxes', () => {
    render(
      <CheckboxListField
        label="Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages"
      />,
    );
    expect(screen.getByText('Telugu')).toBeInTheDocument();
    expect(screen.getByText('Tamil')).toBeInTheDocument();
    expect(screen.getByText('Hindi')).toBeInTheDocument();
  });

  it('shows empty message when items is empty', () => {
    render(
      <CheckboxListField
        label="Languages"
        items={[]}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages available"
      />,
    );
    expect(screen.getByText('No languages available')).toBeInTheDocument();
  });

  it('checks selected items and sorts them first', () => {
    render(
      <CheckboxListField
        label="Languages"
        items={ITEMS}
        selectedIds={['lang-3']}
        onToggle={vi.fn()}
        emptyMessage="No languages"
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // Hindi (selected) should be first
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it('calls onToggle with item id when checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <CheckboxListField
        label="Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={onToggle}
        emptyMessage="No languages"
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Tamil
    expect(onToggle).toHaveBeenCalledWith('lang-2');
  });

  it('renders search input', () => {
    render(
      <CheckboxListField
        label="Assign Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages"
      />,
    );
    expect(screen.getByPlaceholderText('Search languages...')).toBeInTheDocument();
  });

  it('filters items by search query', () => {
    render(
      <CheckboxListField
        label="Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages"
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tel' } });
    expect(screen.getByText('Telugu')).toBeInTheDocument();
    expect(screen.queryByText('Tamil')).not.toBeInTheDocument();
    expect(screen.queryByText('Hindi')).not.toBeInTheDocument();
  });

  it('shows no results message when search matches nothing', () => {
    render(
      <CheckboxListField
        label="Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages"
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } });
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it('shows loading spinner instead of empty message when isLoading is true', () => {
    const { container } = render(
      <CheckboxListField
        label="Languages"
        items={[]}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages"
        isLoading
      />,
    );
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('No languages')).not.toBeInTheDocument();
  });

  it('shows no-results message only when not loading', () => {
    render(
      <CheckboxListField
        label="Languages"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No languages"
        isLoading
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz' } });
    // Loading but no displayed items — show spinner, not "no results"
    expect(screen.queryByText(/No results for/)).not.toBeInTheDocument();
  });

  it('calls onSearch with query when provided and input changes', () => {
    const onSearch = vi.fn();
    render(
      <CheckboxListField
        label="Production Houses"
        items={ITEMS}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No production houses"
        onSearch={onSearch}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'te' } });
    expect(onSearch).toHaveBeenCalledWith('te');
  });

  it('merges selectedItems not in current results when onSearch is set', () => {
    // items contains only lang-2; selectedItems has lang-1 which is not in items
    const selectedItems = [{ id: 'lang-1', name: 'Telugu' }];
    render(
      <CheckboxListField
        label="Languages"
        items={[{ id: 'lang-2', name: 'Tamil' }]}
        selectedIds={['lang-1']}
        selectedItems={selectedItems}
        onToggle={vi.fn()}
        emptyMessage="No languages"
        onSearch={vi.fn()}
      />,
    );
    // Both Telugu (from selectedItems) and Tamil (from items) should appear
    expect(screen.getByText('Telugu')).toBeInTheDocument();
    expect(screen.getByText('Tamil')).toBeInTheDocument();
  });

  it('does not duplicate items that are both selected and in current results when onSearch is set', () => {
    // lang-1 appears in both items and selectedItems — should not be duplicated
    const selectedItems = [{ id: 'lang-1', name: 'Telugu' }];
    render(
      <CheckboxListField
        label="Languages"
        items={[
          { id: 'lang-1', name: 'Telugu' },
          { id: 'lang-2', name: 'Tamil' },
        ]}
        selectedIds={['lang-1']}
        selectedItems={selectedItems}
        onToggle={vi.fn()}
        emptyMessage="No languages"
        onSearch={vi.fn()}
      />,
    );
    // Telugu should appear exactly once
    const teluguItems = screen.getAllByText('Telugu');
    expect(teluguItems).toHaveLength(1);
  });

  it('shows "Type at least 2 characters" hint when onSearch set and search length is 1', () => {
    render(
      <CheckboxListField
        label="Production Houses"
        items={[]}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No production houses"
        onSearch={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } });
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('shows empty message when onSearch is set and items is empty with no search', () => {
    render(
      <CheckboxListField
        label="Production Houses"
        items={[]}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No production houses found"
        onSearch={vi.fn()}
      />,
    );
    expect(screen.getByText('No production houses found')).toBeInTheDocument();
  });

  it('renders item imageUrl when provided', () => {
    const itemsWithImage = [{ id: 'ph-1', name: 'Studio A', imageUrl: '/logo.png' }];
    render(
      <CheckboxListField
        label="Production Houses"
        items={itemsWithImage}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="No PHs"
      />,
    );
    const img = screen.getByRole('img', { name: 'Studio A' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/logo.png');
  });
});
