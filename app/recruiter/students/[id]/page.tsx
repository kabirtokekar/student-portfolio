"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Award, 
  CheckCircle2, 
  FolderGit2,
  ExternalLink,
  Download,
  Linkedin,
  Globe,
  Heart,
  Loader2,
  AlertTriangle,
  GraduationCap
} from "lucide-react";
import Image from "next/image";

type VerificationStatus = 'verified'; // Only verified items shown to recruiters

interface Project {
  id: string;
  title: string;
  description: string;
  submittedAt: string;
  techStack: string[];
  github_link?: string;
  live_link?: string;
}

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  credential_url?: string;
  file?: string;
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
  skills: any;
  cv_resume?: string;
  avatar?: string;
  collectionId: string;
  collectionName: string;
}

export default function RecruiterStudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [recruiterId, setRecruiterId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      // Get recruiter record
      const recruiterRecords = await pb.collection("recruiter").getFullList({
        filter: `user = "${currentUser.id}"`,
        $autoCancel: false
      });

      if (recruiterRecords.length === 0) {
        setError("Recruiter record not found");
        return;
      }

      setRecruiterId(recruiterRecords[0].id);

      const studentId = params.id as string;
      
      // Check if shortlisted
      const shortlistCheck = await pb.collection("shortlists").getFullList({
        filter: `recruiter = "${recruiterRecords[0].id}" && student = "${studentId}"`,
        $autoCancel: false
      });
      setIsShortlisted(shortlistCheck.length > 0);

      // Fetch student
      const studentRecord = await pb.collection("students").getOne(studentId, {
        expand: "user",
        $autoCancel: false
      });

      const userData = studentRecord.expand?.user || {};
      console.log("Raw skills from PocketBase:", studentRecord.skills);
      console.log("Type of skills:", typeof studentRecord.skills);

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
        skills: studentRecord.skills,
        cv_resume: studentRecord.cv_resume,
        avatar: studentRecord.avatar,
        collectionId: studentRecord.collectionId,
        collectionName: studentRecord.collectionName
      });

      // Fetch ONLY verified projects
      const projectRecords = await pb.collection("projects").getFullList({
        filter: `student = "${studentId}" && status = "verified"`,
        sort: "-created",
        $autoCancel: false
      });

      setProjects(projectRecords.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        submittedAt: p.created,
        techStack: p.tech_stack || [],
        github_link: p.github_link,
        live_link: p.live_link
      })));

      // Fetch ONLY verified certificates
      const certRecords = await pb.collection("certificates").getFullList({
        filter: `student = "${studentId}" && status = "verified"`,
        sort: "-created",
        $autoCancel: false
      });

      setCertificates(certRecords.map(c => ({
        id: c.id,
        title: c.title,
        issuer: c.issuer,
        issueDate: c.issue_date,
        credential_url: c.credential_url,
        file: c.file
      })));

    } catch (error: any) {
      console.error("Error fetching student data:", error);
      setError(error.message || "Failed to load student data");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleShortlist = async () => {
    try {
      if (isShortlisted) {
        const shortlistRecord = await pb.collection("shortlists").getFullList({
          filter: `recruiter = "${recruiterId}" && student = "${student?.id}"`,
          $autoCancel: false
        });
        
        if (shortlistRecord.length > 0) {
          await pb.collection("shortlists").delete(shortlistRecord[0].id);
        }
      } else {
        await pb.collection("shortlists").create({
          recruiter: recruiterId,
          student: student?.id
        });
      }

      setIsShortlisted(!isShortlisted);
    } catch (error) {
      console.error("Error toggling shortlist:", error);
      alert("Failed to update shortlist");
    }
  };

  const getAvatarUrl = useCallback((): string | null => {
    if (!student?.avatar) return null;
    try {
      return pb.files.getURL(student, student.avatar);
    } catch {
      return null;
    }
  }, [student]);

  const getFileUrl = useCallback((filename: string): string => {
    if (!student) return '';
    try {
      return pb.files.getURL(student, filename);
    } catch {
      return '';
    }
  }, [student]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">{error || "Student not found"}</p>
          <Link href="/recruiter/browse" className="text-blue-600 hover:underline">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href="/recruiter/browse"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Browse
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-5">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-lg">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={student.name} width={96} height={96} className="object-cover w-full h-full" unoptimized />
                ) : (
                  student.name.charAt(0)
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {student.roll_number} • {student.department} • Batch {student.batch}
                </p>
                
                <div className="flex flex-wrap gap-3 mt-3">
                  {student.linkedin && (
                    <a href={student.linkedin} target="_blank" rel="noopener noreferrer" 
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-[#0077b5]/10 text-[#0077b5] hover:bg-[#0077b5]/20 font-medium">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {student.portfolio_url && (
                    <a href={student.portfolio_url} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium">
                      <Globe className="h-4 w-4" />
                      Portfolio
                    </a>
                  )}
                  <a href={`mailto:${student.email}`}
                     className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">
                    <Mail className="h-4 w-4" />
                    Contact
                  </a>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleShortlist}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  isShortlisted 
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <Heart className={`h-5 w-5 ${isShortlisted ? 'fill-current' : ''}`} />
                {isShortlisted ? 'Shortlisted' : 'Shortlist'}
              </button>
              
              {student.cv_resume && (
                <a 
                  href={getFileUrl(student.cv_resume)}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Resume
                </a>
              )}
            </div>
          </div>

          {student.bio && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">About</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{student.bio}</p>
            </div>
          )}

          {(() => {
  // Convert skills to array safely - handle all possible types
  let skillsArray: string[] = [];
  
  if (student.skills) {
    if (Array.isArray(student.skills)) {
      skillsArray = student.skills;
    } else if (typeof student.skills === 'string') {
      skillsArray = student.skills.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (typeof student.skills === 'object') {
      // Handle if it's somehow an object
      skillsArray = Object.values(student.skills).filter((v): v is string => typeof v === 'string');
    }
  }
  
  if (skillsArray.length === 0) return null;
  
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Skills</h3>
      <div className="flex flex-wrap gap-2">
        {skillsArray.map((skill, index) => (
          <span key={`${skill}-${index}`} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium border border-blue-100">
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
})()}
        </div>
      </div>

      {/* Verified Projects */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Verified Projects ({projects.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderGit2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No verified projects yet</p>
            </div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h4>
                <p className="text-gray-600 mb-3 text-sm">{project.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.techStack.map(tech => (
                    <span key={tech} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {project.github_link && (
                    <a href={project.github_link} target="_blank" rel="noopener noreferrer" 
                       className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Code
                    </a>
                  )}
                  {project.live_link && (
                    <a href={project.live_link} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-green-600 hover:underline flex items-center gap-1 font-medium">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Live Demo
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Verified Certificates */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Verified Certificates ({certificates.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {certificates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No verified certificates yet</p>
            </div>
          ) : (
            certificates.map((cert) => (
              <div key={cert.id} className="p-6 hover:bg-gray-50 transition-colors flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{cert.title}</h4>
                  <p className="text-gray-600 font-medium">{cert.issuer}</p>
                  <p className="text-sm text-gray-500 mt-1">Issued {new Date(cert.issueDate).toLocaleDateString()}</p>
                  
                  <div className="flex gap-3 mt-3">
                    {cert.credential_url && (
                      <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"
                         className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Verify Credential
                      </a>
                    )}
                  </div>
                </div>
                {cert.file && (
                  <a 
                    href={getFileUrl(cert.file)}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}