export default function DashboardPage() {
    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="page-header-sub">Bienvenido a Automatio CRM</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Facturado este mes</div>
                    <div className="stat-value">0,00 €</div>
                    <div className="stat-sub">Febrero 2026</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Pendiente de cobro</div>
                    <div className="stat-value">0,00 €</div>
                    <div className="stat-sub">0 facturas</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Clientes</div>
                    <div className="stat-value">0</div>
                    <div className="stat-sub">Activos</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Presupuestos</div>
                    <div className="stat-value">0</div>
                    <div className="stat-sub">Este mes</div>
                </div>
            </div>

            {/* Recent Activity Placeholder */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Actividad reciente</span>
                </div>
                <div className="card-body">
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>Sin actividad reciente</h3>
                        <p>Empieza creando tu primer cliente o presupuesto</p>
                    </div>
                </div>
            </div>
        </>
    );
}
