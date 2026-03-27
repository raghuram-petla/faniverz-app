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

  it('checks selected items', () => {
    render(
      <CheckboxListField
        label="Languages"
        items={ITEMS}
        selectedIds={['lang-1', 'lang-3']}
        onToggle={vi.fn()}
        emptyMessage="No languages"
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // Telugu
    expect(checkboxes[1]).not.toBeChecked(); // Tamil
    expect(checkboxes[2]).toBeChecked(); // Hindi
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
});
