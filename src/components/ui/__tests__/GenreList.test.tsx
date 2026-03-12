import React from 'react';
import { render } from '@testing-library/react-native';
import { GenreList } from '../GenreList';

describe('GenreList', () => {
  it('returns null when genres is empty', () => {
    const { toJSON } = render(<GenreList genres={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders max 2 items by default', () => {
    const { getByText, queryByText } = render(<GenreList genres={['Action', 'Drama', 'Comedy']} />);
    expect(getByText('Action')).toBeTruthy();
    expect(getByText('Drama')).toBeTruthy();
    expect(queryByText('Comedy')).toBeNull();
  });

  it('renders custom maxItems count', () => {
    const { getByText, queryByText } = render(
      <GenreList genres={['Action', 'Drama', 'Comedy', 'Thriller']} maxItems={3} />,
    );
    expect(getByText('Action')).toBeTruthy();
    expect(getByText('Drama')).toBeTruthy();
    expect(getByText('Comedy')).toBeTruthy();
    expect(queryByText('Thriller')).toBeNull();
  });

  it('uses separator mode when separator prop is provided', () => {
    const { getByText } = render(<GenreList genres={['Action', 'Drama']} separator=" • " />);
    // In separator mode, genres are joined into a single text
    expect(getByText('Action • Drama')).toBeTruthy();
  });

  it('renders all items up to maxItems in pill mode', () => {
    const { getByText } = render(<GenreList genres={['Action', 'Drama']} maxItems={5} />);
    // Each genre is rendered as a separate Text element in pill mode
    expect(getByText('Action')).toBeTruthy();
    expect(getByText('Drama')).toBeTruthy();
  });
});
