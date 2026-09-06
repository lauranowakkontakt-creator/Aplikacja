import {Config} from '@remotion/cli/config';

// Kodek i profil podajemy przy renderze (patrz skrypty w package.json),
// bo dla podglądu H.264 i dla dostawy ProRes 4444 są różne.
Config.setVideoImageFormat('png');
Config.setConcurrency(4);

// Renderer OpenGL: bez GPU „swangle" (emulacja SwiftShader) potrafi być
// wolniejszy niż zwykły rasteryzator Skia. Domyślnie zostawiamy wybór
// Chromium; REMOTION_GL pozwala to nadpisać przy porównaniach.
if (process.env.REMOTION_GL) {
  Config.setChromiumOpenGlRenderer(process.env.REMOTION_GL as never);
}

if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
