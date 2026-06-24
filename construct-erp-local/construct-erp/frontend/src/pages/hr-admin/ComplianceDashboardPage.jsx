// src/pages/hr-admin/ComplianceDashboardPage.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();

const fetchStatus = () => API.get('/hr/compliance/status').then(r => r.data);

const COMPLIANCE_ITEMS = [
  { key: 'pf',              label: 'Provident Fund (PF)',       route: '/hr-admin/pf-compliance',       freq: 'Monthly',      desc: 'ECR filing, challan & registers' },
  { key: 'esi',             label: 'ESI Contribution',          route: '/hr-admin/esi-compliance',       freq: 'Monthly',      desc: 'Half-yearly returns, Form 5/6' },
  { key: 'professional_tax',label: 'Professional Tax (PT)',     route: '/hr-admin/professional-tax',     freq: 'Monthly',      desc: 'State-wise PT challan & returns' },
  { key: 'tds',             label: 'TDS on Salary',             route: '/hr-admin/tds-compliance',       freq: 'Quarterly',    desc: 'Form 24Q, Form 16 generation' },
  { key: 'gratuity',        label: 'Gratuity Register',         route: '/hr-admin/gratuity-register',    freq: 'Annual',       desc: 'Gratuity liability per employee' },
  { key: 'bonus',           label: 'Statutory Bonus',           route: '/hr-admin/bonus-register',       freq: 'Annual',       desc: 'Bonus Act 8.33% calculation' },
  { key: 'lwf',             label: 'Labour Welfare Fund',       route: '/hr-admin/lwf',                  freq: 'Bi-annual',    desc: 'LWF contributions & challan' },
  { key: 'minimum_wages',   label: 'Minimum Wages',             route: '/hr-admin/minimum-wages',        freq: 'Ongoing',      desc: 'Compliance check vs state rates' },
  { key: 'statutory_regs',  label: 'Statutory Registers',       route: '/hr-admin/statutory-registers',  freq: 'Ongoing',      desc: 'Form B, C, D — muster rolls' },
];

const STATUS_CONFIG = {
  ok:      { icon: CheckCircle, color: '#15803D', bg: '#F0FDF4', label: 'Compliant' },
  due:     { icon: Clock,       color: '#B45309', bg: '#FFFBEB', label: 'Due Soon' },
  overdue: { icon: AlertTriangle,color:'#DC2626', bg: '#FEF2F2', label: 'Overdue' },
  na:      { icon: ShieldCheck, color: '#94A3B8', bg: '#F8FAFC', label: 'Not Set Up' },
};

export default function ComplianceDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['compliance-status'], queryFn: fetchStatus });
  const statuses = data?.data || {};

  const counts = COMPLIANCE_ITEMS.reduce((acc, item) => {
    const s = statuses[item.key] || 'na';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={18} color={B.purple} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Statutory Compliance</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>All statutory obligations in one place — PF, ESI, PT, TDS, Bonus, Gratuity &amp; more.</p>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Compliant',  count: counts.ok      || 0, color: '#15803D', bg: '#F0FDF4' },
          { label: 'Due Soon',   count: counts.due     || 0, color: '#B45309', bg: '#FFFBEB' },
          { label: 'Overdue',    count: counts.overdue || 0, color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Not Set Up', count: counts.na      || COMPLIANCE_ITEMS.length, color: '#94A3B8', bg: '#F8FAFC' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}20`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.count}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.color, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Compliance cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {COMPLIANCE_ITEMS.map(item => {
          const statusKey = statuses[item.key] || 'na';
          const sc = STATUS_CONFIG[statusKey];
          const Icon = sc.icon;
          return (
            <div key={item.key}
              onClick={() => navigate(item.route)}
              style={{ background: '#fff', border: `1px solid ${statusKey === 'overdue' ? '#FECACA' : '#E2E8F0'}`, borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{item.desc}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: sc.bg, color: sc.color, whiteSpace: 'nowrap', marginLeft: 12 }}>
                  <Icon size={11} /> {sc.label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: '#64748B' }}>{item.freq}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: B.purple }}>
                  Open <ArrowRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
