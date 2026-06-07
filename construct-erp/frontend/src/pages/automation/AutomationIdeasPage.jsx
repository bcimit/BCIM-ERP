import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bot, CheckCircle2, Clock3, Filter, Lightbulb, Plus, Rocket, Search,
  Sparkles, Target, ToggleLeft, ToggleRight, Zap,
} from 'lucide-react';
import { automationIdeasAPI } from '../../api/client';

const STATUSES = [
  { key: 'idea', label: 'Idea', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'review', label: 'Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'approved', label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'done', label: 'Done', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'on_hold', label: 'On Hold', color: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const PRIORITIES = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'critical', label: 'Critical' },
];

const DEPARTMENTS = [
  'Procurement', 'Stores', 'Bill Tracker', 'QS & Billing', 'Finance',
  'Assets & IT', 'Planning', 'Quality (QA/QC)', 'HSE & Safety', 'Administration',
];

const MODULES = [
  'PO / WO Automation', 'Bill Tracker Automation', 'Mail Alerts', 'Reports',
  'Asset Automation', 'Stores Automation', 'Approvals', 'Data Import', 'Compliance',
];

const initialForm = {
  title: '',
  department: 'Procurement',
  target_module: 'PO / WO Automation',
  priority: 'medium',
  status: 'idea',
  pain_point: '',
  suggested_automation: '',
  expected_benefit: '',
  target_date: '',
  is_enabled: true,
};

const statusMeta = (status) => STATUSES.find((s) => s.key === status) || STATUSES[0];

const priorityClass = (priority) => ({
  critical: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
}[priority] || 'bg-slate-50 text-slate-600 border-slate-200');

const fmtDate = (value) => {
  if (!value) return 'No target date';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function KpiCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value || 0}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function IdeaCard({ idea, onStatusChange, onToggle }) {
  const status = statusMeta(idea.status);
  const isOn = idea.is_enabled !== false;
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md ${isOn ? 'border-slate-200' : 'border-slate-200 opacity-70 grayscale'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{idea.title}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">{idea.department} / {idea.target_module}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${priorityClass(idea.priority)}`}>
            {idea.priority}
          </span>
          <button
            type="button"
            onClick={() => onToggle(idea.id, !isOn)}
            title={isOn ? 'Turn automation OFF' : 'Turn automation ON'}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase transition ${isOn ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
          >
            {isOn ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {isOn ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-700">
        {idea.pain_point && (
          <div>
            <p className="font-black uppercase tracking-[0.12em] text-slate-400">Problem</p>
            <p className="mt-1 font-semibold leading-relaxed">{idea.pain_point}</p>
          </div>
        )}
        {idea.suggested_automation && (
          <div>
            <p className="font-black uppercase tracking-[0.12em] text-slate-400">Automation</p>
            <p className="mt-1 font-semibold leading-relaxed">{idea.suggested_automation}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${status.color}`}>
          {status.label}
        </span>
        <span className="text-[11px] font-bold text-slate-500">{fmtDate(idea.target_date)}</span>
        {idea.project_name && <span className="text-[11px] font-bold text-slate-500">/ {idea.project_name}</span>}
        <select
          value={idea.status}
          onChange={(e) => onStatusChange(idea.id, e.target.value)}
          className="ml-auto rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-900 outline-none"
        >
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function AutomationIdeasPage() {
  const [ideas, setIdeas] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: 'all', department: 'all', priority: 'all', enabled: 'all' });
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        automationIdeasAPI.list(filters),
        automationIdeasAPI.stats(),
      ]);
      setIdeas(listRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load automation ideas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status, filters.department, filters.priority, filters.enabled]);

  const grouped = useMemo(() => {
    return STATUSES.reduce((acc, status) => {
      acc[status.key] = ideas.filter((idea) => idea.status === status.key);
      return acc;
    }, {});
  }, [ideas]);

  const setF = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await automationIdeasAPI.create(form);
      toast.success('Automation idea added');
      setForm(initialForm);
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save idea');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await automationIdeasAPI.update(id, { status });
      setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, status } : idea)));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const toggleEnabled = async (id, is_enabled) => {
    try {
      await automationIdeasAPI.update(id, { is_enabled });
      setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, is_enabled } : idea)));
      setStats((prev) => ({
        ...prev,
        enabled: Math.max(0, Number(prev.enabled || 0) + (is_enabled ? 1 : -1)),
        disabled: Math.max(0, Number(prev.disabled || 0) + (is_enabled ? -1 : 1)),
      }));
      toast.success(is_enabled ? 'Automation turned ON' : 'Automation turned OFF');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update automation switch');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-screen-2xl space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-950 text-white">
                <Bot className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">Automation Control Desk</p>
                <h1 className="text-2xl font-black text-slate-950">Automation Ideas</h1>
                <p className="mt-1 text-sm font-semibold text-slate-600">Capture ERP automation ideas, prioritize them, and track implementation.</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" /> Add Automation Idea
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard icon={Lightbulb} label="Total Ideas" value={stats.total} tone="bg-blue-50 text-blue-700" />
          <KpiCard icon={ToggleRight} label="Automation ON" value={stats.enabled} tone="bg-emerald-50 text-emerald-700" />
          <KpiCard icon={ToggleLeft} label="Automation OFF" value={stats.disabled} tone="bg-slate-100 text-slate-700" />
          <KpiCard icon={Clock3} label="Under Review" value={stats.review} tone="bg-slate-100 text-slate-700" />
          <KpiCard icon={Rocket} label="In Progress" value={stats.in_progress} tone="bg-indigo-50 text-indigo-700" />
          <KpiCard icon={CheckCircle2} label="Completed" value={stats.done} tone="bg-emerald-50 text-emerald-700" />
          <KpiCard icon={Zap} label="Urgent" value={stats.urgent} tone="bg-orange-50 text-orange-700" />
        </div>

        {showForm && (
          <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Idea Title</label>
                <input value={form.title} onChange={(e) => setF('title', e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500" placeholder="e.g. Auto update PO from uploaded PDF" />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Department</label>
                <select value={form.department} onChange={(e) => setF('department', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500">
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Module / Area</label>
                <select value={form.target_module} onChange={(e) => setF('target_module', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500">
                  {MODULES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Priority</label>
                <select value={form.priority} onChange={(e) => setF('priority', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500">
                  {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Target Date</label>
                <input type="date" value={form.target_date} onChange={(e) => setF('target_date', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setF('is_enabled', !form.is_enabled)}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-black transition ${form.is_enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}
                >
                  {form.is_enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  Automation {form.is_enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Current Problem</label>
                <textarea value={form.pain_point} onChange={(e) => setF('pain_point', e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500" placeholder="What manual work or mistake is happening now?" />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Suggested Automation</label>
                <textarea value={form.suggested_automation} onChange={(e) => setF('suggested_automation', e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500" placeholder="What should ERP do automatically?" />
              </div>
              <div className="lg:col-span-4">
                <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Expected Benefit</label>
                <input value={form.expected_benefit} onChange={(e) => setF('expected_benefit', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none focus:border-blue-500" placeholder="e.g. Avoid duplicate entry, reduce bill errors, save approval time" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Idea'}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500" placeholder="Search automation ideas..." />
            </div>
            <Filter className="hidden h-4 w-4 text-slate-400 xl:block" />
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none">
              <option value="all">All Status</option>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none">
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none">
              <option value="all">All Priority</option>
              {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <select value={filters.enabled} onChange={(e) => setFilters((f) => ({ ...f, enabled: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-950 outline-none">
              <option value="all">ON + OFF</option>
              <option value="on">Automation ON</option>
              <option value="off">Automation OFF</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-black text-slate-500">Loading automation ideas...</div>
        ) : ideas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-blue-200 bg-blue-50 p-10 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-blue-700" />
            <h2 className="mt-3 text-lg font-black text-slate-950">No automation ideas yet</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Start with recurring manual work, duplicate entry, reminders, alerts, or report preparation.</p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {STATUSES.filter((s) => grouped[s.key]?.length).map((status) => (
              <div key={status.key} className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-700" />
                    <p className="text-sm font-black text-slate-950">{status.label}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{grouped[status.key].length}</span>
                </div>
                {grouped[status.key].map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} onStatusChange={updateStatus} onToggle={toggleEnabled} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
