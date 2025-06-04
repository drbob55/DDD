"use client";
import React, { useState, useEffect } from "react";

export default function CaseSubmissionPage() {
  const [form, setForm] = useState({
    patientFirstName: "",
    patientLastName: "",
    patientEmail: "",
    phone: "",
    sex: "",
    notes: "",
    dateOfBirth: "",
    upper: null as File | null,
    lower: null as File | null,
    bite: null as File | null,
  });
  
  // Separate state for date components
  const [dateComponents, setDateComponents] = useState({
    day: "",
    month: "",
    year: ""
  });
  
  const [emailStatus, setEmailStatus] = useState<null | "exists" | "not-exists" | "checking">(null);
  const [patientId, setPatientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  
  // Date roll-down helpers
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 110 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  // Generate temporary patient ID for new patients
  const generateTempPatientId = () => {
    return "NEW-" + Math.floor(10000000 + Math.random() * 90000000).toString();
  };
  
  // --- Real-time email checking ---
  const checkEmail = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus(null);
      setPatientId("");
      return;
    }
    
    setEmailStatus("checking");
    try {
      const res = await fetch(`/api/users/exists?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        setEmailStatus("not-exists");
        // Generate temporary ID for new patient
        setPatientId(generateTempPatientId());
        return;
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        setEmailStatus("not-exists");
        setPatientId(generateTempPatientId());
        return;
      }
      
      const data = await res.json();
      if (data.exists && data.id) {
        setEmailStatus("exists");
        setPatientId(data.id);
        // Auto-fill existing patient data if available
        if (data.firstName) setForm(f => ({ ...f, patientFirstName: data.firstName }));
        if (data.lastName) setForm(f => ({ ...f, patientLastName: data.lastName }));
        if (data.phone) setForm(f => ({ ...f, phone: data.phone }));
        if (data.sex) setForm(f => ({ ...f, sex: data.sex }));
        if (data.dateOfBirth) {
          const dob = new Date(data.dateOfBirth);
          setDateComponents({
            day: dob.getDate().toString().padStart(2, "0"),
            month: (dob.getMonth() + 1).toString().padStart(2, "0"),
            year: dob.getFullYear().toString()
          });
        }
      } else {
        setEmailStatus("not-exists");
        setPatientId(generateTempPatientId());
      }
    } catch (err) {
      console.error("Email check error:", err);
      setEmailStatus("not-exists");
      setPatientId(generateTempPatientId());
    }
  };
  
  // --- Input handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "file") {
      const fileInput = e.target as HTMLInputElement;
      const file = fileInput.files?.[0] || null;
      setForm(f => ({ ...f, [name]: file }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
      if (name === "patientEmail") {
        checkEmail(value);
      }
    }
  };
  
  // --- Date of Birth handlers ---
  const handleDateChange = (field: 'day' | 'month' | 'year', value: string) => {
    const newDateComponents = { ...dateComponents, [field]: value };
    setDateComponents(newDateComponents);
    
    // Update form dateOfBirth if all components are selected
    if (newDateComponents.day && newDateComponents.month && newDateComponents.year) {
      const dateOfBirth = `${newDateComponents.year}-${newDateComponents.month.padStart(2, "0")}-${newDateComponents.day.padStart(2, "0")}`;
      setForm(f => ({ ...f, dateOfBirth }));
    } else {
      setForm(f => ({ ...f, dateOfBirth: "" }));
    }
  };
  
  // --- Submit Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);
    
    // Construct dateOfBirth for validation
    const dateOfBirth = dateComponents.day && dateComponents.month && dateComponents.year
      ? `${dateComponents.year}-${dateComponents.month.padStart(2, "0")}-${dateComponents.day.padStart(2, "0")}`
      : "";
    
    // Basic validation
    if (!form.patientFirstName || !form.patientLastName || !form.patientEmail || !form.sex || !dateOfBirth) {
      setMsg("Please fill in all required patient fields.");
      setSubmitting(false);
      return;
    }
    
    if (!form.upper && !form.lower && !form.bite) {
      setMsg("At least one scan file is required.");
      setSubmitting(false);
      return;
    }
    
    const data = new FormData();
    data.append("patientFirstName", form.patientFirstName);
    data.append("patientLastName", form.patientLastName);
    data.append("patientEmail", form.patientEmail);
    data.append("phone", form.phone || "");
    data.append("sex", form.sex);
    data.append("dateOfBirth", dateOfBirth);
    data.append("notes", form.notes || "");
    if (form.upper) data.append("upper", form.upper);
    if (form.lower) data.append("lower", form.lower);
    if (form.bite) data.append("bite", form.bite);
    
    try {
      const res = await fetch("/api/cases", { method: "POST", body: data });
      const contentType = res.headers.get("content-type");
      const out = contentType?.includes("application/json") ? await res.json() : {};
      
      if (res.ok) {
        setMsg("Case submitted successfully!");
        // Reset form
        setForm({
          patientFirstName: "",
          patientLastName: "",
          patientEmail: "",
          phone: "",
          sex: "",
          notes: "",
          dateOfBirth: "",
          upper: null,
          lower: null,
          bite: null,
        });
        setDateComponents({ day: "", month: "", year: "" });
        setEmailStatus(null);
        setPatientId("");
      } else {
        setMsg(out.error || "Error submitting case.");
      }
    } catch (err: any) {
      setMsg("Submission failed. Please try again.");
      console.error("Submit error:", err);
    }
    
    setSubmitting(false);
  };
  
  return (
    <form className="max-w-md mx-auto p-6 bg-white rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-4">Submit New Case</h2>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Patient Email *</label>
        <div className="flex items-center gap-2">
          <input
            type="email"
            name="patientEmail"
            value={form.patientEmail}
            onChange={handleChange}
            required
            placeholder="patient@example.com"
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {emailStatus === "checking" && <span className="text-blue-500">🔄</span>}
          {emailStatus === "exists" && <span className="text-green-600">✔️</span>}
          {emailStatus === "not-exists" && <span className="text-orange-500">✖️ New Patient</span>}
        </div>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Patient ID</label>
        <input
          type="text"
          value={patientId}
          readOnly
          placeholder="Will be generated"
          className="border px-3 py-2 rounded bg-gray-100 w-full cursor-not-allowed"
        />
        {patientId.startsWith("NEW-") && (
          <p className="text-xs text-gray-600 mt-1">Permanent ID will be assigned upon submission</p>
        )}
      </div>
      
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">First Name *</label>
          <input
            type="text"
            name="patientFirstName"
            placeholder="John"
            value={form.patientFirstName}
            onChange={handleChange}
            required
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Last Name *</label>
          <input
            type="text"
            name="patientLastName"
            placeholder="Doe"
            value={form.patientLastName}
            onChange={handleChange}
            required
            className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="(555) 123-4567"
          className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Sex *</label>
        <select
          name="sex"
          value={form.sex}
          onChange={handleChange}
          required
          className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to reply</option>
        </select>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Date of Birth *</label>
        <div className="flex gap-2">
          <select 
            value={dateComponents.day} 
            onChange={e => handleDateChange('day', e.target.value)} 
            required
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">DD</option>
            {days.map(d => (
              <option key={d} value={d.toString().padStart(2, "0")}>
                {d}
              </option>
            ))}
          </select>
          
          <select
            value={dateComponents.month} 
            onChange={e => handleDateChange('month', e.target.value)} 
            required
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">MM</option>
            {months.map(m => (
              <option key={m} value={m.toString().padStart(2, "0")}>
                {m}
              </option>
            ))}
          </select>
          
          <select
            value={dateComponents.year} 
            onChange={e => handleDateChange('year', e.target.value)} 
            required
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
          >
            <option value="">YYYY</option>
            {years.map(y => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Notes (optional)</label>
        <textarea 
          name="notes" 
          value={form.notes} 
          onChange={handleChange} 
          rows={3}
          placeholder="Any additional information..."
          className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Upper Scan</label>
          <input 
            name="upper" 
            type="file" 
            onChange={handleChange}
            accept=".stl,.obj,.zip,.ply"
            className={`border rounded px-3 py-2 w-full ${
              form.upper ? "border-green-600 bg-green-50" : "border-gray-300"
            } file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Lower Scan</label>
          <input
            name="lower" 
            type="file"
            onChange={handleChange}
            accept=".stl,.obj,.zip,.ply"
            className={`border rounded px-3 py-2 w-full ${
              form.lower ? "border-green-600 bg-green-50" : "border-gray-300"
            } file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`} 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Bite Scan</label>
          <input
            name="bite" 
            type="file"
            onChange={handleChange}
            accept=".stl,.obj,.zip,.ply"
            className={`border rounded px-3 py-2 w-full ${
              form.bite ? "border-green-600 bg-green-50" : "border-gray-300"
            } file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100`} 
          />
        </div>
        
        <p className="text-xs text-gray-600">At least one scan file is required. Accepted formats: .stl, .obj, .zip, .ply</p>
      </div>
      
      <button 
        type="submit" 
        disabled={submitting} 
        className="bg-blue-700 text-white font-bold py-2 px-4 rounded w-full hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Submitting..." : "Submit Case"}
      </button>
      
      {msg && (
        <div className={`mt-3 text-center p-2 rounded ${
          msg.includes("successfully") ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
        }`}>
          {msg}
        </div>
      )}
    </form>
  );
}