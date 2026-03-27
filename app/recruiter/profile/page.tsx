"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { 
  Camera, 
  Mail, 
  Phone, 
  Building2, 
  Globe, 
  Save, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Briefcase,
  MapPin
} from "lucide-react";
import Image from "next/image";

interface RecruiterProfile {
  id: string;
  name: string;
  email: string;
  company_name: string;
  company_website?: string;
  phone?: string;
  industry?: string;
  location?: string;
  bio?: string;
  avatar?: string;
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

export default function RecruiterProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());

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

      const records = await pb.collection("recruiter").getFullList({
        filter: `user = "${currentUser.id}"`,
        expand: "user",
        $autoCancel: false
      });

      if (records.length > 0) {
        const recruiter = records[0];
        const userData = recruiter.expand?.user || currentUser;
        
        setProfile({
          id: recruiter.id,
          name: userData.name,
          email: userData.email,
          company_name: recruiter.company_name,
          company_website: recruiter.company_website || "",
          phone: recruiter.phone || "",
          industry: recruiter.industry || "",
          location: recruiter.location || "",
          bio: recruiter.bio || "",
          avatar: recruiter.avatar || "",
          created: recruiter.created,
          updated: recruiter.updated,
          collectionId: recruiter.collectionId,
          collectionName: recruiter.collectionName
        });
      } else {
        showToast('error', 'Recruiter profile not found');
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
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', 'Image size should be less than 5MB');
        return;
      }
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
    formData.append("industry", profile.industry?.trim() || "");
    formData.append("location", profile.location?.trim() || "");
    formData.append("bio", profile.bio?.trim() || "");
    formData.append("company_website", profile.company_website?.trim() || "");
    
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }
    
    // FIXED: Capture the updated record response
    const updatedRecord = await pb.collection("recruiter").update(profile.id, formData);
    
    // FIXED: Immediately update profile state with new avatar filename
    setProfile(prev => ({
      ...prev!,
      avatar: updatedRecord.avatar || prev!.avatar,
      phone: updatedRecord.phone || "",
      industry: updatedRecord.industry || "",
      location: updatedRecord.location || "",
      bio: updatedRecord.bio || "",
      company_website: updatedRecord.company_website || "",
      updated: updatedRecord.updated
    }));
    
    // Update refreshKey to bust the image cache
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

  const getAvatarUrl = useCallback((): string | null => {
    if (!profile?.avatar) return null;
    try {
      return pb.files.getURL(profile as any, profile.avatar) + `?t=${refreshKey}`;
    } catch (err) {
      return null;
    }
  }, [profile, refreshKey]);

  const hasValidAvatar = useCallback((): boolean => {
    return !!profile?.avatar && profile.avatar !== "";
  }, [profile]);

  const getInitials = useCallback((name: string) => {
    return name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Failed to load profile</p>
          <button onClick={fetchProfile} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
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
              className="ml-auto hover:bg-black/5 rounded-full p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your company information</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button 
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
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
        <div className="p-6 sm:p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-lg ring-4 ring-white">
                {displayAvatar && hasValidAvatar() ? (
                  <Image 
                    src={displayAvatar}
                    alt={profile.name}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <Briefcase className="h-10 w-10" />
                )}
              </div>
              {isEditing && (
                <label className="absolute -bottom-2 -right-2 p-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all cursor-pointer shadow-lg">
                  <Camera className="h-4 w-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{profile.company_name}</h2>
              <p className="text-gray-600">{profile.name}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  <Briefcase size={12} />
                  Recruiter
                </span>
                {profile.industry && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {profile.industry}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Company Name</label>
              <input
                type="text"
                disabled
                value={profile.company_name}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone size={14} />
                Phone Number
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                placeholder={isEditing ? "Enter phone number" : "Not provided"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Globe size={14} />
                Company Website
              </label>
              <input
                type="url"
                disabled={!isEditing}
                value={profile.company_website}
                onChange={(e) => setProfile({...profile, company_website: e.target.value})}
                placeholder={isEditing ? "https://company.com" : "Not provided"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 size={14} />
                Industry
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={profile.industry}
                onChange={(e) => setProfile({...profile, industry: e.target.value})}
                placeholder={isEditing ? "e.g., Software, Consulting" : "Not specified"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin size={14} />
                Location
              </label>
              <input
                type="text"
                disabled={!isEditing}
                value={profile.location}
                onChange={(e) => setProfile({...profile, location: e.target.value})}
                placeholder={isEditing ? "City, Country" : "Not specified"}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Company Bio</label>
            <textarea
              disabled={!isEditing}
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              placeholder={isEditing ? "Tell us about your company..." : "No bio provided"}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}