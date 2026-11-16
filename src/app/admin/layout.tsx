export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-premium-shell min-h-screen">{children}</div>;
}
