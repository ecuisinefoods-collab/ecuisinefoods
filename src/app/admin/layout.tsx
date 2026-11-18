import AdminWorkspaceChrome from "@/components/admin/admin-workspace-chrome";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-premium-shell admin-workspace min-h-screen">
      <AdminWorkspaceChrome>{children}</AdminWorkspaceChrome>
    </div>
  );
}
