"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { 
  ArrowLeft, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  CheckCircle 
} from "lucide-react";

export default function AddAdmin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const departments = [
    "Computer Science & Engineering (CSE)",
    "Information Technology (IT)",
    "Electronics & Communication (ECE)",
    "Electrical Engineering (EE)",
    "Mechanical Engineering (ME)",
    "Civil Engineering (CE)"
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Invalid email address";
    }
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.department) {
      newErrors.department = "Please select a department";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Create admin user
      const userRecord = await pb.collection("users").create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.password,
        role: "admin",
        emailVisibility: false,
        createdBy: pb.authStore.model?.id
      });

      // Create admin profile (department only, no adminType)
      await pb.collection("admins").create({
        user: userRecord.id,
        department: formData.department,
        createdBy: pb.authStore.model?.id,
        isActive: true
      });

      setSuccess(true);
      setTimeout(() => router.push("/superadmin/admin-list"), 2000);
    } catch (err: any) {
      console.error(err);
      if (err.data?.data?.email?.code === 'validation_invalid_email') {
        setErrors({...errors, email: "This email is already registered"});
      } else {
        setErrors({...errors, submit: "Failed to create admin. Please try again."});
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Created Successfully!</h2>
          <p className="text-gray-600">Redirecting to admin list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link 
        href="/superadmin/admin-list" 
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to Admin List
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Administrator</h1>
      <p className="text-gray-600 mb-6">Add a new admin who can manage students, faculty, and recruiters</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Basic Information */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.name ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                  }`}
                  placeholder="Enter administrator's full name"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                    errors.email ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                  }`}
                  placeholder="admin@college.edu"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                      errors.password ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="Min 8 characters"
                  />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                      errors.confirmPassword ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="Re-enter password"
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Details - Department Only (REMOVED ADMIN TYPE) */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Scope <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 appearance-none bg-white transition-all ${
                  errors.department ? "border-red-300 focus:border-red-500" : "border-gray-300 focus:border-blue-500"
                }`}
              >
                <option value="">Select department scope...</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
            <p className="mt-2 text-sm text-gray-500">
              This admin will manage students and faculty from this department
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Link
            href="/superadmin/admin-list"
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </Link>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus size={20} />
                Create Administrator
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}