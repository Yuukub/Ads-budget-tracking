import { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { budgetApi } from '../api/api';
import { BudgetLog, BudgetLogFormData } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

export function BudgetLogPage() {
    const [logs, setLogs] = useState<BudgetLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'clientName'; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc'
    });
    const [formData, setFormData] = useState<BudgetLogFormData>({
        clientName: '',
        date: new Date().toISOString().split('T')[0],
        type: 'RECEIVED',
        amount: 0,
        usableAmount: 0,
        platform: 'google_ads',
        note: '',
    });

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await budgetApi.getAll();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch budget logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await budgetApi.create(formData);
            setIsModalOpen(false);
            fetchLogs();
            // Reset form
            setFormData({
                clientName: '',
                date: new Date().toISOString().split('T')[0],
                type: 'RECEIVED',
                amount: 0,
                usableAmount: 0,
                platform: 'google_ads',
                note: '',
            });
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('ยืนยันการลบข้อมูล?')) return;
        try {
            await budgetApi.delete(id);
            fetchLogs();
        } catch (error) {
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
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-foreground">📑 บัญชีงบประมาณ (Budget Ledger)</h1>
                <Button onClick={() => setIsModalOpen(true)}>+ เพิ่มรายการ</Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">ยอดรับทั้งหมด</div>
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
                                            วันที่
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
                                    <th className="p-3 text-center font-medium">ลบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {receivedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/50">
                                        <td className="p-3">{formatDate(log.date)}</td>
                                        <td className="p-3 font-medium">{log.clientName}</td>
                                        <td className="p-3 text-right text-green-600">{formatCurrency(log.amount)}</td>
                                        <td className="p-3 text-right text-blue-600">{formatCurrency(log.usableAmount || 0)}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleDelete(log.id)} className="text-muted-foreground hover:text-destructive">
                                                x
                                            </button>
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
                                            วันที่
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
                                    <th className="p-3 text-center font-medium">ลบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topupLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/50">
                                        <td className="p-3">{formatDate(log.date)}</td>
                                        <td className="p-3 font-medium">{log.clientName}</td>
                                        <td className="p-3 text-muted-foreground text-xs">{log.platform}</td>
                                        <td className="p-3 text-right text-orange-600">{formatCurrency(log.amount)}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleDelete(log.id)} className="text-muted-foreground hover:text-destructive">
                                                x
                                            </button>
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="เพิ่มรายการบัญชี">
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
                        label="วันที่"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                    />

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
