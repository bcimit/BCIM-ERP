// src/pages/hr-admin/PayslipGalleryPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GalleryThumbnails, CheckCircle, Eye, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

const fetchTemplates = () => API.get('/hr/payslip-templates').then(r => r.data);

const MOCK_TEMPLATES = [
  { id: 1, name: 'Classic', description: 'Traditional two-column layout with company logo header', is_active: true, preview_color: '#7C3AED' },
  { id: 2, name: 'Modern', description: 'Clean flat design with highlighted net pay section', is_active: false, preview_color: '#2563EB' },
  { id: 3, name: 'Compact', description: 'Single page, condensed for low-detail payslips', is_active: false, preview_color: '#059669' },
  { id: 4, name: 'Detailed', description: 'Full A4 with detailed breakdowns, annexures supported', is_active: false, preview_color: '#D97706' },
];

export default function PayslipGalleryPage() {
  const qc = useQueryClient();
  const [preview, setPreview] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payslip-templates'],
    queryFn: fetchTemplates,
    onError: () => null,
  });
  const templates = data?.data?.length ? data.data : MOCK_TEMPLATES;

  const activateMut = useMutation({
    mutationFn: (id) => API.patch(`/hr/payslip-templates/${id}/activate`),
    onSuccess: () => { toast.success('Template activated'); qc.invalidateQueries({ queryKey: ['payslip-templates'] }); },
    onError: () => toast.error('Failed to activate'),
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GalleryThumbnails size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Payslip Gallery</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Choose a payslip template for your organisation. The active template is used when generating payslips.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {isLoading ? (
          [1,2,3,4].map(i => <div key={i} style={{ height: 320, background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }} />)
        ) : templates.map(t => (
          <div key={t.id} style={{ background: '#fff', border: `2px solid ${t.is_active ? B.purple : '#E2E8F0'}`, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
            {/* Preview area */}
            <div style={{ height: 200, background: `linear-gradient(135deg, ${t.preview_color}10, ${t.preview_color}25)`, position: 'relative', display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}>
              {/* Mock payslip preview */}
              <div style={{ background: t.preview_color, height: 28, borderRadius: 4, opacity: 0.8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[80, 60, 70, 55, 65].map((w, i) => <div key={i} style={{ height: 8, background: '#94A3B8', borderRadius: 3, width: `${w}%` }} />)}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[60, 80, 50, 75, 60].map((w, i) => <div key={i} style={{ height: 8, background: '#94A3B8', borderRadius: 3, width: `${w}%` }} />)}
                </div>
              </div>
              <div style={{ background: t.preview_color, height: 20, borderRadius: 4, opacity: 0.6, marginTop: 'auto' }} />
              {t.is_active && (
                <div style={{ position: 'absolute', top: 10, right: 10, background: '#F0FDF4', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#15803D' }}>
                  <CheckCircle size={11} /> Active
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 1.4 }}>{t.description}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPreview(t)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontWeight: 600 }}>
                  <Eye size={12} /> Preview
                </button>
                {!t.is_active && (
                  <button onClick={() => activateMut.mutate(t.id)} disabled={activateMut.isPending}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: B.purple, color: '#fff', fontWeight: 700 }}>
                    Use This
                  </button>
                )}
                {t.is_active && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#15803D' }}>
                    <CheckCircle size={12} style={{ marginRight: 4 }} /> In Use
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 600, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Preview: {preview.name}</h2>
              <button onClick={() => setPreview(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748B' }}>×</button>
            </div>
            <div style={{ height: 380, background: `linear-gradient(135deg, ${preview.preview_color}10, ${preview.preview_color}20)`, borderRadius: 12, display: 'flex', flexDirection: 'column', padding: 24, gap: 12 }}>
              <div style={{ background: preview.preview_color, height: 40, borderRadius: 6, opacity: 0.9 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>
                {['Earnings', 'Deductions'].map(s => (
                  <div key={s}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: preview.preview_color, marginBottom: 8, textTransform: 'uppercase' }}>{s}</div>
                    {[90, 70, 50, 80, 60].map((w, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ height: 8, background: '#CBD5E1', borderRadius: 3, width: `${w}%` }} />
                        <div style={{ height: 8, background: '#CBD5E1', borderRadius: 3, width: '20%' }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ background: preview.preview_color, height: 32, borderRadius: 6, opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setPreview(null)} style={{ padding: '9px 18px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontWeight: 600 }}>Close</button>
              {!preview.is_active && (
                <button onClick={() => { activateMut.mutate(preview.id); setPreview(null); }}
                  style={{ padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Use This Template
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
