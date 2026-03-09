import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { NotificationProvider } from "@/components/NotificationContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <NotificationProvider>
                <div className="app-layout">
                    <Sidebar />
                    <div className="main-content">
                        <Topbar />
                        <main className="page-content">{children}</main>
                    </div>
                </div>
            </NotificationProvider>
        </SidebarProvider>
    );
}
