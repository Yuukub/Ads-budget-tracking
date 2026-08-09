import { Button } from '../ui/Button';
import type { BudgetPeriod, BudgetPeriodMode } from '../../types';
import { getCurrentMonth } from '../../utils/budgetPeriod';

interface BudgetPeriodFilterProps {
  period: BudgetPeriod;
  onChange: (period: BudgetPeriod) => void;
}

export function BudgetPeriodFilter({ period, onChange }: BudgetPeriodFilterProps) {
  const setMode = (mode: BudgetPeriodMode) => {
    if (mode === 'all') {
      onChange({ mode });
      return;
    }

    const selectedMonth = period.mode === 'month'
      ? period.month
      : period.mode === 'range'
        ? period.from
        : getCurrentMonth();

    if (mode === 'month') {
      onChange({ mode, month: selectedMonth });
      return;
    }

    onChange({ mode, from: selectedMonth, to: selectedMonth });
  };

  const updateRange = (field: 'from' | 'to', value: string) => {
    if (period.mode !== 'range') return;

    if (field === 'from') {
      onChange({
        mode: 'range',
        from: value,
        to: value > period.to ? value : period.to,
      });
      return;
    }

    onChange({
      mode: 'range',
      from: value < period.from ? value : period.from,
      to: value,
    });
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-medium text-foreground">ช่วงเวลาบัญชี</h2>
          <p className="text-sm text-muted-foreground">เลือกเดือนเดียวหรือกำหนดช่วงเดือนที่ต้องการดู</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'ทั้งหมด'],
            ['month', 'รายเดือน'],
            ['range', 'กำหนดช่วง'],
          ] as const).map(([mode, label]) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={period.mode === mode ? 'primary' : 'outline'}
              onClick={() => setMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {period.mode === 'month' && (
        <label className="mt-4 block max-w-xs text-sm font-medium text-foreground">
          เดือน
          <input
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            type="month"
            value={period.month}
            onChange={(event) => onChange({ mode: 'month', month: event.target.value })}
          />
        </label>
      )}

      {period.mode === 'range' && (
        <div className="mt-4 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-foreground">
            เดือนเริ่มต้น
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              type="month"
              value={period.from}
              onChange={(event) => updateRange('from', event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-foreground">
            เดือนสิ้นสุด
            <input
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              type="month"
              value={period.to}
              onChange={(event) => updateRange('to', event.target.value)}
            />
          </label>
        </div>
      )}
    </section>
  );
}
