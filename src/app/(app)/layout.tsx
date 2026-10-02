import { Sidebar } from "@/components/Sidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { OfflineProvider } from "@/components/OfflineProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-col bg-background md:ml-64">
          <main className="flex-1 p-4 pt-20 md:p-12 md:pt-12">{children}</main>
          <SiteFooter />
        </div>
      </div>
    </OfflineProvider>
  );
}
