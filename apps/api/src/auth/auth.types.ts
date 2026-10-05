/** Who is calling. `id` is the ERP id (student_id or staff_id) or a parent contact id prefixed with "contact:". */
export interface AuthUser {
  id: string;
  kind: 'student' | 'staff' | 'parent' | 'system';
  /** primary role used for audit and inbox routing */
  role: string;
  /** every role held (Keycloak realm roles or dev header) */
  roles: string[];
  name?: string;
  /** hostels this login may see; null = all (set by ScopeGuard, decision D7) */
  scope?: string[] | null;
}
