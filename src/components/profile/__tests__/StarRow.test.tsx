import React from 'react';
import { render } from '@testing-library/react-native';
import { StarRow } from '../StarRow';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { yellow400: '#facc15' },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, ...props }: Record<string, unknown>) => {
    const { Text } = require('react-native');
    return (
      <Text testID={testID} {...props}>
        {String(name)}
      </Text>
    );
  },
}));

const mockStyles = { starRow: { flexDirection: 'row' as const } };

describe('StarRow', () => {
  it('renders 5 star icons', () => {
    const { toJSON } = render(<StarRow rating={3} styles={mockStyles} />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
    // Should render 5 children (one per star)
    expect((tree as { children: unknown[] }).children).toHaveLength(5);
  });

  it('renders full stars for rating of 5', () => {
    render(<StarRow rating={5} styles={mockStyles} />);
    const tree = render(<StarRow rating={5} styles={mockStyles} />).toJSON();
    const children = (tree as { children: { children: string[] }[] }).children;
    children.forEach((child) => {
      expect(child.children[0]).toBe('star');
    });
  });

  it('renders all outline stars for rating of 0', () => {
    const tree = render(<StarRow rating={0} styles={mockStyles} />).toJSON();
    const children = (tree as { children: { children: string[] }[] }).children;
    children.forEach((child) => {
      expect(child.children[0]).toBe('star-outline');
    });
  });

  it('renders half star for rating like 2.5', () => {
    const tree = render(<StarRow rating={2.5} styles={mockStyles} />).toJSON();
    const children = (tree as { children: { children: string[] }[] }).children;
    // Stars 1,2 = full, star 3 = half (3 - 0.5 = 2.5 <= 2.5), stars 4,5 = outline
    expect(children[0].children[0]).toBe('star');
    expect(children[1].children[0]).toBe('star');
    expect(children[2].children[0]).toBe('star-half');
    expect(children[3].children[0]).toBe('star-outline');
    expect(children[4].children[0]).toBe('star-outline');
  });
});
