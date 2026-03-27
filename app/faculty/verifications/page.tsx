"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { CheckCircle2, XCircle, Clock, Filter, Search, ExternalLink, Loader2, Award, FolderGit2, Download, AlertCircle, ChevronDown, FileText, Calendar, User } from "lucide-react";
import Link from "next/link";

type VerificationType = 'project' | 'certificate';
type VerificationStatus = 'pending' | 'verified' | 'rejected';

interface VerificationItem {
  id: string;
  type: VerificationType;
  title: string;
  studentName: string;
  studentRoll: string;
  studentId: string;
  submittedAt: string;
  status: VerificationStatus;
  details?: string;
  file?: string;
  github_link?: string;
  live_link?: string;
  credential_url?: string;
  collectionId: string;
  collectionName: string;
}

interface Stats {
  total: number;
  projects: number;
  certificates: number;
}

export default function VerificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'project' | 'certificate'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingItems, setPendingItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, projects: 0, certificates: 0 });
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
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
      
      const facultyId = facultyRecords[0].id;

      // FIXED: First get students, then fetch their pending items
      const students = await pb.collection("students").getFullList({
        filter: `faculty = "${facultyId}"`,
        fields: "id",
        $autoCancel: false
      });

      const studentIds = students.map(s => s.id);
      
      if (studentIds.length === 0) {
        setPendingItems([]);
        setStats({ total: 0, projects: 0, certificates: 0 });
        setLoading(false);
        return;
      }

      const studentFilter = studentIds.map(id => `student = "${id}"`).join(" || ");

      // Fetch pending projects with student info
      const pendingProjects = await pb.collection("projects").getFullList({
        filter: `status = "pending" && (${studentFilter})`,
        expand: "student,student.user",
        sort: "-created",
        $autoCancel: false
      });

      // Fetch pending certificates with student info
      const pendingCertificates = await pb.collection("certificates").getFullList({
        filter: `status = "pending" && (${studentFilter})`,
        expand: "student,student.user",
        sort: "-created",
        $autoCancel: false
      });

      // Map to common format
      const items: VerificationItem[] = [
        ...pendingProjects.map(p => {
          const student = p.expand?.student;
          const userData = student?.expand?.user;
          return {
            id: p.id,
            type: 'project' as const,
            title: p.title,
            studentName: userData?.name || 'Unknown',
            studentRoll: student?.roll_number || '',
            studentId: student?.id,
            submittedAt: p.created,
            status: p.status as VerificationStatus,
            details: p.description?.substring(0, 150) + (p.description?.length > 150 ? '...' : ''),
            github_link: p.github_link,
            live_link: p.live_link,
            collectionId: p.collectionId,
            collectionName: p.collectionName
          };
        }),
        ...pendingCertificates.map(c => {
          const student = c.expand?.student;
          const userData = student?.expand?.user;
          return {
            id: c.id,
            type: 'certificate' as const,
            title: c.title,
            studentName: userData?.name || 'Unknown',
            studentRoll: student?.roll_number || '',
            studentId: student?.id,
            submittedAt: c.created,
            status: c.status as VerificationStatus,
            details: `Issuer: ${c.issuer}`,
            file: c.file,
            credential_url: c.credential_url,
            collectionId: c.collectionId,
            collectionName: c.collectionName
          };
        })
      ];

      // Sort by date
      items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      setPendingItems(items);
      setStats({
        total: items.length,
        projects: pendingProjects.length,
        certificates: pendingCertificates.length
      });
    } catch (error: any) {
      console.error("Error fetching verifications:", error);
      setError(error.message || "Failed to load verifications");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = [...pendingItems];
    
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.type === filter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.studentName.toLowerCase().includes(query) || 
        item.title.toLowerCase().includes(query) ||
        item.studentRoll.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [filter, searchQuery, pendingItems]);

  const handleAction = async (id: string, type: VerificationType, action: 'approve' | 'reject') => {
    setActionLoading(id);
    setProcessingId(id);
    try {
      const newStatus: VerificationStatus = action === 'approve' ? 'verified' : 'rejected';
      
      if (type === 'project') {
        await pb.collection("projects").update(id, {
          status: newStatus,
          verifiedBy: pb.authStore.model?.id,
          verifiedAt: new Date().toISOString()
        });
      } else {
        await pb.collection("certificates").update(id, {
          status: newStatus,
          verifiedBy: pb.authStore.model?.id,
          verifiedAt: new Date().toISOString()
        });
      }
      
      // Remove from list with animation
      setTimeout(() => {
        setPendingItems(prev => prev.filter(item => item.id !== id));
        setStats(prev => ({
          ...prev,
          total: prev.total - 1,
          [type === 'project' ? 'projects' : 'certificates']: prev[type === 'project' ? 'projects' : 'certificates'] - 1
        }));
        setProcessingId(null);
      }, 300);
      
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
      setProcessingId(null);
    } finally {
      setActionLoading(null);
    }
  };

  // FIXED: Proper file URL generation
  const getFileUrl = useCallback((item: VerificationItem): string => {
    if (!item.file) return '';
    try {
      // Create a proper record object for PocketBase
      const record = {
        id: item.id,
        collectionId: item.collectionId,
        collectionName: item.collectionName
      };
      return pb.files.getURL(record as any, item.file);
    } catch (err) {
      console.error("Error generating file URL:", err);
      return '';
    }
  }, []);

  const getTypeIcon = (type: VerificationType) => {
    return type === 'project' ? <FolderGit2 className="h-4 w-4" /> : <Award className="h-4 w-4" />;
  };

  const getTypeColor = (type: VerificationType) => {
    return type === 'project' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-purple-100 text-purple-800 border-purple-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
          <p className="text-sm text-gray-500">Loading verifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Error loading verifications</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button 
            onClick={fetchVerifications}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-6 w-6 text-indigo-600" />
          Pending Verifications
        </h1>
        <p className="mt-1 text-sm text-gray-500">Review and verify student submissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FolderGit2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Projects</p>
              <p className="text-2xl font-bold text-gray-900">{stats.projects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Certificates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.certificates}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, title, or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 bg-white">
            <Filter className="h-4 w-4 text-gray-400" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="py-2.5 focus:outline-none bg-transparent min-w-[130px]"
            >
              <option value="all">All Types</option>
              <option value="project">Projects Only</option>
              <option value="certificate">Certificates Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Verification List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {pendingItems.length === 0 ? "All caught up!" : "No matching items"}
            </h3>
            <p className="text-sm text-gray-500">
              {pendingItems.length === 0 
                ? "No pending verifications at the moment. Great job!" 
                : "Try adjusting your search or filter criteria."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className={`p-6 hover:bg-gray-50 transition-all duration-300 ${processingId === item.id ? 'opacity-50 scale-[0.98]' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(item.type)}`}>
                        {getTypeIcon(item.type)}
                        {item.type === 'project' ? 'Project' : 'Certificate'}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Submitted {new Date(item.submittedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <Link href={`/faculty/students/${item.studentId}`} className="font-medium text-indigo-600 hover:underline">
                        {item.studentName}
                      </Link>
                      <span className="text-gray-400">•</span>
                      <span className="font-mono text-gray-500">{item.studentRoll}</span>
                    </div>
                    
                    {item.details && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.details}</p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {item.type === 'project' && (
                        <>
                          {item.github_link && (
                            <a 
                              href={item.github_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              GitHub
                            </a>
                          )}
                          {item.live_link && (
                            <a 
                              href={item.live_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-green-600 bg-gray-100 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Live Demo
                            </a>
                          )}
                        </>
                      )}
                      {item.type === 'certificate' && item.credential_url && (
                        <a 
                          href={item.credential_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Verify Online
                        </a>
                      )}
                      {item.type === 'certificate' && item.file && (
                        <a 
                          href={getFileUrl(item)} 
                          download
                          className="inline-flex items-center gap-1.5 text-sm text-gray-700 hover:text-purple-600 bg-gray-100 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download File
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleAction(item.id, item.type, 'approve')}
                      disabled={actionLoading === item.id}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] justify-center"
                    >
                      {actionLoading === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                    <button 
                      onClick={() => handleAction(item.id, item.type, 'reject')}
                      disabled={actionLoading === item.id}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}