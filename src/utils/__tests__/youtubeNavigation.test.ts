import { Share } from 'react-native';
import { shareYouTubeVideo } from '../youtubeNavigation';

jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);

describe('shareYouTubeVideo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('triggers native share with YouTube watch URL', () => {
    shareYouTubeVideo('abc123');
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://www.youtube.com/watch?v=abc123',
    });
  });

  it('includes the correct video ID in the share URL', () => {
    shareYouTubeVideo('xyz_-789');
    expect(Share.share).toHaveBeenCalledWith({
      message: 'https://www.youtube.com/watch?v=xyz_-789',
    });
  });
});
