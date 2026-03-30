import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('./auditUtils', () => ({ getChangedFields: vi.fn() }));
vi.mock('../auditUtils', () => ({
  getChangedFields: (details: Record<string, unknown>) => {
    const old = details.old as Record<string, unknown> | undefined;
    const newVal = details.new as Record<string, unknown> | undefined;
    if (!old || !newVal) return null;
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(newVal)) {
      if (JSON.stringify(old[key]) !== JSON.stringify(newVal[key])) {
        changes[key] = { from: old[key], to: newVal[key] };
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  },
}));

vi.mock('lucide-react', () => ({
  Plus: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="plus-icon" {...props} />,
  Minus: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="minus-icon" {...props} />,
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="arrow-right-icon" {...props} />
  ),
}));

import { ChangeDetails } from '../ChangeDetails';

describe('ChangeDetails', () => {
  // ---- update action ----

  it('renders update diff with changed fields', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { title: 'Old Title', status: 'draft' },
          new: { title: 'New Title', status: 'draft' },
        }}
      />,
    );
    expect(screen.getByText('1 field changed')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Old Title')).toBeInTheDocument();
    expect(screen.getByText('New Title')).toBeInTheDocument();
  });

  it('renders "fields changed" (plural) when multiple fields differ', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { title: 'A', status: 'draft' },
          new: { title: 'B', status: 'published' },
        }}
      />,
    );
    expect(screen.getByText('2 fields changed')).toBeInTheDocument();
  });

  it('falls back to entity details when getChangedFields returns null (no old/new)', () => {
    render(<ChangeDetails action="update" details={{ some_field: 'value', another_field: 42 }} />);
    // Fallback shows EntityDetails-style label
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders URL value as a link in update diff', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { poster_url: 'https://old.example.com/img.jpg' },
          new: { poster_url: 'https://new.example.com/img.jpg' },
        }}
      />,
    );
    const link = screen.getByRole('link', { name: /new\.example\.com/ });
    expect(link).toHaveAttribute('href', 'https://new.example.com/img.jpg');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders null value as "not set" in update diff', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { description: 'Some desc' },
          new: { description: null },
        }}
      />,
    );
    expect(screen.getAllByText('not set').length).toBeGreaterThan(0);
  });

  it('renders boolean true as "Yes" in update diff', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { is_active: false },
          new: { is_active: true },
        }}
      />,
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders empty array as "empty list"', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { tags: ['a', 'b'] },
          new: { tags: [] },
        }}
      />,
    );
    expect(screen.getByText('empty list')).toBeInTheDocument();
  });

  it('renders short string array inline (≤3 items)', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { genres: [] },
          new: { genres: ['Action', 'Drama', 'Comedy'] },
        }}
      />,
    );
    expect(screen.getByText('Action, Drama, Comedy')).toBeInTheDocument();
  });

  it('renders long array as "N items" when >3 items', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { tags: [] },
          new: { tags: ['a', 'b', 'c', 'd'] },
        }}
      />,
    );
    expect(screen.getByText('4 items')).toBeInTheDocument();
  });

  it('renders object with keys as {key1, key2}', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { metadata: null },
          new: { metadata: { director: 'John', year: 2024 } },
        }}
      />,
    );
    expect(screen.getByText('{director, year}')).toBeInTheDocument();
  });

  it('renders empty object as "empty"', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { metadata: { x: 1 } },
          new: { metadata: {} },
        }}
      />,
    );
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('truncates very long strings at 200 chars with ellipsis', () => {
    const longString = 'x'.repeat(250);
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { description: 'short' },
          new: { description: longString },
        }}
      />,
    );
    const truncated = screen.getByText((text) => text.endsWith('…') && text.length === 201);
    expect(truncated).toBeInTheDocument();
  });

  it('formats snake_case field name as Title Case', () => {
    render(
      <ChangeDetails
        action="update"
        details={{
          old: { release_date: '2024-01-01' },
          new: { release_date: '2024-06-01' },
        }}
      />,
    );
    expect(screen.getByText('Release Date')).toBeInTheDocument();
  });

  // ---- create action ----

  it('renders create details from details.new', () => {
    render(
      <ChangeDetails action="create" details={{ new: { title: 'New Movie', status: 'draft' } }} />,
    );
    expect(screen.getByText(/Created with/)).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('New Movie')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders create details directly when details.new is absent', () => {
    render(<ChangeDetails action="create" details={{ title: 'Direct Movie', year: 2024 }} />);
    expect(screen.getByText(/Created with/)).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders "1 field" (singular) for create with single field', () => {
    render(<ChangeDetails action="create" details={{ new: { title: 'Solo' } }} />);
    expect(screen.getByText('Created with 1 field')).toBeInTheDocument();
  });

  it('filters out hidden fields (id, created_at, updated_at, created_by) in create', () => {
    render(
      <ChangeDetails
        action="create"
        details={{
          new: {
            id: 'abc',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            created_by: 'user-1',
            title: 'Visible',
          },
        }}
      />,
    );
    expect(screen.queryByText('Id')).not.toBeInTheDocument();
    expect(screen.queryByText('Created At')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated At')).not.toBeInTheDocument();
    expect(screen.queryByText('Created By')).not.toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('shows "No details recorded" for create with empty fields (after filtering)', () => {
    render(
      <ChangeDetails action="create" details={{ new: { id: 'abc', created_at: '2024-01-01' } }} />,
    );
    expect(screen.getByText('No details recorded')).toBeInTheDocument();
  });

  // ---- delete action ----

  it('renders delete details from details.old', () => {
    render(<ChangeDetails action="delete" details={{ old: { title: 'Deleted Movie' } }} />);
    expect(screen.getByText(/Deleted entity had/)).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Deleted Movie')).toBeInTheDocument();
  });

  it('renders delete details directly when details.old is absent', () => {
    render(<ChangeDetails action="delete" details={{ title: 'Direct Delete' }} />);
    expect(screen.getByText(/Deleted entity had/)).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders "1 field" (singular) for delete with single field', () => {
    render(<ChangeDetails action="delete" details={{ old: { title: 'Only' } }} />);
    expect(screen.getByText('Deleted entity had 1 field')).toBeInTheDocument();
  });

  it('shows "No details recorded" for delete with empty fields', () => {
    render(<ChangeDetails action="delete" details={{ old: { id: 'abc' } }} />);
    expect(screen.getByText('No details recorded')).toBeInTheDocument();
  });

  // ---- sync / unknown actions ----

  it('renders sync action using details.new', () => {
    render(
      <ChangeDetails
        action="sync"
        details={{ new: { title: 'Synced Movie', tmdb_id: '12345' } }}
      />,
    );
    expect(screen.getByText('Synced Data')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders sync action using details.old when new is absent', () => {
    render(<ChangeDetails action="sync" details={{ old: { title: 'Old Synced' } }} />);
    expect(screen.getByText('Synced Data')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders sync action using details directly when old and new are absent', () => {
    render(<ChangeDetails action="sync" details={{ title: 'Raw Sync Data', status: 'active' }} />);
    expect(screen.getByText('Synced Data')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders unknown action as entity details', () => {
    render(<ChangeDetails action="import" details={{ title: 'Imported Movie' }} />);
    expect(screen.getByText('Synced Data')).toBeInTheDocument();
  });

  it('shows "No details recorded" for sync/unknown with only hidden fields', () => {
    render(<ChangeDetails action="sync" details={{ id: 'abc', created_at: '2024-01-01' }} />);
    expect(screen.getByText('No details recorded')).toBeInTheDocument();
  });

  // ---- FieldList accent border ----

  it('applies green accent class in create FieldList', () => {
    const { container } = render(
      <ChangeDetails action="create" details={{ new: { title: 'Movie' } }} />,
    );
    expect(container.querySelector('.border-l-green-600\\/40')).toBeInTheDocument();
  });

  it('applies red accent class in delete FieldList', () => {
    const { container } = render(
      <ChangeDetails action="delete" details={{ old: { title: 'Movie' } }} />,
    );
    expect(container.querySelector('.border-l-red-600\\/40')).toBeInTheDocument();
  });

  it('applies neutral accent class in entity details FieldList', () => {
    const { container } = render(<ChangeDetails action="sync" details={{ title: 'Movie' }} />);
    expect(container.querySelector('.border-l-outline-subtle')).toBeInTheDocument();
  });

  // ---- isUrl / ValueDisplay ----

  it('renders http:// URL as a link', () => {
    render(<ChangeDetails action="create" details={{ new: { website: 'http://example.com' } }} />);
    const link = screen.getByRole('link', { name: /example\.com/ });
    expect(link).toHaveAttribute('href', 'http://example.com');
  });

  it('renders non-URL string without a link', () => {
    render(<ChangeDetails action="create" details={{ new: { title: 'Not a URL' } }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Not a URL')).toBeInTheDocument();
  });

  it('renders array of numbers inline (≤3 items)', () => {
    render(<ChangeDetails action="create" details={{ new: { ids: [1, 2, 3] } }} />);
    expect(screen.getByText('1, 2, 3')).toBeInTheDocument();
  });

  it('renders undefined value as "not set" (formatValue undefined branch)', () => {
    // Pass undefined as a value in a plain object — shows in EntityDetails FieldList
    render(
      <ChangeDetails
        action="sync"
        details={{ description: undefined as unknown as string, title: 'Test' }}
      />,
    );
    // "not set" should appear for the undefined description field
    expect(screen.getByText('not set')).toBeInTheDocument();
  });

  it('renders delete with multiple fields (plural "fields")', () => {
    render(
      <ChangeDetails action="delete" details={{ old: { title: 'Movie', status: 'published' } }} />,
    );
    expect(screen.getByText('Deleted entity had 2 fields')).toBeInTheDocument();
  });
});
