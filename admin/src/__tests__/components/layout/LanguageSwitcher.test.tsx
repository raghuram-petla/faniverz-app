import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

const mockSetSelectedLanguageId = vi.fn();
const mockShowSwitcher = vi.hoisted(() => ({ current: true }));
const mockAvailableLanguages = vi.hoisted(() => ({
  current: [
    { id: 'lang-1', name: 'Telugu' },
    { id: 'lang-2', name: 'Tamil' },
  ],
}));
const mockSelectedLanguageId = vi.hoisted(() => ({ current: null as string | null }));
const mockUserRole = vi.hoisted(() => ({ current: 'root' as string }));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({
    selectedLanguageId: mockSelectedLanguageId.current,
    setSelectedLanguageId: mockSetSelectedLanguageId,
    showSwitcher: mockShowSwitcher.current,
    availableLanguages: mockAvailableLanguages.current,
  }),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => ({ role: mockUserRole.current }),
}));

vi.mock('lucide-react', () => ({
  Globe: (p: { className?: string }) => <span data-testid="globe-icon" className={p.className} />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockShowSwitcher.current = true;
  mockSelectedLanguageId.current = null;
  mockUserRole.current = 'root';
});

describe('LanguageSwitcher', () => {
  it('renders nothing when showSwitcher is false', () => {
    mockShowSwitcher.current = false;
    const { container } = render(<LanguageSwitcher />);
    expect(container.innerHTML).toBe('');
  });

  it('renders button with "All" label when no language selected', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByLabelText('Switch content language')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows selected language name', () => {
    mockSelectedLanguageId.current = 'lang-1';
    render(<LanguageSwitcher />);
    expect(screen.getByText('Telugu')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Switch content language'));
    expect(screen.getByText('All Languages')).toBeInTheDocument();
    expect(screen.getByText('Telugu')).toBeInTheDocument();
    expect(screen.getByText('Tamil')).toBeInTheDocument();
  });

  it('shows "All Languages" option only for root/super_admin', () => {
    mockUserRole.current = 'admin';
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Switch content language'));
    expect(screen.queryByText('All Languages')).not.toBeInTheDocument();
    expect(screen.getByText('Telugu')).toBeInTheDocument();
  });

  it('shows "All Languages" for super_admin', () => {
    mockUserRole.current = 'super_admin';
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Switch content language'));
    expect(screen.getByText('All Languages')).toBeInTheDocument();
  });

  it('calls setSelectedLanguageId(null) when "All Languages" clicked', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Switch content language'));
    fireEvent.click(screen.getByText('All Languages'));
    expect(mockSetSelectedLanguageId).toHaveBeenCalledWith(null);
  });

  it('calls setSelectedLanguageId with lang id on language click', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Switch content language'));
    fireEvent.click(screen.getByText('Telugu'));
    expect(mockSetSelectedLanguageId).toHaveBeenCalledWith('lang-1');
  });

  it('closes dropdown after selecting a language', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText('Switch content language'));
    fireEvent.click(screen.getByText('Tamil'));
    expect(screen.queryByText('All Languages')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <LanguageSwitcher />
      </div>,
    );
    fireEvent.click(screen.getByLabelText('Switch content language'));
    expect(screen.getByText('Telugu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('All Languages')).not.toBeInTheDocument();
  });

  it('toggles dropdown open/closed on button click', () => {
    render(<LanguageSwitcher />);
    const btn = screen.getByLabelText('Switch content language');
    fireEvent.click(btn);
    expect(screen.getByText('All Languages')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText('All Languages')).not.toBeInTheDocument();
  });
});
