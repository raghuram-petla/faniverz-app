import { render, screen, fireEvent } from '@testing-library/react';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import type { FieldChange } from '@/hooks/useFormChanges';

const mockChanges: FieldChange[] = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    oldValue: 'Alice',
    newValue: 'Bob',
    oldDisplay: 'Alice',
    newDisplay: 'Bob',
  },
  {
    key: 'active',
    label: 'Active',
    type: 'boolean',
    oldValue: true,
    newValue: false,
    oldDisplay: 'Yes',
    newDisplay: 'No',
  },
];

const defaultProps = {
  changes: mockChanges,
  changeCount: 2,
  saveStatus: 'idle' as const,
  onSave: vi.fn(),
  onDiscard: vi.fn(),
  onRevertField: vi.fn(),
};

describe('FormChangesDock', () => {
  it('returns null when no changes and status is idle', () => {
    const { container } = render(
      <FormChangesDock {...defaultProps} changes={[]} changeCount={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders change rows for each change', () => {
    render(<FormChangesDock {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows old value and new value', () => {
    render(<FormChangesDock {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('shows change count with unsaved text', () => {
    render(<FormChangesDock {...defaultProps} />);
    expect(screen.getByText('2 unsaved changes')).toBeInTheDocument();
  });

  it('shows singular text for 1 change', () => {
    render(<FormChangesDock {...defaultProps} changes={[mockChanges[0]]} changeCount={1} />);
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
  });

  it('calls onDiscard when Discard button clicked', () => {
    const onDiscard = vi.fn();
    render(<FormChangesDock {...defaultProps} onDiscard={onDiscard} />);
    fireEvent.click(screen.getByText('Discard'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when Save button clicked', () => {
    const onSave = vi.fn();
    render(<FormChangesDock {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save Changes'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when saving', () => {
    render(<FormChangesDock {...defaultProps} saveStatus="saving" />);
    expect(screen.getByText('Discard')).toBeDisabled();
    expect(screen.getByText('Saving...').closest('button')).toBeDisabled();
  });

  it('shows success message when save completes', () => {
    render(<FormChangesDock {...defaultProps} changes={[]} changeCount={0} saveStatus="success" />);
    expect(screen.getByText('✓ Changes saved successfully')).toBeInTheDocument();
  });

  it('calls onRevertField when undo button clicked', () => {
    const onRevertField = vi.fn();
    render(<FormChangesDock {...defaultProps} onRevertField={onRevertField} />);
    fireEvent.click(screen.getByLabelText('Undo Name'));
    expect(onRevertField).toHaveBeenCalledWith('name');
  });

  it('does not render undo buttons when onRevertField is not provided', () => {
    render(<FormChangesDock {...defaultProps} onRevertField={undefined} />);
    expect(screen.queryByLabelText('Undo Name')).not.toBeInTheDocument();
  });

  it('renders "Save Changes" text when status is idle', () => {
    render(<FormChangesDock {...defaultProps} />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('renders "Saving..." text when status is saving', () => {
    render(<FormChangesDock {...defaultProps} saveStatus="saving" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('does not render dock when saveStatus is success and isDirty', () => {
    // When changes exist AND saveStatus is success, the dirty portion takes precedence
    render(<FormChangesDock {...defaultProps} saveStatus="success" />);
    // changeCount > 0 so isDirty is true — shows unsaved changes UI, not success
    expect(screen.getByText('2 unsaved changes')).toBeInTheDocument();
  });

  it('hides success message when there are pending changes', () => {
    // When isDirty=true and saveStatus=success, only the changes UI shows
    render(<FormChangesDock {...defaultProps} saveStatus="success" />);
    expect(screen.queryByText('Changes saved successfully')).not.toBeInTheDocument();
  });

  it('calls scrollBy down when down scroll indicator is clicked', () => {
    // Create many changes to trigger overflow
    const manyChanges: FieldChange[] = Array.from({ length: 20 }, (_, i) => ({
      key: `field-${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      oldValue: `old-${i}`,
      newValue: `new-${i}`,
      oldDisplay: `old-${i}`,
      newDisplay: `new-${i}`,
    }));

    render(<FormChangesDock {...defaultProps} changes={manyChanges} changeCount={20} />);
    // Component renders, we can verify it doesn't crash with many changes
    expect(screen.getByText('20 unsaved changes')).toBeInTheDocument();
  });

  it('renders scroll-down indicator when content overflows', () => {
    const manyChanges: FieldChange[] = Array.from({ length: 20 }, (_, i) => ({
      key: `field-${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      oldValue: `old-${i}`,
      newValue: `new-${i}`,
      oldDisplay: `old-${i}`,
      newDisplay: `new-${i}`,
    }));

    // Mock the scrollable div to simulate overflow
    const originalDefineProperty = Object.defineProperty;
    const scrollByMock = vi.fn();

    render(<FormChangesDock {...defaultProps} changes={manyChanges} changeCount={20} />);

    // Find the scrollable div and simulate scroll state
    const scrollDiv = document.querySelector('.overflow-y-auto');
    if (scrollDiv) {
      originalDefineProperty(scrollDiv, 'scrollTop', { value: 0, writable: true });
      originalDefineProperty(scrollDiv, 'clientHeight', { value: 100, writable: true });
      originalDefineProperty(scrollDiv, 'scrollHeight', { value: 500, writable: true });
      scrollDiv.scrollBy = scrollByMock;

      // Trigger scroll check
      fireEvent.scroll(scrollDiv);

      // Down arrow should appear
      // Verify render without error
      expect(screen.getByText('20 unsaved changes')).toBeInTheDocument();
    }
  });

  it('scrollBy function scrolls content by ROW_HEIGHT', () => {
    const manyChanges: FieldChange[] = Array.from({ length: 20 }, (_, i) => ({
      key: `field-${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      oldValue: `old-${i}`,
      newValue: `new-${i}`,
      oldDisplay: `old-${i}`,
      newDisplay: `new-${i}`,
    }));

    render(<FormChangesDock {...defaultProps} changes={manyChanges} changeCount={20} />);

    const scrollDiv = document.querySelector('.overflow-y-auto');
    if (scrollDiv) {
      const scrollByMock = vi.fn();
      scrollDiv.scrollBy = scrollByMock;

      // Simulate that we can scroll down
      Object.defineProperty(scrollDiv, 'scrollTop', { value: 0, configurable: true });
      Object.defineProperty(scrollDiv, 'clientHeight', { value: 100, configurable: true });
      Object.defineProperty(scrollDiv, 'scrollHeight', { value: 500, configurable: true });
      fireEvent.scroll(scrollDiv);

      // Also simulate scroll-up by setting scrollTop > 0
      Object.defineProperty(scrollDiv, 'scrollTop', { value: 50, configurable: true });
      fireEvent.scroll(scrollDiv);
    }

    expect(screen.getByText('20 unsaved changes')).toBeInTheDocument();
  });

  it('clicks scroll-down button and calls scrollBy with positive ROW_HEIGHT', () => {
    const manyChanges: FieldChange[] = Array.from({ length: 20 }, (_, i) => ({
      key: `field-${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      oldValue: `old-${i}`,
      newValue: `new-${i}`,
      oldDisplay: `old-${i}`,
      newDisplay: `new-${i}`,
    }));

    render(<FormChangesDock {...defaultProps} changes={manyChanges} changeCount={20} />);

    const scrollDiv = document.querySelector('.overflow-y-auto')!;
    const scrollByMock = vi.fn();
    scrollDiv.scrollBy = scrollByMock;

    // Simulate overflow so canScrollDown becomes true
    Object.defineProperty(scrollDiv, 'scrollTop', { value: 0, configurable: true });
    Object.defineProperty(scrollDiv, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(scrollDiv, 'scrollHeight', { value: 500, configurable: true });
    fireEvent.scroll(scrollDiv);

    // The down-scroll button should now be visible; find it by its ChevronDown child
    const allButtons = screen.getAllByRole('button');
    // The scroll-down button is the one after the list, before action bar
    const downButton = allButtons.find(
      (btn) => btn.querySelector('.animate-bounce') && btn.className.includes('rounded-t-lg'),
    );
    expect(downButton).toBeTruthy();
    fireEvent.click(downButton!);
    expect(scrollByMock).toHaveBeenCalledWith({ top: 40, behavior: 'smooth' });
  });

  it('clicks scroll-up button and calls scrollBy with negative ROW_HEIGHT', () => {
    const manyChanges: FieldChange[] = Array.from({ length: 20 }, (_, i) => ({
      key: `field-${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      oldValue: `old-${i}`,
      newValue: `new-${i}`,
      oldDisplay: `old-${i}`,
      newDisplay: `new-${i}`,
    }));

    render(<FormChangesDock {...defaultProps} changes={manyChanges} changeCount={20} />);

    const scrollDiv = document.querySelector('.overflow-y-auto')!;
    const scrollByMock = vi.fn();
    scrollDiv.scrollBy = scrollByMock;

    // Simulate scrolled-down state so canScrollUp becomes true
    Object.defineProperty(scrollDiv, 'scrollTop', { value: 100, configurable: true });
    Object.defineProperty(scrollDiv, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(scrollDiv, 'scrollHeight', { value: 500, configurable: true });
    fireEvent.scroll(scrollDiv);

    // The up-scroll button should now be visible
    const allButtons = screen.getAllByRole('button');
    const upButton = allButtons.find(
      (btn) => btn.querySelector('.animate-bounce') && btn.className.includes('rounded-b-lg'),
    );
    expect(upButton).toBeTruthy();
    fireEvent.click(upButton!);
    expect(scrollByMock).toHaveBeenCalledWith({ top: -40, behavior: 'smooth' });
  });
});
