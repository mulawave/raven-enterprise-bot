export async function fetchOrders(session: any, tenant: any) {
  const res = await fetch(`/api/${tenant}/orders`, {
    headers: { Authorization: `Bearer ${session?.token}` },
    cache: "no-store"
  });
  return res.json();
}

export async function fetchBookings(session: any, tenant: any) {
  const res = await fetch(`/api/${tenant}/bookings`, {
    headers: { Authorization: `Bearer ${session?.token}` },
    cache: "no-store"
  });
  return res.json();
}

export async function fetchCustomers(session: any, tenant: any) {
  const res = await fetch(`/api/${tenant}/customers`, {
    headers: { Authorization: `Bearer ${session?.token}` },
    cache: "no-store"
  });
  return res.json();
}

export async function fetchBroadcasts(session: any, tenant: any) {
  const res = await fetch(`/api/${tenant}/broadcasts`, {
    headers: { Authorization: `Bearer ${session?.token}` },
    cache: "no-store"
  });
  return res.json();
}

export async function fetchAnalytics(session: any, tenant: any) {
  const res = await fetch(`/api/${tenant}/analytics`, {
    headers: { Authorization: `Bearer ${session?.token}` },
    cache: "no-store"
  });
  return res.json();
}

export async function fetchSettings(session: any, tenant: any) {
  const res = await fetch(`/api/${tenant}/settings`, {
    headers: { Authorization: `Bearer ${session?.token}` },
    cache: "no-store"
  });
  return res.json();
}
