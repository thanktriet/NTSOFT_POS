const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string;
};

export async function api<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ===== Menu APIs =====

export async function getMenu(storeId: string) {
  return api(`/menu/store/${storeId}`);
}

export async function getMenuItem(itemId: string) {
  return api(`/menu/item/${itemId}`);
}

// ===== Order APIs =====

export async function createOrder(data: {
  storeId: string;
  tableId: string;
  source: 'qr' | 'staff';
  items: Array<{ menuItemId: string; quantity: number; note?: string; options?: any[] }>;
  note?: string;
}) {
  return api('/orders', { method: 'POST', body: data });
}

export async function getOrdersByTable(tableId: string) {
  return api(`/orders/table/${tableId}`);
}

export async function addItemsToOrder(orderId: string, items: Array<{ menuItemId: string; quantity: number; note?: string; options?: any[] }>) {
  return api(`/orders/${orderId}/items`, { method: 'POST', body: { items } });
}

// ===== Payment APIs =====

export async function requestPayment(tableId: string) {
  return api(`/payments/request/${tableId}`, { method: 'POST' });
}
