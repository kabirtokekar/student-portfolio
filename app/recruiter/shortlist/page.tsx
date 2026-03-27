"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { Heart, Mail, ExternalLink, Loader2, AlertCircle, Trash2, Download } from "lucide-react";
import Image from "next/image";

interface ShortlistedStudent {
  id: string;
  studentId: string;
  name: string;
  email: string;
  department: string;
  batch: string;
  avatar?: string;
  skills: string[];
  verifiedProjects: number;
  verifiedCertificates: number;
  shortlistedAt: string;
  collectionId: string;
  collectionName: string;
}

export default function ShortlistPage() {
  const router = useRouter();
  const [students, setStudents] = useState<ShortlistedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recruiterId, setRecruiterId] = useState<string>("");

  const fetchShortlist = useCallback(async () => {
    try {
      setError(null);
      const currentUser = pb.authStore.model;
      
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      // Step 1: Get recruiter ID
      const recruiterRecords = await pb.collection("recruiter").getFullList({
        filter: `user = "${currentUser.id}"`,
        $autoCancel: false
      });

      if (recruiterRecords.length === 0) {
        setError("Recruiter record not found.");
        setLoading(false);
        return;
      }

      const recId = recruiterRecords[0].id;
      setRecruiterId(recId);

      // Step 2: Get shortlist entries (just IDs, no expand)
      let shortlistRecords;
      try {
        shortlistRecords = await pb.collection("shortlists").getFullList({
          filter: `recruiter = "${recId}"`,
          sort: "-created",
          $autoCancel: false
        });
      } catch (err: any) {
        console.error("Shortlist fetch error:", err);
        setError(`Cannot fetch shortlists: ${err.message}. Check if collection exists and API rules allow access.`);
        setLoading(false);
        return;
      }

      if (shortlistRecords.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Step 3: Get student IDs from shortlists
      const studentIds = shortlistRecords.map(s => s.student).filter(Boolean);
      
      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Step 4: Fetch student details separately
      const studentRecords = await pb.collection("students").getFullList({
        filter: studentIds.map((id: string) => `id = "${id}"`).join(" || "),
        expand: "user",
        $autoCancel: false
      });

      // Step 5: Fetch verified counts
      const [projects, certificates] = await Promise.all([
        pb.collection("projects").getFullList({
          filter: `status = "verified" && (${studentIds.map((id: string) => `student = "${id}"`).join(" || ")})`,
          $autoCancel: false
        }).catch(() => []),
        pb.collection("certificates").getFullList({
          filter: `status = "verified" && (${studentIds.map((id: string) => `student = "${id}"`).join(" || ")})`,
          $autoCancel: false
        }).catch(() => [])
      ]);

      // Step 6: Map data
      const mappedStudents: ShortlistedStudent[] = shortlistRecords.map(shortlist => {
        const student = studentRecords.find(s => s.id === shortlist.student);
        const userData = student?.expand?.user || {};
        
        // Handle skills safely
        let skills: string[] = [];
        if (student?.skills) {
          if (Array.isArray(student.skills)) {
            skills = student.skills;
          } else if (typeof student.skills === 'string') {
            skills = student.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
        
        return {
          id: shortlist.id,
          studentId: student?.id || shortlist.student,
          name: userData.name || 'Unknown',
          email: userData.email || '',
          department: student?.department || 'N/A',
          batch: student?.batch || 'N/A',
          avatar: student?.avatar,
          skills: skills,
          verifiedProjects: projects.filter((p: any) => p.student === student?.id).length,
          verifiedCertificates: certificates.filter((c: any) => c.student === student?.id).length,
          shortlistedAt: shortlist.created,
          collectionId: student?.collectionId || '',
          collectionName: student?.collectionName || ''
        };
      });

      setStudents(mappedStudents);
      
    } catch (error: any) {
      console.error("Error in fetchShortlist:", error);
      setError(error.message || "Failed to load shortlist");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchShortlist();
  }, [fetchShortlist]);

  const removeFromShortlist = async (shortlistId: string) => {
    try {
      await pb.collection("shortlists").delete(shortlistId);
      setStudents(prev => prev.filter(s => s.id !== shortlistId));
    } catch (error) {
      console.error("Error removing from shortlist:", error);
      alert("Failed to remove from shortlist");
    }
  };

  const getAvatarUrl = useCallback((student: ShortlistedStudent): string | null => {
    if (!student.avatar || !student.collectionId) return null;
    try {
      return pb.files.getURL({
        id: student.studentId,
        collectionId: student.collectionId,
        collectionName: student.collectionName
      } as any, student.avatar);
    } catch {
      return null;
    }
  }, []);

  const exportShortlist = () => {
    if (students.length === 0) return;
    
    const csvContent = [
      ["Name", "Email", "Department", "Batch", "Skills", "Projects", "Certificates"].join(","),
      ...students.map(s => [
        s.name,
        s.email,
        s.department,
        s.batch,
        `"${s.skills.join(", ")}"`,
        s.verifiedProjects,
        s.verifiedCertificates
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shortlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Error</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button onClick={fetchShortlist} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-600" />
            Shortlisted Candidates ({students.length})
          </h1>
          <p className="mt-1 text-sm text-gray-500">Your saved talent pool</p>
        </div>
        
        {students.length > 0 && (
          <button
            onClick={exportShortlist}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {students.map((student) => {
          const avatarUrl = getAvatarUrl(student);
          
          return (
            <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={student.name} width={64} height={64} className="object-cover w-full h-full" unoptimized />
                      ) : (
                        student.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-500">{student.department} • Batch {student.batch}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromShortlist(student.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                {student.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {student.skills.slice(0, 4).map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {student.verifiedProjects} projects
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    {student.verifiedCertificates} certificates
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex gap-3">
                <Link 
                  href={`/recruiter/students/${student.studentId}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Profile
                </Link>
                <a 
                  href={`mailto:${student.email}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                >
                  <Mail className="h-4 w-4" />
                  Contact
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {students.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
          <Heart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No candidates shortlisted yet</h3>
          <Link 
            href="/recruiter/browse"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4"
          >
            Browse Talent
          </Link>
        </div>
      )}
    </div>
  );
}