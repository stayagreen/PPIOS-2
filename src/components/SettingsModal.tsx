import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [settings, setSettings] = useState({
    model_prefix: '',
    model_start_number: '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    fetchApi('/settings').then(res => {
      setSettings({
        model_prefix: res.model_prefix || '',
        model_start_number: res.model_start_number || '',
      });
    }).catch(console.error);
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      alert('设置已保存');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    try {
      await fetchApi('/user/password', {
        method: 'PUT',
        body: JSON.stringify(passwords),
      });
      alert('密码已修改，请重新登录');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">系统设置</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">产品编号规则</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">产品型号前缀</label>
              <input value={settings.model_prefix} onChange={e => setSettings(s => ({ ...s, model_prefix: e.target.value }))} placeholder="例如: PPIOS" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">起始编号</label>
              <input type="number" value={settings.model_start_number} onChange={e => setSettings(s => ({ ...s, model_start_number: e.target.value }))} placeholder="例如: 1001" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存设置
            </button>
          </form>

          <hr className="border-slate-200" />

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">修改密码</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">原密码</label>
              <input type="password" required value={passwords.oldPassword} onChange={e => setPasswords(s => ({ ...s, oldPassword: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
              <input type="password" required value={passwords.newPassword} onChange={e => setPasswords(s => ({ ...s, newPassword: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <button type="submit" disabled={pwdLoading} className="w-full py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 disabled:opacity-50 flex justify-center items-center">
              {pwdLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              修改密码
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
