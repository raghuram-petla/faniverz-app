import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonBox } from '../SkeletonBox';

describe('SkeletonBox', () => {
  it('renders with the given dimensions', () => {
    const { getByTestId } = render(<SkeletonBox width={128} height={192} testID="skeleton" />);
    expect(getByTestId('skeleton')).toBeTruthy();
  });

  it('applies custom borderRadius', () => {
    const { getByTestId } = render(
      <SkeletonBox width={100} height={50} borderRadius={12} testID="skeleton" />,
    );
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    expect(flatStyle.borderRadius).toBe(12);
  });

  it('uses default borderRadius of 8', () => {
    const { getByTestId } = render(<SkeletonBox width={100} height={50} testID="skeleton" />);
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    expect(flatStyle.borderRadius).toBe(8);
  });

  it('applies custom style prop', () => {
    const { getByTestId } = render(
      <SkeletonBox width={100} height={50} style={{ marginTop: 10 }} testID="skeleton" />,
    );
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    expect(flatStyle.marginTop).toBe(10);
  });

  it('sets background color from theme border token', () => {
    const { getByTestId } = render(<SkeletonBox width={100} height={50} testID="skeleton" />);
    const node = getByTestId('skeleton');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.map((s: unknown) => (typeof s === 'object' ? s : {})))
      : node.props.style;
    // Global theme mock uses darkTheme where border = 'rgba(255, 255, 255, 0.1)'
    expect(flatStyle.backgroundColor).toBe('rgba(255, 255, 255, 0.1)');
  });

  it('renders with string width and height', () => {
    const { getByTestId } = render(<SkeletonBox width="100%" height="50%" testID="skeleton" />);
    expect(getByTestId('skeleton')).toBeTruthy();
  });
});
