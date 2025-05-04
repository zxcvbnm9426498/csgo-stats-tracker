'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || !code) {
      toast.error('请输入手机号和验证码');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          mobilePhone: phone,
          securityCode: code,
        }),
      });

      const result = await response.json();
      
      if (result.code === 0 && result.description === 'Success') {
        const token = result.result?.loginResult?.accountInfo?.token;
        
        if (token) {
          // 将令牌存储在 sessionStorage 中
          sessionStorage.setItem('authToken', token);
          
          toast.success('登录成功');
          
          // 返回到之前的页面
          router.back();
        } else {
          toast.error('登录成功，但未获取到token');
        }
      } else {
        toast.error(`登录失败: ${result.description || '未知错误'}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('登录请求失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-10 px-4 bg-gray-100 flex flex-col items-center">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            返回查询页面
          </Link>
        </div>
        
        <div className="p-6 bg-white rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">用户登录</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                手机号
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="请输入手机号"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                验证码
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="请输入验证码"
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
          
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>登录后可查看更多玩家数据</p>
          </div>
        </div>
      </div>
    </main>
  );
} 