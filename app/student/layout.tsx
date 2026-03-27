"use client";

import { Award } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { 
  LayoutDashboard, 
  FolderGit2, 
  User, 
  LogOut,
  Menu,
  X,
  Bell,
  CheckCircle2,
  Clock
} from "lucide-react";
import pb from "@/lib/pocketbase";

const navItems = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/projects", label: "My Projects", icon: FolderGit2 },
  { href: "/student/profile", label: "Profile", icon: User },
  { href: "/student/certificates", label: "Certificates", icon: Award },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  const checkAuth = useCallback(async () => {
    const currentUser = pb.authStore.model;
    
    if (!pb.authStore.isValid || !currentUser) {
      router.replace("/login");
      return;
    }
    
    if (currentUser.role !== "student") {
      pb.authStore.clear();
      router.replace("/login");
      return;
    }
    
    setUser(currentUser);
    
    // Fetch student record
    try {
      const records = await pb.collection("students").getFullList({
        filter: `user = "${currentUser.id}"`,
        expand: "user"
      });
      if (records.length > 0) {
        setStudentData(records[0]);
      }
    } catch (err) {
      console.error("Error fetching student data:", err);
    }
    
    setMounted(true);
  }, [router]);

  useEffect(() => {
    checkAuth();
    const unsub = pb.authStore.onChange(() => checkAuth());
    return () => unsub();
  }, [checkAuth]);

  const logout = () => {
    pb.authStore.clear();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/student") return pathname === "/student";
    return pathname.startsWith(href);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="w-64 bg-indigo-900 hidden lg:block" />
        <main className="flex-1" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
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
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white flex flex-col shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <LayoutDashboard size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Student Portal</h2>
              <p className="text-xs text-indigo-200">Portfolio System</p>
            </div>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 lg:hidden text-white/80 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
                isActive(item.href)
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                  : "text-indigo-100 hover:bg-indigo-800"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
              {isActive(item.href) && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <div className="mb-4 p-3 bg-indigo-800/50 rounded-lg">
            <p className="font-medium text-sm truncate">{user?.name}</p>
            <p className="text-xs text-indigo-300 truncate">{user?.email}</p>
            {studentData && (
              <p className="text-xs text-indigo-400 mt-1">
                {studentData.roll_number} • {studentData.department}
              </p>
            )}
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
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} className="text-gray-700" />
            </button>
            <span className="font-bold text-gray-900">Student Portal</span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg relative">
            <Bell size={20} className="text-gray-700" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-40">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {pathname === "/student" ? "Dashboard" : 
                 pathname.includes("projects") ? "My Projects" :
                 pathname.includes("profile") ? "My Profile" : "Student Portal"}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {pathname === "/student" ? "Overview of your portfolio" : "Manage your academic portfolio"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/student/projects/create"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <FolderGit2 size={18} />
                Add Project
              </Link>
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell size={20} className="text-gray-600" />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
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