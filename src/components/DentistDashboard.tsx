{/* View Case Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Case Details</h2>
                <button
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Appointments from "./Appointments";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { ROLES } from "@/lib/constants";

type Appointment = {
  date: string;
};

type Patient = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

type Case = {
  id: string;
  status: string;
  patient: Patient;
  notes: string;
  createdAt: string;
  scanFileUrl?: string;
  upperScanFile?: string;
  lowerScanFile?: string;
  biteScanFile?: string;
  appointments?: Appointment[];
  hiddenByDentist?: boolean;
  caseNumber?: string;
};

type FileUpload = {
  file: File | null;
  preview?: string;
  uploadDate?: Date;
};

type Clinic = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

export default function DentistDashboard({ user }: { user: any }) {
  const { data: session } = useSession();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountTab, setAccountTab] = useState<'profile' | 'clinics' | 'password'>('profile');
  
  // Clinic states
  const [clinics, setClinics] = useState<Clinic[]>([
    { id: '1', name: 'Main Clinic', address: '123 Main St', phone: '+1-555-0123', email: 'main@clinic.com' }
  ]);
  const [selectedClinic, setSelectedClinic] = useState<string>('1');
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [newClinic, setNewClinic] = useState<Omit<Clinic, 'id'>>({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  
  // Profile states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    licenseNumber: '',
    specialization: ''
  });
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patientFirstName: "",
    patientLastName: "",
    patientEmail: "",
    phone: "",
    sex: "MALE",
    dateOfBirth: "",
    notes: "",
    caseNumber: "",
  });
  
  const [files, setFiles] = useState<{ 
    upper: FileUpload; 
    lower: FileUpload; 
    bite: FileUpload;
    additional: FileUpload[];
  }>({
    upper: { file: null },
    lower: { file: null },
    bite: { file: null },
    additional: [],
  });
  
  const [patientExists, setPatientExists] = useState<any>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [datePickerStep, setDatePickerStep] = useState<'day' | 'month' | 'year' | null>(null);
  const [tempDate, setTempDate] = useState({ day: '', month: '', year: '' });

  useEffect(() => {
    if (user?.id) {
      reloadCases();
    }
  }, [user?.id]);

  const reloadCases = async () => {
    if (user?.id) {
      setLoading(true);
      try {
        const res = await fetch(`/api/cases`);
        const data = await res.json();
        setCases(data.cases || []);
      } catch (err) {
        console.error("Error loading cases:", err);
        toast.error("Failed to load cases");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleHideCase = async (caseId: string) => {
    try {
      const res = await fetch("/api/cases", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          caseId: caseId, 
          hiddenByDentist: true 
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setCases(prevCases => prevCases.filter(c => c.id !== caseId));
        if (selectedCase?.id === caseId) {
          setSelectedCase(null);
        }
        toast.success("Case hidden successfully");
      } else {
        toast.error(data.error || "Failed to hide case");
      }
    } catch (err) {
      console.error("Error hiding case:", err);
      toast.error("Error hiding case");
    }
  };

  // Profile update handler
  const handleUpdateProfile = async () => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      if (res.ok) {
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (err) {
      toast.error('Error updating profile');
    }
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      if (res.ok) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error('Failed to change password');
      }
    } catch (err) {
      toast.error('Error changing password');
    }
  };

  // Add clinic handler
  const handleAddClinic = () => {
    if (!newClinic.name) {
      toast.error('Clinic name is required');
      return;
    }
    
    const clinic: Clinic = {
      id: Date.now().toString(),
      ...newClinic
    };
    
    setClinics([...clinics, clinic]);
    setNewClinic({ name: '', address: '', phone: '', email: '' });
    setShowAddClinic(false);
    toast.success('Clinic added successfully');
  };

  // Generate a case number
  const generateCaseNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${year}${month}${day}-${random}`;
  };

  // Check if patient exists by email
  const checkPatientExists = async (email: string) => {
    if (!email || !email.includes("@")) {
      setPatientExists(null);
      return;
    }
    
    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/users/exists?email=${encodeURIComponent(email)}`);
      
      if (!res.ok) {
        console.error('Error checking patient exists:', res.status, res.statusText);
        setPatientExists(null);
        return;
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error('Response is not JSON:', contentType);
        setPatientExists(null);
        return;
      }
      
      const data = await res.json();
      
      if (data.exists && data.role === ROLES.PATIENT) {
        setPatientExists(data);
        setFormData(prev => ({
          ...prev,
          patientFirstName: data.firstName || "",
          patientLastName: data.lastName || "",
          phone: data.phone || "",
          sex: data.sex || "MALE",
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : "",
        }));
        toast.success("Patient found - information auto-filled");
      } else {
        setPatientExists(null);
        setFormData(prev => ({
          ...prev,
          patientFirstName: "",
          patientLastName: "",
          phone: "",
          sex: "MALE",
          dateOfBirth: "",
        }));
      }
    } catch (err) {
      console.error("Error checking patient:", err);
      setPatientExists(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Handle file change with preview
  const handleFileChange = (type: 'upper' | 'lower' | 'bite', file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFiles(prev => ({
          ...prev,
          [type]: {
            file,
            preview: file.name,
            uploadDate: new Date()
          }
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setFiles(prev => ({
        ...prev,
        [type]: { file: null }
      }));
    }
  };

  // Handle additional files
  const handleAdditionalFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setFiles(prev => ({
        ...prev,
        additional: [...prev.additional, {
          file,
          preview: file.name,
          uploadDate: new Date()
        }]
      }));
    };
    reader.readAsDataURL(file);
  };

  // Remove additional file
  const removeAdditionalFile = (index: number) => {
    setFiles(prev => ({
      ...prev,
      additional: prev.additional.filter((_, i) => i !== index)
    }));
  };

  // Handle form submission
  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!files.upper.file && !files.lower.file && !files.bite.file) {
      toast.error("Please upload at least one scan file");
      return;
    }

    if (!formData.patientFirstName || !formData.patientLastName || !formData.patientEmail || !formData.dateOfBirth) {
      toast.error("Please fill in all required patient information");
      return;
    }

    setSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      
      const caseNumber = formData.caseNumber || generateCaseNumber();
      
      Object.entries({ ...formData, caseNumber }).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      
      if (files.upper.file) formDataToSend.append("upper", files.upper.file);
      if (files.lower.file) formDataToSend.append("lower", files.lower.file);
      if (files.bite.file) formDataToSend.append("bite", files.bite.file);
      
      files.additional.forEach((fileObj, index) => {
        if (fileObj.file) {
          formDataToSend.append(`additional_${index}`, fileObj.file);
        }
      });
      
      const res = await fetch("/api/cases", {
        method: "POST",
        body: formDataToSend,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Case ${data.caseId || caseNumber} submitted successfully!`);
        setShowSubmitModal(false);
        resetForm();
        reloadCases();
      } else {
        console.error("Server error:", data);
        toast.error(data.error || "Failed to submit case");
      }
    } catch (err) {
      console.error("Error submitting case:", err);
      toast.error("Error submitting case");
    } finally {
      setSubmitting(false);
    }
  };

  // Upload additional files to existing case
  const handleUploadAdditionalFiles = async (caseId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.stl,.obj,.zip,.ply';
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const formData = new FormData();
      formData.append('caseId', caseId);
      
      for (let i = 0; i < files.length; i++) {
        formData.append(`files`, files[i]);
      }
      
      try {
        const res = await fetch(`/api/cases/${caseId}/files`, {
          method: 'POST',
          body: formData,
        });
        
        if (res.ok) {
          toast.success('Additional files uploaded successfully');
          reloadCases();
        } else {
          toast.error('Failed to upload files');
        }
      } catch (err) {
        console.error('Error uploading files:', err);
        toast.error('Error uploading files');
      }
    };
    
    input.click();
  };

  const resetForm = () => {
    setFormData({
      patientFirstName: "",
      patientLastName: "",
      patientEmail: "",
      phone: "",
      sex: "MALE",
      dateOfBirth: "",
      notes: "",
      caseNumber: "",
    });
    setFiles({
      upper: { file: null },
      lower: { file: null },
      bite: { file: null },
      additional: [],
    });
    setPatientExists(null);
    setActiveStep(1);
    setDatePickerStep(null);
    setTempDate({ day: '', month: '', year: '' });
  };

  // Parse scan files from case
  const parseScanFiles = (selectedCase: Case) => {
    const files: Record<string, string> = {};
    
    if (selectedCase.scanFileUrl) {
      try {
        return JSON.parse(selectedCase.scanFileUrl);
      } catch {
        return {};
      }
    }
    
    if ((selectedCase as any).upperScanFile) files.upper = (selectedCase as any).upperScanFile;
    if ((selectedCase as any).lowerScanFile) files.lower = (selectedCase as any).lowerScanFile;
    if ((selectedCase as any).biteScanFile) files.bite = (selectedCase as any).biteScanFile;
    
    return files;
  };

  const currentClinic = clinics.find(c => c.id === selectedClinic);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
        {/* User Info */}
        <div className="p-6 border-b dark:border-gray-700">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{user.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">ID: {user.id}</p>
        </div>

        {/* Clinic Selector */}
        <div className="p-4 border-b dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Clinic</label>
          <select
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
            className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
          >
            {clinics.map(clinic => (
              <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
            ))}
          </select>
          {currentClinic && currentClinic.phone && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">📞 {currentClinic.phone}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full bg-blue-700 text-white font-medium px-4 py-3 rounded-lg hover:bg-blue-800 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Case
            </button>
          </nav>
        </div>

        {/* Account Section */}
        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={() => setShowAccountModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Account</span>
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Case Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your patient cases and appointments</p>
          </div>

          {/* Cases Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Loading cases...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 mt-4">No cases yet. Click "New Case" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Case Number</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Patient</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Next Appointment</th>
                      <th className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {cases.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{c.caseNumber || c.id}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">ID: {c.id}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{c.patient.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">ID: {c.patient.id}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium
                            ${c.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                              c.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              c.status === 'IN_TREATMENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            {c.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {c.appointments && c.appointments.length > 0
                            ? new Date(c.appointments[0].date).toLocaleString()
                            : "—"}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                              onClick={() => setSelectedCase(c)}
                            >
                              View
                            </button>
                            <button
                              className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium text-sm"
                              onClick={() => {
                                if (confirm("Hide this case from your dashboard?")) {
                                  handleHideCase(c.id);
                                }
                              }}
                            >
                              Hide
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Account Settings</h2>
                <button
                  onClick={() => setShowAccountModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex">
              {/* Tabs */}
              <div className="w-48 bg-gray-50 dark:bg-gray-700 p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setAccountTab('profile')}
                    className={`w-full text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors
                      ${accountTab === 'profile' ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'}`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setAccountTab('clinics')}
                    className={`w-full text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors
                      ${accountTab === 'clinics' ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'}`}
                  >
                    Clinics
                  </button>
                  <button
                    onClick={() => setAccountTab('password')}
                    className={`w-full text-left px-4 py-2 rounded-lg font-medium text-sm transition-colors
                      ${accountTab === 'password' ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'}`}
                  >
                    Password
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6">
                {accountTab === 'profile' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Profile Information</h3>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Phone</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">License Number</label>
                      <input
                        type="text"
                        value={profileData.licenseNumber}
                        onChange={(e) => setProfileData({ ...profileData, licenseNumber: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Specialization</label>
                      <input
                        type="text"
                        value={profileData.specialization}
                        onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <button
                      onClick={handleUpdateProfile}
                      className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800"
                    >
                      Update Profile
                    </button>
                  </div>
                )}

                {accountTab === 'clinics' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Clinics</h3>
                      <button
                        onClick={() => setShowAddClinic(true)}
                        className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 text-sm"
                      >
                        Add Clinic
                      </button>
                    </div>

                    {showAddClinic && (
                      <div className="border dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 space-y-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">Add New Clinic</h4>
                        <input
                          type="text"
                          placeholder="Clinic Name"
                          value={newClinic.name}
                          onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded px-3 py-2"
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={newClinic.address}
                          onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded px-3 py-2"
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={newClinic.phone}
                          onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded px-3 py-2"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={newClinic.email}
                          onChange={(e) => setNewClinic({ ...newClinic, email: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded px-3 py-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddClinic}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setShowAddClinic(false);
                              setNewClinic({ name: '', address: '', phone: '', email: '' });
                            }}
                            className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {clinics.map(clinic => (
                        <div key={clinic.id} className="border dark:border-gray-600 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 dark:text-white">{clinic.name}</h4>
                          {clinic.address && <p className="text-sm text-gray-600 dark:text-gray-400">{clinic.address}</p>}
                          {clinic.phone && <p className="text-sm text-gray-600 dark:text-gray-400">📞 {clinic.phone}</p>}
                          {clinic.email && <p className="text-sm text-gray-600 dark:text-gray-400">✉️ {clinic.email}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {accountTab === 'password' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Change Password</h3>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Password</label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">New Password</label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                      />
                    </div>
                    <button
                      onClick={handleChangePassword}
                      className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800"
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Case Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Case Details</h2>
                <button
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => setSelectedCase(null)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Case ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCase.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Case Number</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCase.caseNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold
                    ${selectedCase.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                      selectedCase.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      selectedCase.status === 'IN_TREATMENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                    {selectedCase.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Patient Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCase.patient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Patient ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCase.patient.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCase.patient.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCase.patient.email || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedCase.notes || "No notes"}</p>
                </div>
              </div>

              {(selectedCase.scanFileUrl || (selectedCase as any).upperScanFile || (selectedCase as any).lowerScanFile || (selectedCase as any).biteScanFile) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Scan Files</h3>
                  <div className="space-y-2">
                    {Object.entries(parseScanFiles(selectedCase) as Record<string, string>).map(
                      ([type, filename]) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="font-medium capitalize text-gray-900 dark:text-white">{type} Scan</span>
                          <a
                            href={`/api/files/${filename}`}
                            download
                            className="text-blue-600 hover:underline text-sm dark:text-blue-400"
                          >
                            Download
                          </a>
                        </div>
                      )
                    )}
                  </div>
                  <button
                    onClick={() => handleUploadAdditionalFiles(selectedCase.id)}
                    className="mt-3 text-blue-600 hover:underline text-sm dark:text-blue-400"
                  >
                    + Upload Additional Files
                  </button>
                </div>
              )}

              <Appointments caseId={selectedCase.id} userId={user.id} userRole={user.role} />
              
              <div className="flex gap-2 justify-end mt-6">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={() => {
                    if (confirm("Hide this case from your dashboard? You can ask an admin to restore it.")) {
                      handleHideCase(selectedCase.id);
                    }
                  }}
                >
                  Hide Case
                </button>
                <button
                  className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  onClick={() => setSelectedCase(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Case Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Submit New Case</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Step {activeStep} of 3</p>
                </div>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex-1 flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                      ${activeStep >= step ? 'bg-blue-700 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${activeStep > step ? 'bg-blue-700' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              <form onSubmit={handleSubmitCase}>
                {activeStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Patient Information</h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Case Number</label>
                      <input
                        type="text"
                        value={formData.caseNumber}
                        onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                        className="w-48 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2"
                        placeholder=""
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Leave case number blank to auto-generate. Phone number is optional.
                    </p>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={formData.patientEmail}
                          onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                          onBlur={(e) => checkPatientExists(e.target.value)}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 pr-10"
                          placeholder="patient@email.com"
                        />
                        {checkingEmail && (
                          <span className="absolute right-3 top-3 text-gray-400">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </span>
                        )}
                        {!checkingEmail && patientExists && (
                          <span className="absolute right-3 top-3 text-green-500">✓</span>
                        )}
                      </div>
                      {patientExists && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          Existing patient found (ID: {patientExists.id}) - Information has been auto-filled
                        </p>
                      )}
                      {!patientExists && formData.patientEmail && !checkingEmail && formData.patientEmail.includes("@") && (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          New patient - please fill in all information below
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.patientFirstName}
                          onChange={(e) => setFormData({ ...formData, patientFirstName: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
                          placeholder="John"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.patientLastName}
                          onChange={(e) => setFormData({ ...formData, patientLastName: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                          Sex <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.sex}
                          onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      
                      <div className="mb-2">
                        <div className="w-full border dark:border-gray-600 rounded-lg px-4 py-2 bg-gray-50 dark:bg-gray-700 min-h-[42px] flex items-center">
                          {formData.dateOfBirth ? (
                            <span className="text-gray-900 dark:text-white">
                              {(() => {
                                const date = new Date(formData.dateOfBirth + 'T00:00:00');
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              })()}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">DD/MM/YYYY</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setDatePickerStep('day');
                          setTempDate({ day: '', month: '', year: '' });
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-2"
                      >
                        {formData.dateOfBirth ? 'Change Date' : 'Select Date'}
                      </button>

                      {datePickerStep && (
                        <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-600 w-80 z-[60]">
                          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 rounded-t-lg">
                            <div className="flex justify-between items-center">
                              <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                                {datePickerStep === 'day' && 'Select Day'}
                                {datePickerStep === 'month' && 'Select Month'}
                                {datePickerStep === 'year' && 'Select Year'}
                              </h3>
                              <button
                                type="button"
                                onClick={() => setDatePickerStep(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-lg leading-none"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          <div className="p-4">
                            {datePickerStep === 'day' && (
                              <div>
                                <div className="grid grid-cols-7 gap-1 mb-3">
                                  {Array.from({ length: 31 }, (_, i) => (
                                    <button
                                      key={i + 1}
                                      type="button"
                                      onClick={() => {
                                        setTempDate(prev => ({ ...prev, day: String(i + 1) }));
                                        setDatePickerStep('month');
                                      }}
                                      className="py-2 px-1 border dark:border-gray-600 rounded text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-gray-900 dark:text-white"
                                    >
                                      {i + 1}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {datePickerStep === 'month' && (
                              <div>
                                <div className="grid grid-cols-2 gap-1 mb-3">
                                  {[
                                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                                  ].map((month, index) => (
                                    <button
                                      key={month}
                                      type="button"
                                      onClick={() => {
                                        setTempDate(prev => ({ ...prev, month: String(index + 1) }));
                                        setDatePickerStep('year');
                                      }}
                                      className="py-2 px-2 border dark:border-gray-600 rounded text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-gray-900 dark:text-white"
                                    >
                                      {month}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex justify-start">
                                  <button
                                    type="button"
                                    onClick={() => setDatePickerStep('day')}
                                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    ← Back
                                  </button>
                                </div>
                              </div>
                            )}

                            {datePickerStep === 'year' && (
                              <div>
                                <div className="max-h-48 overflow-y-auto mb-3">
                                  {Array.from({ length: 10 }, (_, i) => {
                                    const startYear = new Date().getFullYear() - (i * 10);
                                    const endYear = startYear - 9;
                                    return (
                                      <div key={i} className="mb-2">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium mb-1 bg-gray-100 dark:bg-gray-700 py-1 rounded">
                                          {endYear}-{startYear}
                                        </div>
                                        <div className="grid grid-cols-5 gap-1">
                                          {Array.from({ length: 10 }, (_, j) => {
                                            const year = startYear - j;
                                            return (
                                              <button
                                                key={year}
                                                type="button"
                                                onClick={() => {
                                                  setTempDate(prev => ({ ...prev, year: String(year) }));
                                                  const isoDate = `${year}-${tempDate.month.padStart(2, '0')}-${tempDate.day.padStart(2, '0')}`;
                                                  setFormData(prev => ({ ...prev, dateOfBirth: isoDate }));
                                                  setDatePickerStep(null);
                                                  setTempDate({ day: '', month: '', year: '' });
                                                }}
                                                className="py-1 px-1 border dark:border-gray-600 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-gray-900 dark:text-white"
                                              >
                                                {year}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="flex justify-start">
                                  <button
                                    type="button"
                                    onClick={() => setDatePickerStep('month')}
                                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    ← Back
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.patientFirstName || !formData.patientLastName || !formData.patientEmail || !formData.dateOfBirth) {
                            toast.error("Please fill in all required fields");
                            return;
                          }
                          setActiveStep(2);
                        }}
                        className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800"
                      >
                        Next: Scan Files
                      </button>
                    </div>
                  </div>
                )}"
                      >
                        Next: Review & Notes
                      </button>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Review & Submit</h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium">Case Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Case Number:</span> {formData.caseNumber || "Auto-generated"}
                        </div>
                        <div>
                          <span className="text-gray-600">Clinic:</span> {currentClinic?.name}
                        </div>
                        {patientExists && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Existing Patient:</span> Yes (ID: {patientExists.id})
                          </div>
                        )}
                      </div>

                      <h4 className="font-medium">Patient Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span> {formData.patientFirstName} {formData.patientLastName}
                        </div>
                        <div>
                          <span className="text-gray-600">Email:</span> {formData.patientEmail}
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span> {formData.phone || "Not provided"}
                        </div>
                        <div>
                          <span className="text-gray-600">DOB:</span> {formData.dateOfBirth}
                        </div>
                        <div>
                          <span className="text-gray-600">Sex:</span> {formData.sex.replace(/_/g, " ")}
                        </div>
                      </div>
                      
                      <h4 className="font-medium mt-4">Uploaded Files</h4>
                      <div className="space-y-1 text-sm">
                        {files.upper.file && <div>✓ Upper jaw scan: {files.upper.preview}</div>}
                        {files.lower.file && <div>✓ Lower jaw scan: {files.lower.preview}</div>}
                        {files.bite.file && <div>✓ Bite scan: {files.bite.preview}</div>}
                        {files.additional.length > 0 && (
                          <div>✓ {files.additional.length} additional file(s)</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Clinical Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2 h-32"
                        placeholder="Add any clinical notes, special instructions, or concerns..."
                      />
                    </div>

                    <div className="flex justify-between mt-6">
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {submitting ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          "Submit Case"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"
                      >
                        Next: Scan Files
                      </button>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Upload Scan Files</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload at least one scan file. You can add more files later if needed.
                    </p>
                    
                    <div className="space-y-4">
                      {(['upper', 'lower', 'bite'] as const).map((type) => (
                        <div key={type} className="border rounded-lg p-4">
                          <label className="block text-sm font-medium mb-2 capitalize">
                            {type} Jaw Scan
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept=".stl,.obj,.zip,.ply"
                              onChange={(e) => handleFileChange(type, e.target.files?.[0] || null)}
                              className="hidden"
                              id={`file-${type}`}
                            />
                            <label
                              htmlFor={`file-${type}`}
                              className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                                ${files[type].file 
                                  ? 'border-green-400 bg-green-50' 
                                  : 'border-gray-300 hover:border-blue-400'}`}
                            >
                              {files[type].file ? (
                                <div>
                                  <p className="text-green-700 font-medium">
                                    {files[type].preview}
                                  </p>
                                  <p className="text-sm text-gray-600">Click to change</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-gray-600">Click to upload</p>
                                  <p className="text-sm text-gray-400">.stl, .obj, .zip, .ply</p>
                                </div>
                              )}
                            </label>
                            {files[type].file && (
                              <button
                                type="button"
                                onClick={() => handleFileChange(type, null)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Additional Files (Optional)</h4>
                      {files.additional.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
                          <span className="text-sm">{file.preview}</span>
                          <button
                            type="button"
                            onClick={() => removeAdditionalFile(index)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <input
                        type="file"
                        accept=".stl,.obj,.zip,.ply"
                        onChange={(e) => e.target.files?.[0] && handleAdditionalFile(e.target.files[0])}
                        className="hidden"
                        id="additional-file"
                      />
                      <label
                        htmlFor="additional-file"
                        className="inline-block text-blue-600 hover:text-blue-700 cursor-pointer text-sm"
                      >
                        + Add Additional File
                      </label>
                    </div>

                    <div className="flex justify-between mt-6">
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!files.upper.file && !files.lower.file && !files.bite.file) {
                            toast.error("Please upload at least one scan file");
                            return;
                          }
                          setActiveStep(3);
                        }}
                        className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800
                        // ...existing code...

                    <div className="flex justify-between mt-6">
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!files.upper.file && !files.lower.file && !files.bite.file) {
                            toast.error("Please upload at least one scan file");
                            return;
                          }
                          setActiveStep(3);
                        }}
                        className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800"
                      >
                        Next: Review & Notes
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Submit */}
                {activeStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-4">Review & Submit</h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h4 className="font-medium">Case Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Case Number:</span> {formData.caseNumber || "Auto-generated"}
                        </div>
                        <div>
                          <span className="text-gray-600">Clinic:</span> {currentClinic?.name}
                        </div>
                        {patientExists && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Existing Patient:</span> Yes (ID: {patientExists.id})
                          </div>
                        )}
                      </div>

                      <h4 className="font-medium">Patient Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span> {formData.patientFirstName} {formData.patientLastName}
                        </div>
                        <div>
                          <span className="text-gray-600">Email:</span> {formData.patientEmail}
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span> {formData.phone || "Not provided"}
                        </div>
                        <div>
                          <span className="text-gray-600">DOB:</span> {formData.dateOfBirth}
                        </div>
                        <div>
                          <span className="text-gray-600">Sex:</span> {formData.sex.replace(/_/g, " ")}
                        </div>
                      </div>
                      
                      <h4 className="font-medium mt-4">Uploaded Files</h4>
                      <div className="space-y-1 text-sm">
                        {files.upper.file && <div>✓ Upper jaw scan: {files.upper.preview}</div>}
                        {files.lower.file && <div>✓ Lower jaw scan: {files.lower.preview}</div>}
                        {files.bite.file && <div>✓ Bite scan: {files.bite.preview}</div>}
                        {files.additional.length > 0 && (
                          <div>✓ {files.additional.length} additional file(s)</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Clinical Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full border rounded-lg px-4 py-2 h-32"
                        placeholder="Add any clinical notes, special instructions, or concerns..."
                      />
                    </div>

                    <div className="flex justify-between mt-6">
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {submitting ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </span>
                        ) : (
                          "Submit Case"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}