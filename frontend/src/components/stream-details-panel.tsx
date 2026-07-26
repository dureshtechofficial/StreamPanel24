'use client';

import type { FlussonicStream, StreamMediaTrack, StreamProtocols } from '@/types/flussonic-stream';
import { formatUptime } from '@/lib/format';
import { XIcon } from './icons';
import { StreamPlayer } from './stream-player';
import { CopyButton } from './copy-button';

const labelClass = 'text-xs font-medium uppercase tracking-wide text-muted-foreground/70';

const PROTOCOL_KEYS: (keyof StreamProtocols)[] = [
  'hls',
  'player',
  'rtmp',
  'srt',
  'webrtc',
  'dash',
  'cmaf',
  'mss',
  'rtsp',
  'mp4',
  'jpeg',
  'shoutcast',
  'm4f',
  'm4s',
  'mseld',
  'tshttp',
  'api',
  'whitelist',
];

interface StreamUrlEntry {
  label: string;
  url: string;
}

function buildInputUrls(domain: string, name: string, protocols: StreamProtocols | undefined): StreamUrlEntry[] {
  const urls: StreamUrlEntry[] = [];
  if (protocols?.rtmp) urls.push({ label: 'RTMP', url: `rtmp://${domain}:1935/${name}` });
  if (protocols?.srt) {
    urls.push({ label: 'SRT', url: `srt://${domain}:1234?streamid=#!::r=${name},m=publish` });
  }
  return urls;
}

function buildOutputUrls(domain: string, name: string, protocols: StreamProtocols | undefined): StreamUrlEntry[] {
  const urls: StreamUrlEntry[] = [];
  if (protocols?.rtmp) urls.push({ label: 'RTMP', url: `rtmp://${domain}:1935/${name}` });
  if (protocols?.hls) urls.push({ label: 'HLS', url: `https://${domain}/${name}/index.m3u8` });
  if (protocols?.dash) urls.push({ label: 'DASH', url: `https://${domain}/${name}/index.mpd` });
  if (protocols?.srt) {
    urls.push({ label: 'SRT', url: `srt://${domain}:1234?streamid=#!::r=${name},m=request` });
  }
  return urls;
}


