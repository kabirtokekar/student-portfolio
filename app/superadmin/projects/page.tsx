"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  Filter,
  User,
  Calendar,
  AlertCircle,
  RefreshCw
} from "lucide-react";

type ProjectStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  student: string;
  facultyApprover?: string;
  githubUrl?: string;
  liveUrl?: string;
  submissionDate?: string;
  approvalDate?: string;
  created: string;      // Add this
  updated: string;      // Add this (optional but good to have)
  expand?: {
    student?: {
      name: string;
      email: string;
      department: string;
    };
    facultyApprover?: {
      name: string;
      email: string;
    };
  };
}

export default function ProjectsMonitor() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching projects...");
      
      const records = await pb.collection("projects").getFullList({
        sort: "-created",
        expand: "student,facultyApprover",
        $autoCancel: false,
        requestKey: null,
      });

      console.log("Projects fetched:", records.length);
      setProjects(records as unknown as Project[]);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
      setError(err.message || "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pb.authStore.isValid || pb.authStore.model?.role !== "super_admin") {
      router.replace("/login");
      return;
    }

    const timer = setTimeout(() => {
      fetchProjects();
    }, 100);

    return () => clearTimeout(timer);
  }, [fetchProjects, router]);

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesSearch = searchTerm === "" || (
      project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.expand?.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.expand?.student?.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  const getStatusConfig = (status: ProjectStatus) => {
    switch (status) {
      case "approved":
        return { 
          color: "bg-green-100 text-green-800 border-green-200", 
          icon: CheckCircle,
          label: "Approved"
        };
      case "rejected":
        return { 
          color: "bg-red-100 text-red-800 border-red-200", 
          icon: XCircle,
          label: "Rejected"
        };
      case "under_review":
        return { 
          color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
          icon: Clock,
          label: "Under Review"
        };
      case "submitted":
        return { 
          color: "bg-blue-100 text-blue-800 border-blue-200", 
          icon: FileText,
          label: "Submitted"
        };
      default:
        return { 
          color: "bg-gray-100 text-gray-800 border-gray-200", 
          icon: FileText,
          label: "Draft"
        };
    }
  };

  const stats = {
    total: projects.length,
    pending: projects.filter(p => p.status === "submitted" || p.status === "under_review").length,
    approved: projects.filter(p => p.status === "approved").length,
    rejected: projects.filter(p => p.status === "rejected").length,
  };

  const statusTabs = [
    { id: "all" as const, label: "All Projects", count: stats.total },
    { id: "submitted" as ProjectStatus, label: "Submitted", count: projects.filter(p => p.status === "submitted").length },
    { id: "under_review" as ProjectStatus, label: "Under Review", count: projects.filter(p => p.status === "under_review").length },
    { id: "approved" as ProjectStatus, label: "Approved", count: stats.approved },
    { id: "rejected" as ProjectStatus, label: "Rejected", count: stats.rejected },
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
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load projects</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchProjects}
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
        <h1 className="text-3xl font-bold text-gray-900">Projects Monitor</h1>
        <p className="text-gray-600 mt-1">Overview of all student projects and verification status</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
          <p className="text-sm text-yellow-800 mb-1">Pending Review</p>
          <p className="text-3xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <p className="text-sm text-green-800 mb-1">Approved</p>
          <p className="text-3xl font-bold text-green-900">{stats.approved}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
          <p className="text-sm text-red-800 mb-1">Rejected</p>
          <p className="text-3xl font-bold text-red-900">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search projects or students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Projects Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Project</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Faculty</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium mb-1">No projects found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => {
                  const statusConfig = getStatusConfig(project.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 mb-1">{project.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-2 max-w-xs">
                            {project.description || "No description"}
                          </p>
                          {(project.githubUrl || project.liveUrl) && (
                            <div className="flex gap-3 mt-2">
                              {project.githubUrl && (
                                <a href={project.githubUrl} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline">
                                  GitHub →
                                </a>
                              )}
                              {project.liveUrl && (
                                <a href={project.liveUrl} target="_blank" rel="noopener" className="text-xs text-green-600 hover:underline">
                                  Live Demo →
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                            {project.expand?.student?.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {project.expand?.student?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {project.expand?.student?.department || "No Dept"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          <StatusIcon size={14} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {project.expand?.facultyApprover ? (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">
                              {project.expand.facultyApprover.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {project.expand.facultyApprover.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar size={14} />
                          {project.submissionDate 
                            ? new Date(project.submissionDate).toLocaleDateString("en-IN")
                            : new Date(project.created).toLocaleDateString("en-IN")
                          }
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
          <button 
            onClick={fetchProjects}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}