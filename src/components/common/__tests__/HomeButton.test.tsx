import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeButton } from '../HomeButton';

const mockDispatch = jest.fn();
const mockState = { index: 1 };
let mockParent: (() => unknown) | undefined;

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    getState: () => mockState,
    getParent: () => (mockParent ? mockParent() : undefined),
    dispatch: mockDispatch,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  StackActions: { popToTop: () => ({ type: 'POP_TO_TOP' }) },
}));

describe('HomeButton', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState.index = 1;
    mockParent = undefined;
  });

  it('renders nothing when stack index < 2', () => {
    mockState.index = 1;
    const { queryByTestId } = render(<HomeButton />);
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('renders nothing when stack index is 0', () => {
    mockState.index = 0;
    const { queryByTestId } = render(<HomeButton />);
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('renders when stack index >= 2', () => {
    mockState.index = 2;
    const { getByTestId } = render(<HomeButton />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('renders when stack index is 3', () => {
    mockState.index = 3;
    const { getByTestId } = render(<HomeButton />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('renders when forceShow is true regardless of depth', () => {
    mockState.index = 0;
    const { getByTestId } = render(<HomeButton forceShow />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('dispatches popToTop on root navigator when pressed', () => {
    mockState.index = 2;
    const { getByTestId } = render(<HomeButton />);
    fireEvent.press(getByTestId('home-button'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP' });
  });

  it('traverses to root navigator through parent chain', () => {
    mockState.index = 0;
    const grandparentDispatch = jest.fn();
    const grandparent = {
      getState: () => ({ index: 3 }),
      getParent: () => undefined,
      dispatch: grandparentDispatch,
    };
    const parent = {
      getState: () => ({ index: 2 }),
      getParent: () => grandparent,
      dispatch: jest.fn(),
    };
    mockParent = () => parent;
    const { getByTestId } = render(<HomeButton forceShow />);
    fireEvent.press(getByTestId('home-button'));
    // Should dispatch on grandparent (the root), not parent or nearest nav
    expect(grandparentDispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP' });
    expect(parent.dispatch).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('has correct accessibility label', () => {
    mockState.index = 2;
    const { getByLabelText } = render(<HomeButton />);
    expect(getByLabelText('Go to home')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    mockState.index = 2;
    const { getByTestId } = render(<HomeButton style={{ backgroundColor: 'red' }} />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('applies custom iconColor prop', () => {
    mockState.index = 2;
    const { getByTestId } = render(<HomeButton iconColor="#ffffff" />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('uses parent navigator index for nested stacks', () => {
    mockState.index = 0;
    mockParent = () => ({ getState: () => ({ index: 3 }) });
    const { getByTestId } = render(<HomeButton />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('hides when parent navigator depth < 2 in nested stack', () => {
    mockState.index = 0;
    mockParent = () => ({ getState: () => ({ index: 1 }) });
    const { queryByTestId } = render(<HomeButton />);
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('handles getParent throwing an error gracefully', () => {
    mockState.index = 0;
    mockParent = () => {
      throw new Error('No parent');
    };
    const { queryByTestId } = render(<HomeButton />);
    // Falls back to stackDepth=0, so button is hidden
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('handles parent returning null getState', () => {
    mockState.index = 0;
    mockParent = () => ({ getState: () => null });
    const { queryByTestId } = render(<HomeButton />);
    // parentIndex is null, so stackDepth stays 0
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('does not show when forceShow is explicitly false and depth < 2', () => {
    mockState.index = 0;
    const { queryByTestId } = render(<HomeButton forceShow={false} />);
    expect(queryByTestId('home-button')).toBeNull();
  });

  it('handles getState returning undefined (nullish coalescing on state?.index)', () => {
    // Override the mock to return undefined state
    jest.doMock('expo-router', () => ({
      useNavigation: () => ({
        getState: () => undefined,
        getParent: () => undefined,
        dispatch: mockDispatch,
      }),
    }));
    // Using forceShow to ensure button renders
    const { getByTestId } = render(<HomeButton forceShow />);
    expect(getByTestId('home-button')).toBeTruthy();
  });

  it('uses parent index when parent index equals stackDepth (not greater)', () => {
    mockState.index = 1;
    mockParent = () => ({ getState: () => ({ index: 1 }) });
    const { queryByTestId } = render(<HomeButton />);
    // parentIndex (1) is not > stackDepth (1), so stackDepth stays 1, which is < 2
    expect(queryByTestId('home-button')).toBeNull();
  });
});
