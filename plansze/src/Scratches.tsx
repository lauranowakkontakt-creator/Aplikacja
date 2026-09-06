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
 *
 * Rozmycie idzie na pojedynczą rysę — wąski box jest tani, pełna klatka nie.
 * Czasy w sekundach — zmiana fps nie przestraja tempa.
 */

const LAYERS = [
  {blur: 0.6, width: 1.1, alpha: 1.0},
  {blur: 1.9, width: 2.6, alpha: 0.72},
];

export const Scratches: React.FC<{count: number; opacity: number; seed?: string}> = ({
  count,
  opacity,
  seed = 'rysa',
}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const k = Math.min(width, height) / 2160;
  const t = frame / fps;

  const layers = useMemo(() => {
    const buckets: {
      i: number; x0: number; w: number; top: number; h: number;
      alpha: number; periodS: number; phaseS: number; driftS: number; stops: string[];
    }[][] = [[], []];

    for (let i = 0; i < count; i++) {
      const s = `${seed}-${i}`;
      const r = (t2: string) => random(`${s}-${t2}`);
      const b = i % 2;
      const L = LAYERS[b];

      // Nierówny profil jasności wzdłuż rysy — losowe przystanki gradientu.
      const stops: string[] = [];
      let pos = 0;
      let on = false;
      while (pos < 100) {
        pos = Math.min(100, pos + 6 + r(`g${stops.length}`) * 22);
        stops.push(`${on ? 'C' : 'T'} ${pos.toFixed(1)}%`);
        if (r(`t${stops.length}`) > 0.38) on = !on;
      }

      buckets[b].push({
        i,
        x0: 0.04 + r('x') * 0.92,
        w: L.width * (0.8 + r('w') * 1.4) * k,
        top: r('top') * 0.42,
        h: 0.34 + r('h') * 0.78,
        alpha: (0.045 + r('a') * 0.13) * L.alpha,
        periodS: 2.2 + r('p') * 6.6,
        phaseS: r('ph') * 17,
        driftS: (r('dr') - 0.5) * 0.25,
        stops,
      });
    }
    return buckets;
  }, [count, seed, k]);

  return (
    <>
      {layers.map((lines, li) => (
        <div
          key={li}
          style={{position: 'absolute', inset: 0}}
        >
          {lines.map((l) => {
            const u = ((((t + l.phaseS) % l.periodS) + l.periodS) % l.periodS) / l.periodS;
            const life = Math.sin(Math.PI * u) ** 1.15;
            if (life < 0.006) return null;

            const age = u * l.periodS;
            const x =
              l.x0 + l.driftS * age + 0.0011 * noise1(`${seed}-jit-${l.i}`, t / 0.26);
            const a = l.alpha * life * opacity;

            const grad = l.stops
              .map((sp) => {
                const [kind, p] = sp.split(' ');
                const col =
                  kind === 'C'
                    ? `rgba(${COLORS.dustWarm}, ${a})`
                    : `rgba(${COLORS.dustWarm}, 0)`;
                return `${col} ${p}`;
              })
              .join(', ');

            return (
              <div
                key={l.i}
                style={{
                  position: 'absolute',
                  left: `${x * 100}%`,
                  top: `${l.top * 100}%`,
                  width: l.w,
                  height: `${l.h * 100}%`,
                  background: `linear-gradient(to bottom, ${grad})`,
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
