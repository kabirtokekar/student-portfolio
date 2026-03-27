"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { 
  Award, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X,
  Calendar,
  FileText,
  Eye,
  Download
} from "lucide-react";

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  file: string;
  issue_date?: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
  status: "pending" | "verified" | "rejected";
  created: string;
  collectionId: string;
}

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentCertIndex, setCurrentCertIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  const [formData, setFormData] = useState({
    title: "",
    issuer: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
    file: null as File | null,
  });

  const fetchCertificates = useCallback(async () => {
    try {
      const currentUser = pb.authStore.model;
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      const studentRecords = await pb.collection("students").getFullList({
        filter: `user = "${currentUser.id}"`,
        $autoCancel: false
      });
      
      if (studentRecords.length > 0) {
        setStudentId(studentRecords[0].id);
        
        const records = await pb.collection("certificates").getFullList({
          filter: `student = "${studentRecords[0].id}"`,
          sort: "-created",
          $autoCancel: false
        });
        
        setCertificates(records as unknown as Certificate[]);
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const isViewable = (filename: string) => {
    return filename?.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i);
  };

  const openViewer = (index: number) => {
    setCurrentCertIndex(index);
    setZoom(1);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setZoom(1);
  };

  const handlePrev = () => {
    if (currentCertIndex > 0) {
      setCurrentCertIndex(prev => prev - 1);
      setZoom(1);
    }
  };

  const handleNext = () => {
    if (currentCertIndex < certificates.length - 1) {
      setCurrentCertIndex(prev => prev + 1);
      setZoom(1);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      alert("Please upload a certificate file");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("issuer", formData.issuer);
      data.append("file", formData.file);
      data.append("student", studentId);
      data.append("status", "pending");
      
      if (formData.issue_date) data.append("issue_date", formData.issue_date);
      if (formData.expiry_date) data.append("expiry_date", formData.expiry_date);
      if (formData.credential_id) data.append("credential_id", formData.credential_id);
      if (formData.credential_url) data.append("credential_url", formData.credential_url);

      await pb.collection("certificates").create(data);
      
      setFormData({
        title: "",
        issuer: "",
        issue_date: "",
        expiry_date: "",
        credential_id: "",
        credential_url: "",
        file: null,
      });
      setShowForm(false);
      fetchCertificates();
      
    } catch (error: any) {
      console.error("Error adding certificate:", error);
      alert(error.message || "Failed to add certificate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this certificate?")) return;
    
    try {
      await pb.collection("certificates").delete(id);
      setCertificates(certificates.filter(c => c.id !== id));
    } catch (error) {
      alert("Failed to delete certificate");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle2 size={16} className="text-green-600" />;
      case "rejected": return <AlertCircle size={16} className="text-red-600" />;
      default: return <Clock size={16} className="text-yellow-600" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800 border-green-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getFileUrl = (record: Certificate) => {
    return pb.files.getURL(record, record.file);
  };

  const currentCert = certificates[currentCertIndex];
  const fileUrl = currentCert ? getFileUrl(currentCert) : "";
  const isImage = currentCert?.file?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPDF = currentCert?.file?.match(/\.pdf$/i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Certificates</h2>
          <p className="text-gray-600 mt-1">Upload course certificates, hackathon wins, and achievements</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? "Cancel" : "Add Certificate"}
        </button>
      </div>

      {/* Add Certificate Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Certificate</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Title *
                </label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="AWS Cloud Practitioner"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuing Organization *
                </label>
                <input
                  required
                  type="text"
                  value={formData.issuer}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Amazon Web Services"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (if applicable)
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential ID
                </label>
                <input
                  type="text"
                  value={formData.credential_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, credential_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="ABC-123-XYZ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification URL
                </label>
                <input
                  type="url"
                  value={formData.credential_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, credential_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="https://verify.example.com/..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certificate File *
              </label>
              <input
                required
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="text-xs text-gray-500 mt-1">PDF or Image (Max 5MB)</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Award size={18} />
                    Add Certificate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
          <p className="text-gray-500 mb-4">Add your certifications to strengthen your profile</p>
          <button 
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Plus size={20} />
            Add Your First Certificate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert, index) => (
            <div key={cert.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Certificate Preview Thumbnail */}
              {isViewable(cert.file) ? (
                <div 
                  className="h-48 bg-gray-100 relative cursor-pointer group"
                  onClick={() => openViewer(index)}
                >
                  <img
                    src={getFileUrl(cert)}
                    alt={cert.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="flex items-center gap-2 text-white font-medium">
                      <Eye size={20} />
                      Click to View
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-gray-50 flex items-center justify-center">
                  <FileText size={48} className="text-gray-300" />
                </div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{cert.title}</h3>
                    <p className="text-gray-600">{cert.issuer}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 ${getStatusStyle(cert.status)}`}>
                    {getStatusIcon(cert.status)}
                    <span className="capitalize">{cert.status}</span>
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {cert.issue_date && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span>Issued: {new Date(cert.issue_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {cert.credential_id && (
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span>ID: {cert.credential_id}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {isViewable(cert.file) ? (
                    <button
                      onClick={() => openViewer(index)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  ) : (
                    <a
                      href={getFileUrl(cert)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <ExternalLink size={16} />
                      Open
                    </a>
                  )}
                  
                  <a
                    href={getFileUrl(cert)}
                    download
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                  
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors"
                      title="Verify Online"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  
                  <button
                    onClick={() => handleDelete(cert.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {viewerOpen && currentCert && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex flex-col"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
            <div>
              <h3 className="font-semibold text-lg">{currentCert.title}</h3>
              <p className="text-sm text-gray-400">
                {currentCertIndex + 1} of {certificates.length}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <button 
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-gray-700 rounded transition-colors"
                  title="Zoom out"
                >
                  <span className="text-lg">−</span>
                </button>
                <span className="px-2 text-sm font-medium">{Math.round(zoom * 100)}%</span>
                <button 
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-gray-700 rounded transition-colors"
                  title="Zoom in"
                >
                  <span className="text-lg">+</span>
                </button>
              </div>

              {/* Download */}
              <a
                href={fileUrl}
                download
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Download"
              >
                <Download size={20} />
              </a>

              {/* Close */}
              <button 
                onClick={closeViewer}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors ml-2"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Viewer Content */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8 relative">
            {isImage ? (
              <img
                src={fileUrl}
                alt={currentCert.title}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : isPDF ? (
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full max-w-4xl bg-white rounded-lg"
                title={currentCert.title}
              />
            ) : (
              <div className="text-center text-white">
                <p className="mb-4">Preview not available for this file type</p>
                <a 
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <ExternalLink size={18} />
                  Open in New Tab
                </a>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          {certificates.length > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-t border-gray-800">
              <button
                onClick={handlePrev}
                disabled={currentCertIndex === 0}
                className="flex items-center gap-2 px-4 py-2 text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"
              >
                ← Previous
              </button>

              <div className="flex gap-2">
                {certificates.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentCertIndex(idx);
                      setZoom(1);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentCertIndex ? 'bg-white' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={currentCertIndex === certificates.length - 1}
                className="flex items-center gap-2 px-4 py-2 text-white disabled:opacity-30 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}