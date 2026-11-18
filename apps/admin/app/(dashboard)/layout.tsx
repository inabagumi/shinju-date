import { Header } from "@/components/header";

export interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div>
      <Header />
      {/* 本文の最大幅と左右の余白は、ナビゲーションバーと揃えて全ページで同じにする */}
      <main className="mx-auto w-full max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
