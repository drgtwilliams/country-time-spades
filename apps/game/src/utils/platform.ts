/**
 * Platform detection utility.
 */

import { Platform } from 'react-native';

/** True when running on web. */
export const isWeb = Platform.OS === 'web';

/** True when running on iOS. */
export const isIOS = Platform.OS === 'ios';

/** True when running on Android. */
export const isAndroid = Platform.OS === 'android';

/** Screen width for responsive layout. */
export function useScreenDimensions() {
  // Import Dimensions from react-native — this is a function, not a hook
  // but we inline it since React Native hooks can't be conditionally called
  return undefined; // placeholder — actual usage in components with Dimensions.get
}
