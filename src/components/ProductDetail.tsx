import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Edit, Trash2, FolderOpen, Loader2, X, FileText, Download } from 'lucide-react';
import { fetchApi } from '../lib/api';
import ImageGallery from './ImageGallery';
import { toPng } from 'html-to-image';

interface ProductDetailProps {
  user: { id: number; username: string; role: string };
  productId: number;
  onBack: () => void;
  onEdit: () => void;
}

export default function ProductDetail({ user, productId, onBack, onEdit }: ProductDetailProps) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSkuIndex, setActiveSkuIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApi(`/products/${productId}`).then(setProduct).catch(console.error).finally(() => setLoading(false));
  }, [productId]);

  const handleDelete = async () => {
    try {
      await fetchApi(`/products/${productId}`, { method: 'DELETE' });
      onBack();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openDirectory = (path: string) => {
    if (!path) return;
    const cleanPath = path.replace(/^file:\/\/\//, '');
    try {
      const win = window.open(`file:///${cleanPath.replace(/\\/g, '/')}`, '_blank');
      if (!win || win.closed) {
        navigator.clipboard.writeText(cleanPath);
      }
    } catch (e) {
      navigator.clipboard.writeText(cleanPath);
    }
  };

  const handleSaveAsImage = async () => {
    if (!contentRef.current || !product) return;
    setSaving(true);
    try {
      const imgs = contentRef.current.querySelectorAll('img');
      await Promise.all(
        Array.from(imgs).map(
          (img: HTMLImageElement) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            })
        )
      );
      await new Promise((r) => setTimeout(r, 300));
      const dataUrl = await toPng(contentRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        width: contentRef.current.scrollWidth,
        height: contentRef.current.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `${product.model}-产品详情.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存图片失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">产品不存在或已被删除</p>
          <button onClick={onBack} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">返回列表</button>
        </div>
      </div>
    );
  }

  const activeSku = product.skus?.[activeSkuIndex] || null;
  const canEdit = user.role === 'admin' || user.id === product.created_by;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg font-semibold text-slate-900">{product.model}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveAsImage}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              保存为图片
            </button>
            {canEdit && (
              <>
                {deleteConfirm ? (
                  <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                    <span className="text-xs text-red-600">确认删除？</span>
                    <button onClick={handleDelete} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">确定</button>
                    <button onClick={() => setDeleteConfirm(false)} className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-300">取消</button>
                  </div>
                ) : (
                  <>
                    <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <Edit className="w-4 h-4" /> 编辑
                    </button>
                    <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4" /> 删除
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
          <div ref={contentRef} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <ImageGallery images={product.main_images || []} />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{product.model}</h2>
                {product.material && (
                  <p className="text-sm text-slate-500 mt-1">材质: {product.material}</p>
                )}
              </div>

              {product.skus && product.skus.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-slate-500">价格区间</span>
                    <span className="text-2xl font-bold text-orange-600">
                      ¥{Math.min(...product.skus.map((s: any) => s.factory_price || 0))} - ¥{Math.max(...product.skus.map((s: any) => s.factory_price || 0))}
                    </span>
                    <span className="text-xs text-slate-400">出厂价</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm text-slate-500">零售价</span>
                    <span className="text-lg font-semibold text-red-500">
                      ¥{Math.min(...product.skus.map((s: any) => s.retail_price || 0))} - ¥{Math.max(...product.skus.map((s: any) => s.retail_price || 0))}
                    </span>
                  </div>
                </div>
              )}

              {product.skus && product.skus.length > 1 && (
                <div>
                  <span className="text-sm font-medium text-slate-700 mb-2 block">规格选择</span>
                  <div className="flex flex-wrap gap-2">
                    {product.skus.map((sku: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSkuIndex(idx)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          idx === activeSkuIndex
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {sku.spec || `规格 ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeSku && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">规格:</span> <span className="text-slate-900">{activeSku.spec || '-'}</span></div>
                  <div><span className="text-slate-500">尺寸:</span> <span className="text-slate-900">{activeSku.size || '-'}</span></div>
                  <div><span className="text-slate-500">净重:</span> <span className="text-slate-900">{activeSku.net_weight ? `${activeSku.net_weight}kg` : '-'}</span></div>
                  <div><span className="text-slate-500">含包装重量:</span> <span className="text-slate-900">{activeSku.packaged_weight ? `${activeSku.packaged_weight}kg` : '-'}</span></div>
                  <div><span className="text-slate-500">出厂价:</span> <span className="text-slate-900 font-medium">¥{activeSku.factory_price || '-'}</span></div>
                  <div><span className="text-slate-500">零售价:</span> <span className="text-red-500 font-medium">¥{activeSku.retail_price || '-'}</span></div>
                  {activeSku.light_source_spec && (
                    <div><span className="text-slate-500">光源:</span> <span className="text-slate-900">{activeSku.light_source_spec} ({activeSku.light_source_count || 0}个)</span></div>
                  )}
                  {activeSku.remark && (
                    <div className="col-span-2"><span className="text-slate-500">备注:</span> <span className="text-slate-900">{activeSku.remark}</span></div>
                  )}
                </div>
              )}

              {activeSku && (activeSku.main_image || activeSku.size_image) && (
                <div className="flex gap-4 pt-2">
                  {activeSku.main_image && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">SKU图</p>
                      <img src={activeSku.main_image} alt="SKU图" onClick={() => setPreviewImage(activeSku.main_image)} className="h-24 w-24 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-80" />
                    </div>
                  )}
                  {activeSku.size_image && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">尺寸图</p>
                      <img src={activeSku.size_image} alt="尺寸图" onClick={() => setPreviewImage(activeSku.size_image)} className="h-24 w-24 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-80" />
                    </div>
                  )}
                </div>
              )}

              {product.suppliers && product.suppliers.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-sm font-medium text-slate-700 block mb-2">供应商</span>
                  <div className="space-y-2">
                    {product.suppliers.map((s: any) => (
                      <div key={s.id} className="text-sm text-slate-600 flex items-center gap-2">
                        <span className="font-medium text-slate-900">{s.name}</span>
                        {s.factory_model && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">厂家型号: {s.factory_model}</span>}
                        {s.contact_info && <span className="text-xs text-slate-400">{s.contact_info}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.catalog_path && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-sm text-slate-500">图册目录:</span>
                  <span className="text-sm text-slate-900 truncate max-w-[300px]" title={product.catalog_path.replace(/^file:\/\/\//, '')}>{product.catalog_path.replace(/^file:\/\/\//, '')}</span>
                  <button onClick={() => openDirectory(product.catalog_path)} className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors">
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                创建人: {product.creator_name} | 创建时间: {new Date(product.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {product.detail_images && product.detail_images.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">商品详情</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {product.detail_images.map((img: string, idx: number) => (
                <div key={idx} className="flex justify-center p-4">
                  <img
                    src={img}
                    alt={`详情图 ${idx + 1}`}
                    onClick={() => setPreviewImage(img)}
                    className="max-w-full rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {product.skus && product.skus.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-800">规格参数</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">规格</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">尺寸</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">材质</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">净重</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">包装重量</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">出厂价</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">零售价</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">光源</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.skus.map((sku: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900 font-medium">{sku.spec || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{sku.size || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{sku.material || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{sku.net_weight ? `${sku.net_weight}kg` : '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{sku.packaged_weight ? `${sku.packaged_weight}kg` : '-'}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">¥{sku.factory_price || '-'}</td>
                      <td className="px-4 py-3 text-red-500">¥{sku.retail_price || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{sku.light_source_spec ? `${sku.light_source_spec} (${sku.light_source_count || 0})` : '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{sku.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {product.skus?.some((sku: any) => sku.other_images?.length > 0 || sku.other_files?.length > 0) && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <h3 className="text-base font-semibold text-slate-800">规格附件</h3>
            {product.skus?.map((sku: any, idx: number) => (
              (sku.other_images?.length > 0 || sku.other_files?.length > 0) && (
                <div key={idx} className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-700">{sku.spec || `规格 ${idx + 1}`}</h4>
                  {sku.other_images?.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {sku.other_images.map((img: string, i: number) => (
                        <img key={i} src={img} alt="" onClick={() => setPreviewImage(img)} className="h-20 w-20 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-80" />
                      ))}
                    </div>
                  )}
                  {sku.other_files?.length > 0 && (
                    <div className="space-y-2">
                      {sku.other_files.map((file: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-600 truncate">{file.split('/').pop()}</span>
                          <a href={file} download target="_blank" rel="noreferrer" className="ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium">下载</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 p-2">
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}
