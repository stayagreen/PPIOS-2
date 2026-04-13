import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, FolderOpen, Copy } from 'lucide-react';
import { fetchApi, uploadImage } from '../lib/api';
import ImageUpload from './ImageUpload';

interface ProductModalProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface SkuData {
  id?: number;
  spec: string;
  size: string;
  material?: string;
  net_weight: string;
  packaged_weight: string;
  factory_price: string;
  retail_price: string;
  light_source_spec: string;
  light_source_count: string;
  remark: string;
  main_image: string;
  size_image: string;
  other_images: string[];
  other_files: string[];
}

interface OtherImageUploadProps {
  onUpload: (files: FileList) => void;
}

function OtherImageUpload({ onUpload }: OtherImageUploadProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div 
      onClick={(e) => {
        if (isMobile) {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = (e: any) => {
            const files = e.target.files;
            if (files && files.length > 0) onUpload(files);
          };
          input.click();
        } else {
          e.currentTarget.focus();
        }
      }}
      onDoubleClick={() => {
        if (!isMobile) {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = (e: any) => {
            const files = e.target.files;
            if (files && files.length > 0) onUpload(files);
          };
          input.click();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const items = e.clipboardData.items;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) files.push(file);
          }
        }
        if (files.length > 0) {
          // Mock FileList for consistency
          const dataTransfer = new DataTransfer();
          files.forEach(f => dataTransfer.items.add(f));
          onUpload(dataTransfer.files);
        }
      }}
      tabIndex={0}
      className="h-20 w-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/30"
      title={isMobile ? "点击上传图片" : "单击后粘贴，双击上传文件"}
    >
      <Plus className="w-5 h-5 pointer-events-none" />
    </div>
  );
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [catalogPath, setCatalogPath] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<{ id: number, name: string, factory_model: string }[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [activeSkuIndex, setActiveSkuIndex] = useState(0);
  const [skus, setSkus] = useState<SkuData[]>([{
    spec: '',
    size: '',
    net_weight: '',
    packaged_weight: '',
    factory_price: '',
    retail_price: '',
    light_source_spec: '',
    light_source_count: '',
    remark: '',
    material: '',
    main_image: '',
    size_image: '',
    other_images: [],
    other_files: [],
  }]);

  useEffect(() => {
    // Load suppliers
    fetchApi('/suppliers').then(setSuppliers).catch(console.error);

    if (product) {
      setModel(product.model || '');
      setCatalogPath(product.catalog_path ? product.catalog_path.replace(/^file:\/\/\//, '') : '');
      if (product.suppliers) {
        setSelectedSuppliers(product.suppliers.map((s: any) => ({
          id: s.id,
          name: s.name,
          factory_model: s.factory_model || ''
        })));
      }
      if (product.skus && product.skus.length > 0) {
        setSkus(product.skus.map((s: any) => ({
          id: s.id,
          spec: s.spec || '',
          size: s.size || '',
          net_weight: s.net_weight?.toString() || '',
          packaged_weight: s.packaged_weight?.toString() || '',
          factory_price: s.factory_price?.toString() || '',
          retail_price: s.retail_price?.toString() || '',
          light_source_spec: s.light_source_spec || '',
          light_source_count: s.light_source_count?.toString() || '',
          material: s.material || '',
          remark: s.remark || '',
          main_image: s.main_image || '',
          size_image: s.size_image || '',
          other_images: s.other_images || [],
          other_files: s.other_files || [],
        })));
      }
    } else {
      fetchApi('/model/generate').then(res => {
        setModel(res.model || '');
      }).catch(console.error);
    }
  }, [product]);

  const handleSkuChange = (index: number, field: keyof SkuData, value: any) => {
    const newSkus = [...skus];
    newSkus[index] = { ...newSkus[index], [field]: value };
    setSkus(newSkus);
  };

  const addSku = () => {
    const newIndex = skus.length;
    setSkus([...skus, {
      spec: '',
      size: '',
      net_weight: '',
      packaged_weight: '',
      factory_price: '',
      retail_price: '',
      light_source_spec: '',
      light_source_count: '',
      remark: '',
      main_image: '',
      size_image: '',
      other_images: [],
      other_files: [],
    }]);
    setActiveSkuIndex(newIndex);
  };

  const removeSku = (index: number) => {
    if (skus.length <= 1) return;
    const newSkus = (skus || []).filter((_, i) => i !== index);
    setSkus(newSkus);
    if (activeSkuIndex >= newSkus.length) {
      setActiveSkuIndex(newSkus.length - 1);
    } else if (activeSkuIndex === index && index > 0) {
      setActiveSkuIndex(index - 1);
    }
  };

  const handleFileUpload = async (index: number, field: 'other_images' | 'other_files', files: FileList) => {
    try {
      const uploadPromises = Array.from(files).map(file => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      
      setSkus(prev => {
        const newSkus = [...prev];
        const currentList = newSkus[index][field];
        
        // Filter out files that would exceed the limit
        const remainingSlots = 10 - currentList.length;
        const filesToAdd = urls.slice(0, remainingSlots);
        
        if (urls.length > remainingSlots) {
          alert(`最多只能添加10个，已截断多余文件`);
        }
        
        newSkus[index] = { 
          ...newSkus[index], 
          [field]: [...currentList, ...filesToAdd] 
        };
        return newSkus;
      });
    } catch (err) {
      alert('上传失败');
    }
  };

  const removeFile = (skuIndex: number, field: 'other_images' | 'other_files', fileIndex: number) => {
    const currentList = skus[skuIndex][field] || [];
    handleSkuChange(skuIndex, field, currentList.filter((_, i) => i !== fileIndex));
  };

  const applyToAll = (field: keyof SkuData) => {
    if (skus.length <= 1) return;
    const value = skus[activeSkuIndex][field];
    setSkus(skus.map(sku => ({ ...sku, [field]: value })));
  };

  const toggleSupplier = (supplier: any) => {
    setSelectedSuppliers(prev => {
      const exists = prev.find(s => s.id === supplier.id);
      if (exists) {
        return (prev || []).filter(s => s.id !== supplier.id);
      } else {
        return [...(prev || []), { id: supplier.id, name: supplier.name, factory_model: '' }];
      }
    });
  };

  const handleSupplierFactoryModelChange = (id: number, value: string) => {
    setSelectedSuppliers(prev => prev.map(s => s.id === id ? { ...s, factory_model: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        model,
        catalog_path: catalogPath.replace(/^file:\/\/\//, ''),
        suppliers: selectedSuppliers.map(s => ({
          id: s.id,
          factory_model: s.factory_model
        })),
        skus: skus.map(sku => ({
          ...sku,
          net_weight: sku.net_weight ? parseFloat(sku.net_weight) : null,
          packaged_weight: sku.packaged_weight ? parseFloat(sku.packaged_weight) : null,
          factory_price: sku.factory_price ? parseFloat(sku.factory_price) : null,
          retail_price: sku.retail_price ? parseFloat(sku.retail_price) : null,
          light_source_count: sku.light_source_count ? parseInt(sku.light_source_count) : null,
        })),
      };

      if (product) {
        await fetchApi(`/products/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">
            {product ? '编辑产品' : '新增产品'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品型号 <span className="text-red-500">*</span></label>
                <input required value={model} onChange={e => setModel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">供应商与厂家型号 (多选)</label>
                <div className="relative">
                  <div 
                    onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm flex flex-wrap gap-2 min-h-[38px] cursor-pointer hover:border-blue-400 transition-colors pr-8 relative"
                  >
                    {selectedSuppliers.length > 0 ? (
                      selectedSuppliers.map(s => (
                        <div key={s.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1 pr-2" onClick={e => e.stopPropagation()}>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium border border-blue-100 truncate max-w-[100px]">
                            {s.name}
                          </span>
                          <input 
                            placeholder="厂家型号"
                            value={s.factory_model}
                            onChange={e => handleSupplierFactoryModelChange(s.id, e.target.value)}
                            className="w-24 px-1.5 py-0.5 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <X className="w-3 h-3 text-slate-400 cursor-pointer hover:text-red-500" onClick={() => toggleSupplier(s)} />
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400">选择供应商</span>
                    )}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${isSupplierDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {isSupplierDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSupplierDropdownOpen(false)}></div>
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                        {suppliers.map(s => (
                          <label key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                            <input 
                              type="checkbox" 
                              checked={selectedSuppliers.some(sup => sup.id === s.id)}
                              onChange={() => toggleSupplier(s)}
                              className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <span className="text-xs text-slate-700 truncate">{s.name}</span>
                          </label>
                        ))}
                        {suppliers.length === 0 && <p className="text-[10px] text-slate-400 p-3 text-center">暂无供应商</p>}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品图册目录</label>
                <div className="flex gap-2">
                  <input 
                    value={catalogPath} 
                    onChange={e => setCatalogPath(e.target.value)} 
                    placeholder="例如: C:\Photos 或 \\Server\Share"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm" 
                  />
                  <div 
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-400 cursor-help"
                    title="由于浏览器安全限制，无法直接选择本地目录。请手动输入或在资源管理器中“复制为路径”后在此粘贴。"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">支持本地绝对路径与网络共享文件夹地址。</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-lg font-medium text-slate-800">产品规格 (SKU)</h3>
                <button type="button" onClick={addSku} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> 添加规格
                </button>
              </div>

              {/* SKU Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {skus.map((sku, index) => (
                  <div key={index} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveSkuIndex(index)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-x border-t transition-colors ${
                        activeSkuIndex === index
                          ? 'bg-white border-slate-200 text-blue-600 -mb-px z-10'
                          : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {sku.spec || `规格 ${index + 1}`}
                    </button>
                    {skus.length > 1 && activeSkuIndex === index && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSku(index);
                        }}
                        className="ml-[-8px] mr-2 z-20 text-slate-400 hover:text-red-500 bg-white rounded-full p-0.5"
                        title="删除此规格"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {skus.map((sku, index) => (
                <div 
                  key={index} 
                  className={`${activeSkuIndex === index ? 'block' : 'hidden'} p-6 border border-slate-200 rounded-lg bg-white space-y-6 shadow-sm`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">规格名称</label>
                        <button type="button" onClick={() => applyToAll('spec')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input value={sku.spec} onChange={e => handleSkuChange(index, 'spec', e.target.value)} placeholder="例如: 大号 / 金色" className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">尺寸</label>
                        <button type="button" onClick={() => applyToAll('size')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input value={sku.size} onChange={e => handleSkuChange(index, 'size', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">材质</label>
                        <button type="button" onClick={() => applyToAll('material')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input value={sku.material || ''} onChange={e => handleSkuChange(index, 'material', e.target.value)} placeholder="例如: 铁+铝+亚克力" className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">净重 (kg)</label>
                        <button type="button" onClick={() => applyToAll('net_weight')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input type="number" step="0.01" value={sku.net_weight} onChange={e => handleSkuChange(index, 'net_weight', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">含包装重量 (kg)</label>
                        <button type="button" onClick={() => applyToAll('packaged_weight')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input type="number" step="0.01" value={sku.packaged_weight} onChange={e => handleSkuChange(index, 'packaged_weight', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">出厂价 (元)</label>
                        <button type="button" onClick={() => applyToAll('factory_price')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input type="number" step="0.01" value={sku.factory_price} onChange={e => handleSkuChange(index, 'factory_price', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">建议零售价 (元)</label>
                        <button type="button" onClick={() => applyToAll('retail_price')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input type="number" step="0.01" value={sku.retail_price} onChange={e => handleSkuChange(index, 'retail_price', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">光源规格</label>
                        <button type="button" onClick={() => applyToAll('light_source_spec')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input value={sku.light_source_spec} onChange={e => handleSkuChange(index, 'light_source_spec', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">光源数量</label>
                        <button type="button" onClick={() => applyToAll('light_source_count')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input type="number" value={sku.light_source_count} onChange={e => handleSkuChange(index, 'light_source_count', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">备注</label>
                        <button type="button" onClick={() => applyToAll('remark')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <input value={sku.remark} onChange={e => handleSkuChange(index, 'remark', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                  </div>

                  <div className="flex gap-8">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700">SKU图</label>
                        <button type="button" onClick={() => applyToAll('main_image')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <ImageUpload
                        label=""
                        value={sku.main_image}
                        onChange={(url) => handleSkuChange(index, 'main_image', url)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-700">尺寸图</label>
                        <button type="button" onClick={() => applyToAll('size_image')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                      </div>
                      <ImageUpload
                        label=""
                        value={sku.size_image}
                        onChange={(url) => handleSkuChange(index, 'size_image', url)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">其它图片 (最多10张)</label>
                      <div className="flex flex-wrap gap-4">
                        {sku.other_images.map((img, imgIdx) => (
                          <div key={imgIdx} className="relative group">
                            <img src={img} alt="其它图片" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                            <button
                              type="button"
                              onClick={() => removeFile(index, 'other_images', imgIdx)}
                              className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {sku.other_images.length < 10 && (
                          <OtherImageUpload onUpload={(file) => handleFileUpload(index, 'other_images', file)} />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">其它文件 (最多10个)</label>
                      <div className="space-y-2">
                        {sku.other_files.map((file, fileIdx) => (
                          <div key={fileIdx} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-xs text-slate-600 truncate max-w-[200px]">{file.split('/').pop()}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(index, 'other_files', fileIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {sku.other_files.length < 10 && (
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.onchange = (e: any) => {
                                const files = e.target.files;
                                if (files && files.length > 0) handleFileUpload(index, 'other_files', files);
                              };
                              input.click();
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                          >
                            <Plus className="w-3 h-3 mr-1" /> 添加文件
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            取消
          </button>
          <button type="submit" form="product-form" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
