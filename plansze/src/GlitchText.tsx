import React from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Tytuł rozbity na litery, z rzadkim glitchem na pojedynczych znakach.
 *
 * Każda litera ma własny zegar zdarzeń o losowym okresie 7–18 s i losowej fazie,
 * więc zdarzenia nie schodzą się — w kadrze rusza się naraz jedna, czasem dwie.
 * Zdarzenie trwa około jednej dziesiątej sekundy: krótkie przesunięcie w bok,
 * ślad rozjazdu barw jak w źle spasowanym druku i ledwo wyczuwalne rozjaśnienie.
 *
 * Litery NIE pulsują przezroczystością — glitch siedzi w pozycji i w widmie,
 * nie w alfie. Krycie całego tytułu prowadzi jedna obwiednia piętro wyżej.
 */
export const GlitchText: React.FC<{
  text: string;
  scale: number;
  strength: number;
}> = ({text, scale, strength}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  return (
    <span style={{whiteSpace: 'pre'}}>
      {Array.from(text).map((ch, i) => {
        if (ch === ' ') {
          return (
            <span key={i} style={{whiteSpace: 'pre'}}>
              {' '}
            </span>
          );
        }

        const r = (key: string) => random(`glitch-${i}-${key}`);
        const periodS = 7 + r('p') * 11;
        const phaseS = r('ph') * periodS;
        const durS = 0.10 + r('d') * 0.07;

        const u = (((t + phaseS) % periodS) + periodS) % periodS;

        let dx = 0;
        let dy = 0;
        let ghost: string | undefined;
        let bright = 1;

        if (u < durS && strength > 0) {
          // Kształt zdarzenia: szybki narost, szybki zanik — kilka klatek,
          // nie jedna, żeby nie było to czystym przeskokiem.
          const shape = Math.sin(Math.PI * (u / durS)) ** 0.55 * strength;
          const dir = r('dir') > 0.5 ? 1 : -1;

          dx = dir * (2.5 + r('ax') * 4.3) * scale * shape;
          dy = (r('ay') - 0.5) * 3.6 * scale * shape;
          bright = 1 + 0.09 * shape;

          const off = (3.2 + r('go') * 3.8) * scale * shape;
          ghost =
            `${-off}px 0 rgba(226, 92, 48, ${(0.44 * shape).toFixed(3)}), ` +
            `${off * 0.7}px 0 rgba(255, 236, 214, ${(0.26 * shape).toFixed(3)})`;
        }

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translate(${dx}px, ${dy}px)`,
              textShadow: ghost,
              filter: bright === 1 ? undefined : `brightness(${bright})`,
              willChange: 'transform',
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};
