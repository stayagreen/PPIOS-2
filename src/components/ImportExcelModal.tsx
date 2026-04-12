import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileSpreadsheet, ArrowRight, Check, Image as ImageIcon, Plus, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { fetchApi, uploadImage } from '../lib/api';

interface ImportExcelModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PRODUCT_FIELDS = [
  { key: 'model', label: '产品型号 (必填)', required: true, type: 'product' },
  { key: 'catalog_path', label: '图册目录', type: 'product' },
  { key: 'supplier_name', label: '供应商名称', type: 'supplier' },
  { key: 'factory_model', label: '工厂型号', type: 'supplier' },
  { key: 'spec', label: '规格名称', type: 'sku' },
  { key: 'size', label: '尺寸', type: 'sku' },
  { key: 'material', label: '材质', type: 'sku' },
  { key: 'net_weight', label: '净重(kg)', type: 'sku' },
  { key: 'packaged_weight', label: '含包装重量(kg)', type: 'sku' },
  { key: 'factory_price', label: '出厂价', type: 'sku' },
  { key: 'retail_price', label: '零售价', type: 'sku' },
  { key: 'light_source_spec', label: '光源规格', type: 'sku' },
  { key: 'light_source_count', label: '光源数量', type: 'sku' },
  { key: 'remark', label: '备注', type: 'sku' },
  { key: 'main_image', label: 'SKU主图', type: 'sku' },
];

