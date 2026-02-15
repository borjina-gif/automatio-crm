import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Topbar />
                <main className="page-content">{children}</main>
            </div>
        </div>
    );
}
