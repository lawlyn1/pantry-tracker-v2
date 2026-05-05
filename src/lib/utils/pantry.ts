import { InventoryItem } from '@/types';

export function getDaysUntilExpiry(item: InventoryItem): number | null {
  if (!item.expiration_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(item.expiration_date);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getExpiryBadge(days: number | null): { text: string; className: string } {
  if (days === null) return { text: '', className: '' };
  if (days < 0) return { text: 'Expired', className: 'bg-red-100 text-red-700' };
  if (days === 0) return { text: 'Today', className: 'bg-red-100 text-red-700' };
  if (days <= 3) return { text: `${days}d left`, className: 'bg-orange-100 text-orange-700' };
  if (days <= 7) return { text: `${days}d left`, className: 'bg-yellow-100 text-yellow-700' };
  return { text: '', className: '' };
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
