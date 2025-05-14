import React from 'react';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-center" />
      
      {/* 侧边栏 */}
      <div className="fixed top-0 left-0 bottom-0 w-64 bg-gray-800 text-white shadow-lg z-10">
        <div className="p-4 flex flex-col h-full">
          <div className="text-xl font-bold py-4 px-2 mb-6 border-b border-gray-700">
            CSGO 后台管理系统
          </div>
          
          <nav className="flex-1">
            <ul className="space-y-2">
              <li>
                <Link href="/admin/dashboard" className="flex items-center px-4 py-3 hover:bg-gray-700 rounded transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span>控制面板</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/accounts" className="flex items-center px-4 py-3 hover:bg-gray-700 rounded transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a3 3 0 00-6 0v1h6zM4 18v-1a3 3 0 016 0v1H4z" />
                  </svg>
                  <span>账号管理</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/logs" className="flex items-center px-4 py-3 hover:bg-gray-700 rounded transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span>日志查看</span>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="mt-auto pt-4 border-t border-gray-700">
            <Link href="/" className="flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span>返回前台</span>
            </Link>
            <button id="logoutBtn" className="w-full flex items-center px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm6.293 5.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L10.586 12H4a1 1 0 010-2h6.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* 主内容区 */}
      <div className="ml-64 p-8">
        {children}
      </div>
      
      {/* 退出登录处理脚本 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            try {
              const response = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'logout' })
              });
              
              const data = await response.json();
              if (data.success) {
                window.location.href = '/admin';
              }
            } catch (error) {
              console.error('退出登录失败:', error);
            }
          });
        `
      }} />
    </div>
  );
} 