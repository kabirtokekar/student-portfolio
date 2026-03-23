"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  Users, 
  GraduationCap, 
  Briefcase, 
  TrendingUp,
  Plus,
  Clock,
} from "lucide-react";
import { FaChalkboardTeacher } from "react-icons/fa";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    students: 0,
    faculty: 0,
    recruiters: 0,
    total: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) return;

      const users = await pb.collection("users").getFullList({
        filter: `role="student" || role="faculty" || role="recruiter"`,
        sort: "-created",
        $autoCancel: false
      });

      const students = users.filter((u: any) => u.role === "student");
      const faculty = users.filter((u: any) => u.role === "faculty");
      const recruiters = users.filter((u: any) => u.role === "recruiter");

      setStats({
        students: students.length,
        faculty: faculty.length,
        recruiters: recruiters.length,
        total: users.length
      });

      setRecentUsers(users.slice(0, 5));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Students"
          value={stats.students}
          subtitle="Active student accounts"
          icon={GraduationCap}
          color="blue"
          href="/admin/create-student"
        />
        <StatCard 
          title="Faculty"
          value={stats.faculty}
          subtitle="Teaching staff"
          icon={FaChalkboardTeacher}
          color="green"
          href="/admin/create-faculty"
        />
        <StatCard 
          title="Recruiters"
          value={stats.recruiters}
          subtitle="External recruiters"
          icon={Briefcase}
          color="orange"
          href="/admin/create-recruiter"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction 
            href="/admin/create-student"
            icon={GraduationCap}
            title="Add Student"
            description="Create new student account"
            color="blue"
          />
          <QuickAction 
            href="/admin/create-faculty"
            icon={FaChalkboardTeacher}
            title="Add Faculty"
            description="Add teaching staff"
            color="green"
          />
          <QuickAction 
            href="/admin/create-recruiter"
            icon={Briefcase}
            title="Add Recruiter"
            description="Register external recruiter"
            color="orange"
          />
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Recently Created</h3>
          <Link href="/admin/my-users" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All →
          </Link>
        </div>
        
        {recentUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="mb-4">No users created yet</p>
            <Link 
              href="/admin/create-student" 
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus size={18} />
              Create Your First User
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentUsers.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    user.role === "student" ? "bg-blue-100 text-blue-600" :
                    user.role === "faculty" ? "bg-green-100 text-green-600" :
                    "bg-orange-100 text-orange-600"
                  }`}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="capitalize">{user.role}</span>
                      <span>•</span>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-400 flex items-center gap-1">
                  <Clock size={14} />
                  {new Date(user.created).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, href }: any) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
  };

  return (
    <Link href={href} className="block group">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
            <Icon size={24} />
          </div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp size={16} />
            <Plus size={14} />
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    </Link>
  );
}

function QuickAction({ href, icon: Icon, title, description, color }: any) {
  const colors = {
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
    green: "bg-green-100 text-green-600 group-hover:bg-green-200",
    orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-200",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
    >
      <div className={`p-3 rounded-lg transition-colors ${colors[color as keyof typeof colors]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}