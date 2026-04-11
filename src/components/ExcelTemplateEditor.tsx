import React, { useState } from 'react';
import { X, Save, Type, AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline, Image as ImageIcon, Layout, ArrowUpDown, Check } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface ExcelTemplateEditorProps {
  initialTemplate: any;
  onClose: () => void;
  onSave: (template: any) => void;
}

export default function ExcelTemplateEditor({ initialTemplate, onClose, onSave }: ExcelTemplateEditorProps) {
  const [template, setTemplate] = useState(initialTemplate);
  const [loading, setLoading] = useState(false);

  const updateHeader = (field: string, value: any) => {
    setTemplate({
      ...template,
      header: { ...template.header, [field]: value }
    });
  };

  const updateColumn = (index: number, field: string, value: any) => {
    const newColumns = [...template.columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setTemplate({ ...template, columns: newColumns });
  };

  const updateGlobalFont = (field: string, value: any) => {
    setTemplate({
      ...template,
      font: { ...template.font, [field]: value }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(template);
      onClose();
    } catch (err) {
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const enabledColumns = (template?.columns || []).filter((c: any) => c.enabled);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 sm:p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Excel 导出模板编辑器</h2>
              <p className="text-xs text-slate-500">自定义导出文件的外观与结构</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              保存模板
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Sidebar Controls */}
          <div className="w-full lg:w-80 border-r border-slate-100 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
            {/* Header Settings */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">顶部标题设置</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={template.header.enabled}
                    onChange={e => updateHeader('enabled', e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {template.header.enabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">标题文字</label>
                    <input 
                      value={template.header.title} 
                      onChange={e => updateHeader('title', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="输入标题..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">字号</label>
                      <input 
                        type="number" 
                        value={template.header.fontSize} 
                        onChange={e => updateHeader('fontSize', parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">行高</label>
                      <input 
                        type="number" 
                        value={template.header.height} 
                        onChange={e => updateHeader('height', parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateHeader('bold', !template.header.bold)}
                      className={`p-2 rounded-md border transition-all ${template.header.bold ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      title="加粗"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateHeader('italic', !template.header.italic)}
                      className={`p-2 rounded-md border transition-all ${template.header.italic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      title="斜体"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateHeader('underline', !template.header.underline)}
                      className={`p-2 rounded-md border transition-all ${template.header.underline ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      title="下划线"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button 
                      onClick={() => updateHeader('align', 'left')}
                      className={`p-2 rounded-md border transition-all ${template.header.align === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateHeader('align', 'center')}
                      className={`p-2 rounded-md border transition-all ${template.header.align === 'center' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => updateHeader('align', 'right')}
                      className={`p-2 rounded-md border transition-all ${template.header.align === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">文字颜色</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={template.header.fontColor?.startsWith('#') ? template.header.fontColor : '#' + (template.header.fontColor || '000000')} 
                          onChange={e => updateHeader('fontColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-none p-0"
                        />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{template.header.fontColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">背景颜色</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={template.header.bgColor?.startsWith('#') ? template.header.bgColor : '#' + (template.header.bgColor || 'FFFFFF')} 
                          onChange={e => updateHeader('bgColor', e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-none p-0"
                        />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{template.header.bgColor}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">标题图片 (Logo)</label>
                    <div className="flex items-center gap-2">
                      {template.header.image ? (
                        <div className="relative group">
                          <img src={template.header.image} alt="Logo" className="h-10 w-10 object-contain border border-slate-200 rounded" />
                          <button 
                            onClick={() => updateHeader('image', '')}
                            className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const formData = new FormData();
                                  formData.append('image', file);
                                  const res = await fetchApi('/upload', { method: 'POST', body: formData });
                                  updateHeader('image', res.url);
                                } catch (err) {
                                  alert('上传失败');
                                }
                              }
                            };
                            input.click();
                          }}
                          className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all text-xs"
                        >
                          <ImageIcon className="w-4 h-4" />
                          上传图片
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Global Font Settings */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">列表字体设置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">字体名称</label>
                  <input 
                    value={template.font.name} 
                    onChange={e => updateGlobalFont('name', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">字号</label>
                    <input 
                      type="number" 
                      value={template.font.size} 
                      onChange={e => updateGlobalFont('size', parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">颜色</label>
                    <input 
                      type="color" 
                      value={template.font.color?.startsWith('#') ? template.font.color : '#' + (template.font.color || '000000')} 
                      onChange={e => updateGlobalFont('color', e.target.value)}
                      className="w-full h-9 rounded cursor-pointer border border-slate-200 p-1"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 bg-slate-100 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Layout className="w-4 h-4" /> 实时预览 (Excel 样式)
                </h3>
                <span className="text-[10px] text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                  预览仅供参考，实际导出效果以 Excel 为准
                </span>
              </div>

              {/* Excel Mockup */}
              <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    {/* Excel Header (A, B, C...) */}
                    <div className="flex bg-slate-50 border-b border-slate-200">
                      <div className="w-10 border-r border-slate-200" />
                      {enabledColumns.map((_, i) => (
                        <div key={i} className="w-[120px] py-1 text-center text-[10px] font-medium text-slate-400 border-r border-slate-200 last:border-r-0">
                          {String.fromCharCode(65 + (i % 26))}
                        </div>
                      ))}
                    </div>

                    {/* Row 1: Custom Header Title */}
                    {template.header.enabled && (
                      <div className="flex border-b border-slate-200">
                        <div className="w-10 bg-slate-50 border-r border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-400">1</div>
                        <div 
                          className="flex-1 flex items-center px-4 overflow-hidden relative"
                          style={{ 
                            height: `${template.header.height}px`,
                            backgroundColor: template.header.bgColor?.startsWith('#') ? template.header.bgColor : '#' + template.header.bgColor,
                            justifyContent: template.header.align === 'center' ? 'center' : template.header.align === 'right' ? 'flex-end' : 'flex-start',
                            color: template.header.fontColor?.startsWith('#') ? template.header.fontColor : '#' + template.header.fontColor,
                            fontSize: `${template.header.fontSize}px`,
                            fontWeight: template.header.bold ? 'bold' : 'normal',
                            fontStyle: template.header.italic ? 'italic' : 'normal',
                            textDecoration: template.header.underline ? 'underline' : 'none',
                            fontFamily: template.font.name
                          }}
                        >
                          {template.header.image && (
                            <img src={template.header.image} alt="Logo" className="absolute left-4 h-[80%] object-contain" />
                          )}
                          {template.header.title}
                        </div>
                      </div>
                    )}

                    {/* Row 2: Column Headers */}
                    <div className="flex border-b border-slate-200 bg-slate-50">
                      <div className="w-10 border-r border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-400">{template.header.enabled ? '2' : '1'}</div>
                      {enabledColumns.map((col: any) => (
                        <div 
                          key={col.key} 
                          className="w-[120px] px-3 py-2 text-sm font-bold text-slate-700 border-r border-slate-200 last:border-r-0 text-center truncate"
                          style={{ 
                            fontFamily: template.font.name,
                            fontSize: `${template.font.size}px`,
                            color: template.font.color?.startsWith('#') ? template.font.color : '#' + template.font.color
                          }}
                        >
                          {col.header}
                        </div>
                      ))}
                    </div>

                    {/* Row 3: Sample Data */}
                    {[1, 2, 3].map((rowNum) => (
                      <div key={rowNum} className="flex border-b border-slate-100 last:border-b-0">
                        <div className="w-10 bg-slate-50 border-r border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-400">
                          {template.header.enabled ? rowNum + 2 : rowNum + 1}
                        </div>
                        {enabledColumns.map((col: any) => (
                          <div 
                            key={col.key} 
                            className="w-[120px] px-3 py-2 text-sm text-slate-500 border-r border-slate-100 last:border-r-0"
                            style={{ 
                              fontFamily: template.font.name,
                              fontSize: `${template.font.size}px`,
                              color: template.font.color?.startsWith('#') ? template.font.color : '#' + template.font.color
                            }}
                          >
                            <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column Management Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" /> 列管理与排序
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {template.columns.map((col: any, idx: number) => (
                    <div 
                      key={col.key} 
                      className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all ${col.enabled ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60'}`}
                    >
                      <button 
                        onClick={() => updateColumn(idx, 'enabled', !col.enabled)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${col.enabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-transparent'}`}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <div className="flex-1">
                        <input 
                          value={col.header} 
                          onChange={e => updateColumn(idx, 'header', e.target.value)}
                          className="w-full text-xs font-bold text-slate-700 border-none p-0 focus:ring-0 outline-none bg-transparent"
                          placeholder="列标题"
                        />
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{col.key}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
