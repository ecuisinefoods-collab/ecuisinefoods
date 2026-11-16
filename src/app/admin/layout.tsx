import { ThemeToggle } from "@/components/theme-provider";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="admin-premium-shell min-h-screen">
      {children}
      <ThemeToggle showLabel className="admin-theme-toggle fixed bottom-5 right-5 z-[80] border-[#d9c79b] bg-[#142720] px-4 py-3 text-[#f6e7bd] shadow-2xl shadow-black/20 hover:bg-[#1d382e]" />
    </div>
  );
}
