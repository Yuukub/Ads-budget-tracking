import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button } from './Button';

export interface ExportColumn {
    key: string;
    label: string;
    // Optional formatter function
    formatter?: (value: any) => string | number;
    // Optional width
    width?: number;
    // Optional style
    style?: Partial<ExcelJS.Style>;
}

interface ExportButtonProps {
    data: any[];
    columns: ExportColumn[];
    filename?: string;
    label?: string;
    disabled?: boolean;
    headerColor?: string;
}

export function ExportButton({
    data,
    columns,
    filename = 'export',
    label = 'Export',
    disabled = false,
    headerColor = 'FFD9E1F2' // Light blue default
}: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);



    const exportToCSV = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sheet1');

            // Add headers
            worksheet.columns = columns.map(col => ({ header: col.label, key: col.key }));

            // Add rows
            const rows = data.map(item => {
                const row: Record<string, any> = {};
                columns.forEach(col => {
                    const getValue = (obj: any, path: string) => {
                        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                    };
                    const rawValue = getValue(item, col.key);
                    row[col.key] = col.formatter ? col.formatter(rawValue) : rawValue;
                });
                return row;
            });

            worksheet.addRows(rows);

            // Write to buffer
            const buffer = await workbook.csv.writeBuffer();
            const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${filename}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export CSV failed:', error);
            alert('Export CSV failed');
        } finally {
            setIsExporting(false);
            setIsOpen(false);
        }
    };

    const exportToExcel = async () => {
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Report');

            // Define Columns
            worksheet.columns = columns.map(col => ({
                header: col.label,
                key: col.key,
                width: col.width || 20,
                style: col.style
            }));

            // Add Data
            const rows = data.map(item => {
                const row: Record<string, any> = {};
                columns.forEach(col => {
                    const getValue = (obj: any, path: string) => {
                        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                    };
                    const rawValue = getValue(item, col.key);

                    // Keep numbers as numbers for Excel math compatibility
                    // Only format if explicitly string-conversion is desired, otherwise just value
                    // But our columns interface asks for formatter returning string|number.
                    // If formatter formats to string (e.g. "฿1,000"), Excel sees it as text.
                    // Ideally we should pass raw number and use numFmt. 
                    // For now, let's trust the formatter unless we want to enforce types.
                    // A better approach for the future: separate displayFormatter from valueGetter.

                    row[col.key] = col.formatter ? col.formatter(rawValue) : rawValue;
                });
                return row;
            });
            worksheet.addRows(rows);

            // STYLING
            // 1. Header Row Styling
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerColor }
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 24;

            // 2. Borders for all cells
            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    // Auto-align numbers to right, text to left is default, ensuring padding
                    cell.alignment = { ...cell.alignment, vertical: 'middle', indent: 1 };
                });
            });

            // Write file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${filename}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Export Excel failed:', error);
            alert('Export Excel failed');
        } finally {
            setIsExporting(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <Button
                variant="outline"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
                disabled={disabled || isExporting}
            >
                {isExporting ? <div className="animate-spin text-sm">⏳</div> : <Download size={16} />}
                {label}
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-[100] border border-border overflow-hidden">
                    <div className="py-1">
                        <button
                            onClick={exportToExcel}
                            className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground text-left gap-2"
                        >
                            <FileSpreadsheet size={16} className="text-green-600" />
                            Export to Excel (Styled)
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground text-left gap-2"
                        >
                            <FileText size={16} className="text-blue-600" />
                            Export to CSV
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
