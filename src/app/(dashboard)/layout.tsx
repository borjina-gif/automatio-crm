import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <div className="app-layout">
                <Sidebar />
                <div className="main-content">
                    <Topbar />
                    <main className="page-content">{children}</main>
                </div>
            </div>
        </SidebarProvider>
    );
}
