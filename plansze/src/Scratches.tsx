import React, {useMemo} from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from './theme';
import {noise1} from './noise';

/**
 * Rysy na taśmie.
 *
 * Pionowe włoski o nierównej gęstości wzdłuż długości (gradient o losowych
 * przystankach), z delikatnym bocznym chwianiem — jak bramka projektora.
 * Pojawiają się i gasną po obwiedni, nigdy nie migają jedną klatką.
 */
export const Scratches: React.FC<{count: number; opacity: number; seed?: string}> = ({
  count,
  opacity,
  seed = 'rysa',
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const k = Math.min(width, height) / 2160;

  const lines = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const s = `${seed}-${i}`;
      const r = (t: string) => random(`${s}-${t}`);

      // Nierówny profil jasności wzdłuż rysy — losowe przystanki gradientu.
      const stops: string[] = [];
      let pos = 0;
      let on = false;
      while (pos < 100) {
        const step = 6 + r(`g${stops.length}`) * 22;
        pos = Math.min(100, pos + step);
        stops.push(`${on ? 'C' : 'T'} ${pos.toFixed(1)}%`);
        on = r(`t${stops.length}`) > 0.38 ? !on : on;
      }

      return {
        x0: 0.04 + r('x') * 0.92,
        w: (0.9 + r('w') * 2.4) * k,
        top: r('top') * 0.42,
        h: 0.34 + r('h') * 0.78,
        alpha: 0.045 + r('a') * 0.13,
        blur: (0.45 + r('b') * 1.35) * k,
        period: 55 + r('p') * 165,
        phase: r('ph') * 420,
        drift: (r('dr') - 0.5) * 0.010,
        stops,
      };
    });
  }, [count, seed, k]);

  return (
    <>
      {lines.map((l, i) => {
        const u = (((frame + l.phase) % l.period) + l.period) % l.period / l.period;
        const life = Math.sin(Math.PI * u) ** 1.15;
        if (life < 0.006) return null;

        const age = u * l.period;
        const x =
          l.x0 + l.drift * age + 0.0011 * noise1(`${seed}-jit-${i}`, frame / 6.5);
        const a = l.alpha * life * opacity;

        const grad = l.stops
          .map((sp) => {
            const [kind, p] = sp.split(' ');
            const col = kind === 'C' ? `rgba(${COLORS.dustWarm}, ${a})` : `rgba(${COLORS.dustWarm}, 0)`;
            return `${col} ${p}`;
          })
          .join(', ');

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${l.top * 100}%`,
              width: l.w,
              height: `${l.h * 100}%`,
              background: `linear-gradient(to bottom, ${grad})`,
              filter: `blur(${l.blur}px)`,
              willChange: 'transform',
            }}
          />
        );
      })}
    </>
  );
};
