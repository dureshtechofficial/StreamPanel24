'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

type ClapprPlayer = {
  destroy: () => void;
  on: (evt: string, cb: () => void, ctx?: unknown) => void;
  setVolume?: (value: number) => void;
  play?: () => void;
};

/**
 * Embeds a Clappr player for the given HLS URL. Clappr touches the DOM/window
 * at import time, so both it and the HLS.js playback plugin are dynamically
 * imported inside the effect rather than at module scope (this component
 * itself doesn't need `next/dynamic`'s `ssr: false` since nothing runs until
 * after mount). The player is destroyed and recreated whenever `src` changes.
 *
 * Autoplay policy: browsers only allow autoplay when muted, so the preview
 * starts muted and shows an explicit "unmute" button — clicking it (a user
 * gesture) is what lets audio play. Clappr's own controls (play/pause, seek,
 * volume, fullscreen) are shown too.
 */
export function StreamPlayer({ src }: { src: string }) {
  const rawId = useId();
  const playerId = `clappr-player-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const playerRef = useRef<ClapprPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let player: ClapprPlayer | null = null;
    setError(null);
    setMuted(true);

    (async () => {
      const [{ Player }, { default: HlsjsPlayback }] = await Promise.all([
        import('@clappr/core'),
        import('@clappr/hlsjs-playback'),
      ]);
      if (cancelled) return;

      // Clappr's shipped type declarations are incomplete (auto-generated from
      // JSDoc) and omit `plugins`, `playback`, and the percentage-string form
      // of width/height its own docs use — hence the loose cast.
      const options: Record<string, unknown> = {
        source: src,
        // Force the HLS mime type so Clappr always selects the HLS.js playback
        // plugin rather than falling back to native <video>, which can't play
        // .m3u8 in Chrome/Firefox (only Safari) — the usual "black player" cause.
        mimeType: 'application/x-mpegURL',
        parentId: `#${playerId}`,
        plugins: [HlsjsPlayback],
        width: '100%',
        height: '100%',
        // Muted autoplay is permitted by browser autoplay policies, so the
        // preview starts on its own; the unmute button below turns on audio.
        autoPlay: true,
        mute: true,
        playback: {
          controls: true,
          playInline: true,
          hlsjsConfig: { enableWorker: true, lowLatencyMode: true },
        },
      };
      const instance = new Player(
        options as ConstructorParameters<typeof Player>[0],
      ) as unknown as ClapprPlayer;
      player = instance;
      playerRef.current = instance;

      // Surface a fatal playback error instead of a silent black box
      // (Clappr's PLAYER_ERROR event name is the string 'error').
      instance.on('error', () => {
        if (!cancelled) {
          setError('This stream could not be played — it may be offline or unreachable.');
        }
      });
    })();

    return () => {
      cancelled = true;
      player?.destroy();
      playerRef.current = null;
    };
  }, [src, playerId]);

  function toggleMute() {
    const next = !muted;
    playerRef.current?.setVolume?.(next ? 0 : 100);
    if (!next) playerRef.current?.play?.();
    setMuted(next);
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <div id={playerId} className="h-full w-full" />

      {!error && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/80"
        >
          {muted ? (
            <>
              <VolumeX className="h-4 w-4" />
              Tap for sound
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              Mute
            </>
          )}
        </button>
      )}

      {error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-white/80">
          {error}
        </div>
      )}
    </div>
  );
}
