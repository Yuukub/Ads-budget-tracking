import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { shareApi } from '../api/api';
import { BudgetFilterBasis, BudgetLog, BudgetPeriod } from '../types';
import { Button } from '../components/ui/Button';
import { BudgetPeriodFilter } from '../components/budget/BudgetPeriodFilter';
import { formatCurrency } from '../utils/helpers';
import { formatBudgetMonth, getBudgetFilterBasis, getBudgetMonthRange, getBudgetPeriodFromSearchParams, getBudgetPeriodLabel, getBudgetPeriodSearchParams, usesAnotherBudgetMonth } from '../utils/budgetPeriod';

interface ShareInfo {
  valid: boolean;
  pageType: string;
  ownerName: string;
  name?: string;
}

export function SharedBudgetPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = getBudgetPeriodFromSearchParams(searchParams);
  const basis = getBudgetFilterBasis(searchParams);
  const monthRange = useMemo(() => getBudgetMonthRange(period), [period]);

  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [budgetLogs, setBudgetLogs] = useState<BudgetLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [authenticatedPassword, setAuthenticatedPassword] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateAndLoad = useCallback(async (pwd?: string) => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);
      setPasswordError(null);

      // Check if already logged in this session (same key as SharedViewPage)
      const sessionKey = `share_logged_${token}`;
      const alreadyLogged = sessionStorage.getItem(sessionKey) === 'true';

      // Validate token (skipLog if already logged in this session)
      const validation = await shareApi.validate(token, pwd, alreadyLogged);
      setShareInfo(validation);
      setRequiresPassword(false);
      if (pwd) setAuthenticatedPassword(pwd);

      // Mark as logged in session storage
      if (!alreadyLogged) {
        sessionStorage.setItem(sessionKey, 'true');
      }

      // Check if this page is allowed
      if (!['budget', 'all'].includes(validation.pageType)) {
        setError('ลิงค์นี้ไม่อนุญาตให้ดูหน้านี้');
        setIsLoading(false);
        return;
      }

      // Load data
      const response = await shareApi.getData(token, 'budget', pwd, monthRange, basis);
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
  }, [token, monthRange, basis]);

  // Validate token and load data
  useEffect(() => {
    if (!token) {
      setError('ไม่พบลิงค์');
      setIsLoading(false);
      return;
    }

    void validateAndLoad(authenticatedPassword);
  }, [token, validateAndLoad, authenticatedPassword]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndLoad(password);
  };

  const handlePeriodChange = (nextPeriod: BudgetPeriod) => {
    setSearchParams(getBudgetPeriodSearchParams(nextPeriod, basis));
  };

  const handleBasisChange = (nextBasis: BudgetFilterBasis) => {
    setSearchParams(getBudgetPeriodSearchParams(period, nextBasis));
  };

  // Split logs by type
  const receivedLogs = budgetLogs.filter((log) => log.type === 'RECEIVED');
  const topupLogs = budgetLogs.filter((log) => log.type === 'TOPUP');

  // Calculate totals (like original BudgetLogPage)
  const totalReceived = receivedLogs.reduce((sum, log) => sum + log.amount, 0);
  const totalUsable = receivedLogs.reduce((sum, log) => sum + (log.usableAmount || 0), 0);
  const totalTopup = topupLogs.reduce((sum, log) => sum + log.amount, 0);
  const remainingUsable = totalUsable - totalTopup;

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
      <div className="bg-blue-500 text-white py-2 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span className="text-sm">
          👁️ กำลังดูในโหมดแชร์ (Read-Only) • ข้อมูลของ {shareInfo?.ownerName}
        </span>
        {shareInfo?.pageType === 'all' && (
          <Link to={`/s/${token}`}>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              ← 🏠 ดูหน้าหลัก
            </Button>
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
        <div className="mb-6 space-y-3">
          <p className="text-sm text-muted-foreground">กำลังแสดง: {getBudgetPeriodLabel(period)}</p>
          <BudgetPeriodFilter period={period} onChange={handlePeriodChange} basis={basis} onBasisChange={handleBasisChange} />
        </div>

        {/* Two Column Table Layout - like original */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Received Logs */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 border-b border-green-100 dark:border-green-800">
              <h2 className="font-semibold text-green-800 dark:text-green-200">📥 รายรับ (Received)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left font-medium">วันที่จริง</th>
                    <th className="p-3 text-left font-medium">ลูกค้า</th>
                    <th className="p-3 text-right font-medium">ยอดรับ</th>
                    <th className="p-3 text-right font-medium">ยอด Ads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receivedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="p-3">
                        <div>{formatDate(log.date)}</div>
                        {usesAnotherBudgetMonth(log.date, log.budgetMonth) && <div className="mt-1 whitespace-nowrap text-xs text-blue-600">ใช้เดือน {formatBudgetMonth(log.budgetMonth)}</div>}
                      </td>
                      <td className="p-3 font-medium">{log.clientName}</td>
                      <td className="p-3 text-right text-green-600">{formatCurrency(log.amount)}</td>
                      <td className="p-3 text-right text-blue-600">{formatCurrency(log.usableAmount || 0)}</td>
                    </tr>
                  ))}
                  {receivedLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Top-up Logs */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 border-b border-orange-100 dark:border-orange-800">
              <h2 className="font-semibold text-orange-800 dark:text-orange-200">📤 รายจ่าย (Top-up)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left font-medium">วันที่จริง</th>
                    <th className="p-3 text-left font-medium">ลูกค้า</th>
                    <th className="p-3 text-left font-medium">Platform</th>
                    <th className="p-3 text-right font-medium">ยอดเติม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topupLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="p-3">
                        <div>{formatDate(log.date)}</div>
                        {usesAnotherBudgetMonth(log.date, log.budgetMonth) && <div className="mt-1 whitespace-nowrap text-xs text-blue-600">ใช้เดือน {formatBudgetMonth(log.budgetMonth)}</div>}
                      </td>
                      <td className="p-3 font-medium">{log.clientName}</td>
                      <td className="p-3 text-muted-foreground text-xs">{log.platform || '-'}</td>
                      <td className="p-3 text-right text-orange-600">{formatCurrency(log.amount)}</td>
                    </tr>
                  ))}
                  {topupLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary Cards - 4 cards like original */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground">ยอดรับ{period.mode === 'all' ? 'ทั้งหมด' : `ตาม${basis === 'budget' ? 'เดือนงบ' : 'วันที่จริง'}`}</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalReceived)}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground">งบ Ads ที่ใช้ได้ (Usable)</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalUsable)}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground">เบิกเติมแล้ว (Top-up)</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalTopup)}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-sm text-muted-foreground">คงเหลือเบิก (Remaining)</div>
            <div className={`text-2xl font-bold ${remainingUsable < 0 ? 'text-red-500' : 'text-foreground'}`}>
              {formatCurrency(remainingUsable)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
