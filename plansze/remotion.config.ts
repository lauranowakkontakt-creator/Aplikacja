import {Config} from '@remotion/cli/config';

// Kodek i profil podajemy przy renderze (patrz skrypty w package.json),
// bo dla podglądu H.264 i dla dostawy ProRes 4444 są różne.
Config.setVideoImageFormat('png');
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(4);

if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
