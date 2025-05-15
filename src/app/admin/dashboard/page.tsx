'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import AdminAuthCheck from '@/app/components/admin/AdminAuthCheck';

interface Stats {
  totalAccounts: number;
  activeAccounts: number;
  suspendedAccounts: number;
  bannedAccounts: number;
  totalLogs: number;
  todayLogs: number;
  recentLogins: number;
  recentSearches: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalAccounts: 0,
    activeAccounts: 0,
    suspendedAccounts: 0,
    bannedAccounts: 0,
    totalLogs: 0,
    todayLogs: 0,
    recentLogins: 0,
    recentSearches: 0
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/logs?limit=5');
        
        if (!response.ok) {
          if (response.status === 401) {
            toast.error('请先登录');
            router.push('/admin');
            return;
          }
          throw new Error('获取数据失败');
        }
        
        // 获取日志数据
        const result = await response.json();
        if (result.success && result.data && result.data.logs) {
          setRecentLogs(result.data.logs);
          
          // 获取账号数据
          const accountsResponse = await fetch('/api/admin/accounts');
          if (accountsResponse.ok) {
            const accountsResult = await accountsResponse.json();
            if (accountsResult.success && accountsResult.data && accountsResult.data.accounts) {
              const accounts = accountsResult.data.accounts;
              
              // 计算统计数据
              const activeAccounts = accounts.filter((acc: any) => acc.status === 'active').length;
              const suspendedAccounts = accounts.filter((acc: any) => acc.status === 'suspended').length;
              const bannedAccounts = accounts.filter((acc: any) => acc.status === 'banned').length;
              
              // 计算今日日志数量
              const today = new Date().toISOString().split('T')[0];
              const todayLogs = result.data.logs.filter((log: any) => 
                log.timestamp && log.timestamp.startsWith(today)
              ).length;
              
              // 计算最近登录和搜索数量
              const recentLogins = result.data.logs.filter((log: any) => 
                log.action && log.action.includes('LOGIN')
              ).length;
              
              const recentSearches = result.data.logs.filter((log: any) => 
                log.action && (log.action.includes('SEARCH') || log.action.includes('VIEW'))
              ).length;
              
              setStats({
                totalAccounts: accounts.length,
                activeAccounts,
                suspendedAccounts,
                bannedAccounts,
                totalLogs: result.data.pagination?.total || result.data.logs.length,
                todayLogs,
                recentLogins,
                recentSearches
              });
            } else {
              // 如果没有获取到账号数据，至少更新日志相关统计
              const today = new Date().toISOString().split('T')[0];
              const todayLogs = result.data.logs.filter((log: any) => 
                log.timestamp && log.timestamp.startsWith(today)
              ).length;
              
              const recentLogins = result.data.logs.filter((log: any) => 
                log.action && log.action.includes('LOGIN')
              ).length;
              
              const recentSearches = result.data.logs.filter((log: any) => 
                log.action && (log.action.includes('SEARCH') || log.action.includes('VIEW'))
              ).length;
              
              setStats(prev => ({
                ...prev,
                totalLogs: result.data.pagination?.total || result.data.logs.length,
                todayLogs,
                recentLogins,
                recentSearches
              }));
            }
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('认证或获取数据失败:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AdminAuthCheck>
      <div>
        <h1 className="text-2xl font-bold mb-6">控制面板</h1>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <h2 className="text-sm text-gray-500 font-medium">总账号数</h2>
            <p className="text-3xl font-bold text-gray-900">{stats.totalAccounts}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h2 className="text-sm text-gray-500 font-medium">活跃账号</h2>
            <p className="text-3xl font-bold text-green-600">{stats.activeAccounts}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h2 className="text-sm text-gray-500 font-medium">已暂停账号</h2>
            <p className="text-3xl font-bold text-yellow-600">{stats.suspendedAccounts}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <h2 className="text-sm text-gray-500 font-medium">已封禁账号</h2>
            <p className="text-3xl font-bold text-red-600">{stats.bannedAccounts}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 最近活动 */}
          <div className="bg-white rounded-lg p-5 shadow">
            <h2 className="text-lg font-semibold mb-4">最近活动</h2>
            <div className="space-y-4">
              {recentLogs.map((log, index) => (
                <div key={index} className="flex items-start">
                  <div className="bg-blue-50 p-2 rounded-full mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-gray-500">{log.details}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 系统概况 */}
          <div className="bg-white rounded-lg p-5 shadow">
            <h2 className="text-lg font-semibold mb-4">系统概况</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">总日志数</span>
                <span className="font-medium">{stats.totalLogs}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">今日日志</span>
                <span className="font-medium">{stats.todayLogs}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">最近登录次数</span>
                <span className="font-medium">{stats.recentLogins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">最近搜索次数</span>
                <span className="font-medium">{stats.recentSearches}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-right">
          <button 
            onClick={() => router.push('/admin/logs')}
            className="text-blue-600 hover:text-blue-800"
          >
            查看所有日志 →
          </button>
        </div>
      </div>
    </AdminAuthCheck>
  );
} 