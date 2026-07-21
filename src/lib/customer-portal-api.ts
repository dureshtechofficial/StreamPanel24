import { customerApiFetch } from './customer-api-client';
import type { FlussonicStreamDirectoryEntry } from '@/types/flussonic-stream-directory';

export function listMyStreams() {
  return customerApiFetch<FlussonicStreamDirectoryEntry[]>('/customer-auth/streams');
}
