// apps/web/src/components/modals/AccountSettingsModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/shared/Modal';
import { useToast } from '@/hooks';
import { format } from 'date-fns';
import { legacyApi } from '@/lib/api-client';

// Define Clinic type locally since it might not be in @dental/shared yet
interface Clinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  dentistId: string;
}

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  clinics: Clinic[];
  onAddClinic: (clinic: Omit<Clinic, 'id'>) => Promise<any>;
  onDeleteClinic: (clinicId: string) => Promise<void>;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  clinics,
  onAddClinic,
  onDeleteClinic
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'clinics' | 'preferences'>('profile');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [newClinic, setNewClinic] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    caseUpdateAlerts: true,
    marketingEmails: false,
  });
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  // Initialize profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || user.name?.split(' ')[0] || '',
        lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Load preferences when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'preferences') {
      loadPreferences();
    }
  }, [isOpen, activeTab]);

  // Load user preferences
  const loadPreferences = async () => {
    setLoadingPreferences(true);
    try {
      const response = await fetch('/api/users/preferences', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoadingPreferences(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async () => {
    if (!profileData.firstName || !profileData.lastName) {
      showToast.error('First name and last name are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      showToast.success('Profile updated successfully');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      showToast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      showToast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      showToast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Add clinic
  const handleAddClinic = async () => {
    if (!newClinic.name) {
      showToast.error('Clinic name is required');
      return;
    }

    setLoading(true);
    try {
      await onAddClinic({
        name: newClinic.name,
        address: newClinic.address,
        phone: newClinic.phone,
        email: newClinic.email,
        dentistId: user.id,
      });
      showToast.success('Clinic added successfully');
      setNewClinic({ name: '', address: '', phone: '', email: '' });
      setShowAddClinic(false);
    } catch (error: any) {
      showToast.error(error.message || 'Failed to add clinic');
    } finally {
      setLoading(false);
    }
  };

  // Update preferences
  const handleUpdatePreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      const data = await response.json();
      
      if (data.warning) {
        showToast.warning(data.warning);
      } else {
        showToast.success('Preferences updated successfully');
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔐' },
    { id: 'clinics', label: 'Clinics', icon: '🏥' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Settings" size="xl">
      <div className="flex h-[600px]">
        {/* Sidebar */}
        <div className="w-64 border-r dark:border-gray-700 p-4">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* User Info */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Logged in as</p>
            <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">ID: {user?.userId}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Member since: {user?.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Profile Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email (cannot be changed)
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg opacity-60 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Change Password
                </h3>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Must be at least 8 characters
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      Change Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication (Future) */}
              <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Two-Factor Authentication
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Add an extra layer of security to your account
                </p>
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-500 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          )}

          {/* Clinics Tab */}
          {activeTab === 'clinics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Manage Clinics
                </h3>
                {!showAddClinic && (
                  <button
                    onClick={() => setShowAddClinic(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Clinic
                  </button>
                )}
              </div>

              {/* Add Clinic Form */}
              {showAddClinic && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add New Clinic</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Clinic Name *
                      </label>
                      <input
                        type="text"
                        value={newClinic.name}
                        onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                        placeholder="Main Clinic"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={newClinic.phone}
                        onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                        placeholder="(123) 456-7890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newClinic.email}
                        onChange={(e) => setNewClinic({ ...newClinic, email: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                        placeholder="clinic@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={newClinic.address}
                        onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                        className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                        placeholder="123 Main St"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => {
                        setShowAddClinic(false);
                        setNewClinic({ name: '', address: '', phone: '', email: '' });
                      }}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddClinic}
                      disabled={loading || !newClinic.name}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Clinic
                    </button>
                  </div>
                </div>
              )}

              {/* Clinics List */}
              <div className="space-y-3">
                {clinics.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No clinics added yet
                  </div>
                ) : (
                  clinics.map((clinic) => (
                    <div
                      key={clinic.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{clinic.name}</h4>
                          {clinic.address && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              📍 {clinic.address}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            {clinic.phone && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                📞 {clinic.phone}
                              </p>
                            )}
                            {clinic.email && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                ✉️ {clinic.email}
                              </p>
                            )}
                          </div>
                        </div>
                        {clinics.length > 1 && (
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this clinic?')) {
                                try {
                                  await onDeleteClinic(clinic.id);
                                  showToast.success('Clinic deleted successfully');
                                } catch (error) {
                                  showToast.error('Failed to delete clinic');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Notification Preferences
              </h3>

              {loadingPreferences ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive email updates about your cases and appointments
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">SMS Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get text messages for urgent updates
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.smsNotifications}
                        onChange={(e) => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Appointment Reminders</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Remind patients about upcoming appointments
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.appointmentReminders}
                        onChange={(e) => setPreferences({ ...preferences, appointmentReminders: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Case Update Alerts</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Notify when case status changes
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.caseUpdateAlerts}
                        onChange={(e) => setPreferences({ ...preferences, caseUpdateAlerts: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Marketing Emails</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive promotional offers and updates
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.marketingEmails}
                        onChange={(e) => setPreferences({ ...preferences, marketingEmails: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={handleUpdatePreferences}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      Save Preferences
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AccountSettingsModal;