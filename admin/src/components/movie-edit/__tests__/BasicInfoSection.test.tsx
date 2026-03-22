import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@/components/common/FormField', () => ({
  FormInput: ({
    label,
    value,
    onValueChange,
    type,
    required,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    type?: string;
    required?: boolean;
  }) => (
    <div>
      <label>
        {label}
        {required && ' *'}
      </label>
      <input
        data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  ),
  FormSelect: ({
    label,
    value,
    options,
    onValueChange,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onValueChange: (v: string) => void;
  }) => (
    <div>
      <label>{label}</label>
      <select
        data-testid={`select-${label.toLowerCase().replace(/\s+/g, '-')}`}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
  FormTextarea: ({
    label,
    value,
    onValueChange,
    rows,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    rows?: number;
  }) => (
    <div>
      <label>{label}</label>
      <textarea
        data-testid={`textarea-${label.toLowerCase().replace(/\s+/g, '-')}`}
        value={value}
        rows={rows}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  ),
  FormField: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label>{label}</label>
      {children}
    </div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({
    children,
    onClick,
    type,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: string;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      type={type as 'button' | 'submit' | 'reset' | undefined}
      data-variant={variant}
      data-testid={`genre-btn-${children}`}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/lib/movie-validation', () => ({
  validateMovieForm: vi.fn(() => []),
}));

vi.mock('@/lib/movie-constants', () => ({
  GENRES: ['Action', 'Drama', 'Comedy'],
  LANGUAGE_OPTIONS: [
    { value: '', label: 'Not set' },
    { value: 'te', label: 'Telugu' },
    { value: 'en', label: 'English' },
  ],
  CERTIFICATION_OPTIONS: [
    { value: '', label: 'None' },
    { value: 'U', label: 'U' },
    { value: 'UA', label: 'UA' },
  ],
}));

import { validateMovieForm } from '@/lib/movie-validation';
import { BasicInfoSection } from '@/components/movie-edit/BasicInfoSection';
import type { MovieForm } from '@/hooks/useMovieEditState';

const makeForm = (overrides: Partial<MovieForm> = {}): MovieForm => ({
  title: 'Test Movie',
  poster_url: '',
  backdrop_url: '',
  release_date: '2024-01-01',
  runtime: '120',
  genres: ['Action'],
  certification: 'U',
  synopsis: 'A test synopsis',
  trailer_url: '',
  in_theaters: false,
  premiere_date: '',
  original_language: 'te',
  is_featured: false,
  tmdb_id: '',
  tagline: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  ...overrides,
});

describe('BasicInfoSection', () => {
  const mockSetForm = vi.fn();
  const mockUpdateField = vi.fn();
  const mockToggleGenre = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (validateMovieForm as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  it('renders the Title field', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Title *')).toBeInTheDocument();
  });

  it('renders release date field', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Release Date')).toBeInTheDocument();
  });

  it('calls updateField when title changes', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    fireEvent.change(screen.getByTestId('input-title'), { target: { value: 'New Title' } });
    expect(mockUpdateField).toHaveBeenCalledWith('title', 'New Title');
  });

  it('calls updateField when synopsis changes', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    fireEvent.change(screen.getByTestId('textarea-synopsis'), {
      target: { value: 'New synopsis' },
    });
    expect(mockUpdateField).toHaveBeenCalledWith('synopsis', 'New synopsis');
  });

  it('calls toggleGenre when a genre button is clicked', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    fireEvent.click(screen.getByTestId('genre-btn-Drama'));
    expect(mockToggleGenre).toHaveBeenCalledWith('Drama');
  });

  it('renders all genres', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByTestId('genre-btn-Action')).toBeInTheDocument();
    expect(screen.getByTestId('genre-btn-Drama')).toBeInTheDocument();
    expect(screen.getByTestId('genre-btn-Comedy')).toBeInTheDocument();
  });

  it('selected genre uses primary variant', () => {
    render(
      <BasicInfoSection
        form={makeForm({ genres: ['Action'] })}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByTestId('genre-btn-Action').getAttribute('data-variant')).toBe('primary');
    expect(screen.getByTestId('genre-btn-Drama').getAttribute('data-variant')).toBe('secondary');
  });

  it('calls setForm when in_theaters checkbox changes', () => {
    render(
      <BasicInfoSection
        form={makeForm({ in_theaters: false })}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    // checkboxes don't have accessible names from our mocked FormField — find by type
    const checkboxes = screen.getAllByRole('checkbox');
    // first checkbox is in_theaters
    fireEvent.click(checkboxes[0]);
    expect(mockSetForm).toHaveBeenCalled();
  });

  it('shows "Yes — In Theaters" label when in_theaters is true', () => {
    render(
      <BasicInfoSection
        form={makeForm({ in_theaters: true })}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Yes — In Theaters')).toBeInTheDocument();
  });

  it('shows "No" label when in_theaters is false', () => {
    render(
      <BasicInfoSection
        form={makeForm({ in_theaters: false })}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getAllByText('No').length).toBeGreaterThan(0);
  });

  it('calls setForm when is_featured checkbox changes', () => {
    render(
      <BasicInfoSection
        form={makeForm({ is_featured: false })}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // second checkbox is is_featured
    fireEvent.click(checkboxes[1]);
    expect(mockSetForm).toHaveBeenCalled();
  });

  it('shows "Yes — Featured on home screen" label when is_featured is true', () => {
    render(
      <BasicInfoSection
        form={makeForm({ is_featured: true })}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Yes — Featured on home screen')).toBeInTheDocument();
  });

  it('shows premiere_date validation error when present', () => {
    (validateMovieForm as ReturnType<typeof vi.fn>).mockReturnValue([
      { field: 'premiere_date', message: 'Premiere must be before release' },
    ]);
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Premiere must be before release')).toBeInTheDocument();
  });

  it('shows runtime validation error when present', () => {
    (validateMovieForm as ReturnType<typeof vi.fn>).mockReturnValue([
      { field: 'runtime', message: 'Runtime must be positive' },
    ]);
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Runtime must be positive')).toBeInTheDocument();
  });

  it('shows in_theaters validation error when present', () => {
    (validateMovieForm as ReturnType<typeof vi.fn>).mockReturnValue([
      { field: 'in_theaters', message: 'Cannot be in theaters without a release date' },
    ]);
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Cannot be in theaters without a release date')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', () => {
    const { container } = render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    fireEvent.submit(container.querySelector('form')!);
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('renders Tagline and TMDB ID fields', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    expect(screen.getByText('Tagline')).toBeInTheDocument();
    expect(screen.getByText('TMDB ID')).toBeInTheDocument();
  });

  it('calls updateField when certification changes', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    fireEvent.change(screen.getByTestId('select-certification'), { target: { value: 'UA' } });
    expect(mockUpdateField).toHaveBeenCalledWith('certification', 'UA');
  });

  it('calls updateField when original language changes', () => {
    render(
      <BasicInfoSection
        form={makeForm()}
        setForm={mockSetForm}
        updateField={mockUpdateField}
        toggleGenre={mockToggleGenre}
        onSubmit={mockOnSubmit}
      />,
    );
    fireEvent.change(screen.getByTestId('select-original-language'), { target: { value: 'en' } });
    expect(mockUpdateField).toHaveBeenCalledWith('original_language', 'en');
  });
});
