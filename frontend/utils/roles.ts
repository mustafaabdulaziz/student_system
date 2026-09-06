export function normalizeRole(role?: string | null): string {
  return (role || '').toString().trim().toUpperCase();
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'ADMIN';
}

export function isOperatorRole(role?: string | null): boolean {
  return normalizeRole(role) === 'OPERATOR';
}

export function isUserRole(role?: string | null): boolean {
  return normalizeRole(role) === 'USER';
}

export function isAgentRole(role?: string | null): boolean {
  return normalizeRole(role) === 'AGENT';
}

/** Admin, Operasyon and Kullanıcı (not agent). */
export function isStaffRole(role?: string | null): boolean {
  return ['ADMIN', 'OPERATOR', 'USER'].includes(normalizeRole(role));
}

/** Admin and Operasyon: catalog CRUD, deletes, news management. */
export function canManageCatalog(role?: string | null): boolean {
  return ['ADMIN', 'OPERATOR'].includes(normalizeRole(role));
}

/** Settings: users, periods, agency companies (not payment lists). */
export function canAccessLimitedSettings(role?: string | null): boolean {
  return canManageCatalog(role);
}

/** Financial totals, application finance, university finance, payments. */
export function canSeeFinance(role?: string | null): boolean {
  return isAdminRole(role);
}
