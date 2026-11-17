import { MainActions } from "@/components/MainActions";
import { Sidebar } from "@/components/Sidebar";
import { SiteFooter } from "@/components/SiteFooter";
import { OfflineProvider } from "@/components/OfflineProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OfflineProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-col bg-background pb-24 md:ml-64 md:pb-0">
          <main className="flex-1 px-4 pt-20 md:px-12 md:py-12">
            {children}
          </main>
          <SiteFooter />
        </div>
        <MainActions variant="bar" />
      </div>
    </OfflineProvider>
  );
}
