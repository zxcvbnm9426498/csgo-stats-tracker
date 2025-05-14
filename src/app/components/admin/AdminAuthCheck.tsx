'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface AdminAuthCheckProps {
  children: React.ReactNode;
}

export default function AdminAuthCheck({ children }: AdminAuthCheckProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 尝试访问需要认证的API端点
        const response = await fetch('/api/admin/logs?limit=1');
        
        if (!response.ok) {
          if (response.status === 401) {
            toast.error('您需要登录才能访问管理页面');
            router.push('/admin');
            return;
          }
        }
        
        setIsChecking(false);
      } catch (error) {
        console.error('认证检查失败:', error);
        toast.error('认证检查失败，重定向到登录页面');
        router.push('/admin');
      }
    };
    
    checkAuth();
  }, [router]);
  
  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  return <>{children}</>;
} 