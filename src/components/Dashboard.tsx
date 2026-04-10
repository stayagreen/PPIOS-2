import React, { useState, useEffect } from 'react';
import { Package2, Search, Plus, Download, Settings, LogOut, Image as ImageIcon, X } from 'lucide-react';
import { fetchApi, exportExcel } from '../lib/api';
import ProductModal from './ProductModal';
import SettingsModal from './SettingsModal';

interface DashboardProps {
  user: { id: number; username: string; role: string };
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadProducts = async () => {
    try {
      const data = await fetchApi('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个产品吗？')) return;
    try {
      await fetchApi(`/products/${id}`, { method: 'DELETE' });
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredProducts = products.filter(p => 
    !search || p.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Package2 className="w-6 h-6" />
            <h1 className="text-xl font-bold text-slate-900">PPIOS 产品管理系统</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{user.username}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                {user.role === 'admin' ? '管理员' : '操作员'}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" title="系统设置">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="退出登录">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="搜索产品型号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => exportExcel().catch(e => alert(e.message))}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              导出 Excel
            </button>
            <button
              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增产品
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">图片</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">产品型号</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">规格 / 尺寸</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">价格</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">创建信息</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <Package2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p>暂无产品数据</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {p.main_image ? (
                            <img src={p.main_image} alt="主图" onClick={() => setPreviewImage(p.main_image)} className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 border border-slate-200" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><ImageIcon className="w-4 h-4"/></div>
                          )}
                          {p.size_image ? (
                            <img src={p.size_image} alt="尺寸图" onClick={() => setPreviewImage(p.size_image)} className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 border border-slate-200" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div>{p.spec || '-'}</div>
                        <div className="text-xs text-slate-400">{p.size || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div>出厂: <span className="text-slate-900">¥{p.factory_price || '-'}</span></div>
                        <div className="text-xs text-slate-400">零售: ¥{p.retail_price || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div>{p.creator_name}</div>
                        <div className="text-xs text-slate-400">{p.created_at?.split('T')[0]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="text-blue-600 hover:text-blue-900 mr-4">编辑</button>
                        {(user.role === 'admin' || user.id === p.created_by) && (
                          <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900">删除</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      {isProductModalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={() => {
            setIsProductModalOpen(false);
            loadProducts();
          }}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 p-2">
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}
