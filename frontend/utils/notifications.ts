export interface AppNotification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  isProcessed?: boolean;
  createdAt: string;
  type: string;
}

export interface NotificationEntityIndex {
  unreadApplicationIds: Set<string>;
  unreadStudentIds: Set<string>;
}

export function parseApplicationIdFromNotification(notification: Pick<AppNotification, 'link'>): string | null {
  const link = notification.link || '';
  const match = link.match(/^\/applications\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function parseStudentIdFromNotification(notification: Pick<AppNotification, 'link'>): string | null {
  const link = notification.link || '';
  const match = link.match(/^\/students\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export type NotificationApplicationMeta = {
  universityId?: string;
  degree?: string;
  responsibleId?: string;
  agentId?: string;
  agencyCompanyId?: string;
};

type NotificationFilterApplication = {
  id: string;
  studentId: string;
  programId: string;
  userId?: string;
  responsibleId?: string;
  agencyCompanyId?: string;
};

type NotificationFilterProgram = {
  id: string;
  universityId: string;
  degree: string;
};

function metaFromApplication(
  app: NotificationFilterApplication,
  programById: Map<string, NotificationFilterProgram>
): NotificationApplicationMeta {
  const program = programById.get(app.programId);
  return {
    universityId: program?.universityId,
    degree: program?.degree,
    responsibleId: app.responsibleId,
    agentId: app.userId,
    agencyCompanyId: app.agencyCompanyId
  };
}

/** Application fields tied to a notification (direct application link, or the student's applications). */
export function getNotificationApplicationMetas(
  notification: Pick<AppNotification, 'link'>,
  applications: NotificationFilterApplication[],
  programs: NotificationFilterProgram[]
): NotificationApplicationMeta[] {
  const programById = new Map(programs.map((p) => [p.id, p]));
  const applicationId = parseApplicationIdFromNotification(notification);
  if (applicationId) {
    const app = applications.find((a) => a.id === applicationId);
    return app ? [metaFromApplication(app, programById)] : [];
  }
  const studentId = parseStudentIdFromNotification(notification);
  if (!studentId) return [];
  return applications
    .filter((a) => a.studentId === studentId)
    .map((a) => metaFromApplication(a, programById));
}

/** Map unread notifications to student/application ids for tree view badges. */
export function buildNotificationEntityIndex(
  notifications: AppNotification[],
  applications: Array<{ id: string; studentId: string }>
): NotificationEntityIndex {
  const unreadApplicationIds = new Set<string>();
  const unreadStudentIds = new Set<string>();
  const appToStudent = new Map(applications.map((a) => [a.id, a.studentId]));

  for (const notification of notifications) {
    if (notification.isRead) continue;
    const applicationId = parseApplicationIdFromNotification(notification);
    if (applicationId) {
      unreadApplicationIds.add(applicationId);
      const studentId = appToStudent.get(applicationId);
      if (studentId) unreadStudentIds.add(studentId);
    }
    const studentId = parseStudentIdFromNotification(notification);
    if (studentId) unreadStudentIds.add(studentId);
  }

  return { unreadApplicationIds, unreadStudentIds };
}

export function navigateFromNotification(
  notification: AppNotification,
  onNavigate?: (page: string, entityId?: string) => void
) {
  if (!notification.link || !onNavigate) return;
  if (notification.link === '/news' || notification.type === 'NEWS') {
    onNavigate('news');
    return;
  }
  const studentMatch = notification.link.match(/^\/students\/(.+)$/);
  if (studentMatch) {
    onNavigate('students', decodeURIComponent(studentMatch[1]));
    return;
  }
  if (notification.link === '/students') {
    onNavigate('students');
    return;
  }
  const match = notification.link.match(/\/applications\/(.+)/);
  if (match) {
    onNavigate('applications', match[1]);
  }
}

export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  const res = await fetch(`/api/notifications?user_id=${userId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((n) => ({ ...n, isProcessed: Boolean(n.isProcessed), isRead: Boolean(n.isRead) }))
    : [];
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const res = await fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
  return res.ok;
}

export async function markNotificationUnread(notificationId: string): Promise<boolean> {
  const res = await fetch(`/api/notifications/${notificationId}/unread`, { method: 'PUT' });
  return res.ok;
}

export async function markNotificationProcessed(notificationId: string): Promise<boolean> {
  const res = await fetch(`/api/notifications/${notificationId}/processed`, { method: 'PUT' });
  return res.ok;
}

export async function markNotificationUnprocessed(notificationId: string): Promise<boolean> {
  const res = await fetch(`/api/notifications/${notificationId}/unprocessed`, { method: 'PUT' });
  return res.ok;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const res = await fetch(`/api/notifications/read-all?user_id=${userId}`, { method: 'PUT' });
  return res.ok;
}
