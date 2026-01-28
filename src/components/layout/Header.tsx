import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useSettings } from '../../hooks/useSettings';
import { LogOut } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { settings, getLogoUrl } = useSettings();

  return (
    <header className="glass-dark sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              {settings?.appLogo ? (
                <img
                  src={getLogoUrl(settings.appLogo)}
                  alt="Logo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <span className="text-2xl">📊</span>
              )}
              <h1 className="text-xl font-bold text-gray-900">
                {settings?.appName || 'Ad Budget Tracker'}
              </h1>
            </Link>

            {user && (
              <nav className="flex items-center gap-4">
                <Link
                  to="/"
                  className={`text-sm font-medium transition-all duration-200 ${location.pathname === '/' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'
                    }`}
                >
                  หน้าหลัก
                </Link>
                <Link
                  to="/history"
                  className={`text-sm font-medium transition-all duration-200 ${location.pathname === '/history' ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'
                    }`}
                >
                  ประวัติ
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`text-sm font-medium transition-all duration-200 ${location.pathname === '/admin' ? 'text-purple-600 font-semibold' : 'text-purple-500 hover:text-purple-700'
                      }`}
                  >
                    Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className="text-gray-600 hidden sm:inline text-sm font-medium">สวัสดี, {user.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2 font-medium"
              >
                <LogOut size={16} />
                <span>ออกจากระบบ</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
