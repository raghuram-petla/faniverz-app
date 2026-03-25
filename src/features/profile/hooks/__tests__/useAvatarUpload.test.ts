jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

const mockMutateAsync = jest.fn();
jest.mock('@/features/auth/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

// Mock global fetch for blob conversion
const mockBlob = new Blob(['test']);
global.fetch = jest.fn().mockResolvedValue({
  blob: () => Promise.resolve(mockBlob),
}) as jest.Mock;

import { renderHook, act } from '@testing-library/react-native';
import { useAvatarUpload } from '../useAvatarUpload';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

describe('useAvatarUpload', () => {
  const mockUpload = jest.fn();
  const mockGetPublicUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'u1' } });

    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/avatar.jpg' },
    });

    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    mockMutateAsync.mockResolvedValue({});
  });

  it('returns pickAndUpload and isUploading', () => {
    const { result } = renderHook(() => useAvatarUpload());

    expect(result.current.pickAndUpload).toBeDefined();
    expect(typeof result.current.pickAndUpload).toBe('function');
    expect(result.current.isUploading).toBe(false);
  });

  it('does nothing when user is null', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('does nothing when assets array is empty (not canceled but no asset)', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it('does nothing when image picker is canceled', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: true,
      assets: [],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it('uploads image and updates profile avatar_url on success', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.png' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    // Verify storage upload was called with correct path and options
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(mockUpload).toHaveBeenCalledWith('u1/avatar.png', mockBlob, {
      upsert: true,
      contentType: 'image/png',
    });

    // Verify getPublicUrl was called
    expect(mockGetPublicUrl).toHaveBeenCalledWith('u1/avatar.png');

    // Verify profile was updated with the public URL (with cache-bust param)
    expect(mockMutateAsync).toHaveBeenCalledWith({
      avatar_url: expect.stringContaining('https://example.com/avatar.jpg?t='),
    });
  });

  it('sets isUploading during upload process', async () => {
    let resolveUpload!: (value: { error: null }) => void;
    mockUpload.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpg' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    // Start the upload but don't await it yet
    let pickPromise: Promise<void>;
    await act(async () => {
      pickPromise = result.current.pickAndUpload();
    });

    // isUploading should be true while upload is in progress
    expect(result.current.isUploading).toBe(true);

    // Resolve the upload
    await act(async () => {
      resolveUpload({ error: null });
      await pickPromise!;
    });

    // isUploading should be false after completion
    expect(result.current.isUploading).toBe(false);
  });

  it('resets isUploading to false even on upload error', async () => {
    const uploadError = { message: 'Upload failed' };
    mockUpload.mockResolvedValueOnce({ error: uploadError });

    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpg' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      try {
        await result.current.pickAndUpload();
      } catch {
        // expected - upload error is thrown
      }
    });

    expect(result.current.isUploading).toBe(false);
  });

  it('uses file extension from uri for upload path', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpeg' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(mockUpload).toHaveBeenCalledWith('u1/avatar.jpeg', mockBlob, {
      upsert: true,
      contentType: 'image/jpeg',
    });
  });

  it('falls back to jpg extension when uri has no dot', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo-without-extension' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining('/avatar.'),
      mockBlob,
      expect.objectContaining({ upsert: true }),
    );
  });

  it('falls back to image/jpeg contentType for unknown extension', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.xyz' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(mockUpload).toHaveBeenCalledWith('u1/avatar.xyz', mockBlob, {
      upsert: true,
      contentType: 'image/jpeg',
    });
  });

  it('handles webp extension with correct MIME type', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.webp' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(mockUpload).toHaveBeenCalledWith('u1/avatar.webp', mockBlob, {
      upsert: true,
      contentType: 'image/webp',
    });
  });

  it('handles gif extension with correct MIME type', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.GIF' }],
    });

    const { result } = renderHook(() => useAvatarUpload());

    await act(async () => {
      await result.current.pickAndUpload();
    });

    expect(mockUpload).toHaveBeenCalledWith('u1/avatar.gif', mockBlob, {
      upsert: true,
      contentType: 'image/gif',
    });
  });

  it('does not set isUploading after unmount (mountedRef check)', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///tmp/photo.jpg' }],
    });

    let resolveUpload!: (value: { error: null }) => void;
    mockUpload.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useAvatarUpload());

    let pickPromise: Promise<void>;
    await act(async () => {
      pickPromise = result.current.pickAndUpload();
    });

    // Unmount before upload resolves to test mountedRef check
    unmount();

    await act(async () => {
      resolveUpload({ error: null });
      await pickPromise!;
    });

    // Should not throw — mountedRef prevents state update on unmounted component
  });
});
