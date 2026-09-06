import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ATMO, COLORS, TYPE} from './theme';
import {noise1, noise2} from './noise';
import {loadFraunces} from './fonts';
import {Dust} from './Dust';
import {Scratches} from './Scratches';
import {Grain} from './Grain';

loadFraunces();

export type PlanszaProps = {
  title: string;
  channel: string;
  /** Podkład tylko do prób — finał renderuje się na przezroczystym tle. */
  backdrop: boolean;
  dustCount: number;
  scratchCount: number;
  grain: number;
};

export const Plansza: React.FC<PlanszaProps> = ({
  title,
  channel,
  backdrop,
  dustCount,
  scratchCount,
  grain,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width, height} = useVideoConfig();
  const k = Math.min(width / 3840, height / 2160);

  const ease = Easing.inOut(Easing.cubic);

  // ---- Obwiednie ---------------------------------------------------------
  // Wszystko startuje od pełnej przezroczystości i wraca do niej na końcu.
  const outEnv = interpolate(
    frame,
    [durationInFrames - fps * 2.0, durationInFrames],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}
  );

  // Nazwa kanału wchodzi pierwsza — jest kotwicą marki.
  const channelIn = interpolate(frame, [fps * 0.25, fps * 2.9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  // Tytuł wyłania się powoli, z lekkim opóźnieniem.
  const titleIn = interpolate(frame, [fps * 0.7, fps * 4.3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  const atmoIn = interpolate(frame, [0, fps * 2.2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease,
  });

  // Czas w sekundach. Wszystkie okresy niżej podaję w sekundach, nie w
  // klatkach — dzięki temu zmiana fps nie przestraja ruchu ani migotania.
  const t = frame / fps;

  // ---- Migotanie projektora ---------------------------------------------
  // Suma dwóch wolnych szumów. Spokojne, bez stroboskopu, bez skoków.
  const flicker =
    1 +
    ATMO.flickerA * noise1('migot-a', t / 0.34) +
    ATMO.flickerB * noise1('migot-b', t / 0.84);

  // ---- Ruch tytułu -------------------------------------------------------
  // MOCNI W DUCHU stoi nieruchomo — dryf dotyczy wyłącznie tytułu.
  const dx = (9 * noise2('dryf-x', t / 4.6) + 3 * noise1('dryf-x2', t / 1.96)) * k;
  const dy = (7 * noise2('dryf-y', t / 5.28) + 2.4 * noise1('dryf-y2', t / 2.28)) * k;
  const rot = 0.11 * noise2('dryf-rot', t / 6.4);

  // Delikatne osiadanie na wejściu — część „wyłaniania się".
  const settle = interpolate(frame, [0, fps * 4.6], [1.014, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const breathe = 1 + 0.0022 * noise1('oddech', t / 7.0);
  const scale = settle * breathe;

  const titleOpacity = titleIn * outEnv * flicker;
  const channelOpacity = channelIn * outEnv * flicker;
  const atmoOpacity = atmoIn * outEnv * flicker;

  const haloSpread = 1 - 0.35 * (1 - titleIn);

  return (
    <AbsoluteFill style={{backgroundColor: backdrop ? '#140c07' : undefined}}>
      {backdrop ? (
        <AbsoluteFill
          style={{
            background:
              'radial-gradient(120% 90% at 50% 42%, #4a2f1c 0%, #2a1a10 45%, #120b06 100%)',
          }}
        />
      ) : null}

      {/* Ciepła halacja pod tytułem. Światło, nie ramka. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 30% at 50% 52%, rgba(${COLORS.halo}, ${
            0.150 * titleIn
          }) 0%, rgba(${COLORS.halo}, ${0.060 * titleIn}) 42%, rgba(${
            COLORS.halo
          }, 0) 100%)`,
          transform: `scale(${haloSpread})`,
          opacity: outEnv * flicker,
        }}
      />

      {/* MOCNI W DUCHU — przy górnej krawędzi, bez ruchu. */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: TYPE.channelTop * k,
          opacity: channelOpacity,
        }}
      >
        <div
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: TYPE.channelSize * k,
            fontWeight: TYPE.channelWeight,
            fontVariationSettings: `"opsz" ${TYPE.channelOpsz}, "SOFT" 0, "WONK" 0`,
            letterSpacing: TYPE.channelTracking,
            marginRight: `-${TYPE.channelTracking}`,
            color: COLORS.channel,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            textShadow: `0 0 ${20 * k}px rgba(226, 81, 44, 0.40), 0 ${
              3 * k
            }px ${14 * k}px rgba(0, 0, 0, 0.30)`,
          }}
        >
          {channel}
        </div>
      </AbsoluteFill>

      {/* Tytuł — na środku kadru, jedna czcionka, jeden kolor, jeden rozmiar. */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: titleOpacity,
          transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`,
          willChange: 'transform, opacity',
        }}
      >
        <div
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: TYPE.titleSize * k,
            fontWeight: TYPE.titleWeight,
            fontVariationSettings: `"opsz" ${TYPE.titleOpsz}, "SOFT" ${TYPE.titleSoft}, "WONK" ${TYPE.titleWonk}`,
            letterSpacing: TYPE.titleTracking,
            color: COLORS.title,
            lineHeight: 1.06,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            padding: `0 ${180 * k}px`,
            // Szeroką poświatę robi gradient warstwy wyżej — jest darmowy.
            // Cień tekstu zostaje wąski, bo każdy jego piksel promienia to
            // osobne rozmycie maski glifów na każdej klatce.
            textShadow: `0 0 ${34 * k}px rgba(${COLORS.halo}, 0.30), 0 ${
              4 * k
            }px ${20 * k}px rgba(0, 0, 0, 0.30)`,
          }}
        >
          {title}
        </div>
      </AbsoluteFill>

      {/* Atmosfera: kurz, rysy, ziarno. */}
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <Dust count={dustCount} opacity={atmoOpacity} />
        <Scratches count={scratchCount} opacity={atmoOpacity} />
        <Grain opacity={grain * atmoOpacity} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
