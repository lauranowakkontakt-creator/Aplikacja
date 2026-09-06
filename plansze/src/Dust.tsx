import React, {useMemo} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from './theme';

/**
 * Kurz w snopie światła.
 *
 * Każdy pyłek to miękki gradient promienisty (bez twardej krawędzi = nie wygląda
 * wektorowo), lekko rozmyty i spłaszczony w elipsę pod losowym kątem.
 *
 * Cykl życia: pyłek pojawia się i znika po sinusoidalnej obwiedni, więc nigdy nie
 * "wskakuje" w kadr. Pozycja jest ciągłą funkcją wieku — bez poklatkowania.
 */
export const Dust: React.FC<{count: number; opacity: number; seed?: string}> = ({
  count,
  opacity,
  seed = 'kurz',
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const k = Math.min(width, height) / 2160;

  const motes = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const s = `${seed}-${i}`;
      const r = (t: string) => random(`${s}-${t}`);

      // Trzy plany głębi. Bliżej = większy i bardziej rozmyty.
      const depth = r('d');
      const size = (5 + depth * 21) * k;
      const elong = 0.55 + r('e') * 2.6;

      return {
        x0: r('x') * 1.18 - 0.09,
        y0: r('y') * 1.1 - 0.05,
        w: size,
        h: size * elong,
        rot: r('rot') * 180,
        blur: (0.9 + depth * 4.4) * k,
        alpha: 0.11 + r('a') * 0.30 * (1 - depth * 0.32),
        warm: r('c') > 0.62,
        period: 190 + r('p') * 250,
        phase: r('ph') * 600,
        vx: (r('vx') - 0.5) * 0.00052,
        vy: -(0.00048 + r('vy') * 0.00082),
        swayAmp: 0.0018 + r('sa') * 0.0062,
        swayPer: 95 + r('sp') * 150,
        swayPh: r('sph') * Math.PI * 2,
      };
    });
  }, [count, seed, k]);

  return (
    <>
      {motes.map((m, i) => {
        const u = (((frame + m.phase) % m.period) + m.period) % m.period / m.period;
        const life = Math.sin(Math.PI * u) ** 1.35;
        if (life < 0.004) return null;

        const age = u * m.period;
        const x =
          m.x0 +
          m.vx * age +
          m.swayAmp * Math.sin(m.swayPh + (age / m.swayPer) * Math.PI * 2);
        const y = m.y0 + m.vy * age;

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
              filter: `blur(${m.blur}px)`,
              willChange: 'transform',
            }}
          />
        );
      })}
    </>
  );
};
