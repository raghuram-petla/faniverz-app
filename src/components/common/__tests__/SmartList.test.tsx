import React from 'react';
import { render } from '@testing-library/react-native';
import { SmartList } from '../SmartList';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';

jest.mock('../SmartList.styles', () => ({
  styles: new Proxy({}, { get: () => ({}) }),
}));

// Mock FlashList since it requires native module
jest.mock('@shopify/flash-list', () => {
  const RN = require('react-native');
  const MockReact = require('react');
  return {
    FlashList: (props: Record<string, unknown>) => {
      const { drawDistance: _d, ...rest } = props;
      return MockReact.createElement(RN.FlatList, rest);
    },
  };
});

const defaultConfig: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

const makeItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: String(i), name: `Item ${i}` }));

describe('SmartList', () => {
  const defaultProps = {
    data: makeItems(10),
    renderItem: ({ item }: { item: { id: string; name: string } }) =>
      React.createElement('Text', null, item.name),
    keyExtractor: (item: { id: string }) => item.id,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    config: defaultConfig,
  };

  it('renders FlashList variant', () => {
    const { getByText } = render(<SmartList {...defaultProps} variant="flash" />);
    expect(getByText('Item 0')).toBeTruthy();
  });

  it('renders FlatList variant', () => {
    const { getByText } = render(<SmartList {...defaultProps} variant="flat" />);
    expect(getByText('Item 0')).toBeTruthy();
  });

  it('renders loading footer when fetching next page', () => {
    const { UNSAFE_queryAllByType } = render(
      <SmartList {...defaultProps} variant="flat" isFetchingNextPage={true} />,
    );
    // ActivityIndicator is rendered inside the footer
    const indicators = UNSAFE_queryAllByType(require('react-native').ActivityIndicator);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('does not render loading footer when not fetching', () => {
    const { UNSAFE_queryAllByType } = render(
      <SmartList {...defaultProps} variant="flat" isFetchingNextPage={false} />,
    );
    const indicators = UNSAFE_queryAllByType(require('react-native').ActivityIndicator);
    expect(indicators.length).toBe(0);
  });

  it('renders custom ListFooterComponent instead of default', () => {
    const CustomFooter = React.createElement('Text', null, 'Custom Footer');
    const { getByText, UNSAFE_queryAllByType } = render(
      <SmartList
        {...defaultProps}
        variant="flat"
        isFetchingNextPage={true}
        ListFooterComponent={CustomFooter}
      />,
    );
    expect(getByText('Custom Footer')).toBeTruthy();
  });

  it('renders empty data', () => {
    const EmptyComponent = React.createElement('Text', null, 'No items');
    const { getByText } = render(
      <SmartList {...defaultProps} data={[]} variant="flat" ListEmptyComponent={EmptyComponent} />,
    );
    expect(getByText('No items')).toBeTruthy();
  });

  it('passes numColumns to FlatList', () => {
    const { toJSON } = render(<SmartList {...defaultProps} variant="flat" numColumns={2} />);
    expect(toJSON()).toBeTruthy();
  });
});
