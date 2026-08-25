import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShareLink, ShareLinkFormData, ShareAccessLog } from '../../types';
import { shareApi } from '../../api/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Copy, Check, Trash2, Eye, Link2, Clock, Key, Hash, Pencil } from 'lucide-react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'create' | 'manage';

export function ShareLinkModal({ isOpen, onClose }: ShareLinkModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // Create/Edit form state
  const [editingLink, setEditingLink] = useState<ShareLink | null>(null);
  const [formData, setFormData] = useState<ShareLinkFormData>({
    name: '',
    pageType: 'all',
    expiresAt: null,
    password: null,
    maxViews: null,
  });
  const [createdLink, setCreatedLink] = useState<ShareLink | null>(null);

  // Access logs state
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [accessLogs, setAccessLogs] = useState<ShareAccessLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Load share links when modal opens
  useEffect(() => {
    if (isOpen) {
      loadShareLinks();
    }
  }, [isOpen]);

  const loadShareLinks = async () => {
    try {
      const links = await shareApi.getMyLinks();
      setShareLinks(links);
    } catch (error) {
      console.error('Failed to load share links:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingLink) {
        // Update existing link
        const updated = await shareApi.update(editingLink.id, formData);
        setShareLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        resetForm();
        setActiveTab('manage');
      } else {
        // Create new link
        const link = await shareApi.create(formData);
        setCreatedLink(link);
        loadShareLinks();
      }
    } catch (error) {
      console.error('Failed to save share link:', error);
      alert('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (link: ShareLink) => {
    setEditingLink(link);
    setFormData({
      name: link.name || '',
      pageType: link.pageType as 'home' | 'budget' | 'all',
      expiresAt: link.expiresAt ? new Date(link.expiresAt).toISOString().split('T')[0] : null,
      password: null, // Don't fill password, leave blank for unchanged
      maxViews: link.maxViews || null,
    });
    setActiveTab('create');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบลิงค์นี้?')) return;

    try {
      await shareApi.delete(id);
      setShareLinks((prev) => prev.filter((link) => link.id !== id));
      if (editingLink?.id === id) {
        resetForm();
      }
    } catch (error) {
      console.error('Failed to delete share link:', error);
      alert('ไม่สามารถลบลิงค์ได้');
    }
  };

  const handleToggleActive = async (link: ShareLink) => {
    try {
      await shareApi.update(link.id, { isActive: !link.isActive });
      setShareLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, isActive: !l.isActive } : l))
      );
    } catch (error) {
      console.error('Failed to toggle share link:', error);
    }
  };

  const copyToClipboard = async (token: string, id: string) => {
    const url = `${window.location.origin}/s/${token}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) throw new Error('Clipboard fallback failed');
      }

      setCopiedId(id);
      setCopyMessage(`คัดลอกลิงก์แล้ว: ${url}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy share link:', error);
      setCopyMessage('คัดลอกลิงก์ไม่สำเร็จ กรุณาคัดลอก URL ที่แสดงด้านล่างด้วยตัวเอง');
    }
  };

  const loadAccessLogs = async (linkId: string) => {
    if (selectedLinkId === linkId) {
      setSelectedLinkId(null);
      return;
    }

    setSelectedLinkId(linkId);
    setIsLoadingLogs(true);

    try {
      const logs = await shareApi.getAccessLogs(linkId);
      setAccessLogs(logs);
    } catch (error) {
      console.error('Failed to load access logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (link: ShareLink) => {
    if (!link.isActive) {
      return <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">ปิดใช้งาน</span>;
    }
    if (link.isExpired) {
      return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">หมดอายุ</span>;
    }
    if (link.isMaxedOut) {
      return <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full">ครบจำนวน</span>;
    }
    return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">ใช้งานได้</span>;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      pageType: 'all',
      expiresAt: null,
      password: null,
      maxViews: null,
    });
    setEditingLink(null);
    setCreatedLink(null);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {editingLink ? '✏️ แก้ไขลิงค์' : '🔗 แชร์ลิงค์'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { setActiveTab('create'); resetForm(); }}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'create' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            {editingLink ? 'แก้ไขข้อมูล' : 'สร้างลิงค์ใหม่'}
          </button>
          <button
            onClick={() => { setActiveTab('manage'); resetForm(); }}
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'manage' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            จัดการลิงค์ ({shareLinks.length})
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {copyMessage && (
            <div role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 break-all">
              {copyMessage}
            </div>
          )}
          {activeTab === 'create' && (
            <>
              {createdLink ? (
                // Show created link
                <div className="text-center py-6">
                  <div className="text-4xl mb-4">🎉</div>
                  <h3 className="text-lg font-semibold mb-2">สร้างลิงค์สำเร็จ!</h3>
                  <div className="bg-muted rounded-lg p-3 mb-4">
                    <code className="text-sm break-all">
                      {window.location.origin}/s/{createdLink.token}
                    </code>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => copyToClipboard(createdLink.token, createdLink.id)}>
                      {copiedId === createdLink.id ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copiedId === createdLink.id ? 'คัดลอกแล้ว' : 'คัดลอก'}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      สร้างลิงค์ใหม่
                    </Button>
                  </div>
                </div>
              ) : (
                // Create/Edit form
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      ชื่อลิงค์ (ไม่บังคับ)
                    </label>
                    <Input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="เช่น สำหรับลูกค้า ABC"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      หน้าที่แชร์
                    </label>
                    <select
                      value={formData.pageType}
                      onChange={(e) => setFormData({ ...formData, pageType: e.target.value as 'home' | 'budget' | 'all' })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="all">ทั้งหมด (หน้าหลัก + บัญชี)</option>
                      <option value="home">เฉพาะหน้าหลัก</option>
                      <option value="budget">เฉพาะหน้าบัญชี</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      วันหมดอายุ (ไม่บังคับ)
                    </label>
                    <Input
                      type="date"
                      value={formData.expiresAt || ''}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value || null })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      <Key className="w-4 h-4 inline mr-1" />
                      {editingLink ? 'เปลี่ยนรหัสผ่าน (ปล่อยว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน (ไม่บังคับ)'}
                    </label>
                    <Input
                      type="text"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value || null })}
                      placeholder={editingLink ? 'พิมพ์รหัสใหม่เพื่อเปลี่ยน' : 'ปล่อยว่างถ้าไม่ต้องการรหัสผ่าน'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      <Hash className="w-4 h-4 inline mr-1" />
                      จำกัดจำนวนครั้งดู (ไม่บังคับ)
                    </label>
                    <Input
                      type="number"
                      value={formData.maxViews || ''}
                      onChange={(e) => setFormData({ ...formData, maxViews: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="เช่น 100"
                      min={1}
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingLink && (
                      <Button type="button" variant="outline" className="w-full" onClick={() => { resetForm(); setActiveTab('manage'); }}>
                        ยกเลิก
                      </Button>
                    )}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      <Link2 className="w-4 h-4 mr-2" />
                      {isLoading ? 'กำลังบันทึก...' : editingLink ? 'บันทึกการแก้ไข' : 'สร้างลิงค์'}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-3">
              {shareLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ยังไม่มีลิงค์ที่สร้าง
                </div>
              ) : (
                shareLinks.map((link) => (
                  <div key={link.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground truncate">
                              {link.name || 'ไม่มีชื่อ'}
                            </span>
                            {getStatusBadge(link)}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>หน้า: {link.pageType === 'all' ? 'ทั้งหมด' : link.pageType === 'home' ? 'หน้าหลัก' : 'บัญชี'}</div>
                            <div>ดูแล้ว: {link.viewCount}{link.maxViews ? `/${link.maxViews}` : ''} ครั้ง</div>
                            {link.expiresAt && <div>หมดอายุ: {formatDate(link.expiresAt)}</div>}
                            {link.hasPassword && <div>🔒 มีรหัสผ่าน</div>}
                          </div>
                          <a
                            href={`${window.location.origin}/s/${link.token}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block truncate text-xs text-primary underline"
                            title={`${window.location.origin}/s/${link.token}`}
                          >
                            {window.location.origin}/s/{link.token}
                          </a>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(link.token, link.id)}
                            className="p-2 hover:bg-muted rounded-lg"
                            title="คัดลอก"
                          >
                            {copiedId === link.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(link)}
                            className="p-2 hover:bg-muted rounded-lg"
                            title="แก้ไข"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => loadAccessLogs(link.id)}
                            className="p-2 hover:bg-muted rounded-lg"
                            title="ดู Log"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(link)}
                            className={`p-2 hover:bg-muted rounded-lg ${link.isActive ? 'text-green-500' : 'text-gray-400'}`}
                            title={link.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className="p-2 hover:bg-muted rounded-lg text-red-500"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Access Logs */}
                    {selectedLinkId === link.id && (
                      <div className="border-t border-border bg-muted/30 p-3">
                        <h4 className="text-sm font-medium mb-2">ประวัติการเข้าชม</h4>
                        {isLoadingLogs ? (
                          <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
                        ) : accessLogs.length === 0 ? (
                          <div className="text-sm text-muted-foreground">ยังไม่มีการเข้าชม</div>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {accessLogs.map((log) => (
                              <div key={log.id} className="text-xs text-muted-foreground flex justify-between">
                                <span>{formatDate(log.accessedAt)}</span>
                                <span className="truncate ml-2">{log.ipAddress || 'N/A'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
