import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './Button';

export interface ExportColumn {
    key: string;
    label: string;
    // Optional formatter function
    formatter?: (value: any) => string | number;
}

interface ExportButtonProps {
    data: any[];
    columns: ExportColumn[];
    filename?: string;
    label?: string;
    disabled?: boolean;
}

export function ExportButton({
    data,
    columns,
    filename = 'export',
    label = 'Export',
    disabled = false
}: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
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

    const prepareData = () => {
        return data.map(item => {
            const row: Record<string, any> = {};
            columns.forEach(col => {
                // Access nested properties if key has dots (e.g. "client.name")
                const getValue = (obj: any, path: string) => {
                    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
                };

                const rawValue = getValue(item, col.key);
                row[col.label] = col.formatter ? col.formatter(rawValue) : rawValue;
            });
            return row;
        });
    };

    const exportToCSV = () => {
        const exportData = prepareData();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

        const blob = new Blob(['\ufeff' + csvOutput], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsOpen(false);
    };

    const exportToExcel = () => {
        const exportData = prepareData();
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Auto-width columns
        const colWidths = columns.map(col => {
            const maxContentWidth = Math.max(
                col.label.length,
                ...exportData.map(row => String(row[col.label] || '').length)
            );
            return { wch: Math.min(maxContentWidth + 2, 50) }; // Cap width at 50 chars
        });
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <Button
                variant="outline"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                type="button"
            >
                <Download size={16} />
                {label}
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-border overflow-hidden">
                    <div className="py-1">
                        <button
                            onClick={exportToExcel}
                            className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground text-left gap-2"
                        >
                            <FileSpreadsheet size={16} className="text-green-600" />
                            Export to Excel
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
