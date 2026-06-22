function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // Use same hostname as frontend but port 3001
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const API_BASE = typeof window !== 'undefined' ? getApiBase() : 'http://localhost:3001';

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

  // Auto-attach token from localStorage if not provided
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Handle 401 - redirect to login
    if (res.status === 401 && typeof window !== 'undefined') {
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('staff');
        window.location.href = '/staff/login';
        throw new Error('Phiên đăng nhập hết hạn');
      }
    }
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
