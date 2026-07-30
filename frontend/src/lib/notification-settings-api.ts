import { apiFetch } from "./api-client";
import type {
  NotificationEvent,
  NotificationSetting,
} from "@/types/notification";

export function listNotificationSettings() {
  return apiFetch<NotificationSetting[]>("/settings/notifications");
}

export function updateNotificationSetting(
  event: NotificationEvent,
  enabled: boolean,
) {
  return apiFetch<NotificationSetting>(`/settings/notifications/${event}`, {
    method: "PATCH",
    body: { enabled },
  });
}
