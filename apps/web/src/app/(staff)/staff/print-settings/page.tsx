'use client';

import { useState, useEffect } from 'react';
import { BluetoothPrinter, getPrinter, PrinterStatus } from '@/lib/bluetooth-printer';

interface PrinterConfig {
  type: 'ip' | 'bluetooth';
  ip?: string;
  port?: number;
  name?: string;
}

export default function PrintSettingsPage() {
  const [config, setConfig] = useState<PrinterConfig>({
    type: 'ip',
    ip: '192.168.1.100',
    port: 9100,
  });
  const [btStatus, setBtStatus] = useState<PrinterStatus>('disconnected');
  const [btSupported, setBtSupported] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setBtSupported(BluetoothPrinter.isSupported());
  }, []);

  // ===== IP LAN Print =====
  const testIpPrinter = async () => {
    setTesting(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/print/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ip: config.ip, port: config.port }),
      });
      const data = await res.json();
      setMessage(data.message);
    } catch (err) {
      setMessage('Lỗi kết nối API');
    }
    setTesting(false);
  };

  // ===== Bluetooth Print =====
  const connectBluetooth = async () => {
    const printer = getPrinter();
    printer.onStatusChange = setBtStatus;
    const success = await printer.connect();
    if (success) {
      setMessage(`Đã kết nối: ${printer.printerInfo?.name}`);
      setConfig((prev) => ({
        ...prev,
        type: 'bluetooth',
        name: printer.printerInfo?.name,
      }));
    } else {
      setMessage('Không thể kết nối Bluetooth');
    }
  };

  const disconnectBluetooth = () => {
    const printer = getPrinter();
    printer.disconnect();
    setBtStatus('disconnected');
    setMessage('Đã ngắt kết nối');
  };

  const testBluetoothPrint = async () => {
    const printer = getPrinter();
    setTesting(true);
    const success = await printer.printText(
      '    === TEST PRINT ===\n' +
      '      NTSOFT POS\n' +
      ' Ket noi thanh cong!\n' +
      ` ${new Date().toLocaleString('vi-VN')}\n`,
    );
    setMessage(success ? 'In test thành công' : 'Lỗi khi in');
    setTesting(false);
  };

  const saveConfig = () => {
    localStorage.setItem('printer_config', JSON.stringify(config));
    setMessage('Đã lưu cài đặt máy in');
  };

  return (
    <div className="min-h-screen bg-dark-800 text-white p-4 max-w-[390px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <a href="/staff" className="text-xl">←</a>
        <h1 className="text-lg font-bold">Cài đặt máy in</h1>
      </div>

      {/* Connection Type */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold mb-3">Phương thức kết nối</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setConfig((p) => ({ ...p, type: 'ip' }))}
            className={`p-3 rounded-lg border text-center text-sm transition-all ${
              config.type === 'ip'
                ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                : 'border-dark-400 text-gray-400'
            }`}
          >
            🌐 IP LAN
          </button>
          <button
            onClick={() => setConfig((p) => ({ ...p, type: 'bluetooth' }))}
            className={`p-3 rounded-lg border text-center text-sm transition-all ${
              config.type === 'bluetooth'
                ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                : 'border-dark-400 text-gray-400'
            }`}
          >
            📶 Bluetooth
          </button>
        </div>
      </div>

      {/* IP LAN Config */}
      {config.type === 'ip' && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-3">🌐 Cấu hình IP LAN</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Địa chỉ IP máy in</label>
              <input
                type="text"
                value={config.ip}
                onChange={(e) => setConfig((p) => ({ ...p, ip: e.target.value }))}
                className="input w-full"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Port (mặc định 9100)</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig((p) => ({ ...p, port: parseInt(e.target.value) || 9100 }))}
                className="input w-full"
                placeholder="9100"
              />
            </div>
            <button
              onClick={testIpPrinter}
              disabled={testing}
              className="btn-primary w-full disabled:opacity-50"
            >
              {testing ? '⏳ Đang test...' : '🖨️ Test in thử'}
            </button>
          </div>
          <div className="mt-3 p-3 bg-dark-500 rounded-lg">
            <p className="text-xs text-gray-400">
              💡 Hướng dẫn: Máy in cần kết nối cùng mạng WiFi/LAN với máy chủ.
              Xem IP máy in trong cài đặt printer hoặc in trang cấu hình.
            </p>
          </div>
        </div>
      )}

      {/* Bluetooth Config */}
      {config.type === 'bluetooth' && (
        <div className="card mb-4">
          <h3 className="text-sm font-semibold mb-3">📶 Bluetooth</h3>

          {!btSupported && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-3">
              <p className="text-xs text-red-400">
                ⚠️ Trình duyệt này không hỗ trợ Web Bluetooth.
                Vui lòng dùng Chrome trên Android/Desktop.
              </p>
            </div>
          )}

          {btSupported && (
            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-dark-500 rounded-lg">
                <span className="text-xs text-gray-400">Trạng thái</span>
                <span className={`text-xs font-semibold ${
                  btStatus === 'connected' ? 'text-green-500' :
                  btStatus === 'connecting' ? 'text-yellow-500' :
                  btStatus === 'error' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {btStatus === 'connected' ? '🟢 Đã kết nối' :
                   btStatus === 'connecting' ? '🟡 Đang kết nối...' :
                   btStatus === 'printing' ? '🟠 Đang in...' :
                   btStatus === 'error' ? '🔴 Lỗi' : '⚪ Chưa kết nối'}
                </span>
              </div>

              {config.name && btStatus === 'connected' && (
                <div className="flex items-center justify-between p-3 bg-dark-500 rounded-lg">
                  <span className="text-xs text-gray-400">Máy in</span>
                  <span className="text-xs text-white font-medium">{config.name}</span>
                </div>
              )}

              {/* Actions */}
              {btStatus !== 'connected' ? (
                <button
                  onClick={connectBluetooth}
                  disabled={btStatus === 'connecting'}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {btStatus === 'connecting' ? '⏳ Đang tìm...' : '🔍 Tìm máy in Bluetooth'}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={testBluetoothPrint}
                    disabled={testing}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {testing ? '⏳ Đang in...' : '🖨️ Test in thử'}
                  </button>
                  <button
                    onClick={disconnectBluetooth}
                    className="w-full p-2 border border-red-500/50 text-red-400 rounded-lg text-sm"
                  >
                    Ngắt kết nối
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 p-3 bg-dark-500 rounded-lg">
            <p className="text-xs text-gray-400">
              💡 Bật Bluetooth trên máy in trước, sau đó nhấn "Tìm máy in" và chọn thiết bị.
              Hỗ trợ: Xprinter, Bixolon, Rongta và các máy in ESC/POS.
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${
          message.includes('thành công') || message.includes('Đã')
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {message}
        </div>
      )}

      {/* Save */}
      <button onClick={saveConfig} className="btn-primary w-full">
        💾 Lưu cài đặt
      </button>
    </div>
  );
}
