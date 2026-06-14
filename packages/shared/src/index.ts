// ===== Enums (mirrors Prisma enums) =====

export const STAFF_ROLES = ['owner', 'manager', 'staff', 'kitchen'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const TABLE_STATUSES = ['empty', 'occupied', 'reserved', 'paying'] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const ORDER_STATUSES = ['pending', 'confirmed', 'cooking', 'served', 'paid', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_STATUSES = ['pending', 'cooking', 'ready', 'served'] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const ORDER_SOURCES = ['qr', 'staff'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const PAYMENT_METHODS = ['cash', 'qr_transfer', 'momo', 'card', 'mixed'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ===== WebSocket Events =====

export const WS_EVENTS = {
  // Client → Server
  JOIN_STORE: 'join:store',
  JOIN_TABLE: 'join:table',
  SERVICE_REQUEST: 'service:request',

  // Server → Client
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ITEM_STATUS: 'item:status',
  TABLE_UPDATED: 'table:updated',
  NOTIFICATION: 'notification',
  SERVICE_REQUEST_RECEIVED: 'service:request',
} as const;

// ===== API Routes =====

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
  },
  STORES: '/stores',
  TABLES: '/tables',
  MENU: {
    FULL: (storeId: string) => `/menu/store/${storeId}`,
    ITEM: (id: string) => `/menu/item/${id}`,
    CATEGORIES: '/menu/categories',
    ITEMS: '/menu/items',
    OPTIONS: '/menu/options',
  },
  ORDERS: {
    CREATE: '/orders',
    BY_STORE: (storeId: string) => `/orders/store/${storeId}`,
    ACTIVE: (storeId: string) => `/orders/store/${storeId}/active`,
    BY_TABLE: (tableId: string) => `/orders/table/${tableId}`,
    BY_ID: (id: string) => `/orders/${id}`,
    ADD_ITEMS: (id: string) => `/orders/${id}/items`,
    STATUS: (id: string) => `/orders/${id}/status`,
  },
  KITCHEN: {
    QUEUE: (storeId: string) => `/kitchen/queue/${storeId}`,
    STATS: (storeId: string) => `/kitchen/stats/${storeId}`,
    START: (itemId: string) => `/kitchen/item/${itemId}/start`,
    READY: (itemId: string) => `/kitchen/item/${itemId}/ready`,
    SERVED: (itemId: string) => `/kitchen/item/${itemId}/served`,
  },
  PAYMENTS: {
    PROCESS: (orderId: string) => `/payments/process/${orderId}`,
    REQUEST: (tableId: string) => `/payments/request/${tableId}`,
    QR: '/payments/qr',
    REVENUE: (storeId: string) => `/payments/revenue/${storeId}`,
  },
  NOTIFICATIONS: {
    BY_STORE: (storeId: string) => `/notifications/${storeId}`,
    READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: (storeId: string) => `/notifications/${storeId}/read-all`,
  },
} as const;

// ===== Utility Types =====

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
}

// ===== Constants =====

export const PIN_LENGTH = 4;
export const ORDER_NUMBER_RESET_HOUR = 6; // Reset order number at 6 AM
export const KDS_URGENT_MINUTES = 10; // Mark as urgent after 10 minutes
export const KDS_WARNING_MINUTES = 7;

// ===== Formatter Helpers =====

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function minutesAgo(date: Date | string): number {
  const d = new Date(date);
  return Math.floor((Date.now() - d.getTime()) / 60000);
}
