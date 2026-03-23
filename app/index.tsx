import { Redirect } from 'expo-router';

// @boundary App entry point — immediately redirects to the tab navigator
// @sideeffect Redirect replaces the current route entry (no back navigation to this screen)
// @coupling if (tabs) group is renamed, this redirect breaks silently (blank screen)
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
