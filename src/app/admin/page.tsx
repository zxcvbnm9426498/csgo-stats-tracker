'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // 检查是否已登录，如果已登录则重定向到控制面板
    const checkLoginStatus = async () => {
      try {
        const response = await fetch('/api/admin/logs', {
          method: 'GET'
        });
        
        if (response.ok) {
          // 已登录
          router.push('/admin/dashboard');
        }
      } catch (error) {
        // 未登录或发生错误，无需处理
      }
    };
    
    checkLoginStatus();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          username,
          password,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('登录成功');
        router.push('/admin/dashboard');
      } else {
        toast.error(result.message || '登录失败');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('登录请求失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-10 px-4 bg-gray-100 flex flex-col items-center justify-center">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CSGO 后台管理系统</h1>
          <p className="text-gray-600">请登录以访问管理功能</p>
        </div>
        
        <div className="p-6 bg-white rounded-xl shadow-md">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="请输入管理员用户名"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="请输入密码"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            返回前台页面
          </Link>
        </div>
      </div>
    </main>
  );
} 