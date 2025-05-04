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
    const wasLoggedIn = isLoggedIn;
    const currentlyLoggedIn = !!authToken;
    setIsLoggedIn(currentlyLoggedIn);
    
    console.log(`[页面] useEffect 登录状态检查: wasLoggedIn=${wasLoggedIn}, currentlyLoggedIn=${currentlyLoggedIn}`);
    
    // 如果用户从未登录变为已登录，并且有玩家数据，则获取额外信息
    if (currentlyLoggedIn && !wasLoggedIn && playerData?.playerInfo?.steamId64Str) {
      console.log('[页面] 登录状态变化，触发 updatePlayerData');
      updatePlayerData(playerData.playerInfo.steamId64Str, authToken);
    }
  }, [isLoggedIn]);

  // 在搜索结果(playerData)返回后，如果已登录，立即请求额外数据
  useEffect(() => {
    console.log(`[页面] useEffect 玩家数据检查: playerData=${!!playerData}, isLoggedIn=${isLoggedIn}`);
    if (playerData?.playerInfo?.steamId64Str && isLoggedIn) {
      const authToken = sessionStorage.getItem('authToken');
      if (authToken) {
        console.log('[页面] 玩家数据已加载且用户已登录，触发 updatePlayerData');
        updatePlayerData(playerData.playerInfo.steamId64Str, authToken);
      } else {
        console.warn('[页面] 玩家数据已加载但 authToken 未找到，无法更新数据');
      }
    }
  }, [playerData?.playerInfo?.steamId64Str, isLoggedIn]);

  // 更新玩家数据（获取ELO分数和封禁信息）
  const updatePlayerData = async (steamId: string, token: string) => {
    try {
      console.log('[页面] 开始请求玩家数据，steamId:', steamId);
      
      // 获取ELO分数
      console.log('[页面] 请求ELO分数');
      const eloResponse = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          action: 'getEloScore',
          steamId
        })
      });
      
      const eloData = await eloResponse.json();
      console.log('[页面] 收到ELO数据响应:', eloData);
      
      if (eloData.statusCode === 0 && eloData.data) {
        let pvpScore = null;
        
        // 尝试从不同的地方获取pvpScore
        if (eloData.data.pvpScore) {
          // 如果API直接返回了pvpScore
          pvpScore = eloData.data.pvpScore;
          console.log('[页面] 从API响应中直接获取到pvpScore:', pvpScore);
        } else if (eloData.data.matchList && eloData.data.matchList.length > 0) {
          // 如果有比赛列表，从第一场比赛中获取
          pvpScore = eloData.data.matchList[0].pvpScore;
          console.log('[页面] 从第一场比赛记录中获取pvpScore:', pvpScore);
        }
        
        // 修改判断条件，允许 pvpScore 为 0
        if (pvpScore !== null && pvpScore !== undefined) { 
          console.log('[页面] 更新UI显示ELO分数:', pvpScore);
          setPlayerData(prevData => {
            if (!prevData) return null;
            return {
              ...prevData,
              playerStats: {
                code: 0,
                data: {
                  ...eloData.data,
                  pvpScore: pvpScore
                }
              }
            };
          });
        } else {
          console.log('[页面] 未找到有效的pvpScore值 (可能是 null 或 undefined)');
        }
      } else {
        console.error('[页面] 获取ELO分数失败:', eloData);
      }
      
      // 获取封禁信息
      console.log('[页面] 请求封禁信息');
      const banResponse = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          action: 'checkBan',
          steamId
        })
      });
      
      const banData = await banResponse.json();
      console.log('[页面] 收到封禁信息响应:', banData);
      
      // 如果有封禁信息，更新到userInfo中
      if (banData.statusCode === 0 && banData.data) {
        console.log('[页面] 更新UI显示封禁信息');
        setPlayerData(prevData => {
          if (!prevData || !prevData.userInfo) return prevData;
          return {
            ...prevData,
            userInfo: {
              ...prevData.userInfo,
              banInfo: banData.data
            }
          };
        });
      }
    } catch (error) {
      console.error('[页面] 更新玩家数据时出错:', error);
    }
  };

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
    
    // 如果有玩家数据，清除额外信息
    if (playerData) {
      setPlayerData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          playerStats: null
        };
      });
    }
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
