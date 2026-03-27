"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { 
  User, 
  Mail, 
  Phone, 
  Linkedin, 
  Globe, 
  FileText, 
  Upload, 
  X, 
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import Image from "next/image";

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  roll_number: string;
  department: string;
  batch: string;
  phone?: string;
  linkedin?: string;
  portfolio_url?: string;
  bio?: string;
  skills?: string[];
  cv_resume?: string;
  avatar?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // For PocketBase record methods
}

export default function StudentProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [skillInput, setSkillInput] = useState("");
  // Add timestamp state to force image refresh
  const [refreshKey, setRefreshKey] = useState(Date.now());
  
  // Form state
  const [formData, setFormData] = useState({
    phone: "",
    linkedin: "",
    portfolio_url: "",
    bio: "",
    skills: [] as string[],
  });
  
  const [files, setFiles] = useState({
    avatar: null as File | null,
    cv_resume: null as File | null,
  });

  // FIXED: Better skills parsing function
  const parseSkills = (skillsData: unknown): string[] => {
    if (!skillsData) return [];
    
    // If it's already an array
    if (Array.isArray(skillsData)) {
      return skillsData.map(s => String(s).trim()).filter(Boolean);
    }
    
    // If it's a string that looks like JSON array (e.g., '["c"]')
    if (typeof skillsData === 'string') {
      const trimmed = skillsData.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed.map(s => String(s).trim()).filter(Boolean);
          }
        } catch {
          // Not valid JSON, fall through to split
        }
      }
      // Split by comma
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    return [];
  };

  const fetchProfile = useCallback(async () => {
    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      // FIXED: Fetch fresh data without cache
      const records = await pb.collection("students").getFullList({
        filter: `user = "${currentUser.id}"`,
        expand: "user",
        $autoCancel: false,
        cache: 'no-store' // Disable caching
      });

      if (records.length > 0) {
        const student = records[0];
        const userData = student.expand?.user || currentUser;
        
        // FIXED: Use parseSkills function
        const parsedSkills = parseSkills(student.skills);
        
        const profileData: StudentProfile = {
          ...student,
          name: userData.name,
          email: userData.email,
          roll_number: student.roll_number,
          department: student.department,
          batch: student.batch,
          phone: student.phone || "",
          linkedin: student.linkedin || "",
          portfolio_url: student.portfolio_url || "",
          bio: student.bio || "",
          skills: parsedSkills,
          cv_resume: student.cv_resume || "",
          avatar: student.avatar || "",
        };
        
        setProfile(profileData);
        setFormData({
          phone: student.phone || "",
          linkedin: student.linkedin || "",
          portfolio_url: student.portfolio_url || "",
          bio: student.bio || "",
          skills: parsedSkills,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const formDataToSend = new FormData();
      
      // Append text fields
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("linkedin", formData.linkedin);
      formDataToSend.append("portfolio_url", formData.portfolio_url);
      formDataToSend.append("bio", formData.bio);
      // Send skills as JSON array
      formDataToSend.append("skills", JSON.stringify(formData.skills));
      
      // Append files if selected
      if (files.avatar) {
        formDataToSend.append("avatar", files.avatar);
      }
      if (files.cv_resume) {
        formDataToSend.append("cv_resume", files.cv_resume);
      }
      
      await pb.collection("students").update(profile.id, formDataToSend);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // FIXED: Force refresh by updating timestamp and clearing files
      setRefreshKey(Date.now());
      setFiles({ avatar: null, cv_resume: null });
      
      // Re-fetch profile data
      await fetchProfile();
      
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  // FIXED: Get avatar URL with cache busting
  const getAvatarUrl = (record: StudentProfile | null, filename: string | undefined): string | null => {
    if (!record || !filename || filename.length === 0) return null;
    try {
      // Add timestamp to URL to prevent caching
      const url = pb.files.getURL(record, filename);
      return `${url}?t=${refreshKey}`;
    } catch {
      return null;
    }
  };

  const getFileUrl = (record: StudentProfile, filename: string): string => {
    return pb.files.getURL(record, filename);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
      </div>
    );
  }

  if (!profile) return null;

  // Compute avatar URL
  const avatarUrl = getAvatarUrl(profile, profile.avatar);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
        <p className="text-gray-600 mt-1">Manage your personal information and documents</p>
      </div>

      {/* Alert Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-medium">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Profile Photo</h3>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden mb-4 relative">
                {avatarUrl ? (
                  <Image 
                    key={refreshKey} // Force re-render when refreshKey changes
                    src={avatarUrl}
                    alt="Profile" 
                    fill 
                    className="object-cover"
                    unoptimized // Disable Next.js image optimization for dynamic URLs
                    onError={() => {
                      console.error('Failed to load avatar');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 text-4xl font-bold">
                    {profile.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFiles(prev => ({ ...prev, avatar: file }));
                      // Auto-save when file selected (optional)
                      // handleSave();
                    }
                  }}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium">
                  <Upload size={16} />
                  {files.avatar ? files.avatar.name : "Change Photo"}
                </span>
              </label>
              
              {/* Show selected file name if exists */}
              {files.avatar && (
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {files.avatar.name}
                </p>
              )}
            </div>
          </div>

          {/* Academic Info (Read-only) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Academic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Roll Number</label>
                <p className="font-medium text-gray-900">{profile.roll_number}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Department</label>
                <p className="font-medium text-gray-900">{profile.department}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Batch</label>
                <p className="font-medium text-gray-900">{profile.batch}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium text-gray-900">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Editable Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Links */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contact & Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="https://myportfolio.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">About Me</h3>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder="Tell recruiters about yourself, your interests, and career goals..."
            />
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Skills</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Add a skill (e.g., React, Python)..."
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span className="text-lg">+</span>
              </button>
            </div>
            
            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <span 
                    key={skill} 
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-indigo-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* CV/Resume Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">CV / Resume</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                id="cv-upload"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setFiles(prev => ({ ...prev, cv_resume: e.target.files?.[0] || null }))}
              />
              
              {files.cv_resume ? (
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <FileText size={24} />
                  <span className="font-medium">{files.cv_resume.name}</span>
                  <button 
                    onClick={() => setFiles(prev => ({ ...prev, cv_resume: null }))}
                    className="text-red-500 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : profile.cv_resume ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 size={24} />
                    <span className="font-medium">Resume uploaded</span>
                  </div>
                  <a 
                    href={getFileUrl(profile, profile.cv_resume)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                  >
                    <FileText size={14} />
                    View Current Resume
                  </a>
                  <div>
                    <label 
                      htmlFor="cv-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 cursor-pointer text-sm font-medium"
                    >
                      <Upload size={16} />
                      Replace Resume
                    </label>
                  </div>
                </div>
              ) : (
                <label htmlFor="cv-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={32} className="text-gray-400" />
                    <span className="font-medium text-gray-700">Upload CV/Resume</span>
                    <span className="text-sm text-gray-500">PDF, DOC, or DOCX (Max 5MB)</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
