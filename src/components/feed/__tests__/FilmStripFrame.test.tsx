import React from 'react';
import { Text, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilmStripFrame } from '../FilmStripFrame';
import { RAIL_WIDTH, SPROCKET_SIZE, SPROCKET_SPACING } from '@/constants/filmStrip';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: { background: '#000000' },
    colors: {},
  }),
}));

type TestView = { props: { style?: Array<Record<string, unknown>> } };

describe('FilmStripFrame', () => {
  it('renders children inside the frame', () => {
    render(
      <FilmStripFrame>
        <Text testID="child">Hello</Text>
      </FilmStripFrame>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('applies film-colored background with rail padding', () => {
    const { toJSON } = render(
      <FilmStripFrame>
        <Text>Content</Text>
      </FilmStripFrame>,
    );
    const json = JSON.stringify(toJSON());
    // Outer has paddingHorizontal = RAIL_WIDTH
    expect(json).toContain(`"paddingHorizontal":${RAIL_WIDTH}`);
    // Film color for dark theme
    expect(json).toContain('#2C2C2E');
  });

  it('renders sprocket holes after layout measurement', () => {
    const { UNSAFE_root } = render(
      <FilmStripFrame>
        <Text>Content</Text>
      </FilmStripFrame>,
    );

    // Before layout: no sprocket holes (height=0)
    const viewsBefore = UNSAFE_root.findAllByType(View);
    const sprocketsBefore = viewsBefore.filter(
      (v: TestView) => v.props.style?.[0]?.position === 'absolute',
    );
    expect(sprocketsBefore).toHaveLength(0);

    // Trigger layout with known height
    const outerView = viewsBefore[0];
    fireEvent(outerView, 'layout', {
      nativeEvent: { layout: { height: 200, width: 390, x: 0, y: 0 } },
    });

    // After layout: sprockets should appear (left + right)
    const viewsAfter = UNSAFE_root.findAllByType(View);
    const expectedCount = Math.floor(200 / SPROCKET_SPACING);
    const sprocketsAfter = viewsAfter.filter(
      (v: TestView) => v.props.style?.[0]?.position === 'absolute',
    );
    expect(sprocketsAfter).toHaveLength(expectedCount * 2);
  });

  it('positions left sprockets centered in left rail', () => {
    const { UNSAFE_root } = render(
      <FilmStripFrame>
        <Text>Content</Text>
      </FilmStripFrame>,
    );
    const views = UNSAFE_root.findAllByType(View);
    fireEvent(views[0], 'layout', {
      nativeEvent: { layout: { height: 100, width: 390, x: 0, y: 0 } },
    });
    const viewsAfter = UNSAFE_root.findAllByType(View);
    const leftSprocket = viewsAfter.find(
      (v: TestView) => v.props.style?.[1]?.left === (RAIL_WIDTH - SPROCKET_SIZE) / 2,
    );
    expect(leftSprocket).toBeTruthy();
  });

  it('positions right sprockets centered in right rail', () => {
    const { UNSAFE_root } = render(
      <FilmStripFrame>
        <Text>Content</Text>
      </FilmStripFrame>,
    );
    const views = UNSAFE_root.findAllByType(View);
    fireEvent(views[0], 'layout', {
      nativeEvent: { layout: { height: 100, width: 390, x: 0, y: 0 } },
    });
    const viewsAfter = UNSAFE_root.findAllByType(View);
    const rightSprocket = viewsAfter.find(
      (v: TestView) => v.props.style?.[1]?.right === (RAIL_WIDTH - SPROCKET_SIZE) / 2,
    );
    expect(rightSprocket).toBeTruthy();
  });

  it('renders no sprockets when height is 0 (before layout)', () => {
    const { UNSAFE_root } = render(
      <FilmStripFrame>
        <Text>Content</Text>
      </FilmStripFrame>,
    );
    const views = UNSAFE_root.findAllByType(View);
    const sprockets = views.filter((v: TestView) => v.props.style?.[0]?.position === 'absolute');
    expect(sprockets).toHaveLength(0);
  });
});
