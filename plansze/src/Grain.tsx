import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * Ziarno taśmy. Renderowane w 1/4 rozdzielczości i rozciągane — tanio,
 * a przy okazji miękko, więc nie wygląda na cyfrowy szum.
 */
export const Grain: React.FC<{opacity: number}> = ({opacity}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (opacity <= 0) return null;

  const w = Math.round(width / 4);
  const h = Math.round(height / 4);

  return (
    <svg
      width={w}
      height={h}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: 'scale(4)',
        transformOrigin: 'top left',
        opacity,
        filter: 'blur(0.6px)',
        pointerEvents: 'none',
      }}
    >
      <filter id="ziarno">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.82"
          numOctaves={2}
          seed={frame % 211}
          stitchTiles="stitch"
        />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 1  0 0 0 0 0.88  0 0 0 0 0.74  0.34 0.34 0.34 0 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#ziarno)" />
    </svg>
  );
};
