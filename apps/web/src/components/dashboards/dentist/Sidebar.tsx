import React from 'react';
import { Clinic } from '@dental/shared';

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    userId?: string;
  };
  currentView: 'cases' | 'appointments' | 'archive';
  onViewChange: (view: 'cases' | 'appointments' | 'archive') => void;
  onNewCase: () => void;
  clinics: Clinic[];
  selectedClinic: string;
  onClinicChange: (clinicId: string) => void;
  onAccountClick: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentView,
  onViewChange,
  onNewCase,
  clinics,
  selectedClinic,
  onClinicChange,
  onAccountClick,
  onSignOut
}) => {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
      {/* User Info */}
      <div className="p-6 border-b dark:border-gray-700">
        <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
          {user.name || 'Dentist'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {user.email}
        </p>
        {user.userId && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            ID: {user.userId}
          </p>
        )}
      </div>

      {/* Clinic Selector */}
      <div className="p-4 border-b dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Current Clinic
        </label>
        {clinics.length === 0 ? (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">No clinics available</p>
            <button
              onClick={onAccountClick}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Add a clinic
            </button>
          </div>
        ) : (
          <>
            <select
              value={selectedClinic}
              onChange={(e) => onClinicChange(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>
            {clinics.find(c => c.id === selectedClinic)?.phone && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                📞 {clinics.find(c => c.id === selectedClinic)?.phone}
              </p>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          <button
            onClick={onNewCase}
            className="w-full bg-blue-700 text-white font-medium px-4 py-3 rounded-lg hover:bg-blue-800 flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Case
          </button>
          
          <NavButton
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            label="Active Cases"
            isActive={currentView === 'cases'}
            onClick={() => onViewChange('cases')}
          />

          <NavButton
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            label="Appointments"
            isActive={currentView === 'appointments'}
            onClick={() => onViewChange('appointments')}
            className="bg-purple-600 hover:bg-purple-700"
          />

          <NavButton
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            }
            label="Archived Cases"
            isActive={currentView === 'archive'}
            onClick={() => onViewChange('archive')}
            className="bg-gray-700 hover:bg-gray-800"
          />
        </nav>
      </div>

      {/* Account Section */}
      <div className="p-4 border-t dark:border-gray-700">
        <button
          onClick={onAccountClick}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium">Account</span>
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

// Navigation Button Component
interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ 
  icon, 
  label, 
  isActive, 
  onClick, 
  className = 'bg-blue-600 hover:bg-blue-700' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full font-medium px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
        isActive 
          ? `${className.split(' ')[0]} text-white` 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );
};