import { toast } from 'sonner';
import { ApiError } from '@/lib/api-error';

/** Re-export so callers import everything toast-related from one place. */
export { toast };

/** Success toast with our default copy shape. */
export function toastSuccess(message: string, description?: string) {
  return toast.success(message, description ? { description } : undefined);
}

/**
 * Error toast that knows how to unwrap our ApiError (which carries a
 * `messages: string[]` from the backend's validation pipe). Falls back to a
 * generic line for unexpected errors.
 */
export function toastError(err: unknown, fallback = 'Something went wrong. Please try again.') {
  let description: string | undefined;
  if (err instanceof ApiError) {
    description = err.messages.join('\n');
  } else if (err instanceof Error && err.message) {
    description = err.message;
  }
  return toast.error(fallback, description ? { description } : undefined);
}
