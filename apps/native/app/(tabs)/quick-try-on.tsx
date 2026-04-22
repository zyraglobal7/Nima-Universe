import { Redirect } from "expo-router";

// This screen is never shown directly — the center tab button opens the
// QuickTryOnModal instead. If someone navigates here programmatically,
// redirect them to Discover.
export default function QuickTryOnScreen() {
  return <Redirect href="/(tabs)/discover" />;
}
