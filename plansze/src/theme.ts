/**
 * Jedno miejsce na wszystkie decyzje projektowe.
 * Zmiana tutaj przechodzi na wszystkie pięć plansz.
 */

export const FPS = 25;              // <- dopasuj do fps timeline'u w DaVinci
export const DURATION_S = 10;
export const WIDTH = 3840;
export const HEIGHT = 2160;

export const COLORS = {
  /** Tytuł — ciepła kość słoniowa. Jeden kolor na cały tytuł. */
  title: '#F7E8CD',
  /** Nazwa kanału — wermilion z logo Mocnych w Duchu, lekko ocieplony. */
  channel: '#EC5A30',
  /** Ciepła poświata pod tytułem (halacja, nie ramka). */
  halo: '255, 186, 122',
  /** Kurz i rysy. */
  dustWarm: '255, 226, 190',
  dustAmber: '255, 198, 148',
};

export const TYPE = {
  /** Tytuł: Fraunces, jedna czcionka / jeden kolor / jeden rozmiar. */
  titleSize: 300,
  titleWeight: 500,
  titleOpsz: 144,
  titleSoft: 40,
  titleWonk: 1,
  titleTracking: '-0.012em',

  /** MOCNI W DUCHU: ta sama rodzina, pogrubiona, rozstrzelona. */
  channelSize: 100,
  channelWeight: 900,
  channelOpsz: 40,
  channelTracking: '0.40em',
  /** Odległość od górnej krawędzi kadru (px w 4K). */
  channelTop: 168,
};

/** Atmosfera retro. Wszystko w jednym miejscu, żeby dało się kręcić gałkami. */
export const ATMO = {
  dustCount: 155,
  scratchCount: 9,
  grain: 0.03,
  /** Amplituda migotania (ułamek jasności). Spokojne, nie stroboskop. */
  flickerA: 0.028,
  flickerB: 0.016,
};
