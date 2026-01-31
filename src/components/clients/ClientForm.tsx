import { useState, useEffect, useRef } from 'react';
import { Client, ClientFormData } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/helpers';
import { uploadApi } from '../../api/api';

type LogoInputType = 'url' | 'upload';

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClientForm({ client, onSubmit, onCancel, isLoading }: ClientFormProps) {
  const [name, setName] = useState(client?.name || '');
  const [totalBudget, setTotalBudget] = useState(client?.totalBudget?.toString() || '');
  const [logo, setLogo] = useState(client?.logo || '');
  const [logoInputType, setLogoInputType] = useState<LogoInputType>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!client;
  const minBudget = client?.allocated || 0;

  useEffect(() => {
    if (client) {
      setName(client.name);
      setTotalBudget(client.totalBudget.toString());
      setLogo(client.logo || '');
    }
  }, [client]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('ไฟล์ต้องมีขนาดไม่เกิน 2MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF, WebP)');
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      const result = await uploadApi.uploadLogo(file);
      setLogo(result.url);
    } catch (err) {
      setError('อัพโหลดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get full logo URL for display
  const getLogoUrl = (logoPath: string) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http')) return logoPath;
    return `http://localhost:3001${logoPath}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const budget = parseFloat(totalBudget) || 0;

    if (!name.trim()) {
      setError('กรุณากรอกชื่อลูกค้า');
      return;
    }

    if (budget < 0) {
      setError('งบประมาณต้องไม่ติดลบ');
      return;
    }

    if (isEdit && budget < minBudget) {
      setError(`งบรวมต้องไม่น้อยกว่างบที่จัดสรรไปแล้ว (${formatCurrency(minBudget)})`);
      return;
    }

    onSubmit({ name: name.trim(), totalBudget: budget, logo: logo || null });
  };

  const newUnallocated = isEdit
    ? (parseFloat(totalBudget) || 0) - (client?.allocated || 0)
    : parseFloat(totalBudget) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Input
        label="ชื่อลูกค้า"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อบริษัท หรือชื่อลูกค้า"
        required
      />

      <Input
        label="งบรวมทั้งหมด (฿)"
        type="number"
        step="0.01"
        value={totalBudget}
        onChange={(e) => setTotalBudget(e.target.value)}
        placeholder="100000"
        min={0}
      />

      {/* Logo Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">โลโก้ลูกค้า (ไม่บังคับ)</label>

        {/* Logo Preview */}
        {logo && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg overflow-hidden max-w-full">
            <img
              src={getLogoUrl(logo)}
              alt="Logo preview"
              className="w-12 h-12 object-contain rounded border bg-white flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect fill="%23f3f4f6" width="48" height="48"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12">?</text></svg>';
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-500 truncate">{logo}</div>
            </div>
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="text-red-500 hover:text-red-700 text-sm flex-shrink-0"
            >
              ลบ
            </button>
          </div>
        )}

        {/* Input Type Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLogoInputType('upload')}
            className={`flex-1 py-2 px-3 text-sm rounded-lg border ${logoInputType === 'upload'
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            อัพโหลดไฟล์
          </button>
          <button
            type="button"
            onClick={() => setLogoInputType('url')}
            className={`flex-1 py-2 px-3 text-sm rounded-lg border ${logoInputType === 'url'
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            ใส่ URL
          </button>
        </div>

        {/* Upload Input */}
        {logoInputType === 'upload' && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileUpload}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className={`flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isUploading
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
            >
              {isUploading ? (
                <span className="text-gray-500">กำลังอัพโหลด...</span>
              ) : (
                <>
                  <span className="text-gray-400">📷</span>
                  <span className="text-sm text-gray-600">คลิกเพื่อเลือกไฟล์ (สูงสุด 2MB)</span>
                </>
              )}
            </label>
          </div>
        )}

        {/* URL Input */}
        {logoInputType === 'url' && (
          <Input
            type="url"
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
        )}
      </div>

      {isEdit && (
        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
          <div className="text-gray-600">📊 สถานะงบปัจจุบัน:</div>
          <div className="text-gray-500">├─ จัดสรรแล้ว: {formatCurrency(client?.allocated || 0)}</div>
          <div className={newUnallocated < 0 ? 'text-red-600' : 'text-green-600'}>
            └─ ยังไม่จัดสรร: {formatCurrency(newUnallocated)} {newUnallocated !== client?.unallocated && '(หลังแก้ไข)'}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          ยกเลิก
        </Button>
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </form>
  );
}
