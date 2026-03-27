"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  FolderGit2,
  Award,
  Loader2,
  Globe,
  Linkedin,
  ExternalLink,
  Download,
  User,
  GraduationCap,
  MapPin,
  AlertTriangle
} from "lucide-react";
import Image from "next/image";

// Types
type VerificationStatus = 'pending' | 'verified' | 'rejected';

interface Project {
  id: string;
  title: string;
  description: string;
  status: VerificationStatus;
  submittedAt: string;
  techStack: string[];
  github_link?: string;
  live_link?: string;
  student: string;
  collectionId: string;
  collectionName: string;
}

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  status: VerificationStatus;
  file?: string;
  credential_url?: string;
  student: string;
  collectionId: string;
  collectionName: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roll_number: string;
  batch: string;
  department: string;
  bio?: string;
  linkedin?: string;
  portfolio_url?: string;
  skills?: string[];
  cv_resume?: string;
  avatar?: string;
  joinedDate: string;
  profileCompletion: number;
  collectionId: string;
  collectionName: string;
}

type TabType = 'overview' | 'projects' | 'certificates';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [student, setStudent] = useState<Student | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentData = useCallback(async () => {
    try {
      setError(null);
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      const studentId = params.id as string;
      if (!studentId) {
        setError("Invalid student ID");
        return;
      }
      
      // Fetch student with user data
      const studentRecord = await pb.collection("students").getOne(studentId, {
        expand: "user",
        $autoCancel: false
      });

      if (!studentRecord) {
        router.replace("/faculty/students");
        return;
      }

      const userData = studentRecord.expand?.user || {};

      // Calculate profile completion
      let completion = 0;
      const fields = [studentRecord.phone, studentRecord.linkedin, studentRecord.bio, studentRecord.skills?.length > 0, studentRecord.cv_resume];
      const pointsPerField = 20;
      fields.forEach(field => {
        if (field) completion += pointsPerField;
      });

      setStudent({
        id: studentRecord.id,
        name: userData.name || 'Unknown',
        email: userData.email || '',
        phone: studentRecord.phone,
        roll_number: studentRecord.roll_number,
        batch: studentRecord.batch,
        department: studentRecord.department,
        bio: studentRecord.bio,
        linkedin: studentRecord.linkedin,
        portfolio_url: studentRecord.portfolio_url,
        skills: studentRecord.skills || [],
        cv_resume: studentRecord.cv_resume,
        avatar: studentRecord.avatar,
        joinedDate: studentRecord.created,
        profileCompletion: completion,
        collectionId: studentRecord.collectionId,
        collectionName: studentRecord.collectionName
      });

      // Fetch projects
      const projectRecords = await pb.collection("projects").getFullList({
        filter: `student = "${studentId}"`,
        sort: "-created",
        $autoCancel: false
      });

      setProjects(projectRecords.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status as VerificationStatus,
        submittedAt: p.created,
        techStack: p.tech_stack || [],
        github_link: p.github_link,
        live_link: p.live_link,
        student: p.student,
        collectionId: p.collectionId,
        collectionName: p.collectionName
      })));

      // Fetch certificates
      const certRecords = await pb.collection("certificates").getFullList({
        filter: `student = "${studentId}"`,
        sort: "-created",
        $autoCancel: false
      });

      setCertificates(certRecords.map(c => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issueDate: c.issue_date,
        status: c.status as VerificationStatus,
        file: c.file,
        credential_url: c.credential_url,
        student: c.student,
        collectionId: c.collectionId,
        collectionName: c.collectionName
      })));

    } catch (error: any) {
      console.error("Error fetching student data:", error);
      setError(error.message || "Failed to load student data");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleVerification = async (type: 'project' | 'certificate', id: string, action: 'verify' | 'reject') => {
    setActionLoading(id);
    try {
      const newStatus: VerificationStatus = action === 'verify' ? 'verified' : 'rejected';
      const updateData = {
        status: newStatus,
        verifiedBy: pb.authStore.model?.id,
        verifiedAt: new Date().toISOString()
      };
      
      if (type === 'project') {
        await pb.collection("projects").update(id, updateData);
        setProjects(prev => prev.map(p => 
          p.id === id ? { ...p, status: newStatus } : p
        ));
      } else {
        await pb.collection("certificates").update(id, updateData);
        setCertificates(prev => prev.map(c => 
          c.id === id ? { ...c, status: newStatus } : c
        ));
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusStyle = (status: VerificationStatus) => {
    const styles = {
      verified: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200"
    };
    return styles[status] || styles.pending;
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case "verified": return <CheckCircle2 className="h-4 w-4" />;
      case "rejected": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // FIXED: Proper file URL generation using the record object
  const getFileUrl = useCallback((record: any, filename: string): string => {
    if (!record || !filename) return '';
    try {
      return pb.files.getURL(record, filename);
    } catch (err) {
      console.error("Error generating file URL:", err);
      return '';
    }
  }, []);

  // FIXED: Avatar URL with null check
  const getAvatarUrl = useCallback((): string | null => {
    if (!student?.avatar || student.avatar === "") return null;
    try {
      return pb.files.getURL(student, student.avatar);
    } catch (err) {
      console.error("Error generating avatar URL:", err);
      return null;
    }
  }, [student]);

  const hasValidAvatar = useCallback((): boolean => {
    return !!student?.avatar && student.avatar !== "";
  }, [student]);

  const getInitials = useCallback((name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
          <p className="text-sm text-gray-500">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Error loading student</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={fetchStudentData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
            <Link 
              href="/faculty/students"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back to Students
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!student) return null;

  const avatarUrl = getAvatarUrl();
  const pendingCount = projects.filter(p => p.status === 'pending').length + certificates.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href="/faculty/students"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Students
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="sm:flex sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg ring-4 ring-white">
                {hasValidAvatar() && avatarUrl ? (
                  <Image 
                    src={avatarUrl} 
                    alt={student.name} 
                    width={80} 
                    height={80} 
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span>{getInitials(student.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {student.roll_number} • {student.department}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 font-medium">
                    <Mail className="h-3.5 w-3.5" />
                    {student.email}
                  </span>
                  {student.phone && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-green-50 text-green-700 font-medium">
                      <Phone className="h-3.5 w-3.5" />
                      {student.phone}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-purple-50 text-purple-700 font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    Batch {student.batch}
                  </span>
                </div>
                {(student.linkedin || student.portfolio_url) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {student.linkedin && (
                      <a 
                        href={student.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-[#0077b5]/10 text-[#0077b5] hover:bg-[#0077b5]/20 transition-colors font-medium"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {student.portfolio_url && (
                      <a 
                        href={student.portfolio_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Portfolio
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col items-end gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>{student.profileCompletion}% Complete</span>
              </div>
              {pendingCount > 0 && (
                <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-3 py-1 rounded-full">
                  {pendingCount} pending verification{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          {student.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                About
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{student.bio}</p>
            </div>
          )}

          {student.skills && student.skills.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {student.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-lg font-medium border border-indigo-100">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {student.cv_resume && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a 
                href={getFileUrl(student, student.cv_resume)}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
              >
                <Download className="h-4 w-4" />
                Download Resume
              </a>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex gap-8 px-6 overflow-x-auto">
            {[
              { id: 'overview' as TabType, label: 'Overview', icon: FileText, count: null },
              { id: 'projects' as TabType, label: 'Projects', icon: FolderGit2, count: projects.filter(p => p.status === 'pending').length },
              { id: 'certificates' as TabType, label: 'Certificates', icon: Award, count: certificates.filter(c => c.status === 'pending').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {(tab.count ?? 0) > 0 && (
                  <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FolderGit2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-600">Total Projects</h4>
                </div>
                <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {projects.filter(p => p.status === 'verified').length} verified
                </p>
              </div>
              <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-600">Certificates</h4>
                </div>
                <p className="text-3xl font-bold text-gray-900">{certificates.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {certificates.filter(c => c.status === 'verified').length} verified
                </p>
              </div>
              <div className="p-5 bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-xl border border-yellow-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-600">Pending Reviews</h4>
                </div>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting your verification</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="divide-y divide-gray-200">
            {projects.length === 0 ? (
              <div className="p-12 text-center">
                <FolderGit2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No projects submitted yet</p>
                <p className="text-sm text-gray-400 mt-1">Student hasn&apos;t added any projects</p>
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{project.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(project.status)}`}>
                          {getStatusIcon(project.status)}
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3 text-sm leading-relaxed">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {project.techStack.map((tech) => (
                          <span key={tech} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Submitted {new Date(project.submittedAt).toLocaleDateString()}</span>
                        {project.github_link && (
                          <a href={project.github_link} target="_blank" rel="noopener noreferrer" 
                             className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                            <ExternalLink className="h-3 w-3" />
                            GitHub
                          </a>
                        )}
                        {project.live_link && (
                          <a href={project.live_link} target="_blank" rel="noopener noreferrer"
                             className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                            <ExternalLink className="h-3 w-3" />
                            Live Demo
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {project.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={() => handleVerification('project', project.id, 'verify')}
                          disabled={actionLoading === project.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                        >
                          {actionLoading === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Verify
                        </button>
                        <button 
                          onClick={() => handleVerification('project', project.id, 'reject')}
                          disabled={actionLoading === project.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="divide-y divide-gray-200">
            {certificates.length === 0 ? (
              <div className="p-12 text-center">
                <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No certificates uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">Student hasn&apos;t added any certificates</p>
              </div>
            ) : (
              certificates.map((cert) => (
                <div key={cert.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Award className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{cert.title}</h3>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(cert.status)}`}>
                            {getStatusIcon(cert.status)}
                            {cert.status === 'verified' ? 'Verified' : cert.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-gray-600 font-medium">{cert.issuer}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
                          <span>Issued {new Date(cert.issueDate).toLocaleDateString()}</span>
                          {cert.credential_url && (
                            <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"
                               className="text-indigo-600 hover:underline flex items-center gap-1 font-medium">
                              <ExternalLink className="h-3 w-3" />
                              Verify Online
                            </a>
                          )}
                        </div>
                        {cert.file && (
                          <a 
                            href={getFileUrl(cert, cert.file)}
                            download
                            className="inline-flex items-center gap-1.5 mt-3 text-sm text-indigo-600 hover:underline font-medium"
                          >
                            <Download className="h-4 w-4" />
                            Download Certificate
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {cert.status === 'pending' && (
                      <button 
                        onClick={() => handleVerification('certificate', cert.id, 'verify')}
                        disabled={actionLoading === cert.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex-shrink-0"
                      >
                        {actionLoading === cert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}