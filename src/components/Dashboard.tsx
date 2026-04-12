import React, { useState, useEffect } from 'react';
import { Package2, Search, Plus, Download, Settings, LogOut, Image as ImageIcon, X, FolderOpen, Eye, FileText, Users, Info, Upload, ChevronDown, FileSpreadsheet, Folder } from 'lucide-react';
import { fetchApi, exportExcel } from '../lib/api';
import ProductModal from './ProductModal';
import SettingsModal from './SettingsModal';
import SupplierManagement from './SupplierManagement';
import ImportExcelModal from './ImportExcelModal';

interface DashboardProps {
  user: { id: number; username: string; role: string };
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products');

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetchApi(`/products/${id}`, { method: 'DELETE' });
      loadProducts();
      setSelectedIds(selectedIds.filter(i => i !== id));
      showNotification('产品已删除');
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const filteredProducts = (products || []).filter(p => 
    !search || p.model.toLowerCase().includes(search.toLowerCase())
  );

  const openDirectory = (path: string) => {
    if (!path) return;
    
    const copyPath = () => {
      navigator.clipboard.writeText(path);
      showNotification('由于浏览器安全限制无法直接打开，路径已复制到剪贴板，请在资源管理器中粘贴打开', 'success');
    };

    // Try to open file protocol
    // Note: Most browsers block this for security. 
    try {
      const win = window.open(`file:///${path.replace(/\\/g, '/')}`, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        copyPath();
      }
    } catch (e) {
      copyPath();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        {notification && (
          <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-md shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {notification.text}
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <Package2 className="w-6 h-6" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">PPIOS 产品管理</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1 ml-8 mr-auto">
            <button 
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              产品管理
            </button>
            <button 
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'suppliers' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              供应商管理
            </button>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block text-sm text-slate-600">
              <span className="font-medium text-slate-900">{user.username}</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                {user.role === 'admin' ? '管理员' : '操作员'}
              </span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1"></div>
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" title="系统设置">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="退出登录">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex gap-2">
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium text-center transition-colors ${activeTab === 'products' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 bg-slate-50'}`}
        >
          产品管理
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium text-center transition-colors ${activeTab === 'suppliers' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 bg-slate-50'}`}
        >
          供应商管理
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'suppliers' ? (
          <SupplierManagement />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1 sm:max-w-xs">
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
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="relative">
              <button
                onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                导入产品
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              {isImportDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsImportDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                    <button
                      onClick={() => {
                        setIsImportDropdownOpen(false);
                        setIsImportExcelModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      从Excel文件导入
                    </button>
                    <button
                      onClick={() => {
                        setIsImportDropdownOpen(false);
                        alert('从文件夹导入功能开发中...');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Folder className="w-4 h-4 text-blue-600" />
                      从文件夹导入
                    </button>
                    <button
                      onClick={() => {
                        setIsImportDropdownOpen(false);
                        alert('从供应商报表导入功能开发中...');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-purple-600" />
                      从供应商报表导入
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => exportExcel(selectedIds).catch(e => alert(e.message))}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              {selectedIds.length > 0 ? `导出已选(${selectedIds.length})` : '导出全部'}
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

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">图片</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">产品型号</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">材质</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">供应商</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">规格 / 尺寸</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">价格</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">创建信息</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      <Package2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p>暂无产品数据</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.flatMap((p) => 
                    p.skus.map((sku: any, skuIndex: number) => (
                      <tr 
                        key={`${p.id}-${skuIndex}`} 
                        className="hover:bg-slate-50 transition-colors cursor-default"
                        onDoubleClick={() => setViewingProduct(p)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onDoubleClick={(e) => e.stopPropagation()}>
                          {skuIndex === 0 && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                              checked={selectedIds.includes(p.id)}
                              onChange={() => toggleSelect(p.id)}
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {sku.main_image ? (
                              <img src={sku.main_image} alt="SKU图" onClick={() => setPreviewImage(sku.main_image)} className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 border border-slate-200" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><ImageIcon className="w-4 h-4"/></div>
                            )}
                            {sku.size_image ? (
                              <img src={sku.size_image} alt="尺寸图" onClick={() => setPreviewImage(sku.size_image)} className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 border border-slate-200" />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-900">{p.model}</div>
                            {p.catalog_path && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); openDirectory(p.catalog_path); }}
                                className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                title={`打开目录: ${p.catalog_path}`}
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{sku.spec || '默认规格'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{p.material || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {p.suppliers && p.suppliers.length > 0 ? (
                            <div className="group relative inline-block">
                              <span className="text-sm text-slate-600 border-b border-dotted border-slate-400 cursor-help flex items-center gap-1">
                                {p.suppliers.map((s: any) => s.name).join(", ")}
                                <Info className="w-3 h-3 text-slate-400" />
                              </span>
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-3">
                                  {p.suppliers.map((s: any, idx: number) => (
                                    <div key={s.id} className={idx > 0 ? "pt-2 border-t border-slate-700" : ""}>
                                      <p className="font-bold pb-1 mb-1 flex justify-between items-center">
                                        <span>{s.name}</span>
                                        {s.factory_model && <span className="text-[10px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">厂家型号: {s.factory_model}</span>}
                                      </p>
                                      <p className="flex items-center gap-2"><span className="text-slate-400">联系人:</span> {s.contact_person || '-'}</p>
                                      <p className="flex items-center gap-2"><span className="text-slate-400">联系方式:</span> {s.contact_info || '-'}</p>
                                      <p className="flex items-start gap-2"><span className="text-slate-400 shrink-0">地址:</span> <span className="break-words">{s.address || '-'}</span></p>
                                    </div>
                                  ))}
                                </div>
                                <div className="absolute left-4 top-full w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>{sku.size || '-'}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {sku.net_weight ? `${sku.net_weight}kg` : '-'} / {sku.packaged_weight ? `${sku.packaged_weight}kg` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <div>出厂: <span className="text-slate-900">¥{sku.factory_price || '-'}</span></div>
                          <div className="text-xs text-slate-400">零售: ¥{sku.retail_price || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <div>{p.creator_name}</div>
                          <div className="text-xs text-slate-400">{p.created_at?.split('T')[0]}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {skuIndex === 0 && (
                            <div className="flex justify-end items-center gap-3">
                              {deleteConfirmId === p.id ? (
                                <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded border border-red-100">
                                  <span className="text-[10px] text-red-600 font-medium">确认删除？</span>
                                  <button 
                                    onClick={() => { handleDelete(p.id); setDeleteConfirmId(null); }} 
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
                                  <button onClick={() => setViewingProduct(p)} className="text-slate-600 hover:text-slate-900">查看</button>
                                  <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="text-blue-600 hover:text-blue-900">编辑</button>
                                  {(user.role === 'admin' || user.id === p.created_by) && (
                                    <button onClick={() => setDeleteConfirmId(p.id)} className="text-red-600 hover:text-red-900">删除</button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200">
              <Package2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p>暂无产品数据</p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div 
                key={p.id} 
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                onDoubleClick={() => setViewingProduct(p)}
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between" onDoubleClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{p.model}</span>
                      {p.catalog_path && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDirectory(p.catalog_path); }}
                          className="p-1.5 text-blue-500 bg-blue-50 rounded-lg transition-colors"
                          title="打开目录"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {deleteConfirmId === p.id ? (
                      <div className="flex items-center gap-2 bg-red-50 px-2 py-1 rounded border border-red-100">
                        <span className="text-[10px] text-red-600 font-medium">确认删除？</span>
                        <button 
                          onClick={() => { handleDelete(p.id); setDeleteConfirmId(null); }} 
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
                        <button onClick={() => setViewingProduct(p)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">查看</button>
                        <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">编辑</button>
                        {(user.role === 'admin' || user.id === p.created_by) && (
                          <button onClick={() => setDeleteConfirmId(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">删除</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {p.skus.map((sku: any, idx: number) => (
                    <div key={idx} className="p-4 flex gap-4">
                      <div className="flex flex-col gap-2">
                        {sku.main_image ? (
                          <img src={sku.main_image} alt="SKU" onClick={() => setPreviewImage(sku.main_image)} className="h-16 w-16 rounded object-cover border border-slate-200" />
                        ) : (
                          <div className="h-16 w-16 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><ImageIcon className="w-6 h-6"/></div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium text-slate-900 flex items-center justify-between">
                          <span>{sku.spec || '默认规格'}</span>
                        </div>
                        {p.supplier_name && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" />
                            {p.supplier_name}
                          </div>
                        )}
                        <div className="text-xs text-slate-500">{sku.size || '-'}</div>
                        <div className="flex justify-between items-end mt-2">
                          <div className="text-xs text-slate-500">
                            <div>出厂: <span className="text-slate-900 font-medium">¥{sku.factory_price || '-'}</span></div>
                            <div>零售: ¥{sku.retail_price || '-'}</div>
                          </div>
                          <div className="text-[10px] text-slate-400 text-right">
                            {p.creator_name}<br/>{p.created_at?.split('T')[0]}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    )}
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
        <SettingsModal user={user} onClose={() => setIsSettingsModalOpen(false)} />
      )}

      {/* View Product Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-slate-900">查看产品详情 - {viewingProduct.model}</h3>
                {viewingProduct.catalog_path && (
                  <button 
                    onClick={() => openDirectory(viewingProduct.catalog_path)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    打开图册目录
                  </button>
                )}
              </div>
              <button onClick={() => setViewingProduct(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Product Level Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">供应商信息</p>
                  {viewingProduct.suppliers && viewingProduct.suppliers.length > 0 ? (
                    <div className="space-y-3">
                      {viewingProduct.suppliers.map((s: any) => (
                        <div key={s.id} className="text-sm font-medium text-slate-900">
                          <p>{s.name}</p>
                          <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                            <p>联系人: {s.contact_person || '-'}</p>
                            <p>电话: {s.contact_info || '-'}</p>
                            <p className="truncate" title={s.address}>地址: {s.address || '-'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-900">未设置</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">创建信息</p>
                  <p className="text-sm font-medium text-slate-900">{viewingProduct.creator_name}</p>
                  <p className="text-xs text-slate-500">{new Date(viewingProduct.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">图册目录</p>
                  <p className="text-sm font-medium text-slate-900 truncate" title={viewingProduct.catalog_path}>{viewingProduct.catalog_path || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">材质</p>
                  <p className="text-sm font-medium text-slate-900">{viewingProduct.material || '-'}</p>
                </div>
              </div>

              {viewingProduct.skus.map((sku: any, idx: number) => (
                <div key={idx} className="border border-slate-200 rounded-xl p-6 space-y-6 bg-white shadow-sm">
                  <div className="flex flex-wrap gap-6 items-start">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {sku.main_image && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-500">主图</p>
                            <div className="relative group cursor-zoom-in" onClick={() => setPreviewImage(sku.main_image)}>
                              <img src={sku.main_image} alt="主图" className="h-32 w-32 object-cover rounded-lg border border-slate-200" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white text-xs font-medium">点击放大</div>
                            </div>
                          </div>
                        )}
                        {sku.size_image && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-500">尺寸图</p>
                            <div className="relative group cursor-zoom-in" onClick={() => setPreviewImage(sku.size_image)}>
                              <img src={sku.size_image} alt="尺寸图" className="h-32 w-32 object-cover rounded-lg border border-slate-200" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white text-xs font-medium">点击放大</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-[240px] grid grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500">规格</p>
                        <p className="text-sm text-slate-900">{sku.spec || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">尺寸</p>
                        <p className="text-sm text-slate-900">{sku.size || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">净重 / 包装重量</p>
                        <p className="text-sm text-slate-900">{sku.net_weight || '-'}kg / {sku.packaged_weight || '-'}kg</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">价格 (出厂/零售)</p>
                        <p className="text-sm text-slate-900">¥{sku.factory_price || '-'} / ¥{sku.retail_price || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-slate-500">光源信息</p>
                        <p className="text-sm text-slate-900">{sku.light_source_spec || '-'} ({sku.light_source_count || '0'}个)</p>
                      </div>
                    </div>
                  </div>

                  {sku.other_images?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500">其它图片</p>
                      <div className="flex flex-wrap gap-3">
                        {sku.other_images.map((img: string, i: number) => (
                          <div key={i} className="relative group cursor-zoom-in" onClick={() => setPreviewImage(img)}>
                            <img src={img} alt={`其它图片 ${i+1}`} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-white text-[10px] font-medium">放大</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sku.other_files?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500">其它文件</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sku.other_files.map((file: string, i: number) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 group">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <span className="text-xs text-slate-600 truncate">{file.split('/').pop()}</span>
                            </div>
                            <a href={file} download target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1">下载</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sku.remark && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-1">备注</p>
                      <p className="text-sm text-slate-600 italic">{sku.remark}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setViewingProduct(null)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">关闭</button>
            </div>
          </div>
        </div>
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

      {isImportExcelModalOpen && (
        <ImportExcelModal 
          onClose={() => setIsImportExcelModalOpen(false)} 
          onSuccess={() => {
            setIsImportExcelModalOpen(false);
            loadProducts();
          }} 
        />
      )}
    </div>
  );
}
