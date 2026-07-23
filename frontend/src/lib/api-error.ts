import type { ApiErrorBody } from '@/types/auth';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly messages: string[];

  constructor(body: ApiErrorBody) {
    const messages = Array.isArray(body.message)
      ? body.message
      : [body.message];
    super(messages.join(' '));
    this.name = 'ApiError';
    this.statusCode = body.statusCode;
    this.messages = messages;
  }
}
