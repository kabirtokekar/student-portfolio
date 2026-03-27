"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  Users, 
  CheckCircle2, 
  Award, 
  TrendingUp,
  ArrowUpRight,
  Building2,
  Star,
  Loader2,
  AlertCircle,
  Search,
  Briefcase,
  Zap,
  Activity,
  FolderGit2,
  Calendar,
  Clock
} from "lucide-react";

interface Stats {
  totalVerifiedStudents: number;
  totalProjects: number;
  totalCertificates: number;
  departments: number;
}

interface RecentStudent {
  id: string;
  name: string;
  department: string;
  batch: string;
  avatar?: string;
  verifiedProjects: number;
  verifiedCertificates: number;
}

export default function RecruiterDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalVerifiedStudents: 0,
    totalProjects: 0,
    totalCertificates: 0,
    departments: 0
  });
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      // Get all students with verified items
      const [students, projects, certificates] = await Promise.all([
        pb.collection("students").getFullList({
          $autoCancel: false
        }),
        pb.collection("projects").getFullList({
          filter: `status = "verified"`,
          $autoCancel: false
        }),
        pb.collection("certificates").getFullList({
          filter: `status = "verified"`,
          $autoCancel: false
        })
      ]);

      // Get unique departments
      const departments = [...new Set(students.map(s => s.department))];

      // Calculate students with at least one verified item
      const verifiedStudentIds = new Set([
        ...projects.map(p => p.student),
        ...certificates.map(c => c.student)
      ]);

      // Map recent students (with verified items)
      const recentData = students
        .filter(s => verifiedStudentIds.has(s.id))
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          name: s.expand?.user?.name || 'Unknown',
          department: s.department,
          batch: s.batch,
          avatar: s.avatar,
          verifiedProjects: projects.filter(p => p.student === s.id).length,
          verifiedCertificates: certificates.filter(c => c.student === s.id).length
        }));

      setStats({
        totalVerifiedStudents: verifiedStudentIds.size,
        totalProjects: projects.length,
        totalCertificates: certificates.length,
        departments: departments.length
      });

      setRecentStudents(recentData);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Error loading dashboard</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section - MATCHES FACULTY STYLE */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-6 w-6 text-yellow-300" />
          <h2 className="text-lg font-semibold">Welcome to Talent Hub!</h2>
        </div>
        <p className="text-indigo-100">
          Browse {stats.totalVerifiedStudents} verified students with {stats.totalProjects} verified projects and {stats.totalCertificates} certificates.
        </p>
      </div>

      {/* Stats Grid - MATCHES FACULTY StatCard STYLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Verified Students"
          value={stats.totalVerifiedStudents}
          subtitle="Active candidates"
          icon={Users}
          color="blue"
          href="/recruiter/browse"
        />
        <StatCard 
          title="Verified Projects"
          value={stats.totalProjects}
          subtitle="Portfolio projects"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard 
          title="Certificates"
          value={stats.totalCertificates}
          subtitle="Verified credentials"
          icon={Award}
          color="purple"
        />
        <StatCard 
          title="Departments"
          value={stats.departments}
          subtitle="Available streams"
          icon={Building2}
          color="indigo"
        />
      </div>

      {/* Quick Actions - MATCHES FACULTY ActionCard STYLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            Quick Actions
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Common tasks and shortcuts</p>
        </div>
        <div className="p-6 space-y-3">
          <ActionCard 
            href="/recruiter/browse"
            icon={Search}
            iconColor="blue"
            title="Browse Talent"
            description="Search and filter verified candidates by skills, department, and batch."
          />
          <ActionCard 
            href="/recruiter/shortlist"
            icon={Star}
            iconColor="yellow"
            title="View Shortlist"
            description="Review your saved candidates and download their details."
          />
        </div>
      </div>

      {/* Recent Talent - MATCHES FACULTY Recent Activity STYLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Recently Verified Talent
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">New candidates with verified portfolios</p>
          </div>
          <Link href="/recruiter/browse" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderGit2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No verified students yet</p>
            </div>
          ) : (
            recentStudents.map((student) => (
              <Link 
                key={student.id} 
                href={`/recruiter/students/${student.id}`}
                className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{student.name}</h4>
                    <p className="text-sm text-gray-500">{student.department} • Batch {student.batch}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {student.verifiedProjects} projects
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-purple-500" />
                    {student.verifiedCertificates} certs
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// StatCard - EXACT COPY FROM FACULTY
function StatCard({ title, value, subtitle, icon: Icon, color, href, suffix = "", trend, alert }: any) {
  const colors = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", icon: "text-blue-600" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", icon: "text-green-600" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", icon: "text-purple-600" },
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", icon: "text-indigo-600" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-600", icon: "text-yellow-600" },
  };

  const theme = colors[color as keyof typeof colors];

  const content = (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 ${href ? 'cursor-pointer group' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${theme.bg} ${theme.border} border`}>
          <Icon size={24} className={theme.icon} />
        </div>
        {alert && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
        {trend && !alert && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
        {value}{suffix}
      </h3>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  
  return content;
}

// ActionCard - EXACT COPY FROM FACULTY
function ActionCard({ href, icon: Icon, iconColor, title, description, urgent }: any) {
  const colors = {
    yellow: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    green: "bg-green-50 text-green-600 group-hover:bg-green-100",
    red: "bg-red-50 text-red-600 group-hover:bg-red-100",
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
  };

  return (
    <Link 
      href={href}
      className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl transition-colors ${colors[iconColor as keyof typeof colors]}`}>
          <Icon size={24} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
            {title}
            {urgent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                Action needed
              </span>
            )}
          </h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <ArrowUpRight size={18} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
    </Link>
  );
}