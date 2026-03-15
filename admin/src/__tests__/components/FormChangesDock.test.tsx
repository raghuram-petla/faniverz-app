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
});
