'use client';

import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import SearchForm from './components/SearchForm';
import ResultDisplay from './components/ResultDisplay';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [playerData, setPlayerData] = useState<any>(null);

  const handleSearch = async (data: { searchType: string; searchId: string }) => {
    setIsLoading(true);
    setPlayerData(null);

    try {
      const response = await fetch('/api/csgo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '查询失败');
      }
      
      setPlayerData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '查询时出现错误');
      console.error('查询错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-10 px-4 bg-gray-100">
      <Toaster position="top-center" />
      
      <div className="container mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CSGO 玩家战绩查询系统</h1>
          <p className="text-gray-600">输入玩家ID或Steam ID查询详细游戏数据</p>
        </header>

        <div className="mb-10">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-600">正在获取数据，请稍候...</p>
          </div>
        ) : (
          playerData && <ResultDisplay data={playerData} />
        )}

        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>CSGO 玩家战绩查询系统 © 2023</p>
        </footer>
      </div>
    </main>
  );
}
