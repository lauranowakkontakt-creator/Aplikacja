import {continueRender, delayRender, staticFile} from 'remotion';

/**
 * Fraunces jako font zmienny, wgrany lokalnie z public/fonts.
 * Bez sieci w trakcie renderu — render jest wtedy powtarzalny.
 */
let started = false;

export const loadFraunces = () => {
  if (started) return;
  started = true;

  const handle = delayRender('Ładowanie Fraunces');

  const css = `
    @font-face {
      font-family: 'Fraunces';
      font-style: normal;
      font-weight: 100 900;
      src: url('${staticFile('fonts/Fraunces-var.ttf')}') format('truetype-variations');
      font-display: block;
    }
    @font-face {
      font-family: 'Fraunces';
      font-style: italic;
      font-weight: 100 900;
      src: url('${staticFile('fonts/Fraunces-Italic-var.ttf')}') format('truetype-variations');
      font-display: block;
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  Promise.all([
    document.fonts.load('500 200px Fraunces'),
    document.fonts.load('900 78px Fraunces'),
  ])
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
};
