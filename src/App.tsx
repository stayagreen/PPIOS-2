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
