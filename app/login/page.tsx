"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import pb from "@/lib/pocketbase";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  AlertCircle,
  Loader2,
  GraduationCap,
  Users,
  Briefcase,
  ArrowLeft,
  UserCog
} from "lucide-react";

interface RoleConfig {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

const roleConfigs: Record<string, RoleConfig> = {
  student: {
    title: "Student Login",
    subtitle: "Access your portfolio, achievements, and academic records",
    icon: GraduationCap,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-200"
  },
  staff: {
    title: "Faculty Login",
    subtitle: "Manage student records and verification processes",
    icon: Users,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-200"
  },
  recruiter: {
    title: "Recruiter Login",
    subtitle: "Verify credentials and explore student portfolios",
    icon: Briefcase,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
    borderColor: "border-violet-200"
  },
  admin: {
    title: "Admin Login",
    subtitle: "System administration and management",
    icon: UserCog,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-200"
  },
  super_admin: {
    title: "Super Admin Login",
    subtitle: "Full system control and configuration",
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-100",
    borderColor: "border-red-200"
  }
};

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get role from URL query param
  const role = searchParams.get("role") || "student";
  const config = roleConfigs[role] || roleConfigs.student;

  // Check if already logged in
  useEffect(() => {
    if (pb.authStore.isValid) {
      const userRole = pb.authStore.model?.role;
      if (userRole === "super_admin") {
        router.replace("/superadmin");
      } else if (userRole === "admin") {
        router.replace("/admin");
      } else if (userRole === "student") {
        router.replace("/student");
      } else if (userRole === "faculty") {
        router.replace("/faculty");
      } else if (userRole === "recruiter") {
        router.replace("/recruiter");
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      setIsLoading(false);
      return;
    }

    try {
      const authData = await pb.collection("users").authWithPassword(email, password);
      
      console.log("Login successful:", authData.record.role);

      // Route based on role
      switch (authData.record.role) {
        case "super_admin":
          router.push("/superadmin");
          break;
        case "admin":
          router.push("/admin");
          break;
        case "student":
          router.push("/student");
          break;
        case "faculty":
          router.push("/faculty");
          break;
        case "recruiter":
          router.push("/recruiter");
          break;
        default:
          setError("Invalid user role");
          pb.authStore.clear();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Handle specific PocketBase errors
      if (err.status === 400) {
        setError("Invalid email or password");
      } else if (err.status === 0) {
        setError("Cannot connect to server. Please check your internet connection.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </button>

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-2xl">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SGSITS Portal</h1>
          <p className="text-blue-200 text-sm">Student Portfolio & Verification System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header - Role Specific */}
          <div className={`px-8 py-6 border-b ${config.borderColor} ${config.bgColor}/50`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${config.bgColor} rounded-lg`}>
                <Icon size={24} className={config.color} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
                <p className="text-sm text-gray-500">{config.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="you@college.edu"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Contact IT Support for account assistance
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/60 text-sm">
          <p>© 2026 Shri Govindram Seksaria Institute of Technology and Science</p>
          <p className="mt-1">All rights reserved</p>
        </div>
      </div>
    </div>
  );
}