import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { shareApi } from '../api/api';
import { Client } from '../types';
import { ClientCard } from '../components/clients/ClientCard';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/helpers';

interface ShareInfo {
  valid: boolean;
  pageType: string;
  ownerName: string;
  name?: string;
}

export function SharedViewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Validate token and load data
  useEffect(() => {
    if (!token) {
      setError('ไม่พบลิงค์');
      setIsLoading(false);
      return;
    }

    validateAndLoad();
  }, [token]);

  const validateAndLoad = async (pwd?: string) => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);
      setPasswordError(null);

      // Validate token
      const validation = await shareApi.validate(token, pwd);
      setShareInfo(validation);
      setRequiresPassword(false);

      // Check if this page is allowed
      if (!['home', 'all'].includes(validation.pageType)) {
        setError('ลิงค์นี้ไม่อนุญาตให้ดูหน้านี้');
        setIsLoading(false);
        return;
      }

      // Load data
      const response = await shareApi.getData(token, 'home', pwd);
      setClients(response.data as Client[]);
    } catch (err: unknown) {
      const error = err as { response?: { status: number; data?: { requiresPassword?: boolean; error?: string } } };
      if (error.response?.status === 401 && error.response?.data?.requiresPassword) {
        setRequiresPassword(true);
        if (pwd) {
          setPasswordError('รหัสผ่านไม่ถูกต้อง');
        }
      } else {
        setError(error.response?.data?.error || 'เกิดข้อผิดพลาด');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndLoad(password);
  };

  // Calculate dashboard stats
  const stats = {
    clientCount: clients.length,
    campaignCount: clients.reduce((sum, c) => sum + c.campaigns.length, 0),
    totalBudget: clients.reduce((sum, c) => sum + c.effectiveBudget, 0),
    expiringSoon: clients.reduce((sum, c) => {
      return sum + c.campaigns.filter((camp) => {
        const daysRemaining = Math.ceil((new Date(camp.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysRemaining <= 3 && daysRemaining >= 0;
      }).length;
    }, 0),
  };

  // Password form
  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm">
          <h1 className="text-xl font-bold text-center mb-4">ใส่รหัสผ่าน</h1>
          <p className="text-sm text-muted-foreground text-center mb-4">
            ลิงค์นี้ต้องใส่รหัสผ่านเพื่อดู
          </p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground mb-3"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-red-500 mb-3">{passwordError}</p>
            )}
            <Button type="submit" className="w-full">
              ยืนยัน
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-bold mb-2">ไม่สามารถเข้าถึงได้</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate('/')} variant="outline">
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Shared View Banner */}
      <div className="bg-blue-500 text-white py-2 px-4 text-center text-sm">
        👁️ กำลังดูในโหมดแชร์ (Read-Only) • ข้อมูลของ {shareInfo?.ownerName}
        {shareInfo?.pageType === 'all' && (
          <Link to={`/s/${token}/budget`} className="ml-4 underline hover:no-underline">
            ดูหน้าบัญชี →
          </Link>
        )}
      </div>

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">
            {shareInfo?.name || `ข้อมูลของ ${shareInfo?.ownerName}`}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">ลูกค้า</div>
            <div className="text-2xl font-bold text-foreground">{stats.clientCount}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">แคมเปญ</div>
            <div className="text-2xl font-bold text-foreground">{stats.campaignCount}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">งบรวม</div>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalBudget)}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">ใกล้หมด</div>
            <div className={`text-2xl font-bold ${stats.expiringSoon > 0 ? 'text-orange-500' : 'text-foreground'}`}>
              {stats.expiringSoon}
            </div>
          </div>
        </div>

        {/* Clients */}
        {clients.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground">ไม่มีข้อมูลลูกค้า</p>
          </div>
        ) : (
          <div className="space-y-6">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={() => {}}
                onDelete={() => {}}
                onAddCampaign={() => {}}
                onUpdateSpent={() => {}}
                onEditCampaign={() => {}}
                onDeleteCampaign={() => {}}
                // No action handlers - read only mode
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
