export function resellerGuard(user: { id: string; role: string; reseller_id?: string }, resellerId: string): boolean {
  return user.role === 'reseller' && user.reseller_id === resellerId
}
