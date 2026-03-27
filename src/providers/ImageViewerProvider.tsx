import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { View } from 'react-native';
import { ImageViewerOverlay } from '@/components/common/ImageViewerOverlay';

export interface ImageSourceLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageViewerTopChrome {
  variant: 'home-feed';
  insetTop: number;
  headerContentHeight: number;
  headerTranslateY: number;
}

// @contract: feedUrl is the low-res variant already loaded in the feed (e.g. _sm or _md),
// displayed immediately as a placeholder while fullUrl (original resolution) loads.
// If feedUrl and fullUrl are the same, the viewer skips the progressive loading step.
// @coupling: sourceRef and sourceLayout are used by ImageViewerOverlay to animate the
// image from its original position in the feed to fullscreen. If the source component
// unmounts during the animation (e.g. feed scrolls while viewer opens), sourceRef
// becomes null and the close animation falls back to a fade instead of position-based.
// @nullable: onSourceHide/onSourceShow are optional callbacks that let the source
// component hide itself while the viewer is open (preventing a ghost image behind
// the overlay) and restore visibility on close.
export interface ImageViewerState {
  feedUrl: string;
  fullUrl: string;
  sourceLayout: ImageSourceLayout;
  sourceRef: React.RefObject<View | null>;
  borderRadius: number;
  /** @contract when true, image viewer uses 16:9 landscape aspect ratio and unlocks screen rotation */
  isLandscape?: boolean;
  topChrome?: ImageViewerTopChrome;
  onSourceHide?: () => void;
  onSourceShow?: () => void;
}

interface ImageViewerContextType {
  openImage: (config: ImageViewerState) => void;
  closeImage: () => void;
}

const ImageViewerContext = createContext<ImageViewerContextType>({
  openImage: () => {},
  closeImage: () => {},
});

export function useImageViewer(): ImageViewerContextType {
  return useContext(ImageViewerContext);
}

export interface ImageViewerProviderProps {
  children: React.ReactNode;
}

// @invariant: only ONE image can be viewed at a time. Calling openImage while another
// image is already open replaces the current viewer state immediately — there is no
// queue or stack. The previous image's onSourceShow callback is NOT called, so the
// previous source image may stay hidden until the component re-renders.
export function ImageViewerProvider({ children }: ImageViewerProviderProps) {
  const [viewerState, setViewerState] = useState<ImageViewerState | null>(null);

  const openImage = useCallback((config: ImageViewerState) => {
    setViewerState(config);
  }, []);

  const closeImage = useCallback(() => {
    setViewerState(null);
  }, []);

  const contextValue = useMemo(() => ({ openImage, closeImage }), [openImage, closeImage]);

  return (
    <ImageViewerContext.Provider value={contextValue}>
      {children}
      {viewerState ? (
        <ImageViewerOverlay
          feedUrl={viewerState.feedUrl}
          fullUrl={viewerState.fullUrl}
          sourceLayout={viewerState.sourceLayout}
          sourceRef={viewerState.sourceRef}
          borderRadius={viewerState.borderRadius}
          isLandscape={viewerState.isLandscape}
          topChrome={viewerState.topChrome}
          onSourceHide={viewerState.onSourceHide}
          onSourceShow={viewerState.onSourceShow}
          onClose={closeImage}
        />
      ) : null}
    </ImageViewerContext.Provider>
  );
}
