import React from 'react';
import {Composition} from 'remotion';
import {Plansza, PlanszaProps} from './Plansza';
import {SONGS} from './songs';
import {ATMO, DURATION_S, FPS, HEIGHT, WIDTH} from './theme';

const CHANNEL = 'Mocni w Duchu';

const base: Omit<PlanszaProps, 'title'> = {
  channel: CHANNEL,
  backdrop: false,
  dustCount: ATMO.dustCount,
  scratchCount: ATMO.scratchCount,
  grain: ATMO.grain,
};

export const RemotionRoot: React.FC = () => (
  <>
    {SONGS.map((song) => (
      <Composition
        key={song.id}
        id={song.id}
        component={Plansza}
        durationInFrames={DURATION_S * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{...base, title: song.title}}
      />
    ))}

    {/* Wersje próbne z podkładem — tylko do oceny czytelności, nie do montażu. */}
    {SONGS.map((song) => (
      <Composition
        key={`${song.id}-Proba`}
        id={`${song.id}Proba`}
        component={Plansza}
        durationInFrames={DURATION_S * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{...base, title: song.title, backdrop: true}}
      />
    ))}
  </>
);
