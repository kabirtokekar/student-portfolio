"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  Users, 
  Shield, 
  GraduationCap, 
  Briefcase, 
  FileCheck, 
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  TrendingUp,
  AlertCircle
} from "lucide-react";

// Type-safe color mapping
type ColorKey = "blue" | "green" | "purple" | "orange" | "red";

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color, 
  trend 
}: { 
  title: string; 
  value: number; 
  subtitle?: string; 
  icon: any; 
  color: ColorKey; 
  trend?: string;
}) {
  const colorClasses: Record<ColorKey, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
    red: "bg-red-50 border-red-200 text-red-600",
  };

  return (
    <div className={`p-6 rounded-xl border ${colorClasses[color]} bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp size={16} />
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function ActivityFeed({ activities }: { activities: any[] }) {
  if (activities.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Clock className="mx-auto mb-3 text-gray-300" size={48} />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {activities.map((activity) => (
        <div key={activity.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
          <div className="mt-0.5">
            {activity.type === 'create' && <CheckCircle className="text-green-500" size={16} />}
            {activity.type === 'verify' && <Shield className="text-purple-500" size={16} />}
            {activity.type === 'delete' && <XCircle className="text-red-500" size={16} />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
            <p className="text-sm text-gray-600 mt-1">
              by <span className="font-medium">{activity.user}</span> • {activity.target}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalRecruiters: 0,
    pendingVerifications: 0,
    approvedProjects: 0,
    rejectedProjects: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = pb.authStore.model;

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = () => {
    if (!pb.authStore.isValid || pb.authStore.model?.role !== "super_admin") {
      router.replace("/login");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching users...");
      // Fetch users with auto-cancel disabled
      const users = await pb.collection("users").getFullList({
        $autoCancel: false,
        sort: "-created",
      });
      console.log("Users fetched:", users.length);

      let projects: any[] = [];
      try {
        console.log("Fetching projects...");
        projects = await pb.collection("projects").getFullList({
          $autoCancel: false,
          sort: "-created",
        });
        console.log("Projects fetched:", projects.length);
      } catch (projErr) {
        console.log("Projects collection not found or empty:", projErr);
        // Projects collection might not exist yet, that's OK
        projects = [];
      }

      // Calculate stats
      const newStats = {
        totalAdmins: users.filter((u: any) => u.role === "admin").length,
        totalStudents: users.filter((u: any) => u.role === "student").length,
        totalFaculty: users.filter((u: any) => u.role === "faculty").length,
        totalRecruiters: users.filter((u: any) => u.role === "recruiter").length,
        pendingVerifications: projects.filter((p: any) => 
          p.status === "submitted" || p.status === "under_review"
        ).length,
        approvedProjects: projects.filter((p: any) => p.status === "approved").length,
        rejectedProjects: projects.filter((p: any) => p.status === "rejected").length,
      };

      console.log("Stats calculated:", newStats);
      setStats(newStats);

      // Set mock activities for now
      setActivities([
        {
          id: "1",
          action: "Created admin",
          user: "Super Admin",
          target: "John Doe (john@college.edu)",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: "create"
        },
        {
          id: "2",
          action: "Verified project",
          user: "Dr. Sharma",
          target: "AI Chatbot by Rahul Kumar",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          type: "verify"
        },
      ]);

    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

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
          <div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-IN", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
          </span>
          <Link 
            href="/superadmin/add-admin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Admin
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Admins"
          value={stats.totalAdmins}
          subtitle="System administrators"
          icon={Shield}
          color="purple"
          trend="+2 this week"
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          subtitle="Active portfolios"
          icon={GraduationCap}
          color="blue"
          trend="+15 this month"
        />
        <StatCard
          title="Faculty"
          value={stats.totalFaculty}
          subtitle="Verifiers"
          icon={Users}
          color="green"
        />
        <StatCard
          title="Recruiters"
          value={stats.totalRecruiters}
          subtitle="External viewers"
          icon={Briefcase}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Verifications</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pendingVerifications}</h3>
            </div>
            <Clock className="text-yellow-500" size={32} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Approved Projects</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.approvedProjects}</h3>
            </div>
            <CheckCircle className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">Rejected Projects</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.rejectedProjects}</h3>
            </div>
            <XCircle className="text-red-500" size={32} />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
            <Link href="#" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Logs
            </Link>
          </div>
          <ActivityFeed activities={activities} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-3">
            <Link href="/superadmin/add-admin" className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all group">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-200">
                <Shield size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create New Admin</p>
                <p className="text-sm text-gray-500">Add system administrator</p>
              </div>
            </Link>
            <Link href="/superadmin/admin-list" className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all group">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-200">
                <Users size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Admins</p>
                <p className="text-sm text-gray-500">View and edit administrators</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}