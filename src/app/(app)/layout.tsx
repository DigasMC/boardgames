import { Sidebar } from "@/components/Sidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { OfflineProvider } from "@/components/OfflineProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-col bg-background md:ml-64">
          <main className="flex-1 px-4 pt-20 md:px-12 md:py-12">{children}</main>
          <SiteFooter />
        </div>
      </div>
    </OfflineProvider>
  );
}
