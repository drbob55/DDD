import React from 'react';
import { AppointmentStatus } from '@dental/shared';

interface AppointmentsProps {
  caseId?: string;
  userId?: string;
  userRole?: string;
  appointments?: Array<{
    id: string;
    date: Date;
    patientName: string;
    type: string;
    status: AppointmentStatus;
    duration?: number;
    clinicName?: string;
    reason?: string;
  }>;
}

export function Appointments({ 
  caseId, 
  userId, 
  userRole, 
  appointments = [] 
}: AppointmentsProps) {
  const [loading, setLoading] = React.useState(false);
  const [caseAppointments, setCaseAppointments] = React.useState(appointments);

  React.useEffect(() => {
    if (caseId) {
      fetchCaseAppointments();
    }
  }, [caseId]);

  const fetchCaseAppointments = async () => {
    if (!caseId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?caseId=${caseId}`);
      if (res.ok) {
        const data = await res.json();
        setCaseAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.CONFIRMED:
        return 'bg-green-100 text-green-800';
      case AppointmentStatus.SCHEDULED:
        return 'bg-blue-100 text-blue-800';
      case AppointmentStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800';
      case AppointmentStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case AppointmentStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case AppointmentStatus.NO_SHOW:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="font-semibold mb-3">Appointments</h3>
        <p className="text-gray-500">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-3">Appointments</h3>
      {caseAppointments.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-500 text-center">No appointments scheduled for this case</p>
        </div>
      ) : (
        <div className="space-y-3">
          {caseAppointments.map((appointment) => (
            <div key={appointment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{appointment.type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">Date:</span>{' '}
                      {new Date(appointment.date).toLocaleDateString()} at{' '}
                      {new Date(appointment.date).toLocaleTimeString()}
                    </p>
                    {appointment.duration && (
                      <p>
                        <span className="font-medium">Duration:</span> {appointment.duration} minutes
                      </p>
                    )}
                    {appointment.clinicName && (
                      <p>
                        <span className="font-medium">Location:</span> {appointment.clinicName}
                      </p>
                    )}
                    {appointment.reason && (
                      <p>
                        <span className="font-medium">Reason:</span> {appointment.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {userRole === 'PATIENT' && (
        <div className="mt-4">
          <button 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            onClick={() => {
              alert('Appointment scheduling will be available soon!');
            }}
          >
            + Schedule New Appointment
          </button>
        </div>
      )}
    </div>
  );
}

export default Appointments;
