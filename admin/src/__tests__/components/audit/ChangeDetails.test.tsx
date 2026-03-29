import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChangeDetails } from '@/components/audit/ChangeDetails';

describe('ChangeDetails', () => {
  describe('update action', () => {
    it('renders field-by-field diff for updates', () => {
      const details = {
        old: { title: 'Old Title', year: 2024 },
        new: { title: 'New Title', year: 2024 },
      };
      render(<ChangeDetails action="update" details={details} />);
      expect(screen.getByText('1 field changed')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Old Title')).toBeInTheDocument();
      expect(screen.getByText('New Title')).toBeInTheDocument();
    });

    it('renders multiple changed fields', () => {
      const details = {
        old: { title: 'Old', year: 2024, rating: 5 },
        new: { title: 'New', year: 2025, rating: 5 },
      };
      render(<ChangeDetails action="update" details={details} />);
      expect(screen.getByText('2 fields changed')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Year')).toBeInTheDocument();
    });

    it('shows Before and After column headers', () => {
      const details = {
        old: { title: 'A' },
        new: { title: 'B' },
      };
      render(<ChangeDetails action="update" details={details} />);
      expect(screen.getByText('Before')).toBeInTheDocument();
      expect(screen.getByText('After')).toBeInTheDocument();
    });

    it('falls back to entity details when no changes detected', () => {
      const details = {
        old: { title: 'Same' },
        new: { title: 'Same' },
      };
      render(<ChangeDetails action="update" details={details} />);
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('handles null → value changes', () => {
      const details = {
        old: { synopsis: null },
        new: { synopsis: 'A great movie' },
      };
      render(<ChangeDetails action="update" details={details} />);
      expect(screen.getByText('not set')).toBeInTheDocument();
      expect(screen.getByText('A great movie')).toBeInTheDocument();
    });
  });

  describe('create action', () => {
    it('renders all fields with created label', () => {
      const details = {
        new: { title: 'New Movie', year: 2025, is_released: true },
      };
      render(<ChangeDetails action="create" details={details} />);
      // id/created_at are hidden, so 3 visible fields
      expect(screen.getByText(/Created with 3 fields/)).toBeInTheDocument();
      expect(screen.getByText('New Movie')).toBeInTheDocument();
      expect(screen.getByText('2025')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('filters out internal fields like id and created_at', () => {
      const details = {
        new: { id: 'abc-123', title: 'Movie', created_at: '2025-01-01' },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.queryByText('abc-123')).not.toBeInTheDocument();
      expect(screen.getByText('Movie')).toBeInTheDocument();
    });

    it('shows empty state when no details', () => {
      render(<ChangeDetails action="create" details={{}} />);
      expect(screen.getByText('No details recorded')).toBeInTheDocument();
    });

    it('uses singular "field" for single field', () => {
      const details = { new: { title: 'Solo' } };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText(/Created with 1 field$/)).toBeInTheDocument();
    });
  });

  describe('delete action', () => {
    it('renders deleted entity fields with red styling', () => {
      const details = {
        old: { title: 'Deleted Movie', year: 2024 },
      };
      render(<ChangeDetails action="delete" details={details} />);
      expect(screen.getByText(/Deleted entity had 2 fields/)).toBeInTheDocument();
      expect(screen.getByText('Deleted Movie')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('shows empty state when no old data', () => {
      render(<ChangeDetails action="delete" details={{}} />);
      expect(screen.getByText('No details recorded')).toBeInTheDocument();
    });
  });

  describe('sync action', () => {
    it('renders synced data view', () => {
      const details = {
        new: { title: 'Synced Movie', tmdb_id: 12345 },
      };
      render(<ChangeDetails action="sync" details={details} />);
      expect(screen.getByText('Synced Data')).toBeInTheDocument();
      expect(screen.getByText('Synced Movie')).toBeInTheDocument();
    });

    it('falls back to old data if new is missing', () => {
      const details = {
        old: { title: 'Old Sync Data' },
      };
      render(<ChangeDetails action="sync" details={details} />);
      expect(screen.getByText('Old Sync Data')).toBeInTheDocument();
    });
  });

  describe('unknown action', () => {
    it('renders entity details for unknown actions', () => {
      const details = {
        new: { title: 'Some Data' },
      };
      render(<ChangeDetails action="import" details={details} />);
      expect(screen.getByText('Synced Data')).toBeInTheDocument();
      expect(screen.getByText('Some Data')).toBeInTheDocument();
    });
  });

  describe('value formatting', () => {
    it('renders booleans as Yes/No', () => {
      const details = {
        old: { is_active: true },
        new: { is_active: false },
      };
      render(<ChangeDetails action="update" details={details} />);
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('renders null values as "not set" in italic', () => {
      const details = {
        new: { synopsis: null },
      };
      render(<ChangeDetails action="create" details={details} />);
      const notSet = screen.getByText('not set');
      expect(notSet).toBeInTheDocument();
      expect(notSet.tagName).toBe('SPAN');
    });

    it('renders arrays inline when short', () => {
      const details = {
        new: { tags: ['action', 'drama'] },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('action, drama')).toBeInTheDocument();
    });

    it('renders long arrays as count', () => {
      const details = {
        new: { tags: ['a', 'b', 'c', 'd', 'e'] },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    it('renders empty arrays as "empty list"', () => {
      const details = {
        new: { tags: [] },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('empty list')).toBeInTheDocument();
    });

    it('renders objects as key summary', () => {
      const details = {
        new: { meta: { width: 100, height: 200 } },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('{width, height}')).toBeInTheDocument();
    });

    it('renders empty objects as "empty"', () => {
      const details = {
        new: { meta: {} },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('empty')).toBeInTheDocument();
    });

    it('renders URLs as clickable links', () => {
      const details = {
        new: { poster_url: 'https://example.com/poster.jpg' },
      };
      render(<ChangeDetails action="create" details={details} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com/poster.jpg');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('truncates very long strings', () => {
      const longStr = 'A'.repeat(250);
      const details = {
        new: { description: longStr },
      };
      render(<ChangeDetails action="create" details={details} />);
      // Should show 200 chars + ellipsis
      expect(screen.getByText(`${'A'.repeat(200)}…`)).toBeInTheDocument();
    });

    it('converts snake_case field names to Title Case', () => {
      const details = {
        new: { release_date: '2025-06-15' },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('Release Date')).toBeInTheDocument();
    });
  });

  describe('field filtering', () => {
    it('hides id, created_at, updated_at, created_by', () => {
      const details = {
        new: {
          id: 'uuid-123',
          created_at: '2025-01-01',
          updated_at: '2025-01-02',
          created_by: 'admin-uuid',
          title: 'Visible',
        },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('Visible')).toBeInTheDocument();
      expect(screen.getByText(/Created with 1 field$/)).toBeInTheDocument();
    });

    it('shows empty state when all fields are hidden', () => {
      const details = {
        new: { id: 'uuid', created_at: '2025-01-01' },
      };
      render(<ChangeDetails action="create" details={details} />);
      expect(screen.getByText('No details recorded')).toBeInTheDocument();
    });
  });
});
