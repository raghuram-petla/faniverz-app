import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AnimatedListItem } from '../AnimatedListItem';

describe('AnimatedListItem', () => {
  it('renders children', () => {
    render(
      <AnimatedListItem index={0}>
        <Text>List item content</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('List item content')).toBeTruthy();
  });

  it('renders with custom stagger and direction', () => {
    render(
      <AnimatedListItem index={2} stagger={50} direction="right" distance={20}>
        <Text>Right slide</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Right slide')).toBeTruthy();
  });

  it('renders with maxDelay cap', () => {
    render(
      <AnimatedListItem index={100} stagger={80} maxDelay={400}>
        <Text>Capped delay</Text>
      </AnimatedListItem>,
    );
    expect(screen.getByText('Capped delay')).toBeTruthy();
  });

  it('renders multiple items without crashing', () => {
    const items = ['A', 'B', 'C'];
    const { getAllByText } = render(
      <>
        {items.map((text, i) => (
          <AnimatedListItem key={text} index={i}>
            <Text>{text}</Text>
          </AnimatedListItem>
        ))}
      </>,
    );
    expect(getAllByText(/[ABC]/)).toHaveLength(3);
  });
});
