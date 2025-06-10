"use client";
import { useState, useEffect } from "react";
import { Save, AlertCircle, Check } from "lucide-react";
import { toast } from "react-hot-toast";

interface SystemConfig {
  adminPin: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  autoArchiveDays: number;
  reminderDays: number;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  version: string;
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    adminPin: "",
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    autoArchiveDays: 90,
    reminderDays: 2,
    maintenanceMode: false,
    registrationOpen: true,
    version: "1.0.0"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      const response = await fetch("/api/system/config");
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Failed to fetch system config:", error);
      toast.error("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/system/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast.success("System settings updated successfully");
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Failed to save system config:", error);
      toast.error("Failed to save system settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Configure system-wide parameters</p>
      </div>

      <div className="space-y-6">
        {/* Security Settings */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin PIN
              </label>
              <input
                type="password"
                value={config.adminPin}
                onChange={(e) => setConfig({ ...config, adminPin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin PIN"
              />
              <p className="text-xs text-gray-500 mt-1">Required for admin operations</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={config.sessionTimeout}
                onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="5"
                max="1440"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={config.maxLoginAttempts}
                onChange={(e) => setConfig({ ...config, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="10"
              />
              <p className="text-xs text-gray-500 mt-1">Lock account after failed attempts</p>
            </div>
          </div>
        </div>

        {/* Business Rules */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Rules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Archive Days
              </label>
              <input
                type="number"
                value={config.autoArchiveDays}
                onChange={(e) => setConfig({ ...config, autoArchiveDays: parseInt(e.target.value) || 90 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="30"
                max="365"
              />
              <p className="text-xs text-gray-500 mt-1">Archive completed cases after X days</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Reminder Days
              </label>
              <input
                type="number"
                value={config.reminderDays}
                onChange={(e) => setConfig({ ...config, reminderDays: parseInt(e.target.value) || 2 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="7"
              />
              <p className="text-xs text-gray-500 mt-1">Send reminders X days before appointment</p>
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Flags</h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
                <p className="text-xs text-gray-500">Show maintenance page to non-admin users</p>
              </div>
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Registration Open</span>
                <p className="text-xs text-gray-500">Allow new user registrations</p>
              </div>
              <input
                type="checkbox"
                checked={config.registrationOpen}
                onChange={(e) => setConfig({ ...config, registrationOpen: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Version</span>
              <span className="text-sm font-medium text-gray-900">{config.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Environment</span>
              <span className="text-sm font-medium text-gray-900">
                {process.env.NODE_ENV === "production" ? "Production" : "Development"}
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
