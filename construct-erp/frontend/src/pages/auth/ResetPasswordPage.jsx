import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { authAPI } from '../../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Reset token missing');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, new_password: password });
      toast.success('Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="mb-6">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-blue-700" />
          </div>
          <h1 className="text-xl font-medium text-slate-900 uppercase italic tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-900 font-medium mt-1">Create a new password for your ERP account.</p>
        </div>

        {!token && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm mb-5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            Reset token missing. Please request a fresh reset link.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[10px] font-medium text-slate-900 font-medium uppercase tracking-widest mb-2 block">New Password</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-blue-500"
                placeholder="Minimum 8 characters"
              />
              <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-900 font-medium uppercase tracking-widest mb-2 block">Confirm Password</label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-blue-500"
              placeholder="Re-enter password"
            />
          </div>

          <button disabled={loading || !token} className="w-full py-3 rounded-xl bg-[#0a2057] text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? 'Updating...' : 'Reset Password'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <Link to="/login" className="block text-center mt-5 text-xs font-medium text-blue-700 uppercase tracking-widest">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
