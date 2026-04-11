import React, { useState, useEffect } from 'react';
import { X, Loader2, UserPlus, Trash2, Users, Layout } from 'lucide-react';
import { fetchApi } from '../lib/api';
import ExcelTemplateEditor from './ExcelTemplateEditor';

interface SettingsModalProps {
  user: any;
  onClose: () => void;
}

const DEFAULT_TEMPLATE = {
  header: {
    title: "产品列表清单",
    image: "",
    fontSize: 20,
    fontColor: "000000",
    bgColor: "FFFFFF",
    height: 40,
    enabled: false,
    align: "center",
    valign: "middle",
    bold: true,
    italic: false,
    underline: false
  },
  columns: [
    { key: "id", header: "产品ID", enabled: true },
    { key: "model", header: "产品型号", enabled: true },
    { key: "supplier_names", header: "供应商", enabled: true },
    { key: "spec", header: "规格名称", enabled: true },
    { key: "size", header: "尺寸", enabled: true },
    { key: "net_weight", header: "净重(kg)", enabled: true },
    { key: "packaged_weight", header: "含包装重量(kg)", enabled: true },
    { key: "factory_price", header: "出厂价(元)", enabled: true },
    { key: "retail_price", header: "零售价(元)", enabled: true },
    { key: "light_source_spec", header: "光源规格", enabled: true },
    { key: "light_source_count", header: "光源数量", enabled: true },
    { key: "catalog_path", header: "图册目录", enabled: true },
    { key: "remark", header: "备注", enabled: true },
    { key: "creator_name", header: "创建人", enabled: true },
    { key: "created_at", header: "创建时间", enabled: true }
  ],
  font: {
    name: "Arial",
    size: 11,
    color: "000000",
    bold: false
  }
};

export default function SettingsModal({ user, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'password'>('system');
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'operator' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [settings, setSettings] = useState({
    model_prefix: '',
    model_start_number: '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
  });

  const [exportTemplate, setExportTemplate] = useState<any>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);

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

    if (user.role === 'admin') {
      loadUsers();
    }
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
  };

  const loadUsers = async () => {
    try {
      const data = await fetchApi('/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserLoading(true);
    try {
      if (editingUser) {
        await fetchApi(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(userForm),
        });
        if (editingUser.id === user.id) {
          const updatedUser = { ...user, username: userForm.username };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          showNotification('个人信息已更新，请刷新页面以同步显示');
        } else {
          showNotification('用户信息已更新');
        }
      } else {
        if (!userForm.password) {
          throw new Error('新增用户必须填写密码');
        }
        await fetchApi('/users', {
          method: 'POST',
          body: JSON.stringify(userForm),
        });
        showNotification('用户已添加');
      }
      setUserForm({ username: '', password: '', role: 'operator' });
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setUserLoading(false);
    }
  };

  const startEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({ username: u.username, password: '', role: u.role });
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setUserForm({ username: '', password: '', role: 'operator' });
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await fetchApi(`/users/${id}`, { method: 'DELETE' });
      loadUsers();
      showNotification('用户已删除');
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      showNotification('设置已保存');
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (newTemplate: any) => {
    setExportTemplate(newTemplate);
    try {
      await fetchApi('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...settings,
          export_template: JSON.stringify(newTemplate)
        }),
      });
      showNotification('导出模板已更新');
    } catch (err: any) {
      showNotification('模板更新失败', 'error');
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

  const updateTemplateHeader = (field: string, value: any) => {
    setExportTemplate({
      ...exportTemplate,
      header: { ...exportTemplate.header, [field]: value }
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
      showNotification('密码已修改，请重新登录');
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      showNotification(err.message, 'error');
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

        <div className="flex border-b border-slate-100 px-6">
          <button 
            onClick={() => setActiveTab('system')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            系统参数
          </button>
          {user.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('users')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              用户管理
            </button>
          )}
          <button 
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'password' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            修改密码
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto flex-1 relative">
          {notification && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-md shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
              {notification.text}
            </div>
          )}
          {activeTab === 'system' && (
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Excel 导出设置</h3>
                    <button 
                      type="button"
                      onClick={() => setIsTemplateEditorOpen(true)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                    >
                      <Layout className="w-3.5 h-3.5" />
                      打开模板编辑器
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">点击上方按钮进入高级编辑器，可自定义 Excel 表头样式、标题、字体及列显示。</p>
                </section>
              )}

              <button type="submit" disabled={loading} className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 flex justify-center items-center transition-colors">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                保存所有设置
              </button>
            </form>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <div className="space-y-6">
              <form onSubmit={handleUserSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    {editingUser ? <Users className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />} 
                    {editingUser ? `编辑用户: ${editingUser.username}` : '新增用户'}
                  </h3>
                  {editingUser && (
                    <button type="button" onClick={cancelEditUser} className="text-xs text-slate-500 hover:text-slate-700">
                      取消编辑
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input 
                    required
                    placeholder="用户名"
                    value={userForm.username}
                    onChange={e => setUserForm(s => ({ ...s, username: e.target.value }))}
                    className="text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input 
                    required={!editingUser}
                    type="password"
                    placeholder={editingUser ? "留空则不修改密码" : "密码"}
                    value={userForm.password}
                    onChange={e => setUserForm(s => ({ ...s, password: e.target.value }))}
                    className="text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm(s => ({ ...s, role: e.target.value }))}
                    className="text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="operator">操作员</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
                <button type="submit" disabled={userLoading} className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center">
                  {userLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingUser ? '保存修改' : '添加用户'}
                </button>
              </form>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">用户名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">角色</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">{u.username}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                            {u.role === 'admin' ? '管理员' : '操作员'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                          {deleteConfirmId === u.id ? (
                            <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded border border-red-100">
                              <span className="text-[10px] text-red-600 font-medium">确认删除？</span>
                              <button 
                                onClick={() => { handleDeleteUser(u.id); setDeleteConfirmId(null); }} 
                                className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded hover:bg-red-700"
                              >
                                确定
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(null)} 
                                className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded hover:bg-slate-300"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => startEditUser(u)} className="text-blue-500 hover:text-blue-700 p-1">
                                <Users className="w-4 h-4" />
                              </button>
                              {u.id !== user.id && (
                                <button onClick={() => setDeleteConfirmId(u.id)} className="text-red-500 hover:text-red-700 p-1">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
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
          )}
        </div>
      </div>
      {isTemplateEditorOpen && (
        <ExcelTemplateEditor 
          initialTemplate={exportTemplate || DEFAULT_TEMPLATE} 
          onClose={() => setIsTemplateEditorOpen(false)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}
