"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  FolderGit2, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Plus,
  ExternalLink,
  AlertCircle
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  status: "pending" | "verified" | "rejected";
  created: string;
  updated: string;
  expand?: {
    verifiedBy?: {
      name: string;
      designation: string;
    };
  };
}

interface Stats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      // Get student record
      const studentRecords = await pb.collection("students").getFullList({
        filter: `user = "${currentUser.id}"`,
        $autoCancel: false
      });
      
      if (studentRecords.length === 0) {
        setLoading(false);
        return;
      }
      
      const student = studentRecords[0];
      setStudentData(student);

      // Get projects
      const projectRecords = await pb.collection("projects").getFullList({
        filter: `student = "${student.id}"`,
        sort: "-created",
        expand: "verifiedBy",
        $autoCancel: false
      });

      const typedProjects = projectRecords as unknown as Project[];
      setProjects(typedProjects);
      
      // Calculate stats
      setStats({
        total: typedProjects.length,
        verified: typedProjects.filter(p => p.status === "verified").length,
        pending: typedProjects.filter(p => p.status === "pending").length,
        rejected: typedProjects.filter(p => p.status === "rejected").length
      });
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 size={16} className="text-green-600" />;
      case "rejected":
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-32 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Projects"
          value={stats.total}
          icon={FolderGit2}
          color="blue"
          trend="+ Add new"
          href="/student/projects/create"
        />
        <StatCard 
          title="Verified"
          value={stats.verified}
          subtitle="Approved by faculty"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard 
          title="Pending"
          value={stats.pending}
          subtitle="Awaiting verification"
          icon={Clock}
          color="yellow"
        />
        <StatCard 
          title="Completion"
          value={stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}
          subtitle="Percent verified"
          icon={TrendingUp}
          color="indigo"
          suffix="%"
        />
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Recent Projects</h3>
            <p className="text-sm text-gray-500 mt-0.5">Your latest portfolio additions</p>
          </div>
          <Link 
            href="/student/projects" 
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
          >
            View All <ExternalLink size={14} />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderGit2 size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-4 max-w-sm mx-auto">
              Start building your portfolio by adding your first project. Faculty will verify it for recruiters to see.
            </p>
            <Link 
              href="/student/projects/create"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              <Plus size={20} />
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {projects.slice(0, 5).map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">{project.title}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusStyle(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span className="capitalize">{project.status}</span>
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech_stack?.map((tech) => (
                    <span 
                      key={tech} 
                      className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    Added {new Date(project.created).toLocaleDateString("en-IN", {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                  
                  {project.status === "verified" && project.expand?.verifiedBy && (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      Verified by {project.expand.verifiedBy.name}
                    </span>
                  )}
                  
                  {project.status === "pending" && (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <Clock size={14} />
                      Awaiting review
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      {projects.length < 3 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <AlertCircle size={20} />
            Pro Tip
          </h4>
          <p className="text-indigo-800 text-sm">
            Students with 5+ verified projects get 3x more recruiter views. Add your academic projects, internships, and personal work to stand out!
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, href, suffix = "", trend }: any) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-600",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-600",
  };

  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">
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