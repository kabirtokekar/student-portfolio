"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { 
  Camera, 
  Mail, 
  Phone, 
  Building, 
  BookOpen, 
  Save, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  Briefcase,
  Calendar,
  Shield
} from "lucide-react";
import Image from "next/image";

interface FacultyProfile {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  department: string;
  designation: string;
  phone?: string;
  specialization?: string;
  bio?: string;
  avatar?: string;
  joining_date?: string;
  created?: string;
  updated?: string;
  collectionId: string;      
  collectionName: string;
}

interface ToastMessage {
  type: 'success' | 'error';
  text: string;
  id: number;
}

export default function FacultyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Toast notification helper
  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setMessages(prev => [...prev, { type, text, id }]);
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
    }, 5000);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      const records = await pb.collection("faculty").getFullList({
        filter: `user = "${currentUser.id}"`,
        expand: "user",
        $autoCancel: false
      });

      if (records.length > 0) {
        const faculty = records[0];
        const userData = faculty.expand?.user || currentUser;
        
        setProfile({
          id: faculty.id,
          name: userData.name,
          email: userData.email,
          employee_id: faculty.employee_id,
          department: faculty.department,
          designation: faculty.designation,
          phone: faculty.phone || "",
          specialization: faculty.specialization || "",
          bio: faculty.bio || "",
          avatar: faculty.avatar || "",
          joining_date: faculty.joining_date || "",
          created: faculty.created,
          updated: faculty.updated,
          collectionId: faculty.collectionId,     
          collectionName: faculty.collectionName
        });
      } else {
        showToast('error', 'Faculty profile not found');
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      showToast('error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Image size should be less than 5MB');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('error', 'Please select an image file');
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [showToast]);

const handleSave = async () => {
  if (!profile) return;
  
  setSaving(true);
  
  try {
    const formData = new FormData();
    formData.append("phone", profile.phone?.trim() || "");
    formData.append("specialization", profile.specialization?.trim() || "");
    formData.append("bio", profile.bio?.trim() || "");
    
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }
    
    // Capture the updated record
    const updatedRecord = await pb.collection("faculty").update(profile.id, formData);
    
    // Update profile state preserving collection info
    setProfile(prev => ({
      ...prev!,
      avatar: updatedRecord.avatar || prev!.avatar,
      phone: updatedRecord.phone || "",
      specialization: updatedRecord.specialization || "",
      bio: updatedRecord.bio || "",
      updated: updatedRecord.updated,
      // Preserve collection metadata
      collectionId: prev!.collectionId,
      collectionName: prev!.collectionName
    }));
    
    // Force image refresh with new timestamp
    setRefreshKey(Date.now());
    
    showToast('success', 'Profile updated successfully!');
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsEditing(false);
    
  } catch (error: any) {
    console.error("Error saving profile:", error);
    showToast('error', error.message || 'Failed to update profile');
  } finally {
    setSaving(false);
  }
};

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    fetchProfile();
  }, [fetchProfile]);

  // FIXED: Proper avatar URL handling with null check
  const getAvatarUrl = useCallback((): string | null => {
    if (!profile?.avatar || profile.avatar === "") return null;
    try {
      // FIXED: Pass the full record object, not an artificial object
      return pb.files.getURL(profile as any, profile.avatar) + `?t=${refreshKey}`;
    } catch (err) {
      console.error("Error generating avatar URL:", err);
      return null;
    }
  }, [profile, refreshKey]);

  // FIXED: Check if avatar is valid before rendering Image component
  const hasValidAvatar = useCallback((): boolean => {
    const url = getAvatarUrl();
    return url !== null && url !== "";
  }, [getAvatarUrl]);

  const getInitials = useCallback((name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
          <p className="text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Failed to load profile</p>
          <button 
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl();
  const displayAvatar = avatarPreview || avatarUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`p-4 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px] animate-in slide-in-from-right ${
              msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <p className="font-medium text-sm">{msg.text}</p>
            <button 
              onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))} 
              className="ml-auto hover:bg-black/5 rounded-full p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Profile</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your personal information and preferences</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <User size={18} />
              Edit Profile
            </button>
          ) : (
            <>
              <button 
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 sm:p-8 border-b border-gray-200 bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-lg ring-4 ring-white">
                {displayAvatar && hasValidAvatar() ? (
                  <Image 
                    src={displayAvatar}
                    alt={profile.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    unoptimized
                    priority
                  />
                ) : (
                  <span className="text-2xl">{getInitials(profile.name)}</span>
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all cursor-pointer shadow-lg group-hover:scale-110">
                  <Camera className="h-4 w-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={handleAvatarChange}
                    aria-label="Change profile photo"
                  />
                </label>
              )}
              {avatarFile && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
              <p className="text-gray-600 font-medium">{profile.designation}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">
                  <Shield size={12} />
                  ID: {profile.employee_id}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  <Building size={12} />
                  {profile.department}
                </span>
              </div>
              {avatarFile && (
                <p className="text-xs text-indigo-600 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  New photo selected: {avatarFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Read-only fields */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <User size={14} />
                Full Name
              </label>
              <input
                type="text"
                disabled
                value={profile.name}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400">Contact admin to change name</p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail size={14} />
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone size={14} />
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  disabled={!isEditing}
                  value={profile.phone}
                  onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  placeholder={isEditing ? "Enter phone number" : "Not provided"}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building size={14} />
                Department
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  disabled
                  value={profile.department}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Briefcase size={14} />
                Designation
              </label>
              <input
                type="text"
                disabled
                value={profile.designation}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <BookOpen size={14} />
                Specialization
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={profile.specialization}
                  onChange={(e) => setProfile({...profile, specialization: e.target.value})}
                  placeholder={isEditing ? "e.g., Machine Learning, Web Development" : "Not specified"}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <User size={14} />
              Bio / About
            </label>
            <textarea
              disabled={!isEditing}
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              placeholder={isEditing ? "Tell us about your background, research interests, and expertise..." : "No bio provided"}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none transition-all"
            />
            {isEditing && (
              <p className="text-xs text-gray-500 text-right">{profile.bio?.length || 0}/500 characters</p>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              {profile.joining_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Joined: {new Date(profile.joining_date).toLocaleDateString()}
                </span>
              )}
              {profile.updated && (
                <span className="flex items-center gap-1">
                Last updated: {new Date(profile.updated).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}