export default function ImportExcelModal({ onClose, onSuccess }: ImportExcelModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  
  // Step 1: File Data
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Mapping
  const [mapping, setMapping] = useState<Record<string, string>>({}); // excelHeader -> productFieldKey

  // Step 3: Row Confirmation
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [currentRowData, setCurrentRowData] = useState<any>({});
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [existingSuppliers, setExistingSuppliers] = useState<any[]>([]);
  
  // Images for current row
  const [mainImage, setMainImage] = useState<string>('');
  const [sizeImage, setSizeImage] = useState<string>('');

  useEffect(() => {
    // Fetch existing products to allow user to select existing models
    fetchApi('/products').then(setExistingProducts).catch(console.error);
    fetchApi('/suppliers').then(setExistingSuppliers).catch(console.error);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParsingProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(arrayBuffer);
      
      setParsingProgress(50);

      const ws = wb.worksheets[0];
      if (!ws) throw new Error("No worksheet found");

      // Extract headers
      const headers: string[] = [];
      const firstRow = ws.getRow(1);
      firstRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.text;
      });

      // Extract images
      const images = ws.getImages();
      const imageMap = new Map<string, string>(); // key: "row,col", value: base64 data URL
      
      const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

      for (const img of images) {
        const media = wb.getImage(img.imageId as any);
        if (media) {
          const row = Math.floor(img.range.tl.row);
          const col = Math.floor(img.range.tl.col);
          let base64 = '';
          if (media.base64) {
            base64 = media.base64;
            // Ensure it has data URI prefix
            if (!base64.startsWith('data:image')) {
              base64 = `data:image/${media.extension || 'png'};base64,${base64}`;
            }
          } else if (media.buffer) {
            const b64 = arrayBufferToBase64(media.buffer as any);
            base64 = `data:image/${media.extension || 'png'};base64,${b64}`;
          }
          
          if (base64) {
            imageMap.set(`${row},${col}`, base64);
          }
        }
      }

      setParsingProgress(70);

      // Extract data
      const rows: any[] = [];
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const rowData: any = {};
        let hasData = false;
        
        headers.forEach((header, colIndex) => {
          if (!header) return;
          
          const cell = row.getCell(colIndex + 1);
          let value = cell.text;
          
          const imgBase64 = imageMap.get(`${rowNumber - 1},${colIndex}`);
          if (imgBase64) {
            value = imgBase64;
          }
          
          if (value) {
            rowData[header] = value;
            hasData = true;
          }
        });
        
        if (hasData) {
          rows.push(rowData);
        }
      });

      setParsingProgress(100);

      if (rows.length > 0) {
        setExcelHeaders(headers.filter(Boolean));
        setExcelData(rows);
        
        // Auto-map if names match
        const autoMapping: Record<string, string> = {};
        headers.forEach(h => {
          if (!h) return;
          const matchedField = PRODUCT_FIELDS.find(f => f.label.includes(h) || h.includes(f.label.replace(' (必填)', '')));
          if (matchedField) {
            autoMapping[h] = matchedField.key;
          }
        });
        setMapping(autoMapping);
        setStep(2);
      } else {
        alert("未找到有效数据");
      }
    } catch (error) {
      console.error("Error parsing Excel:", error);
      alert("解析Excel文件失败，请确保文件格式正确。");
    } finally {
      setIsParsing(false);
      setParsingProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMappingNext = () => {
    if (excelData.length === 0) {
      alert("没有可导入的数据");
      return;
    }
    prepareRowData(0);
    setStep(3);
  };

  function dataURLtoFile(dataurl: string, filename: string) {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  const prepareRowData = async (index: number) => {
    setLoading(true);
    try {
      const rawRow = excelData[index];
      const mappedData: any = {};
      
      Object.entries(mapping).forEach(([excelHeader, fieldKey]) => {
        if (fieldKey && rawRow[excelHeader] !== undefined) {
          mappedData[fieldKey as string] = rawRow[excelHeader];
        }
      });

      // Auto-generate model if not mapped or empty
      if (!mappedData.model) {
        mappedData.model = `AUTO-${Date.now()}-${index + 1}`;
      }

      setCurrentRowData(mappedData);
      setSizeImage('');
      
      if (mappedData.main_image && mappedData.main_image.startsWith('data:image')) {
        try {
          const file = dataURLtoFile(mappedData.main_image, `excel-img-${index}.png`);
          const url = await uploadImage(file);
          setMainImage(url);
        } catch (e) {
          console.error("Failed to upload excel image", e);
          setMainImage('');
        }
      } else {
        setMainImage(mappedData.main_image || '');
      }
      
      setCurrentRowIndex(index);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'main' | 'size') => {
    try {
      const url = await uploadImage(file);
      if (type === 'main') setMainImage(url);
      else setSizeImage(url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('图片上传失败');
    }
  };

  const handleRowAction = (action: 'skip' | 'confirm') => {
    if (action === 'confirm') {
      if (!currentRowData.model) {
        alert("产品型号不能为空");
        return;
      }
      setProcessedRows([...processedRows, { ...currentRowData, main_image: mainImage, size_image: sizeImage }]);
    }

    if (currentRowIndex < excelData.length - 1) {
      prepareRowData(currentRowIndex + 1);
    } else {
      submitImport(action === 'confirm' ? [...processedRows, { ...currentRowData, main_image: mainImage, size_image: sizeImage }] : processedRows);
    }
  };

  const submitImport = async (finalRows: any[]) => {
    if (finalRows.length === 0) {
      alert("没有确认导入的数据");
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Group by model
      const groupedByModel: Record<string, any[]> = {};
      finalRows.forEach(row => {
        if (!groupedByModel[row.model]) {
          groupedByModel[row.model] = [];
        }
        groupedByModel[row.model].push(row);
      });

      for (const [model, rows] of Object.entries(groupedByModel)) {
        // Find if product exists
        const existingProduct = existingProducts.find(p => p.model === model);
        
        const baseRow = rows[0];
        let suppliers: any[] = [];
        
        if (baseRow.supplier_name) {
          let supplierId = existingSuppliers.find(s => s.name === baseRow.supplier_name)?.id;
          if (!supplierId) {
            // Create new supplier
            const res = await fetchApi('/suppliers', {
              method: 'POST',
              body: JSON.stringify({ name: baseRow.supplier_name })
            });
            supplierId = res.id;
            // Update local cache
            setExistingSuppliers(prev => [...prev, { id: supplierId, name: baseRow.supplier_name }]);
          }
          suppliers = [{ id: supplierId, name: baseRow.supplier_name, factory_model: baseRow.factory_model || '' }];
        }
        
        const skus = rows.map(r => ({
          spec: r.spec || '',
          size: r.size || '',
          material: r.material || '',
          net_weight: r.net_weight || null,
          packaged_weight: r.packaged_weight || null,
          factory_price: r.factory_price || null,
          retail_price: r.retail_price || null,
          light_source_spec: r.light_source_spec || '',
          light_source_count: r.light_source_count || null,
          remark: r.remark || '',
          main_image: r.main_image || '',
          size_image: r.size_image || '',
        }));

        if (existingProduct) {
          // Update existing product (append SKUs)
          // Note: The current PUT endpoint replaces all SKUs, so we need to fetch existing SKUs and merge
          const fullProduct = await fetchApi(`/products/${existingProduct.id}`);
          const mergedSkus = [...(fullProduct.skus || []), ...skus];
          
          const mergedSuppliers = [...(fullProduct.suppliers || [])];
          suppliers.forEach(s => {
            if (!mergedSuppliers.find(ms => ms.id === s.id)) {
              mergedSuppliers.push(s);
            }
          });
          
          await fetchApi(`/products/${existingProduct.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              model: existingProduct.model,
              catalog_path: baseRow.catalog_path || existingProduct.catalog_path,
              suppliers: mergedSuppliers,
              skus: mergedSkus
            })
          });
        } else {
          // Create new product
          await fetchApi('/products', {
            method: 'POST',
            body: JSON.stringify({
              model,
              catalog_path: baseRow.catalog_path || '',
              suppliers,
              skus
            })
          });
        }
      }
      
      onSuccess();
    } catch (error: any) {
      console.error("Import failed:", error);
      alert("导入失败: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            从Excel导入产品
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                {isParsing ? (
                  <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-green-600" />
                )}
              </div>
              <h4 className="text-xl font-medium text-slate-900 mb-2">
                {isParsing ? '正在解析Excel文件...' : '上传Excel文件'}
              </h4>
              <p className="text-slate-500 mb-6 text-center max-w-md">
                {isParsing 
                  ? '这可能需要一些时间，特别是当文件中包含大量图片时，请耐心等待。'
                  : '请选择包含产品数据的Excel文件 (.xlsx, .xls)。系统将自动读取表头，并在下一步让您匹配字段。'
                }
              </p>
              
              {isParsing ? (
                <div className="w-full max-w-md bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden">
                  <div className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${parsingProgress}%` }}></div>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    选择文件
                  </button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6">
                <h4 className="text-lg font-medium text-slate-900">字段匹配</h4>
                <p className="text-sm text-slate-500">请将Excel中的表头对应到系统的产品字段。不匹配的字段将被忽略。</p>
              </div>

              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Excel表头</th>
                      <th className="px-4 py-3">对应系统字段</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {excelHeaders.map((header, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-4 py-3 font-medium text-slate-900">{header}</td>
                        <td className="px-4 py-3">
                          <select
                            value={mapping[header] || ''}
                            onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">-- 不导入此列 --</option>
                            {PRODUCT_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-medium text-slate-900">数据确认 ({currentRowIndex + 1} / {excelData.length})</h4>
                  <p className="text-sm text-slate-500">请确认并完善当前行的数据，您可以修改型号或上传图片。</p>
                </div>
                <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  进度: {Math.round(((currentRowIndex) / excelData.length) * 100)}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">产品型号 <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={currentRowData.model || ''}
                      onChange={(e) => setCurrentRowData({ ...currentRowData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      list="existing-models"
                    />
                    <datalist id="existing-models">
                      {existingProducts.map(p => (
                        <option key={p.id} value={p.model} />
                      ))}
                    </datalist>
                    <p className="text-xs text-slate-500 mt-1">相同型号的数据将作为同一产品的不同规格(SKU)导入。</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">规格名称</label>
                      <input
                        type="text"
                        value={currentRowData.spec || ''}
                        onChange={(e) => setCurrentRowData({ ...currentRowData, spec: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">尺寸</label>
                      <input
                        type="text"
                        value={currentRowData.size || ''}
                        onChange={(e) => setCurrentRowData({ ...currentRowData, size: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">材质</label>
                    <input
                      type="text"
                      value={currentRowData.material || ''}
                      onChange={(e) => setCurrentRowData({ ...currentRowData, material: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">出厂价</label>
                      <input
                        type="number"
                        value={currentRowData.factory_price || ''}
                        onChange={(e) => setCurrentRowData({ ...currentRowData, factory_price: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">供应商</label>
                      <input
                        type="text"
                        value={currentRowData.supplier_name || ''}
                        onChange={(e) => setCurrentRowData({ ...currentRowData, supplier_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">图片上传</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-2">主图</p>
                      <div className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                        {mainImage ? (
                          <>
                            <img src={mainImage} alt="Main" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <label className="cursor-pointer text-white text-sm font-medium">
                                更换
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'main')} />
                              </label>
                            </div>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <Plus className="w-6 h-6 mb-1" />
                            <span className="text-xs">上传主图</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'main')} />
                          </label>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-2">规格图</p>
                      <div className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 relative overflow-hidden group">
                        {sizeImage ? (
                          <>
                            <img src={sizeImage} alt="Size" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <label className="cursor-pointer text-white text-sm font-medium">
                                更换
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'size')} />
                              </label>
                            </div>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                            <Plus className="w-6 h-6 mb-1" />
                            <span className="text-xs">上传规格图</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'size')} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          {step === 1 ? (
            <div className="w-full flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                取消
              </button>
            </div>
          ) : step === 2 ? (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                上一步
              </button>
              <button 
                onClick={handleMappingNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                下一步 <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleRowAction('skip')}
                disabled={loading}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                跳过此行
              </button>
              <button 
                onClick={() => handleRowAction('confirm')}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? '处理中...' : currentRowIndex < excelData.length - 1 ? (
                  <>确认并下一行 <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>确认并完成导入 <Check className="w-4 h-4" /></>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
