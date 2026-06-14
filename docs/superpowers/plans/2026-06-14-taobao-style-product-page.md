# 淘宝风格产品页面改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将弹窗式产品新增/编辑改为全页分区块表单，将弹窗式产品详情改为全屏淘宝宝贝风格页面，新增产品级主图(最多10张)和详情图(不限)。

**Architecture:** 组件级视图切换（App.tsx 中 `currentPage` 状态控制渲染哪个视图），不引入路由库。数据库新增 `main_images` 和 `detail_images` 字段存储产品级图片。

**Tech Stack:** React 19 + TypeScript + Tailwind CSS 4 + Vite + Express + better-sqlite3 + lucide-react + motion

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `server/src/db.js` | 修改 | 新增 main_images, detail_images 字段迁移 |
| `server/src/products.js` | 修改 | 处理新字段的 JSON 序列化/反序列化 |
| `src/App.tsx` | 修改 | 添加 Page 类型和 currentPage 视图状态管理 |
| `src/components/Dashboard.tsx` | 修改 | 移除查看弹窗，改为页面导航回调 |
| `src/components/ImageUploadList.tsx` | 新增 | 多图上传列表组件（增删+进度条） |
| `src/components/ImageGallery.tsx` | 新增 | 主图轮播组件（缩略图切换+放大预览） |
| `src/components/ProductForm.tsx` | 新增 | 全页产品表单（主图→基本信息→SKU→详情图） |
| `src/components/ProductDetail.tsx` | 新增 | 淘宝宝贝风格产品详情页 |
| `src/components/ProductModal.tsx` | 删除 | 被 ProductForm.tsx 替代 |

---

### Task 1: Database Migration

**Files:**
- Modify: `server/src/db.js:86-101` (after existing migrations)

- [ ] **Step 1: Add main_images and detail_images columns**

在 `server/src/db.js` 中，找到现有的 `product_skus` 迁移代码块（约第142行附近），在其后面添加新的迁移逻辑：

```javascript
// Migration: Add main_images and detail_images to products if they don't exist
const productColumns2 = db.prepare("PRAGMA table_info(products)").all();
const productColumnNames2 = productColumns2.map((c) => c.name);
if (!productColumnNames2.includes("main_images")) {
  db.exec("ALTER TABLE products ADD COLUMN main_images TEXT");
}
if (!productColumnNames2.includes("detail_images")) {
  db.exec("ALTER TABLE products ADD COLUMN detail_images TEXT");
}
```

- [ ] **Step 2: Verify migration runs**

Run: `npm run dev`
Expected: Server starts without errors, check console for no migration failures.

- [ ] **Step 3: Commit**

```bash
git add server/src/db.js
git commit -m "feat: add main_images and detail_images columns to products table"
```

---

### Task 2: Backend - Update products.js

**Files:**
- Modify: `server/src/products.js`

- [ ] **Step 1: Parse main_images and detail_images in getProducts**

在 `server/src/products.js` 的 `getProducts` 函数中，在 `product.suppliers = ...` 之后添加：

```javascript
    product.main_images = product.main_images ? JSON.parse(product.main_images) : [];
    product.detail_images = product.detail_images ? JSON.parse(product.detail_images) : [];
```

- [ ] **Step 2: Parse main_images and detail_images in getProduct**

在 `getProduct` 函数中，在 `product.suppliers = ...` 之后添加：

```javascript
    product.main_images = product.main_images ? JSON.parse(product.main_images) : [];
    product.detail_images = product.detail_images ? JSON.parse(product.detail_images) : [];
```

- [ ] **Step 3: Update createProduct to handle new fields**

在 `createProduct` 的 transaction 中，修改 `productStmt` 的 INSERT 语句：

