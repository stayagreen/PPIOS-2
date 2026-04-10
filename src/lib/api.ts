const API_BASE = '/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'API Error';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function exportExcel() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/export`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('导出失败');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'products.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetchApi('/upload', {
    method: 'POST',
    body: formData,
  });
  return res.url;
}
