import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, User, Phone, MapPin } from 'lucide-react';
import { fetchApi } from '../lib/api';
import SupplierModal from './SupplierModal';

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/suppliers');
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await fetchApi(`/suppliers/${id}`, { method: 'DELETE' });
      loadSuppliers();
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredSuppliers = (suppliers || []).filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">供应商管理</h1>
          <p className="text-slate-500 text-sm">管理您的产品供应商信息</p>
        </div>
        <button 
          onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          新增供应商
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索供应商名称或联系人..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">供应商名称</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">联系人</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">联系方式</th>
                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">地址</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
                    <span className="text-slate-500">加载中...</span>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    暂无供应商数据
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{s.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {s.contact_person || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {s.contact_info || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={s.address}>{s.address || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        {deleteConfirmId === s.id ? (
                          <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded border border-red-100">
                            <span className="text-[10px] text-red-600 font-medium">确认删除？</span>
                            <button 
                              onClick={() => handleDelete(s.id)} 
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
                            <button 
                              onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(s.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <SupplierModal 
          supplier={editingSupplier} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => { setIsModalOpen(false); loadSuppliers(); }} 
        />
      )}
    </div>
  );
}
