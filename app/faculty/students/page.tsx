"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { Search, Filter, Mail, ExternalLink, TrendingUp, Loader2, Users, GraduationCap, AlertCircle, ChevronDown, ArrowUpDown } from "lucide-react";
import Image from "next/image";

interface Student {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  batch: string;
  department: string;
  profileCompletion: number;
  pendingVerifications: number;
  avatar?: string;
  collectionId: string;
  collectionName: string;
}

interface FilterState {
  search: string;
  department: string;
  batch: string;
  sortBy: 'name' | 'completion' | 'pending';
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    department: 'all',
    batch: 'all',
    sortBy: 'name'
  });
  const [facultyId, setFacultyId] = useState<string>("");

  const fetchStudents = useCallback(async () => {
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
      setFacultyId(faculty.id);

      // Fetch students assigned to this faculty
      const studentRecords = await pb.collection("students").getFullList({
        filter: `faculty = "${faculty.id}"`,
        expand: "user",
        $autoCancel: false
      });

      // If no students, return early
      if (studentRecords.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = studentRecords.map(s => s.id);
      const studentFilter = studentIds.map(id => `student = "${id}"`).join(" || ");

      // Fetch all pending projects and certificates for count - FIXED: Use proper filter syntax
      const [pendingProjects, pendingCertificates] = await Promise.all([
        pb.collection("projects").getFullList({
          filter: `status = "pending" && (${studentFilter})`,
          $autoCancel: false
        }),
        pb.collection("certificates").getFullList({
          filter: `status = "pending" && (${studentFilter})`,
          $autoCancel: false
        })
      ]);

      // Map students with computed data
      const mappedStudents: Student[] = studentRecords.map(student => {
        const userData = student.expand?.user || {};
        
        // Calculate profile completion
        let completion = 0;
        const fields = [student.phone, student.linkedin, student.bio, student.skills?.length > 0, student.cv_resume];
        const pointsPerField = 20;
        fields.forEach(field => {
          if (field) completion += pointsPerField;
        });

        // Count pending items for this student
        const pendingCount = 
          pendingProjects.filter(p => p.student === student.id).length +
          pendingCertificates.filter(c => c.student === student.id).length;

        return {
          id: student.id,
          name: userData.name || 'Unknown',
          email: userData.email || '',
          roll_number: student.roll_number,
          batch: student.batch,
          department: student.department,
          profileCompletion: completion,
          pendingVerifications: pendingCount,
          avatar: student.avatar,
          collectionId: student.collectionId,
          collectionName: student.collectionName
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
    fetchStudents();
  }, [fetchStudents]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = [...students];
    
    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.roll_number.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }
    
    // Department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter(s => s.department === filters.department);
    }
    
    // Batch filter
    if (filters.batch !== 'all') {
      filtered = filtered.filter(s => s.batch === filters.batch);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'completion':
          return b.profileCompletion - a.profileCompletion;
        case 'pending':
          return b.pendingVerifications - a.pendingVerifications;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    return filtered;
  }, [students, filters]);

  // Get unique values for filters
  const departments = useMemo(() => [...new Set(students.map(s => s.department))].sort(), [students]);
  const batches = useMemo(() => [...new Set(students.map(s => s.batch))].sort((a, b) => b.localeCompare(a)), [students]);

  // FIXED: Proper avatar URL generation
  const getAvatarUrl = useCallback((student: Student): string | null => {
    if (!student.avatar || student.avatar === "") return null;
    try {
      return pb.files.getURL(student, student.avatar);
    } catch {
      return null;
    }
  }, []);

  const hasValidAvatar = useCallback((student: Student): boolean => {
    return !!student.avatar && student.avatar !== "";
  }, []);

  const getInitials = useCallback((name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }, []);

  const getCompletionColor = useCallback((completion: number) => {
    if (completion >= 80) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' };
    if (completion >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50', border: 'border-yellow-200' };
    return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-200' };
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      department: 'all',
      batch: 'all',
      sortBy: 'name'
    });
  }, []);

  const hasActiveFilters = filters.search || filters.department !== 'all' || filters.batch !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
          <p className="text-sm text-gray-500">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Error loading students</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button 
            onClick={fetchStudents}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            My Students
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage and monitor your assigned students</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-medium">
            {filteredStudents.length} of {students.length}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, roll number, or email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select 
                value={filters.department}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[140px]"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <select 
              value={filters.batch}
              onChange={(e) => setFilters(prev => ({ ...prev, batch: e.target.value }))}
              className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[120px]"
            >
              <option value="all">All Batches</option>
              {batches.map(batch => (
                <option key={batch} value={batch}>Batch {batch}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 bg-white">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <select 
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}
                className="py-2.5 focus:outline-none bg-transparent min-w-[100px]"
              >
                <option value="name">Sort by Name</option>
                <option value="completion">Completion %</option>
                <option value="pending">Pending Items</option>
              </select>
            </div>
          </div>
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {filteredStudents.length} result{filteredStudents.length !== 1 ? 's' : ''}
            </span>
            <button 
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStudents.map((student) => {
          const avatarUrl = getAvatarUrl(student);
          const colors = getCompletionColor(student.profileCompletion);
          
          return (
            <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg overflow-hidden ring-2 ring-white shadow-sm">
                      {hasValidAvatar(student) && avatarUrl ? (
                        <Image 
                          src={avatarUrl} 
                          alt={student.name} 
                          width={56} 
                          height={56} 
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span>{getInitials(student.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{student.name}</h3>
                      <p className="text-sm text-gray-500 font-mono">{student.roll_number}</p>
                    </div>
                  </div>
                  {student.pendingVerifications > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse">
                      {student.pendingVerifications} pending
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      Batch {student.batch}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                      {student.department}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Profile Completion</span>
                    <span className={`font-bold ${colors.text}`}>
                      {student.profileCompletion}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                      style={{ width: `${student.profileCompletion}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                <Link 
                  href={`/faculty/students/${student.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all group/link"
                >
                  <ExternalLink className="h-4 w-4 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                  View Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No students found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {hasActiveFilters ? "Try adjusting your search or filter criteria." : "No students are currently assigned to you."}
          </p>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}