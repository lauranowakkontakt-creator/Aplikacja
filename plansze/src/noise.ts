import {random} from 'remotion';

/**
 * Gładki szum wartościowy. Deterministyczny (seed -> zawsze ta sama krzywa),
 * ciągły i o ciągłej pochodnej — dzięki temu ruch nie ma schodków ani skoków.
 *
 * `t` podajesz w "komórkach": t = frame / okres. Im większy okres, tym wolniej.
 * Zwraca wartość w przedziale [-1, 1].
 */
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const noise1 = (seed: string, t: number): number => {
  const i = Math.floor(t);
  const f = t - i;
  const a = random(`${seed}:${i}`) * 2 - 1;
  const b = random(`${seed}:${i + 1}`) * 2 - 1;
  return a + (b - a) * smootherstep(f);
};

/** Dwie oktawy — bogatszy, mniej „sinusoidalny" ruch. */
export const noise2 = (seed: string, t: number): number =>
  noise1(seed, t) * 0.72 + noise1(`${seed}~`, t * 2.31) * 0.28;
