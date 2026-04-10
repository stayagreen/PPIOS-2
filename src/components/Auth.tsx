import React, { useState } from 'react';
import { fetchApi } from '../lib/api';
import { Package2, Loader2 } from 'lucide-react';

export default function Auth({ onLogin }: { onLogin: (user: any, token: string) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('operator');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await fetchApi('/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        onLogin(res.user, res.token);
      } else {
        await fetchApi('/register', {
          method: 'POST',
          body: JSON.stringify({ username, password, role }),
        });
        setIsLogin(true);
        setError('注册成功，请登录');
        setUsername('');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-blue-600">
          <Package2 className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          PPIOS 产品管理系统
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
          <div className="flex mb-6 border-b border-slate-200">
            <button
              className={`flex-1 pb-3 text-center font-medium text-sm ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              登录
            </button>
            <button
              className={`flex-1 pb-3 text-center font-medium text-sm ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              注册
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`p-3 text-sm rounded-md ${error === '注册成功，请登录' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">用户名</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">密码</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700">角色</label>
                <div className="mt-1">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="operator">操作员</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? '登录' : '注册')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
