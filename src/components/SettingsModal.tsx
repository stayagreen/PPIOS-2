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

  const [exportTemplate, setExportTemplate] = useState<any>(null);

  useEffect(() => {
    fetchApi('/settings').then(res => {
      setSettings({
        model_prefix: res.model_prefix || '',
        model_start_number: res.model_start_number || '',
      });
      if (res.export_template) {
        setExportTemplate(JSON.parse(res.export_template));
      }
    }).catch(console.error);
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...settings,
          export_template: JSON.stringify(exportTemplate)
        }),
      });
      alert('设置已保存');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplateColumn = (index: number, field: string, value: any) => {
    const newColumns = [...exportTemplate.columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setExportTemplate({ ...exportTemplate, columns: newColumns });
  };

  const updateTemplateFont = (field: string, value: any) => {
    setExportTemplate({
      ...exportTemplate,
      font: { ...exportTemplate.font, [field]: value }
    });
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">系统设置</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto">
          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">产品编号规则</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">产品型号前缀</label>
                  <input value={settings.model_prefix} onChange={e => setSettings(s => ({ ...s, model_prefix: e.target.value }))} placeholder="例如: PPIOS" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">起始编号</label>
                  <input type="number" value={settings.model_start_number} onChange={e => setSettings(s => ({ ...s, model_start_number: e.target.value }))} placeholder="例如: 1001" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </section>

            <hr className="border-slate-100" />

            {exportTemplate && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Excel 导出模板</h3>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">字体设置</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">字体名称</label>
                      <input value={exportTemplate.font.name} onChange={e => updateTemplateFont('name', e.target.value)} className="w-full text-xs px-2 py-1 border border-slate-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">字号</label>
                      <input type="number" value={exportTemplate.font.size} onChange={e => updateTemplateFont('size', parseInt(e.target.value))} className="w-full text-xs px-2 py-1 border border-slate-300 rounded" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">颜色</label>
                      <input type="color" value={exportTemplate.font.color.startsWith('#') ? exportTemplate.font.color : '#' + exportTemplate.font.color} onChange={e => updateTemplateFont('color', e.target.value)} className="w-full h-6 p-0 border border-slate-300 rounded" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={exportTemplate.font.bold} onChange={e => updateTemplateFont('bold', e.target.checked)} className="rounded text-blue-600" />
                        <span className="text-xs text-slate-600">加粗</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">表头预览与编辑 (Excel 风格)</label>
                  <div className="overflow-x-auto border border-slate-300 rounded-lg bg-slate-100 p-1">
                    <div className="flex min-w-max">
                      {exportTemplate.columns.map((col: any, idx: number) => (
                        <div 
                          key={col.key} 
                          className={`flex flex-col w-32 border-r border-slate-300 last:border-r-0 transition-opacity ${!col.enabled ? 'opacity-50' : ''}`}
                        >
                          {/* Column Index / Letter (Excel style) */}
                          <div className="bg-slate-200 text-[10px] text-slate-500 text-center py-1 border-b border-slate-300 font-medium">
                            {String.fromCharCode(65 + (idx % 26))}{idx >= 26 ? Math.floor(idx / 26) : ''}
                          </div>
                          
                          {/* Header Input Cell */}
                          <div className="bg-white p-1">
                            <input 
                              value={col.header} 
                              onChange={e => updateTemplateColumn(idx, 'header', e.target.value)} 
                              className={`w-full text-xs px-2 py-1.5 border-none focus:ring-2 focus:ring-blue-500 outline-none text-center font-semibold ${!col.enabled ? 'text-slate-400' : 'text-slate-900'}`}
                              placeholder="表头名称"
                            />
                          </div>
                          
                          {/* Controls Cell */}
                          <div className="bg-slate-50 p-2 flex flex-col items-center gap-1 border-t border-slate-200">
                            <input 
                              type="checkbox" 
                              checked={col.enabled} 
                              onChange={e => updateTemplateColumn(idx, 'enabled', e.target.checked)} 
                              className="rounded text-blue-600 w-3 h-3 cursor-pointer" 
                            />
                            <span className="text-[9px] text-slate-400 font-mono truncate w-full text-center" title={col.key}>
                              {col.key}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">提示：左右滚动可查看更多列。点击单元格直接编辑表头文字，勾选下方复选框启用/禁用该列。</p>
                </div>
              </section>
            )}

            <button type="submit" disabled={loading} className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 flex justify-center items-center transition-colors">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存所有设置
            </button>
          </form>

          <hr className="border-slate-200" />

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">修改密码</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">原密码</label>
                <input type="password" required value={passwords.oldPassword} onChange={e => setPasswords(s => ({ ...s, oldPassword: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
                <input type="password" required value={passwords.newPassword} onChange={e => setPasswords(s => ({ ...s, newPassword: e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <button type="submit" disabled={pwdLoading} className="w-full py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200 disabled:opacity-50 flex justify-center items-center transition-colors">
              {pwdLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              修改密码
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
