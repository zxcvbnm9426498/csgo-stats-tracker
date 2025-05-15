'use client';

import { useState } from 'react';
import { toast, Toaster } from 'react-hot-toast';

export default function DatabaseManagementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const updateDatabaseSchema = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/admin/update-db', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok && data.success) {
        toast.success('数据库结构更新成功');
      } else {
        toast.error(`更新失败: ${data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('数据库更新错误:', error);
      toast.error('执行更新时出错');
      setResult({ success: false, error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-6">数据库管理</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">数据库维护</h2>
        <p className="mb-4 text-gray-600">
          此页面用于维护和修复数据库结构。执行更新将检查并添加缺少的表、列和索引。
        </p>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={updateDatabaseSchema}
            disabled={isLoading}
            className={`py-2 px-4 rounded-md text-white ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            {isLoading ? '执行中...' : '更新数据库结构'}
          </button>
          
          {isLoading && (
            <div className="flex items-center text-gray-600">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>处理中，请稍候...</span>
            </div>
          )}
        </div>
      </div>
      
      {result && (
        <div className={`bg-white rounded-lg shadow-md p-6 mt-6 border-l-4 ${
          result.success ? 'border-green-500' : 'border-red-500'
        }`}>
          <h3 className="text-lg font-medium mb-2">
            {result.success ? '执行结果: 成功' : '执行结果: 失败'}
          </h3>
          <p className="mb-2 text-gray-700">{result.message}</p>
          
          {result.details && (
            <div className="mt-4 bg-gray-50 p-3 rounded-md">
              <h4 className="text-sm font-semibold mb-2 text-gray-700">详细信息:</h4>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}
          
          {result.error && (
            <div className="mt-4 bg-red-50 p-3 rounded-md">
              <h4 className="text-sm font-semibold mb-1 text-red-700">错误信息:</h4>
              <p className="text-xs text-red-600">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 