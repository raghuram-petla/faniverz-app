import React from 'react';
import { render } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import { PullToRefreshIndicator } from '../PullToRefreshIndicator';

describe('PullToRefreshIndicator', () => {
  const makePullDistance = (value = 0) => ({ value }) as SharedValue<number>;
  const makeIsRefreshing = (value = false) => ({ value }) as SharedValue<boolean>;

  it('renders without crashing', () => {
    const { toJSON } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance()}
        isRefreshing={makeIsRefreshing()}
        refreshing={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('shows arrow icon when not refreshing', () => {
    const { getByTestId, queryByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(30)}
        isRefreshing={makeIsRefreshing()}
        refreshing={false}
      />,
    );
    expect(getByTestId('pull-arrow')).toBeTruthy();
    expect(queryByTestId('refresh-spinner')).toBeNull();
  });

  it('shows spinner when refreshing', () => {
    const { getByTestId, queryByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(60)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    expect(getByTestId('refresh-spinner')).toBeTruthy();
    expect(queryByTestId('pull-arrow')).toBeNull();
  });

  it('renders release text element when not refreshing', () => {
    const { getByText } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(60)}
        isRefreshing={makeIsRefreshing()}
        refreshing={false}
      />,
    );
    expect(getByText('Release to refresh')).toBeTruthy();
  });

  it('shows spinner when refreshing is true', () => {
    const { getByTestId } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    expect(getByTestId('refresh-spinner')).toBeTruthy();
  });

  it('hides arrow and text when refreshing', () => {
    const { queryByTestId, queryByText } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(60)}
        isRefreshing={makeIsRefreshing(true)}
        refreshing={true}
      />,
    );
    expect(queryByTestId('pull-arrow')).toBeNull();
    expect(queryByText('Release to refresh')).toBeNull();
  });

  it('renders at zero pull distance without crashing', () => {
    const { toJSON } = render(
      <PullToRefreshIndicator
        pullDistance={makePullDistance(0)}
        isRefreshing={makeIsRefreshing(false)}
        refreshing={false}
      />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
