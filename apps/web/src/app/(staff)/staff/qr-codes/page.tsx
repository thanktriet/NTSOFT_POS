'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface TableQr {
  id: string;
  name: string;
  floor: string;
  url: string;
  qrDataUrl: string;
}

export default function QrManagementPage() {
  const [tables, setTables] = useState<TableQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('all');

  useEffect(() => {
    loadQrCodes();
  }, []);

  const loadQrCodes = async () => {
    try {
      const data = await api('/qr/store/store-001/all');
      setTables(data);
    } catch (err) {
      console.error('Failed to load QR codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const floors = ['all', ...new Set(tables.map((t) => t.floor))];
  const filtered = selectedFloor === 'all'
    ? tables
    : tables.filter((t) => t.floor === selectedFloor);

  const printAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - NTSOFT POS</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, sans-serif; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; }
          .card { border: 2px solid #ddd; border-radius: 12px; padding: 16px; text-align: center; page-break-inside: avoid; }
          .card img { width: 150px; height: 150px; margin: 8px auto; }
          .card h3 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
          .card p { font-size: 11px; color: #666; word-break: break-all; }
          .store { font-size: 12px; color: #888; margin-bottom: 4px; }
          @media print {
            .grid { grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 8px; }
            .card { border: 1px solid #ccc; padding: 12px; }
            .card img { width: 120px; height: 120px; }
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${filtered.map((t) => `
            <div class="card">
              <div class="store">Nam Thắng Beer & Food</div>
              <h3>${t.name}</h3>
              <img src="${t.qrDataUrl}" alt="QR ${t.name}" />
              <p>Scan để đặt món</p>
            </div>
          `).join('')}
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printSingle = (table: TableQr) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${table.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { text-align: center; padding: 32px; }
          .card img { width: 250px; height: 250px; margin: 16px auto; }
          .card h2 { font-size: 36px; font-weight: 800; }
          .card h3 { font-size: 18px; color: #666; margin-bottom: 8px; }
          .card p { font-size: 14px; color: #888; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h3>Nam Thắng Beer & Food</h3>
          <h2>Bàn ${table.name}</h2>
          <img src="${table.qrDataUrl}" alt="QR ${table.name}" />
          <p>Scan QR để xem menu & đặt món</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-800 px-4 py-4 flex items-center justify-between border-b border-dark-400">
        <div className="flex items-center gap-3">
          <Link href="/staff" className="text-xl">←</Link>
          <h1 className="text-base font-semibold">QR Code Bàn</h1>
        </div>
        <button
          onClick={printAll}
          className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
        >
          🖨️ In tất cả
        </button>
      </header>

      {/* Floor filter */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {floors.map((f) => (
          <button
            key={f}
            onClick={() => setSelectedFloor(f)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${
              selectedFloor === f
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-dark-600 border-dark-400 text-gray-400'
            }`}
          >
            {f === 'all' ? `Tất cả (${tables.length})` : `Tầng ${f}`}
          </button>
        ))}
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {filtered.map((table) => (
          <div
            key={table.id}
            className="bg-dark-600 border border-dark-400 rounded-xl p-4 text-center"
          >
            <h3 className="text-lg font-bold text-white mb-1">{table.name}</h3>
            <img
              src={table.qrDataUrl}
              alt={`QR ${table.name}`}
              className="w-32 h-32 mx-auto rounded-lg bg-white p-1"
            />
            <p className="text-[10px] text-gray-500 mt-2 break-all">{table.url}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => printSingle(table)}
                className="flex-1 py-2 bg-dark-500 border border-dark-400 rounded-lg text-[11px] text-gray-300 font-medium"
              >
                🖨️ In
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(table.url);
                  alert(`Đã copy: ${table.url}`);
                }}
                className="flex-1 py-2 bg-dark-500 border border-dark-400 rounded-lg text-[11px] text-gray-300 font-medium"
              >
                📋 Copy
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-dark-700 flex justify-around py-2.5 pb-3.5 border-t border-dark-400 z-50">
        <NavItem icon="🏠" label="Trang chủ" href="/staff" />
        <NavItem icon="🪑" label="Bàn" href="/staff/tables" />
        <NavItem icon="📝" label="Order" href="/staff/create-order" />
        <NavItem icon="📊" label="Đơn hàng" href="/staff/orders" />
        <NavItem icon="👤" label="Tài khoản" href="/staff/account" />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 text-gray-600">
      <span className="text-lg">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}
