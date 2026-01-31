import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { Download, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { HistoryResponse, HistoryFilters, CampaignWithClient } from '../types';
import { historyApi } from '../api/api';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatCurrency, formatDate, formatPlatform } from '../utils/helpers';

// Helper to get full logo URL
const getLogoUrl = (logoPath: string | null | undefined) => {
  if (!logoPath) return '';
  if (logoPath.startsWith('http')) return logoPath;
  return `http://localhost:3001${logoPath}`;
};

export function HistoryPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CampaignWithClient | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const result = await historyApi.getAll(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filters]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const prepareExportData = (campaigns: CampaignWithClient[]) => {
    return campaigns.map(c => {
      const remaining = c.budget - c.spent;
      return {
        'Period': new Date(c.endDate).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
        'Client Name': c.client?.name || 'Unknown',
        'Campaign Name': c.name,
        'Platform': formatPlatform(c.platform, c.googleAdsType),
        'Budget': c.budget,
        'Spent': c.spent,
        'Remaining': remaining,
        'Status': remaining < 0 ? 'Overspent' : 'Under Budget',
        'Start Date': formatDate(c.createdAt), // Approximation or use activeDays if stored? database has createdAt
        'End Date': formatDate(c.endDate)
      };
    });
  };

  const handleExport = async (scope: 'current' | 'all', format: 'xlsx' | 'csv') => {
    setIsExporting(true);
    setIsExportMenuOpen(false);
    try {
      let campaignsToExport: CampaignWithClient[] = [];
      let filename = 'campaign_history';

      if (scope === 'current') {
        campaignsToExport = data?.campaigns || [];
        const filterParts = [];
        if (filters.clientId) filterParts.push(`client_${filters.clientId}`);
        if (filters.platform) filterParts.push(filters.platform);
        if (filterParts.length > 0) filename += `_${filterParts.join('_')}`;
      } else {
        // Fetch all
        const allData = await historyApi.getAll({}); // Empty filters
        campaignsToExport = allData.campaigns;
        filename += '_ALL';
      }

      filename += `_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        const exportData = prepareExportData(campaignsToExport);
        // Use ExcelJS for consistent CSV export
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('History');

        const columns = Object.keys(exportData[0] || {}).map(key => ({ header: key, key: key }));
        worksheet.columns = columns;
        worksheet.addRows(exportData);

        const buffer = await workbook.csv.writeBuffer();
        const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Excel Export with Styling
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Campaign History');

        // Headers
        const exportData = prepareExportData(campaignsToExport);
        const headers = Object.keys(exportData[0] || {});

        worksheet.columns = headers.map(header => ({
          header: header,
          key: header,
          width: header === 'Client Name' || header === 'Campaign Name' ? 30 : 20
        }));

        // Add Data
        worksheet.addRows(exportData);

        // Styling
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9E1F2' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 24;

        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            cell.alignment = { ...cell.alignment, vertical: 'middle', indent: 1 };
          });

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${filename}.xlsx`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Export failed:', error);
        alert('เกิดข้อผิดพลาดในการ Export ข้อมูล');
      } finally {
        setIsExporting(false);
      }
    };

    // Group campaigns by month
    const groupedCampaigns = useMemo(() => {
      if (!data?.campaigns) return {};

      return data.campaigns.reduce((acc, campaign) => {
        const date = campaign.archivedAt || campaign.endDate;
        const monthYear = new Date(date).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
        });

        if (!acc[monthYear]) {
          acc[monthYear] = [];
        }
        acc[monthYear].push(campaign);
        return acc;
      }, {} as Record<string, CampaignWithClient[]>);
    }, [data?.campaigns]);

    // Delete history handler
    const handleDeleteHistory = async () => {
      if (!deleteTarget) return;
      setIsDeleting(true);
      try {
        await historyApi.delete(deleteTarget.id);
        setDeleteTarget(null);
        await fetchHistory();
      } catch (error: any) {
        alert(error.response?.data?.error || 'เกิดข้อผิดพลาดในการลบประวัติ');
      } finally {
        setIsDeleting(false);
      }
    };

    return (
      <Layout>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              ← กลับหน้าหลัก
            </Button>
            <h1 className="text-xl font-bold text-foreground">📜 ประวัติแคมเปญทั้งหมด</h1>
          </div>

          {/* Export Button & Menu */}
          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="outline"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? <div className="animate-spin text-sm">⏳</div> : <Download size={16} />}
              Export
              <ChevronDown size={14} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-[100] border border-border overflow-hidden">
                <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current View ({data?.campaigns.length || 0})
                </div>
                <button
                  onClick={() => handleExport('current', 'xlsx')}
                  className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground text-left gap-2"
                >
                  <FileSpreadsheet size={16} className="text-green-600" /> Excel
                </button>
                <button
                  onClick={() => handleExport('current', 'csv')}
                  className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground text-left gap-2"
                >
                  <FileText size={16} className="text-blue-600" /> CSV
                </button>

                <div className="border-t border-border my-1"></div>

                <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  All Data
                </div>
                <button
                  onClick={() => handleExport('all', 'xlsx')}
                  className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground text-left gap-2"
                >
                  <FileSpreadsheet size={16} className="text-green-600" /> Excel (All)
                </button>
                <button
                  onClick={() => handleExport('all', 'csv')}
                  className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground text-left gap-2"
                >
                  <FileText size={16} className="text-blue-600" /> CSV (All)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
              <Input
                type="text"
                placeholder="ค้นหาชื่อแคมเปญ..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filters.clientId || 'all'}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                clientId: e.target.value === 'all' ? undefined : e.target.value,
              }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            >
              <option value="all">ลูกค้าทั้งหมด</option>
              {data?.clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>

            <select
              value={filters.platform || 'all'}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                platform: e.target.value === 'all' ? undefined : e.target.value,
              }))}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            >
              <option value="all">Platform ทั้งหมด</option>
              <option value="google_ads">Google Ads</option>
              <option value="facebook_ads">Facebook Ads</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        {data?.summary && data.summary.totalCampaigns > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              📊 <strong>สรุป:</strong> {data.summary.totalCampaigns} แคมเปญ |
              งบรวม {formatCurrency(data.summary.totalBudget)} |
              ใช้จริง {formatCurrency(data.summary.totalSpent)}
              {data.summary.totalRemaining > 0 && (
                <span className="text-green-600"> | เหลือ {formatCurrency(data.summary.totalRemaining)}</span>
              )}
              {data.summary.totalOverspent > 0 && (
                <span className="text-red-600"> | เกิน {formatCurrency(data.summary.totalOverspent)}</span>
              )}
            </div>
          </div>
        )}

        {/* Campaign List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">กำลังโหลด...</div>
        ) : !data?.campaigns.length ? (
          <div className="text-center py-12">
            <span className="text-4xl">📋</span>
            <p className="mt-4 text-muted-foreground">ยังไม่มีประวัติแคมเปญ</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCampaigns).map(([monthYear, campaigns]) => (
              <div key={monthYear}>
                <h2 className="text-lg font-semibold text-foreground mb-3 border-b border-border pb-2">
                  {monthYear}
                </h2>
                <div className="space-y-3">
                  {campaigns.map(campaign => {
                    const remaining = campaign.budget - campaign.spent;
                    const isOverspent = remaining < 0;

                    return (
                      <div
                        key={campaign.id}
                        className="bg-card rounded-lg shadow-sm border border-border p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              {campaign.client?.logo ? (
                                <img
                                  src={getLogoUrl(campaign.client.logo)}
                                  alt=""
                                  className="w-5 h-5 object-contain rounded border border-border"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span>👤</span>
                              )}
                              <span>{campaign.client?.name || 'ไม่ทราบ'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📢</span>
                              <span className="font-medium text-foreground">{campaign.name}</span>
                              <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                                {formatPlatform(campaign.platform, campaign.googleAdsType)}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">
                              งบ: {formatCurrency(campaign.budget)} |
                              ใช้ไป: {formatCurrency(campaign.spent)} |
                              <span className={isOverspent ? 'text-red-600' : 'text-green-600'}>
                                {isOverspent ? ` เกิน: ${formatCurrency(Math.abs(remaining))}` : ` เหลือ: ${formatCurrency(remaining)}`}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              สิ้นสุด: {formatDate(campaign.endDate)}
                              {campaign.archivedAt && ` | เก็บประวัติ: ${formatDate(campaign.archivedAt)}`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(campaign)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            🗑️ ลบ
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          title="ยืนยันการลบประวัติ"
        >
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-foreground">
                คุณต้องการลบประวัติแคมเปญ <strong>{deleteTarget.name}</strong> ใช่หรือไม่?
              </p>
              <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  {deleteTarget.client?.logo ? (
                    <img src={getLogoUrl(deleteTarget.client.logo)} alt="" className="w-5 h-5 object-contain rounded" />
                  ) : (
                    <span>👤</span>
                  )}
                  <span>ลูกค้า: {deleteTarget.client?.name || 'ไม่ทราบ'}</span>
                </div>
                <div>📢 แคมเปญ: {deleteTarget.name}</div>
                <div>💰 งบ: {formatCurrency(deleteTarget.budget)} | ใช้จริง: {formatCurrency(deleteTarget.spent)}</div>
              </div>
              <p className="text-sm text-red-600">
                ⚠️ การลบประวัตินี้ไม่สามารถกู้คืนได้
              </p>
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">
                  ยกเลิก
                </Button>
                <Button variant="danger" onClick={handleDeleteHistory} className="flex-1" disabled={isDeleting}>
                  {isDeleting ? 'กำลังลบ...' : 'ลบประวัติ'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </Layout>
    );
  }
