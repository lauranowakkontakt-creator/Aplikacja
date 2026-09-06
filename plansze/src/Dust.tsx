import React, {useMemo} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from './theme';

/**
 * Kurz w snopie światła.
 *
 * Każdy pyłek to miękki gradient promienisty (bez twardej krawędzi = nie wygląda
 * wektorowo), spłaszczony w elipsę pod losowym kątem. Promień rozmycia bierze się
 * z planu głębi — bliżej znaczy większy i bardziej nieostry — ale nakładany jest
 * na sam pyłek, nie na warstwę: rozmywanie pełnej klatki 4K kosztuje kilkanaście
 * sekund na klatkę, rozmycie kilkunastopikselowego kwadratu nie kosztuje nic.
 *
 * Cykl życia: pyłek pojawia się i gaśnie po sinusoidalnej obwiedni, więc nigdy
 * nie „wskakuje" w kadr. Pozycja jest ciągłą funkcją wieku — bez poklatkowania.
 *
 * Wszystkie czasy w sekundach, nie w klatkach: zmiana fps nie przestraja ruchu.
 */

const LAYERS = [
  {blur: 1.0, size: 4.5, alpha: 1.0},
  {blur: 2.8, size: 9.0, alpha: 0.86},
  {blur: 6.0, size: 17.0, alpha: 0.7},
];

export const Dust: React.FC<{count: number; opacity: number; seed?: string}> = ({
  count,
  opacity,
  seed = 'kurz',
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const k = Math.min(width, height) / 2160;
  const t = frame / fps;

  const layers = useMemo(() => {
    const buckets: {
      x0: number; y0: number; w: number; h: number; rot: number;
      alpha: number; warm: boolean; periodS: number; phaseS: number;
      vxS: number; vyS: number; swayAmp: number; swayS: number; swayPh: number;
    }[][] = [[], [], []];

    for (let i = 0; i < count; i++) {
      const s = `${seed}-${i}`;
      const r = (t2: string) => random(`${s}-${t2}`);
      const b = i % 3;
      const L = LAYERS[b];
      const base = L.size * (0.65 + r('sz') * 0.8) * k;

      buckets[b].push({
        x0: r('x') * 1.18 - 0.09,
        y0: r('y') * 1.1 - 0.05,
        w: base,
        h: base * (0.55 + r('e') * 2.6),
        rot: r('rot') * 180,
        alpha: (0.11 + r('a') * 0.30) * L.alpha,
        warm: r('c') > 0.62,
        periodS: 7.6 + r('p') * 10.0,
        phaseS: r('ph') * 24,
        vxS: (r('vx') - 0.5) * 0.013,
        vyS: -(0.012 + r('vy') * 0.0205),
        swayAmp: 0.0018 + r('sa') * 0.0062,
        swayS: 3.8 + r('sp') * 6.0,
        swayPh: r('sph') * Math.PI * 2,
      });
    }
    return buckets;
  }, [count, seed, k]);

  return (
    <>
      {layers.map((motes, li) => (
        <div
          key={li}
          style={{position: 'absolute', inset: 0}}
        >
          {motes.map((m, i) => {
            const u = ((((t + m.phaseS) % m.periodS) + m.periodS) % m.periodS) / m.periodS;
            const life = Math.sin(Math.PI * u) ** 1.35;
            if (life < 0.004) return null;

            const age = u * m.periodS;
            const x =
              m.x0 +
              m.vxS * age +
              m.swayAmp * Math.sin(m.swayPh + (age / m.swayS) * Math.PI * 2);
            const y = m.y0 + m.vyS * age;

            const rgb = m.warm ? COLORS.dustAmber : COLORS.dustWarm;
            const a = m.alpha * life * opacity;

            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: m.w,
                  height: m.h,
                  transform: `translate(-50%, -50%) rotate(${m.rot}deg)`,
                  background: `radial-gradient(closest-side, rgba(${rgb}, ${a}) 0%, rgba(${rgb}, ${
                    a * 0.42
                  }) 38%, rgba(${rgb}, 0) 100%)`,
                  filter: `blur(${LAYERS[li].blur * k}px)`,
                }}
              />
            );
          })}
        </div>
      ))}
    </>
  );
};
