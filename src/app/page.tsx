'use client';

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import SearchForm from './components/SearchForm';
import ResultDisplay from './components/ResultDisplay';

// Define the player data interface
interface PlayerInfo {
  steamId64Str: string;
  name: string | null;
}

interface UserInfo {
  code: number;
  data?: {
    player?: {
      personaname: string;
    };
    vac_banned: boolean;
    game_ban_count: number;
  };
}

interface DetailedData {
  player_name: string;
  main_stats: Record<string, string>;
  detailed_stats: Record<string, Record<string, string>>;
  weapons: Array<{
    rank: string;
    name: string;
    kills: string;
    shots: string;
    hits: string;
    accuracy: string;
  }>;
  maps: Array<{
    rank: string;
    name: string;
    rounds: string;
    wins: string;
    winrate: string;
  }>;
}

interface PlayerData {
  playerInfo: PlayerInfo;
  userInfo: UserInfo | null;
  playerStats: {
    code: number;
    data: Record<string, unknown>;
  } | null;
  detailedStats: DetailedData | null;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 检查用户是否已登录
    const authToken = sessionStorage.getItem('authToken');
    setIsLoggedIn(!!authToken);
  }, []);

  const handleSearch = async (data: { searchType: string; searchId: string }) => {
    setIsLoading(true);
    setPlayerData(null);

    try {
      const authToken = sessionStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['x-auth-token'] = authToken;
      }
      
      const response = await fetch('/api/csgo', {
        method: 'POST',
        headers,
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

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    setIsLoggedIn(false);
    toast.success('已退出登录');
  };

  return (
    <main className="min-h-screen py-10 px-4 bg-gray-100">
      <Toaster position="top-center" />
      
      <div className="container mx-auto">
        <header className="mb-10 flex justify-between items-center">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CSGO 玩家战绩查询系统</h1>
            <p className="text-gray-600">输入玩家ID或Steam ID查询详细游戏数据</p>
          </div>
          <div>
            {isLoggedIn ? (
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                退出登录
              </button>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                登录
              </Link>
            )}
          </div>
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
          playerData && <ResultDisplay data={playerData} isLoggedIn={isLoggedIn} />
        )}

        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>CSGO 玩家战绩查询系统 © 2023</p>
        </footer>
      </div>
    </main>
  );
}
