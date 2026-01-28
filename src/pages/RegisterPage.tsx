import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TurnstileWidget } from '../components/auth/TurnstileWidget';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { settings, getLogoUrl } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    // Check if Turnstile is required but not completed
    if (settings?.turnstileEnabled && !turnstileToken) {
      setError('กรุณายืนยันว่าคุณไม่ใช่บอท');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name, turnstileToken || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'สมัครสมาชิกไม่สำเร็จ');
      setTurnstileToken(null); // Reset turnstile on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full animate-scale-in">
        <div className="glass-dark rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            {settings?.appLogo ? (
              <img
                src={getLogoUrl(settings.appLogo)}
                alt="Logo"
                className="w-16 h-16 object-contain mx-auto"
              />
            ) : (
              <span className="text-4xl">📊</span>
            )}
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              {settings?.appName || 'สมัครสมาชิก'}
            </h1>
            <p className="mt-2 text-gray-600">สร้างบัญชีเพื่อเริ่มใช้งาน</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Input
              label="ชื่อ"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อของคุณ"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />

            <Input
              label="รหัสผ่าน"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Input
              label="ยืนยันรหัสผ่าน"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {/* Cloudflare Turnstile */}
            {settings?.turnstileEnabled && settings.turnstileSiteKey && (
              <div className="py-2">
                <TurnstileWidget
                  siteKey={settings.turnstileSiteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setError('Turnstile verification failed')}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
