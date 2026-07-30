import { apiFetch } from "./api-client";
import type { NotificationEvent, NotificationRecord } from "@/types/notification";
import type { PaginatedResult } from "@/types/pagination";

export function listNotifications(
  params: { page?: number; limit?: number; event_type?: NotificationEvent } = {},
) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.event_type) query.set("event_type", params.event_type);
  const qs = query.toString();
  return apiFetch<PaginatedResult<NotificationRecord>>(
    `/settings/notifications/log${qs ? `?${qs}` : ""}`,
  );
}
