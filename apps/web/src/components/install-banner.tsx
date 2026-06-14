'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return; // Don't show if already installed

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) return;

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Android/Chrome: capture install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS banner after 2 seconds
    if (ios) {
      setTimeout(() => setShow(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  };

  if (!show || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/60 animate-fadeIn">
      <div className="w-full max-w-[390px] bg-dark-700 rounded-2xl overflow-hidden border border-dark-400 shadow-2xl animate-slideUp">
        {/* Header */}
        <div className="p-5 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-400 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white mx-auto mb-3">
            NT
          </div>
          <h3 className="text-lg font-bold text-white">Cài đặt NTSOFT POS</h3>
          <p className="text-sm text-gray-400 mt-1">
            Thêm vào Màn hình chính để trải nghiệm như app native
          </p>
        </div>

        {/* Benefits */}
        <div className="px-5 pb-4">
          <div className="bg-dark-600 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-500">✓</span>
              <span>Mở nhanh không cần trình duyệt</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-500">✓</span>
              <span>Toàn màn hình, giống app thật</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-500">✓</span>
              <span>Nhận thông báo đơn hàng realtime</span>
            </div>
          </div>
        </div>

        {/* iOS Instructions */}
        {isIOS && (
          <div className="px-5 pb-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
              <p className="text-xs text-blue-400 font-semibold mb-2">Hướng dẫn cài trên iPhone:</p>
              <div className="space-y-1.5 text-xs text-gray-400">
                <p>1. Nhấn nút <span className="text-white font-medium">Chia sẻ</span> (↑) ở thanh dưới</p>
                <p>2. Cuộn xuống chọn <span className="text-white font-medium">"Thêm vào MH chính"</span></p>
                <p>3. Nhấn <span className="text-white font-medium">"Thêm"</span> để hoàn tất</p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 bg-dark-500 border border-dark-400 rounded-xl text-sm font-semibold text-gray-400"
          >
            Để sau
          </button>
          {!isIOS && deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="flex-1 py-3 bg-primary-500 rounded-xl text-sm font-semibold text-white"
            >
              📲 Cài đặt ngay
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 bg-primary-500 rounded-xl text-sm font-semibold text-white"
            >
              Đã hiểu 👍
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
