'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

export default function AdminUserLoginPage() {
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
        const userId = result.result?.loginResult?.accountInfo?.userId;
        const loggedInPhone = result.result?.loginResult?.accountInfo?.mobilePhone;
        
        if (token) {
          // 将令牌和用户信息存储在 sessionStorage 中
          sessionStorage.setItem('authToken', token);
          if (loggedInPhone) {
            sessionStorage.setItem('loggedInUserPhone', loggedInPhone);
            console.log(`[Login] Stored phone: ${loggedInPhone}`);
          }
          if (userId) {
            sessionStorage.setItem('loggedInUserId', userId.toString());
            console.log(`[Login] Stored userId: ${userId}`);
          }
          
          // 保存令牌到数据库
          try {
            const saveResponse = await fetch('/api/admin/save-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone: loggedInPhone,
                userId: userId?.toString(),
                authToken: token,
              }),
            });
            
            const saveResult = await saveResponse.json();
            if (saveResult.success) {
              console.log('[Login] Token saved to database successfully');
            } else {
              console.error('[Login] Failed to save token to database:', saveResult.message);
            }
          } catch (saveError) {
            console.error('[Login] Error saving token to database:', saveError);
          }
          
          toast.success('登录成功');
          
          // 登录成功后刷新当前页面
          router.refresh();
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
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">用户账号登录</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 max-w-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">完美世界平台账号登录</h2>
        
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
        
        <div className="mt-4 text-center text-xs text-gray-500 border-t pt-3">
          <p>
            提示：验证码需前往 <strong>完美世界竞技平台APP</strong>，
            在登录界面通过您注册的手机号手动获取。
          </p>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow-md p-6 max-w-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">账号状态</h2>
        <div id="userLoginStatus" className="py-3">
          <p className="text-gray-600">登录后可查询完美世界平台账号的详细信息</p>
        </div>
        
        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', () => {
              const statusEl = document.getElementById('userLoginStatus');
              const token = sessionStorage.getItem('authToken');
              const phone = sessionStorage.getItem('loggedInUserPhone');
              const userId = sessionStorage.getItem('loggedInUserId');
              
              if (token && statusEl) {
                let html = '<div class="py-2 px-3 bg-green-100 rounded text-green-800">';
                html += '<p class="font-medium">已登录</p>';
                if (phone) html += '<p class="text-sm">手机号: ' + phone + '</p>';
                if (userId) html += '<p class="text-sm">用户ID: ' + userId + '</p>';
                html += '<p class="text-sm">Token: ' + token.substring(0, 6) + '...' + token.substring(token.length - 4) + '</p>';
                html += '</div>';
                
                statusEl.innerHTML = html;
              }
            });
          `
        }} />
      </div>
    </div>
  );
} 