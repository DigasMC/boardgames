import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen bg-background p-4 pt-20 md:ml-64 md:p-12 md:pt-12">
        {children}
      </main>
    </div>
  );
}
