import type { Props } from "defuss";
import { createRef } from "defuss";
import {
  type RecorderController,
  makeMediaElementSourceProvider,
} from "../lib/whistle-recorder";

export interface TestAudioProps extends Props {
  rec: RecorderController;
  src: string; // public URL under /public
  label?: string;
  autoplay?: boolean;
}

export const TestAudio = ({
  rec,
  src,
  label,
  autoplay = false,
}: TestAudioProps) => {
  const audioRef = createRef<null, HTMLAudioElement>();
  const audioRecordingRef = createRef<null, HTMLAudioElement>();

  const onPlay = async () => {
    const el = audioRef.current!;
    await rec.setSourceProvider(makeMediaElementSourceProvider(el));
    await rec.start();

    const recEl = audioRecordingRef.current! as HTMLAudioElement;
    recEl.play();
  };
  const onPauseOrEnd = async () => {
    await rec.setSourceProvider(null);
    await rec.stop();

    const recEl = audioRecordingRef.current! as HTMLAudioElement;
    recEl.pause();

    document.location.reload();
  };
  return (
    <div class="uk-card uk-card-default uk-card-body">
      {label && <div class="uk-card-title uk-margin-small mb-2">{label}</div>}

      <p class="uk-text-meta uk-margin-small-top">Simulate whistle:</p>
      <audio
        ref={audioRef}
        src={src}
        controls
        preload="auto"
        class="w-full"
        autoplay={autoplay}
        onPlay={onPlay}
        onPause={onPauseOrEnd}
        onEnded={onPauseOrEnd}
      />

      <p class="uk-text-meta uk-margin-small-top">Recording:</p>
      <audio
        ref={audioRecordingRef}
        src={src}
        controls
        preload="auto"
        class="w-full"
      />
    </div>
  );
};
