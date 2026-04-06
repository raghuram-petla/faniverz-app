import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { AgreeDisagreePoll } from '../AgreeDisagreePoll';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#666',
      textDisabled: '#444',
      surfaceElevated: '#111',
      borderSubtle: '#333',
    },
    isDark: true,
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: { green500: '#22C55E', red600: '#DC2626' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, d: string, opts?: Record<string, unknown>) => {
      if (opts && typeof d === 'string')
        return d.replace(/\{\{(\w+)\}\}/g, (_, key) => String(opts[key] ?? ''));
      return d;
    },
  }),
}));

const defaultProps = {
  agreeCount: 0,
  disagreeCount: 0,
  userVote: null as 'agree' | 'disagree' | null,
  onVote: jest.fn(),
};

describe('AgreeDisagreePoll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the poll question text', () => {
    render(<AgreeDisagreePoll {...defaultProps} />);
    expect(screen.getByText('Do you agree with this review?')).toBeTruthy();
  });

  it('renders both Agree and Disagree buttons', () => {
    render(<AgreeDisagreePoll {...defaultProps} />);
    expect(screen.getByText('Agree')).toBeTruthy();
    expect(screen.getByText('Disagree')).toBeTruthy();
  });

  it('shows percentages when there are votes', () => {
    render(<AgreeDisagreePoll {...defaultProps} agreeCount={3} disagreeCount={1} />);
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('shows total vote count', () => {
    render(<AgreeDisagreePoll {...defaultProps} agreeCount={3} disagreeCount={1} />);
    expect(screen.getByText('4 votes')).toBeTruthy();
  });

  it('shows vote count for 1 total', () => {
    render(<AgreeDisagreePoll {...defaultProps} agreeCount={1} disagreeCount={0} />);
    expect(screen.getByText('1 votes')).toBeTruthy();
  });

  it('does not show percentages or vote count when total is 0', () => {
    render(<AgreeDisagreePoll {...defaultProps} agreeCount={0} disagreeCount={0} />);
    expect(screen.queryByText(/\d+%/)).toBeNull();
    expect(screen.queryByText(/vote/)).toBeNull();
  });

  it('calls onVote with "agree" when agree button is pressed', () => {
    const onVote = jest.fn();
    render(<AgreeDisagreePoll {...defaultProps} onVote={onVote} />);
    fireEvent.press(screen.getByText('Agree'));
    expect(onVote).toHaveBeenCalledWith('agree');
  });

  it('calls onVote with "disagree" when disagree button is pressed', () => {
    const onVote = jest.fn();
    render(<AgreeDisagreePoll {...defaultProps} onVote={onVote} />);
    fireEvent.press(screen.getByText('Disagree'));
    expect(onVote).toHaveBeenCalledWith('disagree');
  });

  it('highlights agree button when userVote is agree', () => {
    const { toJSON } = render(
      <AgreeDisagreePoll {...defaultProps} userVote="agree" agreeCount={5} disagreeCount={3} />,
    );
    const tree = toJSON();
    const allIonicons = findAllByType(tree, 'Ionicons');
    // First icon is thumbs-up (filled when agree selected)
    expect(allIonicons[0].props.name).toBe('thumbs-up');
    // Second icon is thumbs-down-outline (not selected)
    expect(allIonicons[1].props.name).toBe('thumbs-down-outline');
  });

  it('highlights disagree button when userVote is disagree', () => {
    const { toJSON } = render(
      <AgreeDisagreePoll {...defaultProps} userVote="disagree" agreeCount={2} disagreeCount={6} />,
    );
    const tree = toJSON();
    const allIonicons = findAllByType(tree, 'Ionicons');
    // First icon is thumbs-up-outline (not selected)
    expect(allIonicons[0].props.name).toBe('thumbs-up-outline');
    // Second icon is thumbs-down (filled when disagree selected)
    expect(allIonicons[1].props.name).toBe('thumbs-down');
  });

  it('shows both icons as outline when userVote is null', () => {
    const { toJSON } = render(<AgreeDisagreePoll {...defaultProps} userVote={null} />);
    const allIonicons = findAllByType(toJSON(), 'Ionicons');
    expect(allIonicons[0].props.name).toBe('thumbs-up-outline');
    expect(allIonicons[1].props.name).toBe('thumbs-down-outline');
  });

  it('computes 50/50 for equal votes', () => {
    render(<AgreeDisagreePoll {...defaultProps} agreeCount={5} disagreeCount={5} />);
    // Both should show 50%
    const percentages = screen.getAllByText('50%');
    expect(percentages).toHaveLength(2);
  });
});

function findAllByType(node: any, type: string): any[] {
  const results: any[] = [];
  if (!node) return results;
  if (node.type === type) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        results.push(...findAllByType(child, type));
      }
    }
  }
  return results;
}
