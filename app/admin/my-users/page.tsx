"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  Search, 
  GraduationCap, 
  Briefcase, 
  Edit2, 
  Trash2, 
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Loader2,
  MoreVertical,
  UserCheck,
  UserX,
  RefreshCw,
  Download
} from "lucide-react";
import { FaChalkboardTeacher } from "react-icons/fa";

interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "recruiter";
  department?: string;
  created: string;
  updated: string;
  isActive: boolean;
  expand?: {
    students?: { rollNumber: string; batch: string };
    faculty?: { designation: string };
    recruiter?: { company: string };
  };
}

interface PocketBaseError {
  status?: number;
  message?: string;
  data?: {
    data?: {
      [key: string]: any;
    };
  };
}

// Utility: Get pagination range with dots
const getPaginationRange = (current: number, total: number) => {
  const delta = 2;
  const range: (number | string)[] = [];
  let l: number | undefined;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  const rangeWithDots: (number | string)[] = [];
  for (let i of range) {
    if (l) {
      if (typeof i === 'number' && typeof l === 'number' && i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (typeof i === 'number' && typeof l === 'number' && i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = typeof i === 'number' ? i : l;
  }
  return rangeWithDots;
};

export default function MyUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "created" | "role">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const itemsPerPage = 10;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = pb.authStore.model;
      
      if (!currentUser || !pb.authStore.isValid) {
        console.error("Not authenticated");
        router.replace("/login");
        return;
      }

    const records = await pb.collection("users").getFullList({
      filter:`role="student" || role="faculty" || role="recruiter"`,
      sort:"-created",
      $autoCancel:false
    });

      setUsers(records as unknown as User[]);
      setSelectedUsers([]);
    } catch (err: unknown) {
      const error = err as PocketBaseError;
      console.error("Error fetching users:", error);
      
      if (error.status === 400) {
        setError("Invalid request. Please check your search filters.");
      } else if (error.status === 403) {
        setError("Access denied. Please login again.");
        setTimeout(() => router.replace("/login"), 2000);
      } else if (error.status === 0 || !navigator.onLine) {
        setError("Cannot connect to server. Please check your internet connection.");
      } else {
        setError(error.message || "Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      const user = users.find(u => u.id === deleteId);
      
      if (user) {
        if (user.role === 'student') {
          const studentRecords = await pb.collection("students").getFullList({
            filter: `user = "${deleteId}"`
          });
          for (const record of studentRecords) {
            await pb.collection("students").delete(record.id);
          }
        } else if (user.role === 'faculty') {
          const facultyRecords = await pb.collection("faculty").getFullList({
            filter: `user = "${deleteId}"`
          });
          for (const record of facultyRecords) {
            await pb.collection("faculty").delete(record.id);
          }
        } else if (user.role === 'recruiter') {
          const recruiterRecords = await pb.collection("recruiter").getFullList({
            filter: `user = "${deleteId}"`
          });
          for (const record of recruiterRecords) {
            await pb.collection("recruiter").delete(record.id);
          }
        }
      }

      await pb.collection("users").delete(deleteId);
      setUsers(users.filter(u => u.id !== deleteId));
      setDeleteId(null);
    } catch (err: unknown) {
      const error = err as PocketBaseError;
      console.error("Delete error:", error);
      alert(error.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await pb.collection("users").update(id, { isActive: !currentStatus });
      setUsers(users.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
    } catch (err: unknown) {
      const error = err as PocketBaseError;
      console.error("Status update error:", error);
      alert(error.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const bulkToggleStatus = async (status: boolean) => {
    if (selectedUsers.length === 0) return;
    
    try {
      await Promise.all(
        selectedUsers.map(id => 
          pb.collection("users").update(id, { isActive: status })
        )
      );
      setUsers(users.map(u => 
        selectedUsers.includes(u.id) ? { ...u, isActive: status } : u
      ));
      setSelectedUsers([]);
    } catch (err) {
      alert("Failed to update some users");
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedUsers.length} selected users?`)) return;
    
    for (const id of selectedUsers) {
      try {
        const user = users.find(u => u.id === id);
        if (user?.role === 'student') {
          const records = await pb.collection("students").getFullList({
            filter: `user = "${id}"`
          });
          for (const r of records) await pb.collection("students").delete(r.id);
        } else if (user?.role === 'faculty') {
          const records = await pb.collection("faculty").getFullList({
            filter: `user = "${id}"`
          });
          for (const r of records) await pb.collection("faculty").delete(r.id);
        } else if (user?.role === 'recruiter') {
          const records = await pb.collection("recruiter").getFullList({
            filter: `user = "${id}"`
          });
          for (const r of records) await pb.collection("recruiter").delete(r.id);
        }
        await pb.collection("users").delete(id);
      } catch (e) {
        console.error("Failed to delete user:", id);
      }
    }
    setUsers(users.filter(u => !selectedUsers.includes(u.id)));
    setSelectedUsers([]);
  };

  const exportUsers = () => {
    const data = filteredUsers.map(u => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Department: u.department || '-',
      Status: u.isActive ? 'Active' : 'Inactive',
      Created: new Date(u.created).toLocaleDateString()
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      (user.expand?.students?.rollNumber?.toLowerCase().includes(searchLower));
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) || 
      (statusFilter === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "role") {
      comparison = a.role.localeCompare(b.role);
    } else {
      comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uid => uid !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "student": return <GraduationCap size={18} className="text-blue-600" />;
      case "faculty": return <FaChalkboardTeacher size={18} className="text-green-600" />;
      case "recruiter": return <Briefcase size={18} className="text-orange-600" />;
      default: return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      student: "bg-blue-100 text-blue-800 border-blue-200",
      faculty: "bg-green-100 text-green-800 border-green-200",
      recruiter: "bg-orange-100 text-orange-800 border-orange-200"
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${styles[role as keyof typeof styles] || 'bg-gray-100'}`}>
        {role}
      </span>
    );
  };

  const getUserDetails = (user: User) => {
    switch (user.role) {
      case "student":
        return user.expand?.students ? (
          <span className="text-sm text-gray-600">
            {user.expand.students.rollNumber} • {user.expand.students.batch}
          </span>
        ) : <span className="text-sm text-gray-400">-</span>;
      case "faculty":
        return user.expand?.faculty ? (
          <span className="text-sm text-gray-600">{user.expand.faculty.designation}</span>
        ) : <span className="text-sm text-gray-400">-</span>;
      case "recruiter":
        return user.expand?.recruiter ? (
          <span className="text-sm text-gray-600">{user.expand.recruiter.company}</span>
        ) : <span className="text-sm text-gray-400">-</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Users</h1>
          <p className="text-gray-600 mt-1">Manage users you&apos;ve created</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportUsers}
            disabled={filteredUsers.length === 0}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            Export
          </button>
          <Link 
            href="/admin/create-student"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> Add User
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchUsers} className="ml-auto text-sm font-medium hover:underline flex items-center gap-1">
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-blue-900 font-medium">
            {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => bulkToggleStatus(true)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              <UserCheck size={14} />
              Activate
            </button>
            <button
              onClick={() => bulkToggleStatus(false)}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center gap-1"
            >
              <UserX size={14} />
              Deactivate
            </button>
            <button
              onClick={bulkDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center gap-1"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email or roll number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[120px]"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="faculty">Faculty</option>
                <option value="recruiter">Recruiters</option>
              </select>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-w-[140px]"
            >
              <option value="created-desc">Newest First</option>
              <option value="created-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="role-asc">Role A-Z</option>
            </select>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-500 flex justify-between items-center">
          <span>
            Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            {searchTerm && <span> for &quot;{searchTerm}&quot;</span>}
          </span>
          {(searchTerm || roleFilter !== "all" || statusFilter !== "all") && (
            <button 
              onClick={() => {
                setSearchTerm(""); 
                setRoleFilter("all");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">No users found</p>
                    {searchTerm || roleFilter !== "all" || statusFilter !== "all" ? (
                      <button 
                        onClick={() => {
                          setSearchTerm(""); 
                          setRoleFilter("all");
                          setStatusFilter("all");
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Clear filters
                      </button>
                    ) : (
                      <Link href="/admin/create-student" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Create your first user
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUserDetails(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(user.id, user.isActive)}
                        disabled={togglingId === user.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                          user.isActive 
                            ? "bg-green-100 text-green-800 hover:bg-green-200" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                      >
                        {togglingId === user.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-500"}`} />
                        )}
                        {user.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(user.created).toLocaleDateString("en-IN", {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {/* Edit functionality */}}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteId(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1">
                {getPaginationRange(currentPage, totalPages).map((page, idx) => (
                  typeof page === 'number' ? (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page 
                          ? "bg-blue-600 text-white" 
                          : "hover:bg-white border border-gray-300"
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={idx} className="w-8 h-8 flex items-center justify-center text-gray-400">
                      {page}
                    </span>
                  )
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-gray-600 mb-6">
              This will delete the user and their associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}