export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function minutesAgo(date: Date | string): number {
  const d = new Date(date);
  return Math.floor((Date.now() - d.getTime()) / 60000);
}
