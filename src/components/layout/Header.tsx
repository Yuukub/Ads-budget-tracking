import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useSettings } from '../../hooks/useSettings';
import { LogOut, Menu, X, Share2 } from 'lucide-react';
import { useState } from 'react';
import { ShareLinkModal } from '../share/ShareLinkModal';

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { settings, getLogoUrl } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
              <h1 className="text-xl font-bold text-foreground truncate max-w-[200px] sm:max-w-none">
                {settings?.appName || 'Ad Budget Tracker'}
              </h1>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav aria-label="เมนูหลัก" className="hidden md:flex items-center gap-4">
                <Link
                  to="/"
                  aria-current={location.pathname === '/' ? 'page' : undefined}
                  className={`text-sm font-medium transition-all duration-200 ${location.pathname === '/' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'
                    }`}
                >
                  หน้าหลัก
                </Link>
                <Link
                  to="/budget"
                  aria-current={location.pathname === '/budget' ? 'page' : undefined}
                  className={`text-sm font-medium transition-all duration-200 ${location.pathname === '/budget' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'
                    }`}
                >
                  บัญชี
                </Link>
                <Link
                  to="/history"
                  aria-current={location.pathname === '/history' ? 'page' : undefined}
                  className={`text-sm font-medium transition-all duration-200 ${location.pathname === '/history' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'
                    }`}
                >
                  ประวัติ
                </Link>
                <Link
                  to="/notes"
                  aria-current={location.pathname === '/notes' ? 'page' : undefined}
                  className={`text-sm font-medium transition-all duration-200 ${location.pathname === '/notes' ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-primary'
                    }`}
                >
                  Note
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    aria-current={location.pathname === '/admin' ? 'page' : undefined}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShareModalOpen(true)}
                className="gap-2"
              >
                <Share2 size={16} />
                <span>แชร์</span>
              </Button>
              <span className="text-muted-foreground text-sm font-medium">สวัสดี, {user.name}</span>
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
              aria-label={isMenuOpen ? 'ปิดเมนูหลัก' : 'เปิดเมนูหลัก'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-main-menu"
              className="md:hidden p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {user && isMenuOpen && (
        <div id="mobile-main-menu" className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg absolute w-full left-0 animate-slide-up shadow-lg">
          <div className="px-4 py-4 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="text-foreground font-medium">เมนู</span>
              <span className="text-sm text-muted-foreground">สวัสดี, {user.name}</span>
            </div>

            <nav aria-label="เมนูหลักบนมือถือ" className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                aria-current={location.pathname === '/' ? 'page' : undefined}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary'
                  }`}
              >
                🏠 หน้าหลัก
              </Link>
              <Link
                to="/budget"
                onClick={() => setIsMenuOpen(false)}
                aria-current={location.pathname === '/budget' ? 'page' : undefined}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/budget'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary'
                  }`}
              >
                📑 บัญชี
              </Link>
              <Link
                to="/history"
                onClick={() => setIsMenuOpen(false)}
                aria-current={location.pathname === '/history' ? 'page' : undefined}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/history'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary'
                  }`}
              >
                📋 ประวัติ
              </Link>
              <Link
                to="/notes"
                onClick={() => setIsMenuOpen(false)}
                aria-current={location.pathname === '/notes' ? 'page' : undefined}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/notes'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary'
                  }`}
              >
                📝 Note
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={location.pathname === '/admin' ? 'page' : undefined}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/admin'
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
                    : 'text-muted-foreground hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300'
                    }`}
                >
                  ⚙️ Admin
                </Link>
              )}
            </nav>

            <div className="pt-2 border-t border-border space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setIsShareModalOpen(true); setIsMenuOpen(false); }}
                className="w-full justify-center gap-2"
              >
                <Share2 size={16} />
                <span>แชร์</span>
              </Button>
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

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </header>
  );
}
