import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { ValidationRow } from '@/components/validations/ValidationRow';
import type { ScanResult } from '@/hooks/useValidationTypes';

const baseScanResult: ScanResult = {
  id: 'mov-1',
  entity: 'movies',
  field: 'poster_url',
  currentUrl: '12345.jpg',
  urlType: 'local',
  originalExists: true,
  variants: { sm: true, md: true, lg: true },
  entityLabel: 'Test Movie',
  tmdbId: 100,
};

function renderRow(
  overrides: Partial<ScanResult> = {},
  props: { isSelected?: boolean; isReadOnly?: boolean } = {},
) {
  const item = { ...baseScanResult, ...overrides };
  const onToggle = vi.fn();
  const onFixSingle = vi.fn();

  const { container } = render(
    <table>
      <tbody>
        <ValidationRow
          item={item}
          isSelected={props.isSelected ?? false}
          onToggle={onToggle}
          isReadOnly={props.isReadOnly ?? false}
          onFixSingle={onFixSingle}
        />
      </tbody>
    </table>,
  );

  return { container, onToggle, onFixSingle, item };
}

describe('ValidationRow', () => {
  it('renders entity label and field', () => {
    renderRow();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('poster_url')).toBeInTheDocument();
  });

  it('renders Local badge for local URLs', () => {
    renderRow({ urlType: 'local' });
    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  it('renders External badge for external URLs', () => {
    renderRow({ urlType: 'external' });
    expect(screen.getByText('External')).toBeInTheDocument();
  });

  it('renders green dots for OK variants', () => {
    const { container } = renderRow({
      originalExists: true,
      variants: { sm: true, md: true, lg: true },
    });
    const greenDots = container.querySelectorAll('.bg-green-500');
    expect(greenDots.length).toBe(4); // original + 3 variants
  });

  it('renders red dots for missing variants', () => {
    const { container } = renderRow({
      originalExists: true,
      variants: { sm: true, md: false, lg: false },
    });
    const redDots = container.querySelectorAll('.bg-red-500');
    expect(redDots.length).toBe(2); // md + lg missing
  });

  it('renders gray dots for null variants (external)', () => {
    const { container } = renderRow({
      urlType: 'external',
      originalExists: null,
      variants: { sm: null, md: null, lg: null },
    });
    const grayDots = container.querySelectorAll('.bg-zinc-600');
    expect(grayDots.length).toBe(4);
  });

  it('shows checkbox only when item has issues', () => {
    // No issues
    const { container: c1 } = renderRow();
    expect(c1.querySelector('input[type="checkbox"]')).toBeNull();

    // External = issue
    const { container: c2 } = renderRow({ urlType: 'external' });
    expect(c2.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it('calls onToggle when checkbox clicked', () => {
    const { onToggle } = renderRow({ urlType: 'external' });
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows Fix button for items with issues (non-readonly)', () => {
    renderRow({ urlType: 'external' });
    expect(screen.getByText('Fix')).toBeInTheDocument();
  });

  it('hides Fix button for read-only users', () => {
    renderRow({ urlType: 'external' }, { isReadOnly: true });
    expect(screen.queryByText('Fix')).toBeNull();
  });

  it('hides Fix button for items without issues', () => {
    renderRow();
    expect(screen.queryByText('Fix')).toBeNull();
  });

  it('calls onFixSingle when Fix clicked', () => {
    const { onFixSingle, item } = renderRow({ urlType: 'external' });
    fireEvent.click(screen.getByText('Fix'));
    expect(onFixSingle).toHaveBeenCalledWith(item);
  });
});
