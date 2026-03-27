"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  GraduationCap, 
  Briefcase, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  AlertCircle
} from "lucide-react";
import { FaChalkboardTeacher } from "react-icons/fa";
import pb from "@/lib/pocketbase";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { 
    href: "#", 
    label: "Create Users", 
    icon: UserPlus,
    subItems: [
      { href: "/admin/create-student", label: "Student", icon: GraduationCap },
      { href: "/admin/create-faculty", label: "Faculty", icon: FaChalkboardTeacher },
      { href: "/admin/create-recruiter", label: "Recruiter", icon: Briefcase },
    ]
  },
  { href: "/admin/my-users", label: "My Users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = useCallback(() => {
    const currentUser = pb.authStore.model;
    
    if (!pb.authStore.isValid || !currentUser) {
      console.log("No valid auth, redirecting...");
      router.replace("/login");
      return false;
    }
    
    const allowedRoles = ["admin", "super_admin"];
    if (!allowedRoles.includes(currentUser?.role)) {
      console.log("Invalid role:", currentUser?.role);
      pb.authStore.clear();
      router.replace("/login");
      return false;
    }
    
    setUser(currentUser);
    setAuthError(null);
    return true;
  }, [router]);

  useEffect(() => {
    setMounted(true);
    
    // Initial auth check
    const isAuthed = checkAuth();
    
    // Subscribe to auth state changes
    const unsub = pb.authStore.onChange(() => {
      checkAuth();
    });

    return () => {
      unsub();
    };
  }, [checkAuth]);

  const logout = () => {
    pb.authStore.clear();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const isSubMenuActive = (subItems?: { href: string }[]) => {
    return subItems?.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`));
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="w-64 bg-blue-900" />
        <main className="flex-1" />
      </div>
    );
  }

  // If no user, show loading or error
  if (!user) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-blue-900 p-6 hidden lg:block">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="w-10 h-10 bg-blue-800 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 bg-blue-800" />
            <Skeleton className="h-3 w-24 bg-blue-800" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full bg-blue-800 rounded-lg" />
          <Skeleton className="h-10 w-full bg-blue-800 rounded-lg" />
          <Skeleton className="h-10 w-full bg-blue-800 rounded-lg" />
        </div>
      </div>
      
      {/* Main content loading */}
      <div className="flex-1 p-8 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-blue-900 dark:bg-gray-950 text-white flex flex-col shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
`     }>
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Admin Panel</h2>
              <p className="text-xs text-blue-200">SGSITS Portfolio</p>
            </div>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 lg:hidden text-white/80 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.subItems ? (
                <div className="mb-1">
                  <button
                    onClick={() => setExpandedMenu(!expandedMenu)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                      isSubMenuActive(item.subItems)
                        ? "bg-blue-600 text-white"
                        : "text-blue-100 hover:bg-blue-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={`transition-transform duration-200 ${expandedMenu ? 'rotate-90' : ''}`} 
                    />
                  </button>
                  
                  {expandedMenu && (
                    <div className="ml-4 mt-1 space-y-1 overflow-hidden">
                      {item.subItems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${
                            isActive(sub.href)
                              ? "bg-blue-700 text-white"
                              : "text-blue-200 hover:bg-blue-800 hover:text-white"
                          }`}
                        >
                          <sub.icon size={16} />
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
                    isActive(item.href)
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                      : "text-blue-100 hover:bg-blue-800"
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {isActive(item.href) && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800 dark:border-gray-800">
          <div className="mb-4 p-3 bg-blue-800/50 dark:bg-gray-800/50 rounded-lg">
            <p className="font-medium text-sm truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-blue-300 truncate">{user?.email}</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-700 rounded text-xs capitalize">
              {user?.role || 'admin'}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
            <Menu size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
            <span className="font-bold text-gray-900 dark:text-white">Admin Panel</span>
          </div>
          <ThemeToggle />
        </header>

        <header className="hidden lg:block bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {pathname === "/admin" ? "Dashboard" : 
                 pathname.includes("create-student") ? "Add Student" :
                 pathname.includes("create-faculty") ? "Add Faculty" :
                 pathname.includes("create-recruiter") ? "Add Recruiter" :
                 pathname.includes("my-users") ? "My Users" : "Admin Panel"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {pathname === "/admin" ? "Overview of your department" : "Manage system users"}
              </p>
            </div>
            <div className="flex items-center gap-4">
            <ThemeToggle />
              <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                {new Date().toLocaleDateString("en-IN", { 
                  weekday: "short", day: "numeric", month: "short", year: "numeric" 
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}