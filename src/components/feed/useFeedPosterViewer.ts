import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useImageViewer } from '@/providers/ImageViewerProvider';
import { measureView } from '@/utils/measureView';
import { getImageUrl, type ImageBucket } from '@shared/imageUrl';
import type { ImageViewerTopChrome } from '@/providers/ImageViewerProvider';

/** @contract Tap on feed poster opens full-screen image viewer */
export function useFeedPosterViewer(
  imageUrl: string | null,
  imageBucket: ImageBucket,
  isBackdrop: boolean,
  getImageViewerTopChrome?: () => ImageViewerTopChrome | undefined,
) {
  const { openImage } = useImageViewer();
  const posterRef = useRef<View>(null);
  const [posterHidden, setPosterHidden] = useState(false);

  const handlePress = useCallback(() => {
    /* istanbul ignore next */ if (!imageUrl) return;
    measureView(posterRef, (layout) => {
      const topChrome = getImageViewerTopChrome?.();
      openImage({
        feedUrl: getImageUrl(imageUrl, 'md', imageBucket) ?? /* istanbul ignore next */ imageUrl,
        fullUrl:
          getImageUrl(imageUrl, 'original', imageBucket) ?? /* istanbul ignore next */ imageUrl,
        sourceLayout: layout,
        sourceRef: posterRef,
        borderRadius: 0,
        isLandscape: isBackdrop,
        topChrome,
        onSourceHide: () => setPosterHidden(true),
        onSourceShow: () => setPosterHidden(false),
      });
    });
  }, [getImageViewerTopChrome, imageBucket, imageUrl, isBackdrop, openImage]);

  return { posterRef, posterHidden, handlePress };
}
