import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * @contract Returns the current keyboard height (0 when hidden).
 * @sideeffect Subscribes to Keyboard show/hide events; cleans up on unmount.
 * @coupling iOS uses 'keyboardWillShow'/'keyboardWillHide' for smoother animation;
 *           Android uses 'keyboardDidShow'/'keyboardDidHide'.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}
