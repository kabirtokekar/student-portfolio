"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { 
  LayoutDashboard, 
  Users, 
  CheckCircle2, 
  User, 
  LogOut,
  Menu,
  X,
  Bell,
  Award,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";
import pb from "@/lib/pocketbase";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: "/faculty", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faculty/students", label: "My Students", icon: Users },
  { href: "/faculty/verifications", label: "Verifications", icon: CheckCircle2 },
  { href: "/faculty/profile", label: "Profile", icon: User },
];

interface FacultyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FacultyUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = pb.authStore.model as FacultyUser | null;
      
      if (!pb.authStore.isValid || !currentUser) {
        router.replace("/login");
        return;
      }
      
      if (currentUser.role !== "faculty") {
        pb.authStore.clear();
        router.replace("/login");
        return;
      }
      
      setUser(currentUser);
      
      // Fetch pending count for badge - FIXED: Use proper filter syntax
      try {
        const facultyRecords = await pb.collection("faculty").getFullList({
          filter: `user = "${currentUser.id}"`,
          $autoCancel: false
        });
        
        if (facultyRecords.length > 0) {
          const facultyId = facultyRecords[0].id;
          
          // FIXED: First get students assigned to this faculty, then count their pending items
          const students = await pb.collection("students").getFullList({
            filter: `faculty = "${facultyId}"`,
            fields: "id",
            $autoCancel: false
          });
          
          const studentIds = students.map(s => s.id);
          
          if (studentIds.length > 0) {
            // Build filter for projects/certificates using student IDs
            // FIXED: Use 'student.id' format instead of nested relation
            const studentFilter = studentIds.map(id => `student = "${id}"`).join(" || ");
            
            const [pendingProjects, pendingCertificates] = await Promise.all([
              pb.collection("projects").getList(1, 1, {
                filter: `status = "pending" && (${studentFilter})`,
                $autoCancel: false
              }),
              pb.collection("certificates").getList(1, 1, {
                filter: `status = "pending" && (${studentFilter})`,
                $autoCancel: false
              })
            ]);
            
            setPendingCount(pendingProjects.totalItems + pendingCertificates.totalItems);
          }
        }
      } catch (err) {
        console.error("Error fetching pending count:", err);
        // Don't throw - just set count to 0
        setPendingCount(0);
      }
      
      setMounted(true);
    } catch (error) {
      console.error("Auth check error:", error);
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
    const unsub = pb.authStore.onChange(() => checkAuth());
    return () => unsub();
  }, [checkAuth]);

  const logout = useCallback(() => {
    pb.authStore.clear();
    router.push("/login");
  }, [router]);

  const isActive = useCallback((href: string) => {
    if (href === "/faculty") return pathname === "/faculty";
    return pathname.startsWith(href);
  }, [pathname]);

  const getPageTitle = useCallback(() => {
    switch (true) {
      case pathname === "/faculty": return "Dashboard";
      case pathname.includes("students"): return "My Students";
      case pathname.includes("verifications"): return "Verifications";
      case pathname.includes("profile"): return "My Profile";
      default: return "Faculty Portal";
    }
  }, [pathname]);

  const getPageSubtitle = useCallback(() => {
    switch (true) {
      case pathname === "/faculty": return "Overview of your activities";
      case pathname.includes("students"): return "Manage and monitor your students";
      case pathname.includes("verifications"): return "Review student submissions";
      default: return "Manage student portfolios";
    }
  }, [pathname]);

  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="w-64 bg-indigo-900 hidden lg:block animate-pulse" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <p className="text-sm text-gray-500">Loading faculty portal...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Faculty navigation"
      >
        <div className="p-6 border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Sparkles size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg tracking-tight">Faculty Portal</h2>
              <p className="text-xs text-indigo-200">Verification System</p>
            </div>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 lg:hidden text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1" role="navigation">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const hasBadge = item.href === "/faculty/verifications" && pendingCount > 0;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 group relative
                  ${active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                    : "text-indigo-100 hover:bg-indigo-800/60 hover:text-white"
                  }
                `}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} className={active ? "text-white" : "text-indigo-300 group-hover:text-white"} />
                <span className="font-medium">{item.label}</span>
                {hasBadge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
                {active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <div className="mb-4 p-3 bg-indigo-800/50 rounded-xl backdrop-blur-sm">
            <p className="font-medium text-sm truncate text-white">{user.name}</p>
            <p className="text-xs text-indigo-300 truncate">{user.email}</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-indigo-400">Online</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-red-300 hover:bg-red-900/30 rounded-xl transition-all group"
          >
            <LogOut size={18} className="group-hover:translate-x-[-2px] transition-transform" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
            <span className="font-bold text-gray-900">Faculty Portal</span>
          </div>
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg relative transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-gray-700" />
            {(notifications > 0 || pendingCount > 0) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30 backdrop-blur-md bg-white/80">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{getPageSubtitle()}</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                className="p-2 hover:bg-gray-100 rounded-lg relative transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-600" />
                {(notifications > 0 || pendingCount > 0) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                  {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden xl:block">{user.name}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}