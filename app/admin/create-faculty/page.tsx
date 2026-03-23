"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { Mail, User, Building2, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { FaChalkboardTeacher } from "react-icons/fa";

interface FormData {
  name: string;
  email: string;
  department: string;
  designation: string;
  password: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
  password?: string;
  submit?: string;
}

interface PocketBaseError {
  status?: number;
  message?: string;
  data?: {
    data?: {
      email?: { message?: string };
      [key: string]: any;
    };
  };
}

// Custom hook for rate limiting
const useRateLimit = (maxAttempts = 3, windowMs = 60000) => {
  const [attempts, setAttempts] = useState(0);
  const [isLimited, setIsLimited] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (isLimited && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            setIsLimited(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLimited, timeRemaining]);

  const attempt = useCallback(() => {
    if (isLimited) return false;
    
    if (attempts >= maxAttempts - 1) {
      setIsLimited(true);
      setTimeRemaining(windowMs);
      return false;
    }
    setAttempts(a => a + 1);
    return true;
  }, [attempts, isLimited, maxAttempts, windowMs]);

  const reset = useCallback(() => {
    setAttempts(0);
    setIsLimited(false);
    setTimeRemaining(0);
  }, []);

  return { attempt, reset, isLimited, remaining: maxAttempts - attempts, timeRemaining };
};

export default function CreateFaculty() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    department: "",
    designation: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { attempt, isLimited, remaining, timeRemaining, reset } = useRateLimit(3, 60000);

  const departments = ["CSE", "IT", "ECE", "EE", "ME", "CE"];
  const designations = ["Professor", "Associate Professor", "Assistant Professor", "Lecturer"];

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (success) {
      timeoutId = setTimeout(() => {
        setSuccess(false);
        setFormData({ name: "", email: "", department: "", designation: "", password: "" });
      }, 2000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [success]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.department) {
      newErrors.department = "Department is required";
    }
    
    if (!formData.designation) {
      newErrors.designation = "Designation is required";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (!attempt()) {
      return; // Rate limited
    }

    setIsSubmitting(true);
    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const userRecord = await pb.collection("users").create({
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        passwordConfirm: formData.password,
        role: "faculty",
        department: formData.department,
        emailVisibility: false,
        createdBy: currentUser.id,
        isActive: true,
      });

      await pb.collection("faculty").create({
        user: userRecord.id,
        designation: formData.designation,
        department: formData.department,
        createdBy: currentUser.id,
      });

      setSuccess(true);
      reset(); // Reset rate limit on success
    } catch (err: unknown) {
      const error = err as PocketBaseError;
      console.error("Create faculty error:", error);
      
      if (error.status === 400 && error.data?.data?.email) {
        setErrors({ email: "This email is already registered" });
      } else if (error.status === 403) {
        setErrors({ submit: "You don't have permission to create faculty" });
      } else if (error.status === 0) {
        setErrors({ submit: "Network error. Please check your connection." });
      } else {
        setErrors({ submit: error.message || "Failed to create faculty. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-green-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Faculty Created Successfully!</h2>
        <p className="text-gray-600 mb-6">The faculty account has been created and can now log in.</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => setSuccess(false)} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Another
          </button>
          <Link 
            href="/admin" 
            className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={20} /> Back to Dashboard
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Faculty</h2>
          <p className="text-gray-600 mt-1">Create faculty account for project verification</p>
        </div>

        {isLimited && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              Too many attempts. Please wait {Math.ceil(timeRemaining / 1000)} seconds before trying again.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Dr. John Doe"
                  disabled={isSubmitting || isLimited}
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  placeholder="faculty@college.edu"
                  disabled={isSubmitting || isLimited}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white transition-all ${
                    errors.department ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting || isLimited}
                >
                  <option value="">Select Department...</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white transition-all ${
                  errors.designation ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting || isLimited}
              >
                <option value="">Select Designation...</option>
                {designations.map(desig => (
                  <option key={desig} value={desig}>{desig}</option>
                ))}
              </select>
              {errors.designation && <p className="mt-1 text-sm text-red-600">{errors.designation}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="Temporary password (min 6 chars, 1 uppercase)"
              disabled={isSubmitting || isLimited}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link 
              href="/admin" 
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isLimited}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FaChalkboardTeacher size={20} />
                  Create Faculty
                  {remaining < 3 && <span className="text-xs ml-1">({remaining} left)</span>}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}