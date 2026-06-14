import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NTSOFT POS - Staff',
  description: 'Staff management app',
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[390px] mx-auto min-h-screen bg-dark-800 text-white">
      {children}
    </div>
  );
}
