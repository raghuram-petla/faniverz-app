import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { FilmStripFrameDivider } from '../FilmStripFrameDivider';
import { SPROCKET_SIZE, RAIL_WIDTH } from '@/constants/filmStrip';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: { background: '#000000' },
    colors: {},
  }),
}));

type TestView = { props: { style?: Array<Record<string, unknown>> } };

describe('FilmStripFrameDivider', () => {
  it('renders with film color background', () => {
    const { toJSON } = render(<FilmStripFrameDivider />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('#2C2C2E');
  });

  it('renders left and right sprocket holes', () => {
    const { UNSAFE_root } = render(<FilmStripFrameDivider />);
    const views = UNSAFE_root.findAllByType(View);
    const sprockets = views.filter(
      (v: TestView) =>
        v.props.style?.[0]?.position === 'absolute' && v.props.style?.[0]?.width === SPROCKET_SIZE,
    );
    expect(sprockets).toHaveLength(2);
  });

  it('positions left sprocket centered in left rail', () => {
    const { UNSAFE_root } = render(<FilmStripFrameDivider />);
    const views = UNSAFE_root.findAllByType(View);
    const leftSprocket = views.find(
      (v: TestView) => v.props.style?.[1]?.left === (RAIL_WIDTH - SPROCKET_SIZE) / 2,
    );
    expect(leftSprocket).toBeTruthy();
  });

  it('positions right sprocket centered in right rail', () => {
    const { UNSAFE_root } = render(<FilmStripFrameDivider />);
    const views = UNSAFE_root.findAllByType(View);
    const rightSprocket = views.find(
      (v: TestView) => v.props.style?.[1]?.right === (RAIL_WIDTH - SPROCKET_SIZE) / 2,
    );
    expect(rightSprocket).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<FilmStripFrameDivider />);
    expect(toJSON()).toBeTruthy();
  });
});
