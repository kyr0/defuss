import UIkit from "uikit";

export type NotificationStatus =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "destructive";

export type NotificationPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface NotificationOptions {
  message: string;
  status?: NotificationStatus;
  pos?: NotificationPosition;
  timeout?: number; // ms, default 5000
  group?: string;
  // Allow extra options if UIkit adds more
  [key: string]: any;
}

/**
 * Programmatically create a UIkit/Franken UI notification.
 * - options: message and optional status/position/timeout
 * - Can also be called as createNotification(message, status)
 */
export function createNotification(
  messageOrOptions: string | NotificationOptions,
  status?: NotificationStatus,
) {
  if (!UIkit.notification) throw new Error("UIkit not loaded");

  // Support both signatures: ("Hi!", "success") and ({message, ...})
  if (typeof messageOrOptions === "string") {
    return UIkit.notification(messageOrOptions, status);
  }

  // Direct options object
  return UIkit.notification(messageOrOptions);
}

/**
 * Close all notifications (all or by group)
 */
export function closeAllNotifications(group?: string) {
  if (!UIkit.notification) throw new Error("UIkit not loaded");
  UIkit.notification.closeAll(group);
}
