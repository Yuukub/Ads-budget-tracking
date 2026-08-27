import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ExportButton, ExportColumn } from '../components/ui/ExportButton';
import { BudgetPeriodFilter } from '../components/budget/BudgetPeriodFilter';
import { budgetApi } from '../api/api';
import { BudgetFilterBasis, BudgetLog, BudgetLogFormData, BudgetPeriod } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { budgetMonthKey, formatBudgetMonth, getBudgetFilterBasis, getBudgetMonthRange, getBudgetPeriodFromSearchParams, getBudgetPeriodLabel, getBudgetPeriodSearchParams, usesAnotherBudgetMonth } from '../utils/budgetPeriod';

function emptyBudgetLogForm(): BudgetLogFormData {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return {
        clientName: '',
        date: today,
        type: 'RECEIVED',
        amount: 0,
        usableAmount: 0,
        platform: 'google_ads',
        note: '',
    };
}

export function BudgetLogPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const periodQuery = searchParams.toString();
    const { period, basis, monthRange } = useMemo(() => {
        const params = new URLSearchParams(periodQuery);
        const nextPeriod = getBudgetPeriodFromSearchParams(params);
        return {
            period: nextPeriod,
            basis: getBudgetFilterBasis(params),
            monthRange: getBudgetMonthRange(nextPeriod),
        };
    }, [periodQuery]);
    const [logs, setLogs] = useState<BudgetLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<BudgetLog | null>(null);
    const [useDifferentBudgetMonth, setUseDifferentBudgetMonth] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'clientName'; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'asc'
    });
    const [formData, setFormData] = useState<BudgetLogFormData>(emptyBudgetLogForm);

    const exportColumns: ExportColumn[] = [
        { key: 'date', label: 'Transaction Date', formatter: (val) => formatDate(val) },
        { key: 'budgetMonth', label: 'Budget Month', formatter: (val) => formatBudgetMonth(String(val)) },
        { key: 'clientName', label: 'Client Name' },
        { key: 'type', label: 'Type' },
        { key: 'platform', label: 'Platform', formatter: (val) => val || '-' },
        { key: 'amount', label: 'Amount' },
        { key: 'usableAmount', label: 'Usable', formatter: (val) => val || 0 },
        { key: 'note', label: 'Note', formatter: (val) => val || '' },
    ];

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await budgetApi.getAll(monthRange, basis);
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch budget logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [monthRange, basis]);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    const handlePeriodChange = (nextPeriod: BudgetPeriod) => {
        setSearchParams(getBudgetPeriodSearchParams(nextPeriod, basis));
    };

    const handleBasisChange = (nextBasis: BudgetFilterBasis) => {
        setSearchParams(getBudgetPeriodSearchParams(period, nextBasis));
    };

    const openCreateModal = () => {
        setEditingLog(null);
        setFormData(emptyBudgetLogForm());
        setUseDifferentBudgetMonth(false);
        setIsModalOpen(true);
    };

    const openEditModal = (log: BudgetLog) => {
        setEditingLog(log);
        setFormData({
            clientName: log.clientName,
            date: log.date.slice(0, 10),
            budgetMonth: budgetMonthKey(log.budgetMonth),
            type: log.type,
            amount: log.amount,
            usableAmount: log.usableAmount ?? 0,
            platform: log.platform ?? 'google_ads',
            note: log.note ?? '',
        });
        setUseDifferentBudgetMonth(usesAnotherBudgetMonth(log.date, log.budgetMonth));
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLog(null);
        setUseDifferentBudgetMonth(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                budgetMonth: useDifferentBudgetMonth ? formData.budgetMonth : undefined,
            };
            if (editingLog) await budgetApi.update(editingLog.id, payload);
            else await budgetApi.create(payload);
            setIsModalOpen(false);
            setEditingLog(null);
            setFormData(emptyBudgetLogForm());
            setUseDifferentBudgetMonth(false);
            void fetchLogs();
        } catch {
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('ยืนยันการลบข้อมูล?')) return;
        try {
            await budgetApi.delete(id);
            void fetchLogs();
        } catch {
            alert('ลบข้อมูลไม่สำเร็จ');
        }
    };

    const handleSort = (key: 'date' | 'clientName') => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    // Split logs into Received and Top-up with Sorting
    const { receivedLogs, topupLogs } = useMemo(() => {
        const sorted = [...logs].sort((a, b) => {
            if (sortConfig.key === 'date') {
                return sortConfig.direction === 'asc'
                    ? new Date(a.date).getTime() - new Date(b.date).getTime()
                    : new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            // Sort by clientName
            return sortConfig.direction === 'asc'
                ? a.clientName.localeCompare(b.clientName)
                : b.clientName.localeCompare(a.clientName);
        });

        return sorted.reduce(
            (acc, log) => {
                if (log.type === 'RECEIVED') {
                    acc.receivedLogs.push(log);
                } else {
                    acc.topupLogs.push(log);
                }
                return acc;
            },
            { receivedLogs: [] as BudgetLog[], topupLogs: [] as BudgetLog[] }
        );
    }, [logs, sortConfig]);

    // Calculate totals
    const totalReceived = receivedLogs.reduce((sum, log) => sum + log.amount, 0);
    const totalUsable = receivedLogs.reduce((sum, log) => sum + (log.usableAmount || 0), 0);
    const totalTopup = topupLogs.reduce((sum, log) => sum + log.amount, 0);
    const remainingUsable = totalUsable - totalTopup;

    if (isLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-[50vh]">
                    <div className="animate-pulse text-muted-foreground">กำลังโหลดข้อมูล...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="mb-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">📑 บัญชีงบประมาณ (Budget Ledger)</h1>
                        <p className="text-sm text-muted-foreground">กำลังแสดง: {getBudgetPeriodLabel(period)}</p>
                    </div>
                    <div className="flex gap-2">
                        <ExportButton
                            data={logs}
                            columns={exportColumns}
                            filename={`budget_log_${basis}_${period.mode === 'all' ? 'all' : getBudgetPeriodLabel(period).replaceAll(' ', '_')}`}
                        />
                        <Button onClick={openCreateModal}>+ เพิ่มรายการ</Button>
                    </div>
                </div>
                <BudgetPeriodFilter period={period} onChange={handlePeriodChange} basis={basis} onBasisChange={handleBasisChange} />
            </div>

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
                                    <th
                                        className="p-3 text-left font-medium cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center gap-1">
                                            วันที่จริง
                                            {sortConfig.key === 'date' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-green-600" /> : <ArrowDown size={14} className="text-green-600" />
                                            ) : (
                                                <ArrowUpDown size={14} className="text-green-600 opacity-50" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="p-3 text-left font-medium cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                        onClick={() => handleSort('clientName')}
                                    >
                                        <div className="flex items-center gap-1">
                                            ลูกค้า
                                            {sortConfig.key === 'clientName' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-green-600" /> : <ArrowDown size={14} className="text-green-600" />
                                            ) : (
                                                <ArrowUpDown size={14} className="text-green-600 opacity-50" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-3 text-right font-medium">ยอดรับ</th>
                                    <th className="p-3 text-right font-medium">ยอด Ads</th>
                                    <th className="p-3 text-center font-medium">จัดการ</th>
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
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button type="button" onClick={() => openEditModal(log)} className="text-blue-600 hover:text-blue-700" title="แก้ไขรายการ" aria-label={`แก้ไขรายการ ${log.clientName}`}><Pencil size={15} /></button>
                                                <button type="button" onClick={() => handleDelete(log.id)} className="text-muted-foreground hover:text-destructive" title="ลบรายการ" aria-label={`ลบรายการ ${log.clientName}`}>x</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {receivedLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
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
                                    <th
                                        className="p-3 text-left font-medium cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                        onClick={() => handleSort('date')}
                                    >
                                        <div className="flex items-center gap-1">
                                            วันที่จริง
                                            {sortConfig.key === 'date' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-orange-600" /> : <ArrowDown size={14} className="text-orange-600" />
                                            ) : (
                                                <ArrowUpDown size={14} className="text-orange-600 opacity-50" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="p-3 text-left font-medium cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                        onClick={() => handleSort('clientName')}
                                    >
                                        <div className="flex items-center gap-1">
                                            ลูกค้า
                                            {sortConfig.key === 'clientName' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-orange-600" /> : <ArrowDown size={14} className="text-orange-600" />
                                            ) : (
                                                <ArrowUpDown size={14} className="text-orange-600 opacity-50" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-3 text-left font-medium">Platform</th>
                                    <th className="p-3 text-right font-medium">ยอดเติม</th>
                                    <th className="p-3 text-center font-medium">จัดการ</th>
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
                                        <td className="p-3 text-muted-foreground text-xs">{log.platform}</td>
                                        <td className="p-3 text-right text-orange-600">{formatCurrency(log.amount)}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button type="button" onClick={() => openEditModal(log)} className="text-blue-600 hover:text-blue-700" title="แก้ไขรายการ" aria-label={`แก้ไขรายการ ${log.clientName}`}><Pencil size={15} /></button>
                                                <button type="button" onClick={() => handleDelete(log.id)} className="text-muted-foreground hover:text-destructive" title="ลบรายการ" aria-label={`ลบรายการ ${log.clientName}`}>x</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {topupLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Keep the last table rows visible above the fixed summary. */}
            <div className="h-36 md:h-28" aria-hidden="true" />

            {/* Summary Cards */}
            <section
                className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur"
                role="region"
                aria-label="สรุปบัญชี"
            >
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 md:grid-cols-4 md:gap-4 lg:px-8">
                    <div className="min-w-0 bg-card p-2.5 sm:p-3 rounded-lg border border-border">
                        <div className="truncate text-[11px] text-muted-foreground sm:text-sm">ยอดรับ{period.mode === 'all' ? 'ทั้งหมด' : `ตาม${basis === 'budget' ? 'เดือนงบ' : 'วันที่จริง'}`}</div>
                        <div className="truncate text-base font-bold text-green-600 dark:text-green-400 sm:text-xl" title={formatCurrency(totalReceived)}>{formatCurrency(totalReceived)}</div>
                    </div>
                    <div className="min-w-0 bg-card p-2.5 sm:p-3 rounded-lg border border-border">
                        <div className="truncate text-[11px] text-muted-foreground sm:text-sm">งบ Ads ที่ใช้ได้ (Usable)</div>
                        <div className="truncate text-base font-bold text-blue-600 dark:text-blue-400 sm:text-xl" title={formatCurrency(totalUsable)}>{formatCurrency(totalUsable)}</div>
                    </div>
                    <div className="min-w-0 bg-card p-2.5 sm:p-3 rounded-lg border border-border">
                        <div className="truncate text-[11px] text-muted-foreground sm:text-sm">เบิกเติมแล้ว (Top-up)</div>
                        <div className="truncate text-base font-bold text-orange-600 dark:text-orange-400 sm:text-xl" title={formatCurrency(totalTopup)}>{formatCurrency(totalTopup)}</div>
                    </div>
                    <div className="min-w-0 bg-card p-2.5 sm:p-3 rounded-lg border border-border">
                        <div className="truncate text-[11px] text-muted-foreground sm:text-sm">คงเหลือเบิก (Remaining)</div>
                        <div
                            className={`truncate text-base font-bold sm:text-xl ${remainingUsable < 0 ? 'text-red-500' : 'text-foreground'}`}
                            title={formatCurrency(remainingUsable)}
                        >
                            {formatCurrency(remainingUsable)}
                        </div>
                    </div>
                </div>
            </section>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingLog ? 'แก้ไขรายการบัญชี' : 'เพิ่มรายการบัญชี'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">ประเภท</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.type === 'RECEIVED'}
                                    onChange={() => setFormData({ ...formData, type: 'RECEIVED' })}
                                    className="accent-blue-600"
                                />
                                <span>ยอดรับ (Received)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={formData.type === 'TOPUP'}
                                    onChange={() => setFormData({ ...formData, type: 'TOPUP' })}
                                    className="accent-orange-600"
                                />
                                <span>เติมเงิน (Top-up)</span>
                            </label>
                        </div>
                    </div>

                    <Input
                        label="วันที่รับ/จ่ายจริง"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                    />

                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                            <input
                                type="checkbox"
                                checked={useDifferentBudgetMonth}
                                onChange={(event) => {
                                    const checked = event.target.checked;
                                    setUseDifferentBudgetMonth(checked);
                                    setFormData(current => ({
                                        ...current,
                                        budgetMonth: checked
                                            ? (period.mode === 'month' ? period.month : period.mode === 'range' ? period.from : budgetMonthKey(current.date))
                                            : undefined,
                                    }));
                                }}
                                className="accent-blue-600"
                            />
                            ใช้สำหรับเดือนอื่น
                        </label>
                        <p className="mt-1 text-xs text-muted-foreground">วันที่จริงยังคงเดิม แต่รายการจะถูกรวมยอดในเดือนงบที่เลือก</p>
                        {useDifferentBudgetMonth && (
                            <label className="mt-3 block text-sm font-medium text-foreground">
                                เดือนงบที่นำไปใช้
                                <input
                                    type="month"
                                    value={formData.budgetMonth || budgetMonthKey(formData.date)}
                                    onChange={(event) => setFormData({ ...formData, budgetMonth: event.target.value })}
                                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    required
                                />
                            </label>
                        )}
                    </div>

                    <Input
                        label="ชื่อลูกค้า"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="ระบุชื่อลูกค้า"
                        required
                    />

                    <Input
                        label={formData.type === 'RECEIVED' ? 'ยอดรับทั้งหมด' : 'ยอดเติมเงิน'}
                        type="number"
                        value={formData.amount === 0 ? '' : formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        min="0"
                        required
                    />

                    {formData.type === 'RECEIVED' && (
                        <Input
                            label="ยอด Ads ที่ใช้ได้จริง (Usable)"
                            type="number"
                            value={formData.usableAmount || ''}
                            onChange={(e) => setFormData({ ...formData, usableAmount: parseFloat(e.target.value) })}
                            min="0"
                        />
                    )}

                    {formData.type === 'TOPUP' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Platform</label>
                            <select
                                value={formData.platform || 'google_ads'}
                                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                className="w-full rounded-md border border-input px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-ring"
                            >
                                <option value="google_ads">Google Ads</option>
                                <option value="facebook_ads">Facebook Ads</option>
                                <option value="tiktok_ads">TikTok Ads</option>
                                <option value="line_ads">Line Ads</option>
                            </select>
                        </div>
                    )}

                    <div className="pt-2">
                        <Button type="submit" className="w-full">
                            บันทึก
                        </Button>
                    </div>
                </form>
            </Modal>
        </Layout>
    );
}
