import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminApi, settingsApi } from '../api/api';
import { AdminDashboard, AdminUser, SettingsAdmin } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { uploadApi } from '../api/api';
import { formatCurrency } from '../utils/helpers';

type TabType = 'dashboard' | 'users' | 'settings' | 'security';

export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<SettingsAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'dashboard':
          const dashboardData = await adminApi.getDashboard();
          setDashboard(dashboardData);
          break;
        case 'users':
          const usersData = await adminApi.getUsers();
          setUsers(usersData);
          break;
        case 'settings':
        case 'security':
          const settingsData = await settingsApi.getAdmin();
          setSettings(settingsData);
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: number, newRole: 'user' | 'admin') => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleUpdateUserStatus = async (userId: number, newStatus: 'active' | 'suspended') => {
    try {
      await adminApi.updateUserStatus(userId, newStatus);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This will delete all their data.`)) {
      return;
    }
    try {
      await adminApi.deleteUser(userId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      await settingsApi.update(settings);
      alert('Settings saved successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    try {
      setSaving(true);
      const { url } = await uploadApi.uploadLogo(file);
      setSettings({ ...settings, appLogo: url });
    } catch (err: any) {
      alert(err.response?.data?.error || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'settings', label: 'App Settings' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <Button variant="ghost" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="py-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : (
            <>
              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Users Card */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Users</div>
                    <div className="text-3xl font-bold text-gray-900">{dashboard.users.total}</div>
                    <div className="mt-2 text-sm">
                      <span className="text-green-600">{dashboard.users.active} active</span>
                      {dashboard.users.suspended > 0 && (
                        <span className="text-red-600 ml-2">{dashboard.users.suspended} suspended</span>
                      )}
                    </div>
                  </div>

                  {/* Clients Card */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Clients</div>
                    <div className="text-3xl font-bold text-gray-900">{dashboard.clients.total}</div>
                  </div>

                  {/* Campaigns Card */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Active Campaigns</div>
                    <div className="text-3xl font-bold text-gray-900">{dashboard.campaigns.active}</div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">{dashboard.campaigns.archived} archived</span>
                      {dashboard.campaigns.expiringSoon > 0 && (
                        <span className="text-yellow-600 ml-2">{dashboard.campaigns.expiringSoon} expiring soon</span>
                      )}
                    </div>
                  </div>

                  {/* Budget Card */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm text-gray-500 mb-1">Total Budget</div>
                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(dashboard.budget.totalBudget)}</div>
                    <div className="mt-2 text-sm text-gray-600">
                      Spent: {formatCurrency(dashboard.budget.totalSpent)}
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.clientCount} clients, {u.campaignCount} campaigns
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            {u.id !== user?.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                >
                                  {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateUserStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                                >
                                  {u.status === 'active' ? 'Suspend' : 'Activate'}
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                            {u.id === user?.id && (
                              <span className="text-gray-400 text-xs">(You)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* App Settings Tab */}
              {activeTab === 'settings' && settings && (
                <form onSubmit={handleSaveSettings} className="bg-white rounded-lg shadow p-6 max-w-2xl">
                  <h2 className="text-lg font-semibold mb-4">App Settings</h2>
                  <div className="space-y-4">
                    <Input
                      label="App Name"
                      value={settings.appName}
                      onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                    />
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">App Logo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                          {settings.appLogo ? (
                            <img
                              src={settings.appLogo.startsWith('http') ? settings.appLogo : `http://localhost:3001${settings.appLogo}`}
                              alt="Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-2xl text-gray-300 text-center flex flex-col items-center">
                              <span className="text-xs">No Logo</span>
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => document.getElementById('logo-upload')?.click()}
                              disabled={saving}
                            >
                              Choose File
                            </Button>
                            {settings.appLogo && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setSettings({ ...settings, appLogo: null })}
                                className="text-red-500"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Recommended: Square SVG or PNG (512x512)
                          </p>
                        </div>
                      </div>
                    </div>
                    <Input
                      label="Logo URL (or use upload above)"
                      value={settings.appLogo || ''}
                      onChange={(e) => setSettings({ ...settings, appLogo: e.target.value || null })}
                      placeholder="https://example.com/logo.png"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={settings.primaryColor}
                          onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <Input
                      label="Footer Text"
                      value={settings.footerText}
                      onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                      placeholder="Optional footer text"
                    />
                  </div>
                  <div className="mt-6">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && settings && (
                <form onSubmit={handleSaveSettings} className="bg-white rounded-lg shadow p-6 max-w-2xl">
                  <h2 className="text-lg font-semibold mb-4">Security Settings</h2>

                  {/* Cloudflare Turnstile */}
                  <div className="border rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">Cloudflare Turnstile</h3>
                        <p className="text-sm text-gray-500">Protect login/register forms from bots</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.turnstileEnabled}
                          onChange={(e) => setSettings({ ...settings, turnstileEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {settings.turnstileEnabled && (
                      <div className="space-y-4 pt-4 border-t">
                        <Input
                          label="Site Key"
                          value={settings.turnstileSiteKey || ''}
                          onChange={(e) => setSettings({ ...settings, turnstileSiteKey: e.target.value || null })}
                          placeholder="0x4AAAAAAA..."
                        />
                        <Input
                          label="Secret Key"
                          type="password"
                          value={settings.turnstileSecretKey || ''}
                          onChange={(e) => setSettings({ ...settings, turnstileSecretKey: e.target.value || null })}
                          placeholder="0x4AAAAAAA..."
                        />
                        <p className="text-sm text-gray-500">
                          Get your keys from{' '}
                          <a
                            href="https://dash.cloudflare.com/turnstile"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Cloudflare Dashboard
                          </a>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
