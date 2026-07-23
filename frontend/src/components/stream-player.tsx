'use client';

import { useEffect, useId } from 'react';

/**
 * Embeds a Clappr player for the given HLS URL. Clappr touches the DOM/window
 * at import time, so both it and the HLS.js playback plugin are dynamically
 * imported inside the effect rather than at module scope (this component
 * itself doesn't need `next/dynamic`'s `ssr: false` since nothing runs until
 * after mount). The player is destroyed and recreated whenever `src` changes.
 */
export function StreamPlayer({ src }: { src: string }) {
  const rawId = useId();
  const playerId = `clappr-player-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    let cancelled = false;
    let player: { destroy: () => void } | null = null;

    (async () => {
      const [{ Player }, { default: HlsjsPlayback }] = await Promise.all([
        import('@clappr/core'),
        import('@clappr/hlsjs-playback'),
      ]);
      if (cancelled) return;

      // Clappr's shipped type declarations are incomplete (auto-generated
      // from JSDoc) and don't include `plugins`, or the percentage-string
      // form of width/height that its own docs use — hence the loose cast.
      const options: Record<string, unknown> = {
        source: src,
        parentId: `#${playerId}`,
        plugins: [HlsjsPlayback],
        width: '100%',
        height: '100%',
        autoPlay: false,
        mute: true,
      };
      player = new Player(options as ConstructorParameters<typeof Player>[0]);
    })();

    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [src, playerId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <div id={playerId} className="h-full w-full" />
    </div>
  );
}
