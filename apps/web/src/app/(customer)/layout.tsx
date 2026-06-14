import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đặt món - Nam Thắng Beer & Food',
  description: 'Scan QR để đặt món',
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
