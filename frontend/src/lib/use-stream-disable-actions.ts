import { useState } from 'react';
import { ApiError } from './api-error';

const RESTART_DELAY_MS = 3_000;

/**
 * Shared "Disable"/"Start"/"Restart" button logic for a list of streams —
 * reused by the admin, reseller, and customer portals. Disable/start just
 * set `disabled: true`/`false`.
 *
 * Restart prefers a dedicated backend endpoint (`restartStream`) when one is
 * provided: a single server-side call that disable+re-enables and sends one
 * "restarted" notification. Without it, restart falls back to the legacy
 * two-call mechanism (disabled true, wait, disabled false) — kept only so
 * callers that haven't wired up the endpoint still work.
 */
export function useStreamDisableActions(
  setDisabled: (streamId: string, disabled: boolean) => Promise<unknown>,
  onDone?: () => void | Promise<void>,
  restartStream?: (streamId: string) => Promise<unknown>,
) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'disable' | 'start' | 'restart' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    streamId: string,
    action: 'disable' | 'start' | 'restart',
    task: () => Promise<unknown>,
  ) {
    setBusyId(streamId);
    setBusyAction(action);
    setError(null);
    try {
      await task();
      await onDone?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Failed to ${action === 'start' ? 'start' : action} stream.`,
      );
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  const disable = (streamId: string) => run(streamId, 'disable', () => setDisabled(streamId, true));

  const start = (streamId: string) => run(streamId, 'start', () => setDisabled(streamId, false));

  const restart = (streamId: string) =>
    run(streamId, 'restart', async () => {
      if (restartStream) {
        await restartStream(streamId);
        return;
      }
      await setDisabled(streamId, true);
      await new Promise((resolve) => setTimeout(resolve, RESTART_DELAY_MS));
      await setDisabled(streamId, false);
    });

  return {
    disable,
    start,
    restart,
    /** The stream currently being acted on, or null if none. */
    busyId,
    /** Which action is in flight for `busyId`. */
    busyAction,
    error,
  };
}
