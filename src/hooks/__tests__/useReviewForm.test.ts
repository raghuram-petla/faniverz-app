import { renderHook, act } from '@testing-library/react-native';
import { useReviewForm } from '../useReviewForm';

const mockMutate = jest.fn();
const mockCraftMutate = jest.fn();
const mockHelpfulMutate = jest.fn();

jest.mock('@/features/reviews/hooks', () => ({
  useReviewMutations: () => ({
    create: { mutate: mockMutate },
    helpful: { mutate: mockHelpfulMutate },
  }),
}));

jest.mock('@/features/editorial/hooks', () => ({
  useCraftRatingMutation: () => ({ mutate: mockCraftMutate }),
}));

describe('useReviewForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes with default state', () => {
    const { result } = renderHook(() => useReviewForm('m1', 'u1'));
    expect(result.current.showModal).toBe(false);
    expect(result.current.rating).toBe(0);
    expect(result.current.title).toBe('');
    expect(result.current.body).toBe('');
    expect(result.current.containsSpoiler).toBe(false);
  });

  it('does not submit when rating is 0', () => {
    const { result } = renderHook(() => useReviewForm('m1', 'u1'));
    act(() => result.current.submit());
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('submits review and resets state', () => {
    const { result } = renderHook(() => useReviewForm('m1', 'u1'));
    act(() => {
      result.current.setRating(4);
      result.current.setTitle('Great');
      result.current.setBody('Loved it');
      result.current.setShowModal(true);
    });
    act(() => result.current.submit());
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ movie_id: 'm1', user_id: 'u1', rating: 4 }),
    );
    expect(result.current.showModal).toBe(false);
    expect(result.current.rating).toBe(0);
    expect(result.current.title).toBe('');
  });

  it('submits craft ratings alongside review', () => {
    const { result } = renderHook(() => useReviewForm('m1', 'u1'));
    act(() => {
      result.current.setRating(5);
      result.current.setCraftRatings({ direction: 4 });
    });
    act(() => result.current.submit());
    expect(mockCraftMutate).toHaveBeenCalledWith({ craft: 'direction', rating: 4 });
  });

  it('exposes helpfulMutation', () => {
    const { result } = renderHook(() => useReviewForm('m1', 'u1'));
    expect(result.current.helpfulMutation.mutate).toBe(mockHelpfulMutate);
  });
});
