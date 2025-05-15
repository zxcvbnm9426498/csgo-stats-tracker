'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * 修复数据库按钮组件
 */
export default function FixDatabaseButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    changes?: string[];
    error?: string;
  } | null>(null);

  const handleFixDatabase = async () => {
    if (!confirm('确定要尝试修复数据库结构吗？')) {
      return;
    }

    setIsLoading(true);
    setResult(null);
    const toastId = toast.loading('正在修复数据库结构...');

    try {
      const response = await fetch('/api/admin/fix-db');
      const data = await response.json();

      setResult(data);

      if (data.success) {
        toast.success(data.message, { id: toastId });
      } else {
        toast.error(data.message || '修复失败', { id: toastId });
      }
    } catch (error) {
      console.error('修复数据库出错:', error);
      toast.error('请求修复数据库时出错', { id: toastId });
      setResult({
        success: false,
        message: '请求出错',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleFixDatabase}
        disabled={isLoading}
        className={`px-4 py-2 rounded ${
          isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
        }`}
      >
        {isLoading ? '修复中...' : '修复数据库结构'}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded border ${
          result.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
        }`}>
          <h3 className="font-medium">{result.message}</h3>
          
          {result.changes && result.changes.length > 0 && (
            <div className="mt-2">
              <h4 className="font-medium">变更内容:</h4>
              <ul className="list-disc pl-5 mt-1">
                {result.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          )}
          
          {result.error && (
            <p className="mt-2 text-red-600">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
} 