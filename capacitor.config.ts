import type { CapacitorConfig } from '@capacitor/cli';

// The Android app loads the live web app, so web updates reach the phone
// without a new install. The native side only adds the Glasgow Club bridge.
const config: CapacitorConfig = {
  appId: 'io.github.alicelariviere.gym',
  appName: 'Gym',
  webDir: 'dist',
  server: {
    url: 'https://alicelariviere.github.io/gym-classes/',
    androidScheme: 'https',
  },
};

export default config;
