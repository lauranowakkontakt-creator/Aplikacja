/**
 * Szkielet kompozycji Remotion z poprawnym timingiem.
 *
 * Rejestracja w src/Root.tsx:
 *
 *   <Composition
 *     id="Starter"
 *     component={Starter}
 *     durationInFrames={150}
 *     fps={30}
 *     width={1920}
 *     height={1080}
 *     defaultProps={{ title: 'Tytul', subtitle: 'Podtytul' }}
 *   />
 *
 * Weryfikacja przed ogloszeniem gotowosci:
 *   npx remotion still Starter out/klatka.png --frame=45
 */

import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Props = {
  title: string;
  subtitle: string;
};

export const Starter: React.FC<Props> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Wygaszenie na koncu — liczone od dlugosci, a nie od stalej.
  const outro = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0b0b0f',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: outro,
      }}
    >
      <Sequence durationInFrames={durationInFrames}>
        <Line text={title} delay={0} size={96} weight={700} color="#ffffff" />
      </Sequence>

      <Sequence from={12} durationInFrames={durationInFrames - 12}>
        <Line text={subtitle} delay={0} size={40} weight={400} color="#9aa0aa" offsetY={90} />
      </Sequence>
    </AbsoluteFill>
  );
};

const Line: React.FC<{
  text: string;
  delay: number;
  size: number;
  weight: number;
  color: string;
  offsetY?: number;
}> = ({ text, delay, size, weight, color, offsetY = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // spring() idzie 0 -> 1; zakres skladasz przez interpolate.
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 100, mass: 1 },
  });

  const y = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        transform: `translateY(${y + offsetY}px)`,
        opacity,
      }}
    >
      <div
        style={{
          fontSize: size,          // px, nie vw — kompozycja ma staly rozmiar
          fontWeight: weight,
          color,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: -1,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
