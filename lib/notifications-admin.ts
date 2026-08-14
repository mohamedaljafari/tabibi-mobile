/**
 * مركز إشعارات لوحة التحكم.
 *
 * يتيح للإدارة متابعة الإشعارات التي تصل للأطراف المختلفة:
 * - إشعارات المريض (قبول/رفض طلباته، رسائل جديدة)
 * - إشعارات الشريك (طلبات جديدة، رسائل، إتمامات)
 * - إشعارات «تم» (تأكيد الدفع، إتمام الخدمة، تأكيد الموعد)
 * - الإشعارات الدعائية التسويقية (التي ترسلها الإدارة للمرضى)
 * - إشعارات الإدارة (شريك جديد، طلب جديد، تعديلات يدوية)
 *
 * كما يتيح إرسال إشعار دعائي جديد لكل المرضى (دور marketing)،
 * وتعليم الإشعارات كمقروءة أو حذفها من اللوحة.
 *
 * كل الإشعارات تخزن في المفتاح المشترك notifications_v1.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NOTIFICATIONS_KEY,
  readNotifications,
  markNotificationRead,
  deleteNotification,
  type Notification,
  type NotificationRole,
  type NotificationChannel,
} from "./notifications";

function genId(): string {
  return `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** إشعارات الإدارة */
export async function readAdminNotifications(): Promise<Notification[]> {
  const all = await readNotifications();
  return all.filter((notification) => notification.role === "admin");
}

/** إشعارات المريض (كل إشعارات دور patient) */
export async function readPatientNotifications(): Promise<Notification[]> {
  const all = await readNotifications();
  return all.filter((notification) => notification.role === "patient");
}

/** إشعارات الشريك (كل إشعارات دور provider) */
export async function readProviderNotifications(): Promise<Notification[]> {
  const all = await readNotifications();
  return all.filter((notification) => notification.role === "provider");
}

/** الإشعارات الدعائية التسويقية (كل إشعارات دور marketing) */
export async function readMarketingNotifications(): Promise<Notification[]> {
  const all = await readNotifications();
  return all.filter((notification) => notification.role === "marketing");
}

/** عدد غير المقروءة في قناة محددة */
export async function countUnreadByRole(role: NotificationRole): Promise<number> {
  const all = await readNotifications();
  return all.filter((notification) => notification.role === role && !notification.read).length;
}

/** عدد غير المقروءة بقناة محددة (لجميع الأدوار) */
export async function countUnreadByChannel(channel: NotificationChannel): Promise<number> {
  const all = await readNotifications();
  return all.filter((notification) => notification.channel === channel && !notification.read).length;
}

/** تعليم إشعار كمقروء من اللوحة */
export async function markAdminNotificationRead(notificationId: string): Promise<Notification | null> {
  return await markNotificationRead(notificationId);
}

/** تعليم كل الإشعارات كمقروءة */
export async function markAllNotificationsRead(): Promise<void> {
  const all = await readNotifications();
  let changed = false;
  for (const notification of all) {
    if (!notification.read) {
      notification.read = true;
      changed = true;
    }
  }
  if (changed) {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
  }
}

/** حذف إشعار من اللوحة */
export async function deleteAdminNotification(notificationId: string): Promise<void> {
  return await deleteNotification(notificationId);
}

/** إرسال إشعار دعائي تسويقي جديد لكل المرضى */
export async function createPromoNotification(input: {
  title: string;
  body: string;
}): Promise<Notification | null> {
  try {
    const { createNotification, isChannelEnabled } = await import("./notifications");
    if (!(await isChannelEnabled("promo"))) return null;
    return await createNotification({
      recipientId: "patients",
      role: "marketing",
      type: "promo",
      channel: "promo",
      title: input.title,
      body: input.body,
    });
  } catch {
    return null;
  }
}