function formatBitrate(kbps: number | undefined): string {
  if (kbps === undefined) return '—';
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(2)} Mbps` : `${kbps} kbps`;
}

function formatTrack(track: StreamMediaTrack): string {
  if (track.content === 'video') {
    return `Video · ${track.codec ?? '?'} · ${track.width ?? '?'}x${track.height ?? '?'} · ${
      track.fps ?? '?'
    }fps · ${formatBitrate(track.bitrate)}`;
  }
  if (track.content === 'audio') {
    return `Audio · ${track.codec ?? '?'} · ${track.channels ?? '?'}ch · ${
      track.sample_rate ?? '?'
    }Hz · ${formatBitrate(track.bitrate)}`;
  }
  return `${track.content ?? 'Track'} · ${track.codec ?? '?'}`;
}

export function StreamDetailsPanel({
  open,
  stream,
  onClose,
  showRawData = true,
}: {
  open: boolean;
  stream: FlussonicStream | null;
  onClose: () => void;
  /** The raw sync JSON is internal debugging info — the reseller/customer portals hide it. */
  showRawData?: boolean;
}) {
  const live = stream?.live_stats_json ?? null;
  const stats = live?.stats;
  const tracks = stats?.media_info?.tracks ?? [];

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {stream?.config_json.name ?? 'Stream details'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-muted-foreground"
            aria-label="Close panel"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {stream?.ingest_domain && stream.config_json.protocols?.hls && (
            <div>
              <p className={`${labelClass} mb-2`}>Preview</p>
              <StreamPlayer
                src={`https://${stream.ingest_domain}/${stream.config_json.name}/index.m3u8`}
              />
            </div>
          )}

          {stream &&
            (() => {
              const activeProtocols = PROTOCOL_KEYS.filter(
                (key) => stream.config_json.protocols?.[key],
              );
              return (
                <div>
                  <p className={`${labelClass} mb-2`}>Protocols</p>
                  {activeProtocols.length === 0 ? (
                    <p className="text-sm text-muted-foreground/70">No protocols enabled.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {activeProtocols.map((key) => (
                        <span
                          key={key}
                          className="inline-block rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

          {stream && (
            <div className="border-t border-border pt-4">
              <p className={`${labelClass} mb-2`}>Input / output URLs</p>
              {!stream.ingest_domain ? (
                <p className="text-sm text-muted-foreground/70">
                  Set an ingest domain on this stream to see input/output URLs.
                </p>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const inputUrls = buildInputUrls(
                      stream.ingest_domain,
                      stream.config_json.name,
                      stream.config_json.protocols,
                    );
                    const outputUrls = buildOutputUrls(
                      stream.ingest_domain,
                      stream.config_json.name,
                      stream.config_json.protocols,
                    );
                    return (
                      <>
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Input</p>
                          {inputUrls.length === 0 ? (
                            <p className="text-xs text-muted-foreground/70">
                              No input protocols (RTMP/SRT) enabled.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {inputUrls.map((entry) => (
                                <li key={entry.label} className="rounded-md bg-muted px-3 py-2">
                                  <p className="text-xs font-semibold text-muted-foreground">{entry.label}</p>
                                  <div className="mt-0.5 flex items-start justify-between gap-2">
                                    <span className="break-all font-mono text-xs text-foreground">
                                      {entry.url}
                                    </span>
                                    <CopyButton text={entry.url} />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Output</p>
                          {outputUrls.length === 0 ? (
                            <p className="text-xs text-muted-foreground/70">
                              No output protocols (RTMP/HLS/DASH/SRT) enabled.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {outputUrls.map((entry) => (
                                <li key={entry.label} className="rounded-md bg-muted px-3 py-2">
                                  <p className="text-xs font-semibold text-muted-foreground">{entry.label}</p>
                                  <div className="mt-0.5 flex items-start justify-between gap-2">
                                    <span className="break-all font-mono text-xs text-foreground">
                                      {entry.url}
                                    </span>
                                    <CopyButton text={entry.url} />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {!live && (
            <p className="text-sm text-muted-foreground">
              Not synced yet. Click &quot;Sync&quot; on the streams page to pull live data from the
              server.
            </p>
          )}

          {live && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={labelClass}>Status</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {stats?.status ?? '—'}
                    {stats?.alive === false && ' (not alive)'}
                  </p>
                </div>
                <div>
                  <p className={labelClass}>Clients</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {stats?.client_count ?? stats?.online_clients ?? '—'}
                  </p>
                </div>
                <div>
                  <p className={labelClass}>Bitrate (in / out)</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatBitrate(stats?.input_bitrate)} / {formatBitrate(stats?.output_bitrate)}
                  </p>
                </div>
                <div>
                  <p className={labelClass}>Uptime</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {/* lifetime comes back in milliseconds */}
                    {stats?.lifetime !== undefined
                      ? formatUptime(Math.floor(stats.lifetime / 1000))
                      : '—'}
                  </p>
                </div>
              </div>

              {stats?.url && (
                <div>
                  <p className={labelClass}>Source URL</p>
                  <p className="mt-1 break-all text-sm text-foreground">{stats.url}</p>
                </div>
              )}

              {tracks.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className={`${labelClass} mb-2`}>Media tracks</p>
                  <ul className="space-y-1">
                    {tracks.map((track, i) => (
                      <li key={i} className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                        {formatTrack(track)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {live.inputs && live.inputs.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className={`${labelClass} mb-2`}>Inputs</p>
                  <ul className="space-y-1">
                    {live.inputs.map((input, i) => {
                      const rec = input as { url?: string; stats?: { active?: boolean } };
                      return (
                        <li key={i} className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                          <span
                            className={`mr-2 inline-block h-2 w-2 rounded-full ${
                              rec.stats?.active ? 'bg-success' : 'bg-muted'
                            }`}
                          />
                          {rec.url ?? '—'}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {showRawData && (
                <details className="border-t border-border pt-4">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-muted-foreground">
                    Raw sync data
                  </summary>
                  <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
                    {JSON.stringify(live, null, 2)}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
