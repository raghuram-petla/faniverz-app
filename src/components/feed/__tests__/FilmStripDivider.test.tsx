import React from 'react';
import { render } from '@testing-library/react-native';
import { FilmStripDivider } from '../FilmStripDivider';

describe('FilmStripDivider', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FilmStripDivider />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders a strip with a dashed sprocket row', () => {
    const { toJSON } = render(<FilmStripDivider />);
    const tree = toJSON() as any;
    // Container > strip > sprocketRow
    const strip = tree.children[0];
    const sprocketRow = strip.children[0];
    const styles = [].concat(
      ...(Array.isArray(sprocketRow.props.style)
        ? sprocketRow.props.style
        : [sprocketRow.props.style]),
    );
    const hasDashed = styles.some((s: any) => s?.borderStyle === 'dashed');
    expect(hasDashed).toBe(true);
  });

  it('applies custom marginTop', () => {
    const { toJSON } = render(<FilmStripDivider marginTop={20} />);
    const tree = toJSON() as any;
    expect(tree.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ marginTop: 20 })]),
    );
  });

  it('sprocket row has border radius for rounded look', () => {
    const { toJSON } = render(<FilmStripDivider />);
    const tree = toJSON() as any;
    const sprocketRow = tree.children[0].children[0];
    const styles = [].concat(
      ...(Array.isArray(sprocketRow.props.style)
        ? sprocketRow.props.style
        : [sprocketRow.props.style]),
    );
    const hasRadius = styles.some((s: any) => s?.borderRadius != null && s.borderRadius > 0);
    expect(hasRadius).toBe(true);
  });
});
