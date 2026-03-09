import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { View } from 'react-native';
import { ImageViewerOverlay } from '@/components/common/ImageViewerOverlay';

export interface ImageSourceLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageViewerState {
  feedUrl: string;
  fullUrl: string;
  sourceLayout: ImageSourceLayout;
  sourceRef: React.RefObject<View | null>;
  borderRadius: number;
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
          onClose={closeImage}
        />
      ) : null}
    </ImageViewerContext.Provider>
  );
}
