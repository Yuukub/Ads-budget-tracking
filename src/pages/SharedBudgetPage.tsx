import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { shareApi } from '../api/api';
import { BudgetLog } from '../types';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/helpers';

interface ShareInfo {
  valid: boolean;
  pageType: string;
  ownerName: string;
  name?: string;
}

export function SharedBudgetPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [budgetLogs, setBudgetLogs] = useState<BudgetLog[]>([]);
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
      if (!['budget', 'all'].includes(validation.pageType)) {
        setError('ลิงค์นี้ไม่อนุญาตให้ดูหน้านี้');
        setIsLoading(false);
        return;
      }

      // Load data
      const response = await shareApi.getData(token, 'budget', pwd);
      setBudgetLogs(response.data as BudgetLog[]);
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

  // Split logs by type
  const receivedLogs = budgetLogs.filter((log) => log.type === 'RECEIVED');
  const topupLogs = budgetLogs.filter((log) => log.type === 'TOPUP');

  // Calculate totals
  const totalReceived = receivedLogs.reduce((sum, log) => sum + log.amount, 0);
  const totalTopup = topupLogs.reduce((sum, log) => sum + log.amount, 0);

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
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
          <Link to={`/s/${token}`} className="ml-4 underline hover:no-underline">
            ← ดูหน้าหลัก
          </Link>
        )}
      </div>

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">
            📒 บัญชี - {shareInfo?.name || shareInfo?.ownerName}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="text-sm text-green-600 dark:text-green-400">รวมรับงบ</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(totalReceived)}
            </div>
            <div className="text-xs text-green-500">{receivedLogs.length} รายการ</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="text-sm text-blue-600 dark:text-blue-400">รวมเติมงบ</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(totalTopup)}
            </div>
            <div className="text-xs text-blue-500">{topupLogs.length} รายการ</div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Received Logs */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-green-500 text-white px-4 py-3 font-semibold">
              💵 รับงบจากลูกค้า
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {receivedLogs.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">ไม่มีข้อมูล</div>
              ) : (
                receivedLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-foreground">{log.clientName}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(log.date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{formatCurrency(log.amount)}</div>
                        {log.usableAmount && (
                          <div className="text-xs text-muted-foreground">
                            ใช้ได้: {formatCurrency(log.usableAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                    {log.note && (
                      <div className="text-xs text-muted-foreground mt-1">{log.note}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Topup Logs */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-blue-500 text-white px-4 py-3 font-semibold">
              💰 เติมงบลูกค้า
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {topupLogs.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">ไม่มีข้อมูล</div>
              ) : (
                topupLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-muted/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-foreground">{log.clientName}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(log.date)}</div>
                        {log.platform && (
                          <div className="text-xs text-muted-foreground">{log.platform}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-blue-600">{formatCurrency(log.amount)}</div>
                      </div>
                    </div>
                    {log.note && (
                      <div className="text-xs text-muted-foreground mt-1">{log.note}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
