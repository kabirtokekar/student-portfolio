"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { 
  LayoutDashboard, 
  Search, 
  Heart, 
  User, 
  LogOut,
  Menu,
  X,
  Bell,
  Briefcase,
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
  { href: "/recruiter", label: "Dashboard", icon: LayoutDashboard },
  { href: "/recruiter/browse", label: "Browse Talent", icon: Search },
  { href: "/recruiter/shortlist", label: "Shortlisted", icon: Heart },
  { href: "/recruiter/profile", label: "Profile", icon: User },
];

interface RecruiterUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<RecruiterUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [shortlistCount, setShortlistCount] = useState(0);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = pb.authStore.model as RecruiterUser | null;
      
      if (!pb.authStore.isValid || !currentUser) {
        router.replace("/login");
        return;
      }
      
      if (currentUser.role !== "recruiter") {
        pb.authStore.clear();
        router.replace("/login");
        return;
      }
      
      setUser(currentUser);
      
      // Fetch shortlist count for badge
      try {
        const recruiterRecords = await pb.collection("recruiter").getFullList({
          filter: `user = "${currentUser.id}"`,
          $autoCancel: false
        });
        
        if (recruiterRecords.length > 0) {
          const shortlist = await pb.collection("shortlists").getList(1, 1, {
            filter: `recruiter = "${recruiterRecords[0].id}"`,
            $autoCancel: false
          });
          setShortlistCount(shortlist.totalItems);
        }
      } catch (err) {
        console.error("Error fetching shortlist count:", err);
        setShortlistCount(0);
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
    if (href === "/recruiter") return pathname === "/recruiter";
    return pathname.startsWith(href);
  }, [pathname]);

  const getPageTitle = useCallback(() => {
    switch (true) {
      case pathname === "/recruiter": return "Dashboard";
      case pathname.includes("browse"): return "Browse Talent";
      case pathname.includes("shortlist"): return "Shortlisted Candidates";
      case pathname.includes("profile"): return "Company Profile";
      default: return "Recruiter Portal";
    }
  }, [pathname]);

  const getPageSubtitle = useCallback(() => {
    switch (true) {
      case pathname === "/recruiter": return "Overview of available talent";
      case pathname.includes("browse"): return "Find and filter verified candidates";
      case pathname.includes("shortlist"): return "Your saved candidates";
      default: return "Discover verified student talent";
    }
  }, [pathname]);

  if (!mounted || isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="w-64 bg-indigo-900 hidden lg:block animate-pulse" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            <p className="text-sm text-gray-500">Loading recruiter portal...</p>
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

      {/* Sidebar - MATCHES FACULTY: bg-indigo-900, same structure */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Recruiter navigation"
      >
        <div className="p-6 border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Briefcase size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg tracking-tight">Recruiter Hub</h2>
              <p className="text-xs text-indigo-200">Talent Discovery</p>
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
            const isShortlist = item.href === "/recruiter/shortlist";
            const hasBadge = isShortlist && shortlistCount > 0;
            
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
                    {shortlistCount > 99 ? '99+' : shortlistCount}
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
        {/* Mobile Header - MATCHES FACULTY */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
            <span className="font-bold text-gray-900">Recruiter Hub</span>
          </div>
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg relative transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-gray-700" />
            {(notifications > 0 || shortlistCount > 0) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </header>

        {/* Desktop Header - MATCHES FACULTY */}
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
                {(notifications > 0 || shortlistCount > 0) && (
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