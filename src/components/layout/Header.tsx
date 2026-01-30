import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useSettings } from '../../hooks/useSettings';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { settings, getLogoUrl } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

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
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
                {settings?.appName || 'Ad Budget Tracker'}
              </h1>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-4">
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

          {/* Desktop User Menu */}
          {user && (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-gray-600 text-sm font-medium">สวัสดี, {user.name}</span>
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

          {/* Mobile Menu Button */}
          {user && (
            <button
              onClick={toggleMenu}
              className="md:hidden p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {user && isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg absolute w-full left-0 animate-slide-up shadow-lg">
          <div className="px-4 py-4 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <span className="text-gray-900 font-medium">เมนู</span>
              <span className="text-sm text-gray-500">สวัสดี, {user.name}</span>
            </div>

            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/'
                    ? 'bg-blue-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                  }`}
              >
                🏠 หน้าหลัก
              </Link>
              <Link
                to="/history"
                onClick={() => setIsMenuOpen(false)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/history'
                    ? 'bg-blue-50 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                  }`}
              >
                📋 ประวัติ
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/admin'
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                >
                  ⚙️ Admin
                </Link>
              )}
            </nav>

            <div className="pt-2 border-t border-gray-100">
              <Button
                variant="danger"
                size="sm"
                onClick={logout}
                className="w-full justify-center gap-2"
              >
                <LogOut size={16} />
                <span>ออกจากระบบ</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
