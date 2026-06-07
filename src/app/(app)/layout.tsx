import { Sidebar } from "@/components/shell/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-screen">
      <Sidebar />
      <div className="px-5 py-6 md:px-9 md:py-7 min-w-0">{children}</div>
    </div>
  );
}
