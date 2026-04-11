import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, FolderOpen } from 'lucide-react';
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
  net_weight: string;
  packaged_weight: string;
  factory_price: string;
  retail_price: string;
  light_source_spec: string;
  light_source_count: string;
  catalog_path: string;
  remark: string;
  main_image: string;
  size_image: string;
  other_images: string[];
  other_files: string[];
}

interface OtherImageUploadProps {
  onUpload: (file: File) => void;
}

function OtherImageUpload({ onUpload }: OtherImageUploadProps) {
  return (
    <div 
      onMouseDown={(e) => {
        e.currentTarget.focus();
      }}
      onDoubleClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        };
        input.click();
      }}
      onPaste={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              onUpload(file);
              break;
            }
          }
        }
      }}
      tabIndex={0}
      className="h-20 w-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/30"
      title="单击后粘贴，双击上传文件"
    >
      <Plus className="w-5 h-5 pointer-events-none" />
    </div>
  );
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('');
  const [skus, setSkus] = useState<SkuData[]>([{
    spec: '',
    size: '',
    net_weight: '',
    packaged_weight: '',
    factory_price: '',
    retail_price: '',
    light_source_spec: '',
    light_source_count: '',
    catalog_path: '',
    remark: '',
    main_image: '',
    size_image: '',
    other_images: [],
    other_files: [],
  }]);

  useEffect(() => {
    if (product) {
      setModel(product.model || '');
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
          catalog_path: s.catalog_path || '',
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
    setSkus([...skus, {
      spec: '',
      size: '',
      net_weight: '',
      packaged_weight: '',
      factory_price: '',
      retail_price: '',
      light_source_spec: '',
      light_source_count: '',
      catalog_path: '',
      remark: '',
      main_image: '',
      size_image: '',
      other_images: [],
      other_files: [],
    }]);
  };

  const removeSku = (index: number) => {
    if (skus.length <= 1) return;
    setSkus(skus.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (index: number, field: 'other_images' | 'other_files', file: File) => {
    try {
      const url = await uploadImage(file);
      setSkus(prev => {
        const newSkus = [...prev];
        const currentList = newSkus[index][field];
        if (currentList.length >= 10) {
          alert('最多只能添加10个');
          return prev;
        }
        newSkus[index] = { 
          ...newSkus[index], 
          [field]: [...currentList, url] 
        };
        return newSkus;
      });
    } catch (err) {
      alert('上传失败');
    }
  };

  const removeFile = (skuIndex: number, field: 'other_images' | 'other_files', fileIndex: number) => {
    const currentList = skus[skuIndex][field];
    handleSkuChange(skuIndex, field, currentList.filter((_, i) => i !== fileIndex));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        model,
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
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 mb-1">产品型号 <span className="text-red-500">*</span></label>
              <input required value={model} onChange={e => setModel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-lg font-medium text-slate-800">产品规格 (SKU)</h3>
                <button type="button" onClick={addSku} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> 添加规格
                </button>
              </div>

              {skus.map((sku, index) => (
                <div key={index} className="relative p-6 border border-slate-200 rounded-lg bg-slate-50/50 space-y-6">
                  {skus.length > 1 && (
                    <button type="button" onClick={() => removeSku(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">规格名称</label>
                      <input value={sku.spec} onChange={e => handleSkuChange(index, 'spec', e.target.value)} placeholder="例如: 大号 / 金色" className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">尺寸</label>
                      <input value={sku.size} onChange={e => handleSkuChange(index, 'size', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">净重 (kg)</label>
                      <input type="number" step="0.01" value={sku.net_weight} onChange={e => handleSkuChange(index, 'net_weight', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">含包装重量 (kg)</label>
                      <input type="number" step="0.01" value={sku.packaged_weight} onChange={e => handleSkuChange(index, 'packaged_weight', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">出厂价 (元)</label>
                      <input type="number" step="0.01" value={sku.factory_price} onChange={e => handleSkuChange(index, 'factory_price', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">建议零售价 (元)</label>
                      <input type="number" step="0.01" value={sku.retail_price} onChange={e => handleSkuChange(index, 'retail_price', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">光源规格</label>
                      <input value={sku.light_source_spec} onChange={e => handleSkuChange(index, 'light_source_spec', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">光源数量</label>
                      <input type="number" value={sku.light_source_count} onChange={e => handleSkuChange(index, 'light_source_count', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">产品图册目录</label>
                      <div className="flex gap-2">
                        <input 
                          value={sku.catalog_path} 
                          onChange={e => handleSkuChange(index, 'catalog_path', e.target.value)} 
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

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                    <textarea value={sku.remark} onChange={e => handleSkuChange(index, 'remark', e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"></textarea>
                  </div>

                  <div className="flex gap-8">
                    <ImageUpload
                      label="SKU图"
                      value={sku.main_image}
                      onChange={(url) => handleSkuChange(index, 'main_image', url)}
                    />
                    <ImageUpload
                      label="尺寸图"
                      value={sku.size_image}
                      onChange={(url) => handleSkuChange(index, 'size_image', url)}
                    />
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
                              input.onchange = (e: any) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(index, 'other_files', file);
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
