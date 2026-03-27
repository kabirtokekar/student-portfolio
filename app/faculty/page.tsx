"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  ExternalLink,
  AlertCircle,
  Loader2,
  Award,
  FolderGit2,
  ArrowUpRight,
  Calendar,
  Activity,
  Zap
} from "lucide-react";

interface Stats {
  totalStudents: number;
  pendingVerifications: number;
  verifiedThisMonth: number;
  averageCompletion: number;
}

interface ActivityItem {
  id: string;
  type: 'project' | 'certificate';
  title: string;
  studentName: string;
  studentId: string;
  time: string;
  created: string;
}

export default function FacultyDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    pendingVerifications: 0,
    verifiedThisMonth: 0,
    averageCompletion: 0
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
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

      // Get faculty record
      const facultyRecords = await pb.collection("faculty").getFullList({
        filter: `user = "${currentUser.id}"`,
        $autoCancel: false
      });

      if (facultyRecords.length === 0) {
        setError("Faculty record not found");
        return;
      }

      const faculty = facultyRecords[0];

      // FIXED: First get all students assigned to this faculty
      const students = await pb.collection("students").getFullList({
        filter: `faculty = "${faculty.id}"`,
        $autoCancel: false
      });

      const studentIds = students.map(s => s.id);
      
      // If no students, return early with zeros
      if (studentIds.length === 0) {
        setStats({
          totalStudents: 0,
          pendingVerifications: 0,
          verifiedThisMonth: 0,
          averageCompletion: 0
        });
        setLoading(false);
        return;
      }

      // Build student filter string for queries
      const studentFilter = studentIds.map(id => `student = "${id}"`).join(" || ");

      // Calculate start of month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Fetch all data in parallel using the student filter
      const [
        pendingProjects,
        pendingCertificates,
        verifiedProjects,
        verifiedCertificates,
        recentProjects,
        recentCertificates
      ] = await Promise.all([
        // Pending counts
        pb.collection("projects").getList(1, 1, {
          filter: `status = "pending" && (${studentFilter})`,
          $autoCancel: false
        }),
        pb.collection("certificates").getList(1, 1, {
          filter: `status = "pending" && (${studentFilter})`,
          $autoCancel: false
        }),
        // Verified this month counts
        pb.collection("projects").getList(1, 1, {
          filter: `status = "verified" && updated >= "${startOfMonth.toISOString()}" && (${studentFilter})`,
          $autoCancel: false
        }),
        pb.collection("certificates").getList(1, 1, {
          filter: `status = "verified" && updated >= "${startOfMonth.toISOString()}" && (${studentFilter})`,
          $autoCancel: false
        }),
        // Recent submissions for activity (get actual items)
        pb.collection("projects").getList(1, 5, {
          filter: `(${studentFilter})`,
          sort: "-created",
          expand: "student,student.user",
          $autoCancel: false
        }),
        pb.collection("certificates").getList(1, 5, {
          filter: `(${studentFilter})`,
          sort: "-created",
          expand: "student,student.user",
          $autoCancel: false
        })
      ]);

      // Calculate average profile completion
      let totalCompletion = 0;
      students.forEach(student => {
        let completion = 0;
        if (student.phone) completion += 20;
        if (student.linkedin) completion += 20;
        if (student.bio) completion += 20;
        if (student.skills?.length > 0) completion += 20;
        if (student.cv_resume) completion += 20;
        totalCompletion += completion;
      });

      const avgCompletion = students.length > 0 ? Math.round(totalCompletion / students.length) : 0;

      setStats({
        totalStudents: students.length,
        pendingVerifications: pendingProjects.totalItems + pendingCertificates.totalItems,
        verifiedThisMonth: verifiedProjects.totalItems + verifiedCertificates.totalItems,
        averageCompletion: avgCompletion
      });

      // Build activity feed
      const activities: ActivityItem[] = [
        ...recentProjects.items.map(p => {
          const student = p.expand?.student;
          const userData = student?.expand?.user;
          return {
            id: p.id,
            type: 'project' as const,
            title: p.title,
            studentName: userData?.name || 'Unknown',
            studentId: student?.id,
            time: new Date(p.created).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            created: p.created
          };
        }),
        ...recentCertificates.items.map(c => {
          const student = c.expand?.student;
          const userData = student?.expand?.user;
          return {
            id: c.id,
            type: 'certificate' as const,
            title: c.title,
            studentName: userData?.name || 'Unknown',
            studentId: student?.id,
            time: new Date(c.created).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            created: c.created
          };
        })
      ];

      // Sort by date and take top 5
      activities.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      setRecentActivity(activities.slice(0, 5));

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-96 animate-pulse" />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-96 animate-pulse" />
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
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-6 w-6 text-yellow-300" />
          <h2 className="text-lg font-semibold">Welcome back!</h2>
        </div>
        <p className="text-indigo-100">
          You have {stats.pendingVerifications} pending verification{stats.pendingVerifications !== 1 ? 's' : ''} to review.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Students"
          value={stats.totalStudents}
          subtitle="Assigned to you"
          icon={Users}
          color="blue"
          href="/faculty/students"
          trend={stats.totalStudents > 0 ? "View all" : undefined}
        />
        <StatCard 
          title="Pending Reviews"
          value={stats.pendingVerifications}
          subtitle="Awaiting verification"
          icon={Clock}
          color="yellow"
          href="/faculty/verifications"
          alert={stats.pendingVerifications > 0}
        />
        <StatCard 
          title="Verified This Month"
          value={stats.verifiedThisMonth}
          subtitle="Projects & certificates"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard 
          title="Avg. Completion"
          value={stats.averageCompletion}
          subtitle="Profile completion rate"
          icon={TrendingUp}
          color="indigo"
          suffix="%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                Recent Activity
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">Latest student submissions</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FolderGit2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 rounded-xl p-2 ${activity.type === 'project' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                      {activity.type === 'project' ? <FolderGit2 size={18} /> : <Award size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{activity.studentName}</span>
                        {' '}submitted {activity.type === 'project' ? 'project' : 'certificate'}{' '}
                        <span className="font-medium text-indigo-600">"{activity.title}"</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {activity.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentActivity.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <Link href="/faculty/verifications" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                View all activity
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
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
              href="/faculty/verifications"
              icon={Clock}
              iconColor="yellow"
              title="Review Pending"
              description={`${stats.pendingVerifications} items awaiting your verification`}
              urgent={stats.pendingVerifications > 0}
            />
            <ActionCard 
              href="/faculty/students"
              icon={Users}
              iconColor="blue"
              title="View Students"
              description={`Manage your ${stats.totalStudents} assigned students`}
            />
            <ActionCard 
              href="/faculty/profile"
              icon={CheckCircle2}
              iconColor="green"
              title="Update Profile"
              description="Keep your faculty information up to date"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color, href, suffix = "", trend, alert }: any) {
  const colors = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", icon: "text-blue-600" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", icon: "text-green-600" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-600", icon: "text-yellow-600" },
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", icon: "text-indigo-600" },
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

// Action Card Component
function ActionCard({ href, icon: Icon, iconColor, title, description, urgent }: any) {
  const colors = {
    yellow: "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    green: "bg-green-50 text-green-600 group-hover:bg-green-100",
    red: "bg-red-50 text-red-600 group-hover:bg-red-100",
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
      <ExternalLink size={18} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
    </Link>
  );
}