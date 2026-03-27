import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminPHAssignment } from '@/lib/types';

const mockGetSession = vi.fn();
const mockFetch = vi.fn();
const mockUseAdminProductionHouses = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: (...args: unknown[]) => mockUseAdminProductionHouses(...args),
}));

vi.mock('lucide-react', () => ({
  Loader2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="loader-icon" {...props} />,
  Pencil: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="pencil-icon" {...props} />,
  X: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="x-icon" {...props} />,
  Search: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="search-icon" {...props} />,
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

global.fetch = mockFetch;

import { PHAssignments } from '@/components/users/PHAssignments';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockPHs = [
  { id: 'ph-1', name: 'Mythri Movie Makers', logo_url: '/mythri.png' },
  { id: 'ph-2', name: 'Suresh Productions', logo_url: null },
  { id: 'ph-3', name: 'UV Creations', logo_url: '/uv.png' },
];

const assignedPHs: AdminPHAssignment[] = [
  {
    user_id: 'user-1',
    production_house_id: 'ph-1',
    assigned_by: 'admin-1',
    created_at: '2026-01-01',
    production_house: {
      id: 'ph-1',
      name: 'Mythri Movie Makers',
      logo_url: '/mythri.png',
      description: null,
      tmdb_company_id: null,
      created_at: '2026-01-01',
    },
  },
];

describe('PHAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
    });

    mockUseAdminProductionHouses.mockReturnValue({
      data: { pages: [mockPHs] },
      isFetching: false,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('returns null when roleId is not "production_house_admin"', () => {
    const { container } = render(
      <PHAssignments userId="user-1" roleId="admin" assignedPHs={[]} />,
      { wrapper: makeWrapper() },
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when roleId is "root"', () => {
    const { container } = render(<PHAssignments userId="user-1" roleId="root" assignedPHs={[]} />, {
      wrapper: makeWrapper(),
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders assigned PH name and edit button', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByText('Mythri Movie Makers')).toBeInTheDocument();
    expect(screen.getByTitle('Edit PH assignments')).toBeInTheDocument();
  });

  it('shows dash when no PH assignments', () => {
    render(<PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={[]} />, {
      wrapper: makeWrapper(),
    });

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('opens modal when edit button is clicked', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    expect(screen.getByText('Edit PH Assignments')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('shows all production houses as checkboxes in the modal', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    expect(screen.getByText('Suresh Productions')).toBeInTheDocument();
    expect(screen.getByText('UV Creations')).toBeInTheDocument();
  });

  it('pre-checks the assigned PH in the modal', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const mythriCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Mythri');
    });
    expect(mythriCheckbox?.checked).toBe(true);
  });

  it('Save button is disabled when no changes are made', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    expect(screen.getByText('Save')).toBeDisabled();
  });

  it('Save button becomes enabled after toggling a checkbox', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const sureshCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Suresh');
    });
    fireEvent.click(sureshCheckbox!);

    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('closes modal when Cancel is clicked', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));
    expect(screen.getByText('Edit PH Assignments')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Edit PH Assignments')).not.toBeInTheDocument();
  });

  it('closes modal when backdrop is clicked', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));
    expect(screen.getByText('Edit PH Assignments')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ph-modal-backdrop'));
    expect(screen.queryByText('Edit PH Assignments')).not.toBeInTheDocument();
  });

  it('calls POST /api/user-ph-assignments on save', async () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const sureshCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Suresh');
    });
    fireEvent.click(sureshCheckbox!);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (call) => call[0] === '/api/user-ph-assignments' && call[1]?.method === 'POST',
      );
      expect(postCall).toBeTruthy();
    });
  });

  it('shows error message when save fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Save failed' }),
    });

    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const sureshCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Suresh');
    });
    fireEvent.click(sureshCheckbox!);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('shows error message when save fails with unparseable JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('parse error')),
    });

    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    const sureshCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Suresh');
    });
    fireEvent.click(sureshCheckbox!);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('closes modal when X button is clicked', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));
    expect(screen.getByText('Edit PH Assignments')).toBeInTheDocument();

    const xButton = screen.getByTestId('x-icon').closest('button')!;
    fireEvent.click(xButton);
    expect(screen.queryByText('Edit PH Assignments')).not.toBeInTheDocument();
  });

  it('passes onSearch to CheckboxListField for server-side search', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    fireEvent.click(screen.getByTitle('Edit PH assignments'));

    expect(screen.getByPlaceholderText('Search production houses...')).toBeInTheDocument();
  });

  it('shows multiple assigned PH names as separate pills', () => {
    const multiPHs: AdminPHAssignment[] = [
      ...assignedPHs,
      {
        user_id: 'user-1',
        production_house_id: 'ph-2',
        assigned_by: 'admin-1',
        created_at: '2026-01-01',
        production_house: {
          id: 'ph-2',
          name: 'Suresh Productions',
          logo_url: null,
          description: null,
          tmdb_company_id: null,
          created_at: '2026-01-01',
        },
      },
    ];

    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={multiPHs} />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByText('Mythri Movie Makers')).toBeInTheDocument();
    expect(screen.getByText('Suresh Productions')).toBeInTheDocument();
  });

  it('falls back to production_house_id when production_house is undefined', () => {
    const orphanPHs: AdminPHAssignment[] = [
      {
        user_id: 'user-1',
        production_house_id: 'orphan-id',
        assigned_by: 'admin-1',
        created_at: '2026-01-01',
      },
    ];

    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={orphanPHs} />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByText('orphan-id')).toBeInTheDocument();
  });

  it('shows logo icon for PHs that have logo_url', () => {
    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={assignedPHs} />,
      { wrapper: makeWrapper() },
    );

    const img = screen.getByAltText('Mythri Movie Makers');
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe('IMG');
  });

  it('does not show logo icon for PHs without logo_url', () => {
    const noLogoPHs: AdminPHAssignment[] = [
      {
        user_id: 'user-1',
        production_house_id: 'ph-2',
        assigned_by: 'admin-1',
        created_at: '2026-01-01',
        production_house: {
          id: 'ph-2',
          name: 'Suresh Productions',
          logo_url: null,
          description: null,
          tmdb_company_id: null,
          created_at: '2026-01-01',
        },
      },
    ];

    render(
      <PHAssignments userId="user-1" roleId="production_house_admin" assignedPHs={noLogoPHs} />,
      { wrapper: makeWrapper() },
    );

    expect(screen.getByText('Suresh Productions')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
