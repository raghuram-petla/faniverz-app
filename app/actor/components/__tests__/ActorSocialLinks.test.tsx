import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ActorSocialLinks } from '../ActorSocialLinks';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

const mockStyles = {
  socialLinksRow: {},
  socialButton: {},
  socialButtonText: {},
};

beforeEach(() => jest.clearAllMocks());

describe('ActorSocialLinks', () => {
  it('renders nothing when all IDs are null', () => {
    const { toJSON } = render(<ActorSocialLinks styles={mockStyles} textPrimaryColor="#fff" />);
    expect(toJSON()).toBeNull();
  });

  it('renders IMDb button and opens correct URL', () => {
    const { getByTestId } = render(
      <ActorSocialLinks imdbId="nm123" styles={mockStyles} textPrimaryColor="#fff" />,
    );
    fireEvent.press(getByTestId('social-imdb'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.imdb.com/name/nm123');
  });

  it('renders Instagram button and opens correct URL', () => {
    const { getByTestId } = render(
      <ActorSocialLinks instagramId="actor_ig" styles={mockStyles} textPrimaryColor="#fff" />,
    );
    fireEvent.press(getByTestId('social-instagram'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.instagram.com/actor_ig');
  });

  it('renders Twitter button and opens correct URL', () => {
    const { getByTestId } = render(
      <ActorSocialLinks twitterId="actor_tw" styles={mockStyles} textPrimaryColor="#fff" />,
    );
    fireEvent.press(getByTestId('social-twitter'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://twitter.com/actor_tw');
  });

  it('renders all social links when all IDs provided', () => {
    const { getByTestId } = render(
      <ActorSocialLinks
        imdbId="nm123"
        instagramId="actor_ig"
        twitterId="actor_tw"
        styles={mockStyles}
        textPrimaryColor="#fff"
      />,
    );
    expect(getByTestId('social-imdb')).toBeTruthy();
    expect(getByTestId('social-instagram')).toBeTruthy();
    expect(getByTestId('social-twitter')).toBeTruthy();
  });
});
