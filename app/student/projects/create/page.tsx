"use client";

import { Award } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { ArrowLeft, Plus, X, Loader2, Github, ExternalLink } from "lucide-react";
import Link from "next/link";

interface FormData {
  title: string;
  description: string;
  tech_stack: string[];
  github_link: string;
  live_link: string;
  certificate?: File | null;
}

export default function CreateProject() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    tech_stack: [],
    github_link: "",
    live_link: "",
    certificate: null,
  });
  const [techInput, setTechInput] = useState("");
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentId, setStudentId] = useState<string>("");

  useEffect(() => {
  const fetchStudent = async () => {
    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      
      const records = await pb.collection("students").getFullList({
        filter: `user = "${currentUser.id}"`,
        $autoCancel: false
      });
      
      if (records.length === 0) {
        alert("Student record not found. Please contact admin.");
        router.replace("/login");
        return;
      }
      
      setStudentId(records[0].id);
    } catch (err) {
      console.error("Error fetching student:", err);
      alert("Failed to load student data");
    }
  };
  
  fetchStudent();
}, [router]);

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Project title is required";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 50) {
      newErrors.description = "Description must be at least 50 characters";
    }
    
    if (formData.tech_stack.length === 0) {
      newErrors.tech_stack = ["Add at least one technology"];
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validate()) return;
  
  // CRITICAL: Check if studentId exists
  if (!studentId) {
    alert("Student profile not loaded. Please refresh the page.");
    return;
  }

  setIsSubmitting(true);
  
  try {
    const data = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      tech_stack: formData.tech_stack, // PocketBase stores JSON automatically
      github_link: formData.github_link.trim() || null,
      live_link: formData.live_link.trim() || null,
      student: studentId,  // Relation field
      status: "pending",
    };

    const formDataToSend = new FormData();
    formDataToSend.append("title", formData.title.trim());
    formDataToSend.append("description", formData.description.trim());
    formDataToSend.append("tech_stack", JSON.stringify(formData.tech_stack));
    formDataToSend.append("github_link", formData.github_link.trim());
    formDataToSend.append("live_link", formData.live_link.trim());
    formDataToSend.append("student", studentId);
    formDataToSend.append("status", "pending");

    if (formData.certificate) {
        formDataToSend.append("certificate", formData.certificate);
    }

    await pb.collection("projects").create(formDataToSend);     

    console.log("Sending data:", data); // Debug log

    await pb.collection("projects").create(data);
    
    router.push("/student/projects");
    router.refresh(); // Force refresh to show new data
    
  } catch (error: any) {
    console.error("Error creating project:", error);
    
    // Better error handling
    if (error.status === 400) {
      alert("Validation error: " + (error.message || "Check all required fields"));
    } else if (error.status === 403) {
      alert("Permission denied. Make sure you're logged in as a student.");
    } else if (error.status === 404) {
      alert("Collection not found. Check if 'projects' collection exists in PocketBase.");
    } else {
      alert(error.message || "Failed to create project. Please try again.");
    }
    
  } finally {
    setIsSubmitting(false);
  }
};

  const addTech = () => {
    if (techInput.trim() && !formData.tech_stack.includes(techInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tech_stack: [...prev.tech_stack, techInput.trim()]
      }));
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      tech_stack: prev.tech_stack.filter(t => t !== tech)
    }));
  };

  return (
    <div className="max-w-3xl">
      <Link 
        href="/student/projects" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Projects
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add New Project</h2>
          <p className="text-gray-600 mt-1">Showcase your work to recruiters</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, title: e.target.value }));
                if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="E-commerce Website, ML Model, etc."
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
              }}
              rows={5}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe your project, your role, challenges faced, and outcomes achieved..."
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className={`text-xs ${formData.description.length < 50 ? 'text-gray-400' : 'text-green-600'}`}>
                {formData.description.length} chars (min 50)
              </span>
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tech Stack <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="React, Python, etc. (Press Enter to add)"
              />
              <button
                type="button"
                onClick={addTech}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            
            {formData.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tech_stack.map((tech) => (
                  <span 
                    key={tech} 
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-medium"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeTech(tech)}
                      className="hover:text-indigo-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.tech_stack && <p className="mt-1 text-sm text-red-600">{errors.tech_stack[0]}</p>}
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Github size={16} />
                GitHub Link
              </label>
              <input
                type="url"
                value={formData.github_link}
                onChange={(e) => setFormData(prev => ({ ...prev, github_link: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://github.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <ExternalLink size={16} />
                Live Demo Link
              </label>
              <input
                type="url"
                value={formData.live_link}
                onChange={(e) => setFormData(prev => ({ ...prev, live_link: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <div className="text-blue-600 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Verification Process</p>
              <p>Your project will be reviewed by faculty before appearing to recruiters. This usually takes 1-2 business days.</p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link 
              href="/student/projects"
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Cancel
            </Link>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Award size={16} />
                Project Certificate (Optional)
                </label>
                <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setFormData(prev => ({ ...prev, certificate: e.target.files?.[0] || null }))}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="text-xs text-gray-500 mt-1">Upload completion certificate if available</p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}