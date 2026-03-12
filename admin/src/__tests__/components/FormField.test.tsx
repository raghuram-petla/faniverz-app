import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  INPUT_CLASSES,
  TEXTAREA_CLASSES,
} from '@/components/common/FormField';

describe('FormField', () => {
  it('renders label text', () => {
    render(<FormField label="Title">{null}</FormField>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('shows * when required', () => {
    render(
      <FormField label="Name" required>
        {null}
      </FormField>,
    );
    expect(screen.getByText(/Name \*/)).toBeInTheDocument();
  });

  it('does not show * when not required', () => {
    render(<FormField label="Name">{null}</FormField>);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.queryByText(/\*/)).not.toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FormField label="Field">
        <span data-testid="child">Hello</span>
      </FormField>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('FormInput', () => {
  it('renders label and input', () => {
    render(<FormInput label="Email" onValueChange={vi.fn()} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onValueChange on typing', () => {
    const handler = vi.fn();
    render(<FormInput label="Name" onValueChange={handler} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(handler).toHaveBeenCalledWith('hello');
  });

  it('applies default variant class', () => {
    render(<FormInput label="X" onValueChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveClass(INPUT_CLASSES.default);
  });

  it('applies compact variant class', () => {
    render(<FormInput label="X" variant="compact" onValueChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveClass(INPUT_CLASSES.compact);
  });

  it('applies bordered variant class', () => {
    render(<FormInput label="X" variant="bordered" onValueChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveClass(INPUT_CLASSES.bordered);
  });

  it('passes required prop through', () => {
    render(<FormInput label="Req" required onValueChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeRequired();
  });
});

describe('FormSelect', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  it('renders options', () => {
    render(<FormSelect label="Pick" options={options} onValueChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
  });

  it('renders placeholder option when provided', () => {
    render(
      <FormSelect label="Pick" options={options} onValueChange={vi.fn()} placeholder="Choose..." />,
    );
    expect(screen.getByRole('option', { name: 'Choose...' })).toBeInTheDocument();
  });

  it('calls onValueChange on selection', () => {
    const handler = vi.fn();
    render(<FormSelect label="Pick" options={options} onValueChange={handler} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
    expect(handler).toHaveBeenCalledWith('b');
  });
});

describe('FormTextarea', () => {
  it('renders textarea', () => {
    render(<FormTextarea label="Bio" onValueChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText('Bio')).toBeInTheDocument();
  });

  it('calls onValueChange on typing', () => {
    const handler = vi.fn();
    render(<FormTextarea label="Bio" onValueChange={handler} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'text' } });
    expect(handler).toHaveBeenCalledWith('text');
  });

  it('applies default textarea class', () => {
    render(<FormTextarea label="Bio" onValueChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveClass(TEXTAREA_CLASSES.default);
  });

  it('applies compact textarea class', () => {
    render(<FormTextarea label="Bio" variant="compact" onValueChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveClass(TEXTAREA_CLASSES.compact);
  });
});
