import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchApi } from '../lib/api';
import ImageUpload from './ImageUpload';

interface ProductModalProps {
  product?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    model: '',
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
  });

  useEffect(() => {
    if (product) {
      setFormData({
        model: product.model || '',
        spec: product.spec || '',
        size: product.size || '',
        net_weight: product.net_weight || '',
        packaged_weight: product.packaged_weight || '',
        factory_price: product.factory_price || '',
        retail_price: product.retail_price || '',
        light_source_spec: product.light_source_spec || '',
        light_source_count: product.light_source_count || '',
        catalog_path: product.catalog_path || '',
        remark: product.remark || '',
        main_image: product.main_image || '',
        size_image: product.size_image || '',
      });
    } else {
      // Fetch generated model
      fetchApi('/model/generate').then(res => {
        setFormData(prev => ({ ...prev, model: res.model }));
      }).catch(console.error);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        net_weight: formData.net_weight ? parseFloat(formData.net_weight) : null,
        packaged_weight: formData.packaged_weight ? parseFloat(formData.packaged_weight) : null,
        factory_price: formData.factory_price ? parseFloat(formData.factory_price) : null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        light_source_count: formData.light_source_count ? parseInt(formData.light_source_count) : null,
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">
            {product ? '编辑产品' : '新增产品'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品型号 <span className="text-red-500">*</span></label>
                <input required name="model" value={formData.model} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品规格</label>
                <input name="spec" value={formData.spec} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品尺寸</label>
                <input name="size" value={formData.size} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品净重 (kg)</label>
                <input type="number" step="0.01" name="net_weight" value={formData.net_weight} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">含包装重量 (kg)</label>
                <input type="number" step="0.01" name="packaged_weight" value={formData.packaged_weight} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">含光源出厂价 (元)</label>
                <input type="number" step="0.01" name="factory_price" value={formData.factory_price} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">建议零售价 (元)</label>
                <input type="number" step="0.01" name="retail_price" value={formData.retail_price} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">光源规格</label>
                <input name="light_source_spec" value={formData.light_source_spec} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">光源数量</label>
                <input type="number" name="light_source_count" value={formData.light_source_count} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品图册目录</label>
                <input name="catalog_path" value={formData.catalog_path} onChange={handleChange} placeholder="例如: D:\images\product001" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
              <textarea name="remark" value={formData.remark} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>

            <div className="flex gap-8">
              <ImageUpload
                label="主图"
                value={formData.main_image}
                onChange={(url) => setFormData(prev => ({ ...prev, main_image: url }))}
              />
              <ImageUpload
                label="尺寸图"
                value={formData.size_image}
                onChange={(url) => setFormData(prev => ({ ...prev, size_image: url }))}
              />
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