```javascript
    const productStmt = db.prepare(`
      INSERT INTO products (created_by, model, catalog_path, material, main_images, detail_images) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = productStmt.run(
      userId, 
      productData.model, 
      productData.catalog_path || null, 
      productData.material || null,
      productData.main_images ? JSON.stringify(productData.main_images) : '[]',
      productData.detail_images ? JSON.stringify(productData.detail_images) : '[]'
    );
```

- [ ] **Step 4: Update updateProduct to handle new fields**

在 `updateProduct` 的 transaction 中，在 `material` 的 `updateFields.push` 之后添加：

```javascript
    if (productData.hasOwnProperty('main_images')) {
      updateFields.push("main_images = ?");
      params.push(JSON.stringify(productData.main_images || []));
    }
    if (productData.hasOwnProperty('detail_images')) {
      updateFields.push("detail_images = ?");
      params.push(JSON.stringify(productData.detail_images || []));
    }
```

- [ ] **Step 5: Verify API handles new fields**

Run: `npm run dev`，使用 API 工具（如浏览器控制台）测试：
```javascript
// 登录后测试创建产品
fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
  body: JSON.stringify({ model: 'TEST-001', main_images: ['/uploads/test1.jpg'], detail_images: [], skus: [{ spec: '默认' }] })
}).then(r => r.json()).then(console.log)
```
Expected: 产品创建成功，返回 `{ id: ... }`

- [ ] **Step 6: Commit**

```bash
git add server/src/products.js
git commit -m "feat: handle main_images and detail_images in product CRUD"
```

---

### Task 3: App.tsx - View State Management

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Page type and currentPage state**

将 `src/App.tsx` 替换为以下内容：

```tsx
import { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ProductForm from './components/ProductForm';
import ProductDetail from './components/ProductDetail';

export type Page = 
  | { type: 'dashboard' }
  | { type: 'product-new' }
  | { type: 'product-edit', productId: number }
  | { type: 'product-detail', productId: number };

export default function App() {
  const [user, setUser] = useState<{id: number, username: string, role: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'dashboard' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage({ type: 'dashboard' });
  };

  if (loading) return null;

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  switch (currentPage.type) {
    case 'product-new':
      return (
        <ProductForm
          user={user}
          onClose={() => setCurrentPage({ type: 'dashboard' })}
          onSuccess={() => setCurrentPage({ type: 'dashboard' })}
        />
      );
    case 'product-edit':
      return (
        <ProductForm
          user={user}
          productId={currentPage.productId}
          onClose={() => setCurrentPage({ type: 'dashboard' })}
          onSuccess={() => setCurrentPage({ type: 'dashboard' })}
        />
      );
    case 'product-detail':
      return (
        <ProductDetail
          user={user}
          productId={currentPage.productId}
          onBack={() => setCurrentPage({ type: 'dashboard' })}
          onEdit={() => setCurrentPage({ type: 'product-edit', productId: currentPage.productId })}
        />
      );
    default:
      return <Dashboard user={user} onLogout={handleLogout} onNavigate={setCurrentPage} />;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add page navigation state management to App"
```

---

### Task 4: ImageUploadList Component

**Files:**
- Create: `src/components/ImageUploadList.tsx`

- [ ] **Step 1: Create the multi-image upload component**

创建 `src/components/ImageUploadList.tsx`：

```tsx
import React, { useState, useRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { uploadImage } from '../lib/api';

interface ImageUploadListProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxCount?: number;
  label?: string;
  thumbnailSize?: 'sm' | 'md' | 'lg';
}

export default function ImageUploadList({ 
  images, 
  onChange, 
  maxCount, 
  label,
  thumbnailSize = 'md' 
}: ImageUploadListProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };
  const sizeClass = sizeClasses[thumbnailSize];

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    setProgress(0);
    try {
      const fileArray = Array.from(files);
      const newUrls: string[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        if (maxCount && images.length + newUrls.length >= maxCount) {
          alert(`最多只能添加${maxCount}张图片`);
          break;
        }
        const url = await uploadImage(fileArray[i], (p) => {
          const totalProgress = Math.round(((i + p / 100) / fileArray.length) * 100);
          setProgress(totalProgress);
        });
        newUrls.push(url);
      }
      if (newUrls.length > 0) {
        onChange([...images, ...newUrls]);
      }
    } catch (err) {
      alert('上传失败');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      handleUpload(dt.files);
    }
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {maxCount && (
            <span className="text-xs text-slate-400">{images.length}/{maxCount}</span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div key={index} className={`relative group ${sizeClass} rounded-lg overflow-hidden border border-slate-200`}>
            <img src={img} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {(!maxCount || images.length < maxCount) && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onPaste={handlePaste}
            tabIndex={0}
            className={`${sizeClass} border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50/30 relative`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[10px]">{progress}%</span>
              </div>
            ) : (
              <>
                <Plus className="w-5 h-5 pointer-events-none" />
                <span className="text-[10px] mt-1 pointer-events-none">添加图片</span>
              </>
            )}
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ImageUploadList.tsx
git commit -m "feat: add ImageUploadList component for multi-image upload"
```

---

### Task 5: ImageGallery Component

**Files:**
- Create: `src/components/ImageGallery.tsx`

- [ ] **Step 1: Create the image carousel/gallery component**

创建 `src/components/ImageGallery.tsx`：

```tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="w-80 h-80 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
        <span className="text-sm">暂无图片</span>
      </div>
    );
  }

  const goTo = (index: number) => {
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    setActiveIndex(index);
  };

  return (
    <>
      <div className="space-y-3">
        <div 
          className="relative w-80 h-80 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-zoom-in group"
          onClick={() => setPreviewImage(images[activeIndex])}
        >
          <img 
            src={images[activeIndex]} 
            alt="" 
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {activeIndex + 1} / {images.length}
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, index) => (
              <div
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-colors ${
                  index === activeIndex ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {previewImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" 
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 p-2">
            <X className="w-8 h-8" />
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ImageGallery.tsx
git commit -m "feat: add ImageGallery carousel component"
```

---

### Task 6: ProductForm Component

**Files:**
- Create: `src/components/ProductForm.tsx`

- [ ] **Step 1: Create the full-page product form**

创建 `src/components/ProductForm.tsx`。这是最大的组件，分区块纵向排列：

```tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Plus, FolderOpen, Copy, X } from 'lucide-react';
import { fetchApi, uploadImage } from '../lib/api';
import ImageUploadList from './ImageUploadList';
import ImageUpload from './ImageUpload';

interface ProductFormProps {
  user: { id: number; username: string; role: string };
  productId?: number;
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

export default function ProductForm({ user, productId, onClose, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(!!productId);
  const [model, setModel] = useState('');
  const [catalogPath, setCatalogPath] = useState('');
  const [mainImages, setMainImages] = useState<string[]>([]);
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<{ id: number; name: string; factory_model: string }[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [activeSkuIndex, setActiveSkuIndex] = useState(0);
  const [skus, setSkus] = useState<SkuData[]>([{
    spec: '', size: '', material: '', net_weight: '', packaged_weight: '',
    factory_price: '', retail_price: '', light_source_spec: '', light_source_count: '',
    remark: '', main_image: '', size_image: '', other_images: [], other_files: [],
  }]);

  useEffect(() => {
    fetchApi('/suppliers').then(setSuppliers).catch(console.error);
    if (productId) {
      setFetchingProduct(true);
      fetchApi(`/products/${productId}`).then((product) => {
        setModel(product.model || '');
        setCatalogPath(product.catalog_path ? product.catalog_path.replace(/^file:\/\/\//, '') : '');
        setMainImages(product.main_images || []);
        setDetailImages(product.detail_images || []);
        if (product.suppliers) {
          setSelectedSuppliers(product.suppliers.map((s: any) => ({
            id: s.id, name: s.name, factory_model: s.factory_model || ''
          })));
        }
        if (product.skus && product.skus.length > 0) {
          setSkus(product.skus.map((s: any) => ({
            id: s.id, spec: s.spec || '', size: s.size || '',
            net_weight: s.net_weight?.toString() || '', packaged_weight: s.packaged_weight?.toString() || '',
            factory_price: s.factory_price?.toString() || '', retail_price: s.retail_price?.toString() || '',
            light_source_spec: s.light_source_spec || '', light_source_count: s.light_source_count?.toString() || '',
            material: s.material || '', remark: s.remark || '',
            main_image: s.main_image || '', size_image: s.size_image || '',
            other_images: s.other_images || [], other_files: s.other_files || [],
          })));
        }
      }).catch(console.error).finally(() => setFetchingProduct(false));
    } else {
      fetchApi('/model/generate').then(res => {
        setModel(res.model || '');
      }).catch(console.error);
    }
  }, [productId]);

  const handleSkuChange = (index: number, field: keyof SkuData, value: any) => {
    const newSkus = [...skus];
    newSkus[index] = { ...newSkus[index], [field]: value };
    setSkus(newSkus);
  };

  const addSku = () => {
    const newIndex = skus.length;
    setSkus([...skus, {
      spec: '', size: '', material: '', net_weight: '', packaged_weight: '',
      factory_price: '', retail_price: '', light_source_spec: '', light_source_count: '',
      remark: '', main_image: '', size_image: '', other_images: [], other_files: [],
    }]);
    setActiveSkuIndex(newIndex);
  };

  const removeSku = (index: number) => {
    if (skus.length <= 1) return;
    const newSkus = skus.filter((_, i) => i !== index);
    setSkus(newSkus);
    if (activeSkuIndex >= newSkus.length) setActiveSkuIndex(newSkus.length - 1);
    else if (activeSkuIndex === index && index > 0) setActiveSkuIndex(index - 1);
  };

  const handleFileUpload = async (index: number, field: 'other_images' | 'other_files', files: FileList) => {
    try {
      const uploadPromises = Array.from(files).map(file => uploadImage(file));
      const urls = await Promise.all(uploadPromises);
      setSkus(prev => {
        const newSkus = [...prev];
        const currentList = newSkus[index][field];
        newSkus[index] = { ...newSkus[index], [field]: [...currentList, ...urls] };
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
      if (exists) return prev.filter(s => s.id !== supplier.id);
      return [...prev, { id: supplier.id, name: supplier.name, factory_model: '' }];
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
        main_images: mainImages,
        detail_images: detailImages,
        suppliers: selectedSuppliers.map(s => ({ id: s.id, factory_model: s.factory_model })),
        skus: skus.map(sku => ({
          ...sku,
          net_weight: sku.net_weight ? parseFloat(sku.net_weight) : null,
          packaged_weight: sku.packaged_weight ? parseFloat(sku.packaged_weight) : null,
          factory_price: sku.factory_price ? parseFloat(sku.factory_price) : null,
          retail_price: sku.retail_price ? parseFloat(sku.retail_price) : null,
          light_source_count: sku.light_source_count ? parseInt(sku.light_source_count) : null,
        })),
      };
      if (productId) {
        await fetchApi(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await fetchApi('/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProduct) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg font-semibold text-slate-900">{productId ? '编辑产品' : '新增产品'}</h1>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              取消
            </button>
            <button type="submit" form="product-form" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              保存产品
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
        <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Block 1: Main Images */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <ImageUploadList
              images={mainImages}
              onChange={setMainImages}
              maxCount={10}
              label="商品主图"
              thumbnailSize="md"
            />
            <p className="text-xs text-slate-400 mt-2">最多10张，第一张为封面图。单击选择文件，粘贴图片也可上传。</p>
          </div>

          {/* Block 2: Basic Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-base font-semibold text-slate-800">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">产品型号 <span className="text-red-500">*</span></label>
                <input required value={model} onChange={e => setModel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">供应商与厂家型号 (多选)</label>
                <div className="relative">
                  <div
                    onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm flex flex-wrap gap-2 min-h-[38px] cursor-pointer hover:border-blue-400 transition-colors pr-8 relative"
                  >
                    {selectedSuppliers.length > 0 ? (
                      selectedSuppliers.map(s => (
                        <div key={s.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1 pr-2" onClick={e => e.stopPropagation()}>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium border border-blue-100 truncate max-w-[100px]">{s.name}</span>
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
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">产品图册目录</label>
                <div className="flex gap-2">
                  <input
                    value={catalogPath}
                    onChange={e => setCatalogPath(e.target.value)}
                    placeholder="例如: C:\Photos 或 \\Server\Share"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                  />
                  <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-400 cursor-help" title="由于浏览器安全限制，无法直接选择本地目录。请手动输入或在资源管理器中"复制为路径"后在此粘贴。">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">支持本地绝对路径与网络共享文件夹地址。</p>
              </div>
            </div>
          </div>

          {/* Block 3: SKU Specs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">规格 (SKU)</h3>
              <button type="button" onClick={addSku} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
                <Plus className="w-4 h-4 mr-1" /> 添加规格
              </button>
            </div>

            {/* SKU Tabs */}
            <div className="flex flex-wrap gap-2">
              {skus.map((sku, index) => (
                <div key={index} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveSkuIndex(index)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSkuIndex === index ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {sku.spec || `规格 ${index + 1}`}
                  </button>
                  {skus.length > 1 && activeSkuIndex === index && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeSku(index); }} className="ml-[-4px] text-slate-400 hover:text-red-500 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Active SKU Form */}
            {skus.map((sku, index) => (
              <div key={index} className={`${activeSkuIndex === index ? 'block' : 'hidden'} space-y-4`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">规格名称</label>
                      <button type="button" onClick={() => applyToAll('spec')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5" title="应用到所有规格"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input value={sku.spec} onChange={e => handleSkuChange(index, 'spec', e.target.value)} placeholder="例如: 大号 / 金色" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">尺寸</label>
                      <button type="button" onClick={() => applyToAll('size')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input value={sku.size} onChange={e => handleSkuChange(index, 'size', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">材质</label>
                      <button type="button" onClick={() => applyToAll('material')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input value={sku.material || ''} onChange={e => handleSkuChange(index, 'material', e.target.value)} placeholder="例如: 铁+铝+亚克力" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">净重 (kg)</label>
                      <button type="button" onClick={() => applyToAll('net_weight')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input type="number" step="0.01" value={sku.net_weight} onChange={e => handleSkuChange(index, 'net_weight', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">含包装重量 (kg)</label>
                      <button type="button" onClick={() => applyToAll('packaged_weight')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input type="number" step="0.01" value={sku.packaged_weight} onChange={e => handleSkuChange(index, 'packaged_weight', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">出厂价 (元)</label>
                      <button type="button" onClick={() => applyToAll('factory_price')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input type="number" step="0.01" value={sku.factory_price} onChange={e => handleSkuChange(index, 'factory_price', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">建议零售价 (元)</label>
                      <button type="button" onClick={() => applyToAll('retail_price')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input type="number" step="0.01" value={sku.retail_price} onChange={e => handleSkuChange(index, 'retail_price', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">光源规格</label>
                      <button type="button" onClick={() => applyToAll('light_source_spec')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input value={sku.light_source_spec} onChange={e => handleSkuChange(index, 'light_source_spec', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">光源数量</label>
                      <button type="button" onClick={() => applyToAll('light_source_count')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input type="number" value={sku.light_source_count} onChange={e => handleSkuChange(index, 'light_source_count', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="md:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">备注</label>
                      <button type="button" onClick={() => applyToAll('remark')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <input value={sku.remark} onChange={e => handleSkuChange(index, 'remark', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                </div>

                {/* SKU Images */}
                <div className="flex gap-6 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">SKU图</label>
                      <button type="button" onClick={() => applyToAll('main_image')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <ImageUpload label="" value={sku.main_image} onChange={(url) => handleSkuChange(index, 'main_image', url)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">尺寸图</label>
                      <button type="button" onClick={() => applyToAll('size_image')} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5"><Copy className="w-3 h-3" /> 应用</button>
                    </div>
                    <ImageUpload label="" value={sku.size_image} onChange={(url) => handleSkuChange(index, 'size_image', url)} />
                  </div>
                </div>

                {/* Other Images */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">其它图片</label>
                  <div className="flex flex-wrap gap-3">
                    {sku.other_images.map((img, imgIdx) => (
                      <div key={imgIdx} className="relative group">
                        <img src={img} alt="" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                        <button type="button" onClick={() => removeFile(index, 'other_images', imgIdx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
                        input.onchange = (e: any) => { if (e.target.files?.length) handleFileUpload(index, 'other_images', e.target.files); };
                        input.click();
                      }}
                      className="h-20 w-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors bg-slate-50"
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Other Files */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">其它文件</label>
                  <div className="space-y-2">
                    {sku.other_files.map((file, fileIdx) => (
                      <div key={fileIdx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-xs text-slate-600 truncate max-w-[200px]">{file.split('/').pop()}</span>
                        <button type="button" onClick={() => removeFile(index, 'other_files', fileIdx)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file'; input.multiple = true;
                        input.onchange = (e: any) => { if (e.target.files?.length) handleFileUpload(index, 'other_files', e.target.files); };
                        input.click();
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                    >
                      <Plus className="w-3 h-3 mr-1" /> 添加文件
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Block 4: Detail Images */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <ImageUploadList
              images={detailImages}
              onChange={setDetailImages}
              label="商品详情图"
              thumbnailSize="lg"
            />
            <p className="text-xs text-slate-400 mt-2">不限数量，按上传顺序排列。图片将在详情页纵向全宽展示。</p>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductForm.tsx
git commit -m "feat: add full-page ProductForm component with taobao-style layout"
```

---

### Task 7: ProductDetail Component

**Files:**
- Create: `src/components/ProductDetail.tsx`

- [ ] **Step 1: Create the taobao-style product detail page**

创建 `src/components/ProductDetail.tsx`：

```tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Trash2, FolderOpen, Loader2, X, FileText } from 'lucide-react';
import { fetchApi } from '../lib/api';
import ImageGallery from './ImageGallery';

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
        alert('路径已复制到剪贴板');
      }
    } catch (e) {
      navigator.clipboard.writeText(cleanPath);
      alert('路径已复制到剪贴板');
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
      {/* Top Bar */}
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

      {/* Content */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Section 1: Main Images + Product Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Image Gallery */}
            <div className="flex-shrink-0">
              <ImageGallery images={product.main_images || []} />
            </div>

            {/* Right: Product Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{product.model}</h2>
                {product.material && (
                  <p className="text-sm text-slate-500 mt-1">材质: {product.material}</p>
                )}
              </div>

              {/* Price Range */}
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

              {/* SKU Selector */}
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

              {/* Active SKU Info */}
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

              {/* Active SKU Images */}
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

              {/* Suppliers */}
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

              {/* Catalog Path */}
              {product.catalog_path && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-sm text-slate-500">图册目录:</span>
                  <span className="text-sm text-slate-900 truncate max-w-[300px]" title={product.catalog_path.replace(/^file:\/\/\//, '')}>{product.catalog_path.replace(/^file:\/\/\//, '')}</span>
                  <button onClick={() => openDirectory(product.catalog_path)} className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors">
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Creator Info */}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                创建人: {product.creator_name} | 创建时间: {new Date(product.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Detail Images */}
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

        {/* Section 3: SKU Specs Table */}
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

        {/* Section 4: SKU Other Images & Files */}
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

      {/* Image Preview Modal */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductDetail.tsx
git commit -m "feat: add taobao-style ProductDetail page component"
```

---

### Task 8: Modify Dashboard.tsx

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Add onNavigate prop and remove viewing modal**

在 `Dashboard.tsx` 中做以下修改：

1. 修改 `DashboardProps` 接口，添加 `onNavigate`：

```tsx
interface DashboardProps {
  user: { id: number; username: string; role: string };
  onLogout: () => void;
  onNavigate: (page: any) => void;
}
```

2. 在组件函数签名中添加 `onNavigate`：

```tsx
export default function Dashboard({ user, onLogout, onNavigate }: DashboardProps) {
```

3. 移除 `viewingProduct` 状态声明（约第22行）：

```tsx
// 删除这行:
const [viewingProduct, setViewingProduct] = useState<any>(null);
```

4. 将所有 `setViewingProduct(p)` 替换为 `onNavigate({ type: 'product-detail', productId: p.id })`。
   将所有 `setViewingProduct(null)` 不需要（因为不再有查看弹窗）。

5. 将新增产品按钮的 `onClick` 从：
```tsx
onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
```
改为：
```tsx
onClick={() => onNavigate({ type: 'product-new' })}
```

6. 将编辑按钮的 `onClick` 从：
```tsx
onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
```
改为：
```tsx
onClick={() => onNavigate({ type: 'product-edit', productId: p.id })}
```

7. 移除整个"View Product Modal"区块（从 `{/* View Product Modal */}` 到对应的 `)}` 闭合标签，约第564-715行）。

8. 修改 ProductModal 的调用，改为根据 `editingProduct` 导航：
找到 `{isProductModalOpen && (` 区块，将其替换为：
```tsx
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
```
实际上，因为编辑也改为导航了，`isProductModalOpen` 和 `editingProduct` 状态可以简化。
编辑按钮已改为 `onNavigate`，所以 `isProductModalOpen` 状态和 `ProductModal` 的渲染可以完全移除。

最终，Dashboard 中需要：
- 移除 `editingProduct` 状态
- 移除 `isProductModalOpen` 状态
- 移除 `ProductModal` 的 import 和渲染
- 移除 `viewingProduct` 状态和整个查看弹窗

- [ ] **Step 2: Verify the app compiles**

Run: `npm run lint`
Expected: No TypeScript errors.

Run: `npm run dev`
Expected: App loads, product list shows, double-click navigates to detail page, "新增产品" navigates to form page.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: replace view modal with page navigation in Dashboard"
```

---

### Task 9: Remove ProductModal.tsx

**Files:**
- Delete: `src/components/ProductModal.tsx`

- [ ] **Step 1: Delete the old ProductModal component**

```bash
rm src/components/ProductModal.tsx
```

- [ ] **Step 2: Verify no remaining references**

Run: `npm run lint`
Expected: No errors. If there are import errors, remove the import from the referencing file.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove ProductModal (replaced by ProductForm)"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run lint check**

Run: `npm run lint`
Expected: No TypeScript errors.

- [ ] **Step 2: Run dev server and test manually**

Run: `npm run dev`

Test the following flows:
1. Login → product list shows correctly
2. Click "新增产品" → full-page form opens with sections: 主图, 基本信息, SKU, 详情图
3. Upload main images (multiple) → thumbnails appear, can delete
4. Fill in basic info, add SKU → save succeeds
5. Double-click product row → detail page opens (taobao style)
6. Detail page: main image carousel works, SKU selector works, detail images show vertically
7. Click "编辑" on detail page → edit form opens with pre-filled data
8. Save edit → returns to dashboard, data updated
9. Delete product from detail page → returns to dashboard

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve issues from final verification"
```
