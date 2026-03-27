"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { Search, Filter, Mail, GraduationCap, Award, CheckCircle2, Loader2, AlertCircle, ExternalLink, Heart } from "lucide-react";
import Image from "next/image";

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  batch: string;
  department: string;
  bio?: string;
  skills: string[];
  avatar?: string;
  verifiedProjects: number;
  verifiedCertificates: number;
  collectionId: string;
  collectionName: string;
  isShortlisted: boolean;
}

interface FilterState {
  search: string;
  department: string;
  batch: string;
  skill: string;
  hasProjects: boolean;
  hasCertificates: boolean;
}

export default function BrowseStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recruiterId, setRecruiterId] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    department: 'all',
    batch: 'all',
    skill: 'all',
    hasProjects: false,
    hasCertificates: false
  });

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
      
      const recId = recruiterRecords[0].id;
      setRecruiterId(recId);

      // Get existing shortlists
      const shortlists = await pb.collection("shortlists").getFullList({
        filter: `recruiter = "${recId}"`,
        $autoCancel: false
      });
      const shortlistedStudentIds = new Set(shortlists.map(s => s.student));

      // Fetch verified projects and certificates
      const [projects, certificates] = await Promise.all([
        pb.collection("projects").getFullList({
          filter: `status = "verified"`,
          $autoCancel: false
        }),
        pb.collection("certificates").getFullList({
          filter: `status = "verified"`,
          $autoCancel: false
        })
      ]);

      // Get students who have verified items
      const studentIdsWithContent = new Set([
        ...projects.map(p => p.student),
        ...certificates.map(c => c.student)
      ]);

      if (studentIdsWithContent.size === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch those students
      const studentRecords = await pb.collection("students").getFullList({
        filter: Array.from(studentIdsWithContent).map(id => `id = "${id}"`).join(" || "),
        expand: "user",
        $autoCancel: false
      });

      // Map students with counts
      const mappedStudents: Student[] = studentRecords.map(student => {
        const userData = student.expand?.user || {};
        return {
          id: student.id,
          name: userData.name || 'Unknown',
          email: userData.email || '',
          roll_number: student.roll_number,
          batch: student.batch,
          department: student.department,
          bio: student.bio,
          skills: student.skills ? (typeof student.skills === 'string' ? student.skills.split(',').map((s: string) => s.trim()) : (Array.isArray(student.skills) ? student.skills : [])) : [],
          avatar: student.avatar,
          verifiedProjects: projects.filter(p => p.student === student.id).length,
          verifiedCertificates: certificates.filter(c => c.student === student.id).length,
          collectionId: student.collectionId,
          collectionName: student.collectionName,
          isShortlisted: shortlistedStudentIds.has(student.id)
        };
      });

      setStudents(mappedStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      setError(error.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleShortlist = async (studentId: string) => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      if (student.isShortlisted) {
        // Remove from shortlist
        const shortlistRecord = await pb.collection("shortlists").getFullList({
          filter: `recruiter = "${recruiterId}" && student = "${studentId}"`,
          $autoCancel: false
        });
        
        if (shortlistRecord.length > 0) {
          await pb.collection("shortlists").delete(shortlistRecord[0].id);
        }
      } else {
        // Add to shortlist
        await pb.collection("shortlists").create({
          recruiter: recruiterId,
          student: studentId
        });
      }

      // Update local state
      setStudents(prev => prev.map(s => 
        s.id === studentId ? { ...s, isShortlisted: !s.isShortlisted } : s
      ));
    } catch (error) {
      console.error("Error toggling shortlist:", error);
      alert("Failed to update shortlist");
    }
  };

  // Filter logic
  const filteredStudents = useMemo(() => {
    let filtered = [...students];
    
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.roll_number.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.skills.some(skill => skill.toLowerCase().includes(query))
      );
    }
    
    if (filters.department !== 'all') {
      filtered = filtered.filter(s => s.department === filters.department);
    }
    
    if (filters.batch !== 'all') {
      filtered = filtered.filter(s => s.batch === filters.batch);
    }

    if (filters.skill !== 'all') {
      filtered = filtered.filter(s => s.skills.includes(filters.skill));
    }

    if (filters.hasProjects) {
      filtered = filtered.filter(s => s.verifiedProjects > 0);
    }

    if (filters.hasCertificates) {
      filtered = filtered.filter(s => s.verifiedCertificates > 0);
    }
    
    return filtered;
  }, [students, filters]);

  // Get unique values for filters
  const departments = useMemo(() => [...new Set(students.map(s => s.department))].sort(), [students]);
  const batches = useMemo(() => [...new Set(students.map(s => s.batch))].sort((a, b) => b.localeCompare(a)), [students]);
  const allSkills = useMemo(() => [...new Set(students.flatMap(s => s.skills))].sort(), [students]);

  const getAvatarUrl = useCallback((student: Student): string | null => {
    if (!student.avatar) return null;
    try {
      return pb.files.getURL(student, student.avatar);
    } catch {
      return null;
    }
  }, []);

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
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
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
            <Search className="h-6 w-6 text-blue-600" />
            Browse Talent
          </h1>
          <p className="mt-1 text-sm text-gray-500">Discover verified candidates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, skill, roll number..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select 
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>

          <select 
            value={filters.batch}
            onChange={(e) => setFilters(prev => ({ ...prev, batch: e.target.value }))}
            className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Batches</option>
            {batches.map(batch => <option key={batch} value={batch}>Batch {batch}</option>)}
          </select>

          <select 
            value={filters.skill}
            onChange={(e) => setFilters(prev => ({ ...prev, skill: e.target.value }))}
            className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Skills</option>
            {allSkills.map(skill => <option key={skill} value={skill}>{skill}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input 
              type="checkbox" 
              checked={filters.hasProjects}
              onChange={(e) => setFilters(prev => ({ ...prev, hasProjects: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Has Verified Projects
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input 
              type="checkbox" 
              checked={filters.hasCertificates}
              onChange={(e) => setFilters(prev => ({ ...prev, hasCertificates: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Has Certificates
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStudents.map((student) => {
          const avatarUrl = getAvatarUrl(student);
          
          return (
            <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={student.name} width={64} height={64} className="object-cover w-full h-full" unoptimized />
                      ) : (
                        student.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-500 font-mono">{student.roll_number}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4" />
                        {student.department} • Batch {student.batch}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleShortlist(student.id)}
                    className={`p-2 rounded-full transition-all ${student.isShortlisted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                    title={student.isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                  >
                    <Heart className={`h-5 w-5 ${student.isShortlisted ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {student.bio && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{student.bio}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {(Array.isArray(student.skills) ? student.skills : []).length > 5 && (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                      +{(Array.isArray(student.skills) ? student.skills : []).length - 5} more
                    </span>
                  )}
                  {student.skills.length > 5 && (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                      +{student.skills.length - 5} more
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {student.verifiedProjects} projects
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-purple-500" />
                    {student.verifiedCertificates} certificates
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 flex gap-3">
                <Link 
                  href={`/recruiter/students/${student.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Profile
                </Link>
                <a 
                  href={`mailto:${student.email}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-all"
                >
                  <Mail className="h-4 w-4" />
                  Contact
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
          <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No students found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}