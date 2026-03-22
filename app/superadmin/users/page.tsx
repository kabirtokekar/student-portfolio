"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { 
  Users, 
  GraduationCap, 
  Briefcase, 
  Search, 
  Mail,
  Calendar,
  AlertCircle,
  RefreshCw
} from "lucide-react";

type UserRole = "student" | "faculty" | "recruiter" | "admin";
type TabRole = "all" | UserRole;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  created: string;
  isActive: boolean;
  expand?: {
    createdBy?: {
      name: string;
      email: string;
    };
  };
}

export default function UserDirectory() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabRole>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Use useCallback to prevent recreating function on every render
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching users with $autoCancel: false");
      
      // Single request with auto-cancel disabled
      const records = await pb.collection("users").getFullList({
        filter: 'role != "super_admin"',
        sort: "-created",
        expand: "createdBy",
        $autoCancel: false, // Explicitly disable for this request
        requestKey: null, // Prevent request deduplication issues
      });

      console.log("Users fetched successfully:", records.length);
      setUsers(records as unknown as User[]);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check auth first
    if (!pb.authStore.isValid || pb.authStore.model?.role !== "super_admin") {
      router.replace("/login");
      return;
    }

    // Fetch with small delay to prevent Strict Mode double-fire
    const timer = setTimeout(() => {
      fetchUsers();
    }, 100);

    return () => clearTimeout(timer);
  }, [fetchUsers, router]);

  // Filter users based on tab and search
  const filteredUsers = users.filter(user => {
    const matchesTab = activeTab === "all" || user.role === activeTab;
    const matchesSearch = searchTerm === "" || (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return matchesTab && matchesSearch;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "student": return <GraduationCap size={18} />;
      case "faculty": return <Users size={18} />;
      case "recruiter": return <Briefcase size={18} />;
      case "admin": return <Users size={18} />;
      default: return <Users size={18} />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "student": return "bg-blue-100 text-blue-800 border-blue-200";
      case "faculty": return "bg-green-100 text-green-800 border-green-200";
      case "recruiter": return "bg-orange-100 text-orange-800 border-orange-200";
      case "admin": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const tabs = [
    { id: "all" as TabRole, label: "All", count: users.length },
    { id: "student" as TabRole, label: "Students", count: users.filter(u => u.role === "student").length },
    { id: "faculty" as TabRole, label: "Faculty", count: users.filter(u => u.role === "faculty").length },
    { id: "recruiter" as TabRole, label: "Recruiters", count: users.filter(u => u.role === "recruiter").length },
    { id: "admin" as TabRole, label: "Admins", count: users.filter(u => u.role === "admin").length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load users</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchUsers}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Directory</h1>
        <p className="text-gray-600 mt-1">View all system users created by admins</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {tabs.filter(t => t.id !== "all").map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              activeTab === tab.id 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{tab.count}</p>
            <p className="text-sm text-gray-600">{tab.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Created By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail size={12} />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.department || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{user.expand?.createdBy?.name || "System"}</p>
                        <p className="text-gray-500 text-xs">{user.expand?.createdBy?.email || ""}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} />
                        {new Date(user.created).toLocaleDateString("en-IN")}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}