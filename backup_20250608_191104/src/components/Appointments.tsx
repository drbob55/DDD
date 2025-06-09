"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ROLES } from "@/lib/constants";

type Appointment = {
  id: string;
  date: string;
  notes?: string;
  user?: {
    name: string;
    email: string;
  };
};

interface AppointmentsProps {
  caseId: string;
  userId: string;
  userRole: string;
}

export default function Appointments({ caseId, userId, userRole }: AppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    date: "",
    time: "",
    notes: "",
  });

  useEffect(() => {
    fetchAppointments();
  }, [caseId]);

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`/api/appointments?caseId=${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAppointment.date || !newAppointment.time) {
      toast.error("Please select date and time");
      return;
    }

    const appointmentDateTime = new Date(`${newAppointment.date}T${newAppointment.time}`);
    
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          date: appointmentDateTime.toISOString(),
          notes: newAppointment.notes,
        }),
      });

      if (res.ok) {
        toast.success("Appointment scheduled successfully");
        setShowAddForm(false);
        setNewAppointment({ date: "", time: "", notes: "" });
        fetchAppointments();
      } else {
        toast.error("Failed to schedule appointment");
      }
    } catch (err) {
      console.error("Error scheduling appointment:", err);
      toast.error("Error scheduling appointment");
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Appointment cancelled");
        fetchAppointments();
      } else {
        toast.error("Failed to cancel appointment");
      }
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      toast.error("Error cancelling appointment");
    }
  };

  const canManageAppointments = userRole === ROLES.DENTIST || userRole === ROLES.ADMIN;

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Appointments</h3>
        <div className="text-center py-4 text-gray-500">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Appointments</h3>
        {canManageAppointments && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {showAddForm ? "Cancel" : "+ Schedule Appointment"}
          </button>
        )}
      </div>

      {/* Add Appointment Form */}
      {showAddForm && canManageAppointments && (
        <form onSubmit={handleAddAppointment} className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                required
                value={newAppointment.date}
                onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                required
                value={newAppointment.time}
                onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={newAppointment.notes}
              onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Initial consultation, Follow-up..."
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Schedule
          </button>
        </form>
      )}

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No appointments scheduled</p>
      ) : (
        <div className="space-y-2">
          {appointments.map((appointment) => {
            const appointmentDate = new Date(appointment.date);
            const isPast = appointmentDate < new Date();
            
            return (
              <div
                key={appointment.id}
                className={`p-3 rounded-lg border ${
                  isPast ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {appointmentDate.toLocaleDateString()} at {appointmentDate.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    {appointment.notes && (
                      <p className="text-sm text-gray-600 mt-1">{appointment.notes}</p>
                    )}
                    {isPast && (
                      <span className="text-xs text-gray-500 mt-1 inline-block">Past appointment</span>
                    )}
                  </div>
                  {canManageAppointments && !isPast && (
                    <button
                      onClick={() => handleDeleteAppointment(appointment.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}