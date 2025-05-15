'use client';

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import ResultDisplay from './components/ResultDisplay';
import AccountCard from './components/AccountCard';

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

// 账号接口定义
interface Account {
  id: string;
  username: string;
  userId?: string;
  steamId?: string;
  status: string;
}

// Helper function to mask phone number
const maskPhoneNumber = (phone: string | null): string | null => {
  if (!phone || phone.length < 7) return phone; // Return original if too short or null
  const start = phone.substring(0, 3);
  const end = phone.substring(phone.length - 4);
  return `${start}****${end}`;
};

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  // 加载账号列表
  useEffect(() => {
    fetchAccounts();
  }, []);

  // 检查登录状态
  useEffect(() => {
    const authToken = sessionStorage.getItem('authToken');
    const storedPhone = sessionStorage.getItem('loggedInUserPhone');
    const storedUserId = sessionStorage.getItem('loggedInUserId');
    const currentlyLoggedIn = !!authToken;
    
    setIsLoggedIn(currentlyLoggedIn);
    setUserToken(authToken); 
    setUserPhone(storedPhone);
    setUserId(storedUserId);

    console.log(`[页面] 初始加载: isLoggedIn=${currentlyLoggedIn}, Phone=${storedPhone}, UserID=${storedUserId}`);
  }, []);

  // 监听页面路径变化，如果用户从其他页面返回，重置activeAccount
  useEffect(() => {
    // 当用户从详情页返回时，清除activeAccount状态
    if (pathname === '/') {
      // 通过检查sessionStorage判断是否是从详情页返回
      const isReturnFromDetails = sessionStorage.getItem('viewingDetails');
      if (isReturnFromDetails === 'true') {
        setActiveAccount(null);
        sessionStorage.removeItem('viewingDetails');
      }
    }
  }, [pathname]);

  // 当账号被选中且有Steam ID时，获取战绩
  useEffect(() => {
    if (activeAccount?.steamId) {
      handleAccountSelect(activeAccount);
    }
  }, [activeAccount]);

  // 获取所有账号
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/public/accounts');
      
      if (!response.ok) {
        throw new Error('获取账号列表失败');
      }
      
      const data = await response.json();
      if (data.success && data.data.accounts) {
        // 只显示有Steam ID的账号
        const validAccounts = data.data.accounts.filter((account: Account) => account.steamId);
        setAccounts(validAccounts);
      } else {
        toast.error('获取账号列表失败');
      }
    } catch (error) {
      console.error('获取账号失败:', error);
      toast.error(error instanceof Error ? error.message : '获取账号失败');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePlayerData = async (steamId: string, token: string) => {
    try {
      console.log('[页面] 开始请求玩家数据，steamId:', steamId);
      
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
        
        if (eloData.data.pvpScore) {
          pvpScore = eloData.data.pvpScore;
          console.log('[页面] 从API响应中直接获取到pvpScore:', pvpScore);
        } else if (eloData.data.matchList && eloData.data.matchList.length > 0) {
          pvpScore = eloData.data.matchList[0].pvpScore;
          console.log('[页面] 从第一场比赛记录中获取pvpScore:', pvpScore);
        }
        
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

  // 处理账号卡片点击
  const handleAccountSelect = async (account: Account) => {
    if (!account.steamId) {
      toast.error('该账号没有关联Steam ID，无法查询战绩');
      return;
    }

    setActiveAccount(account);
    setIsLoading(true);
    setPlayerData(null);

    try {
      const authToken = sessionStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authToken) { headers['x-auth-token'] = authToken; }
      
      const response = await fetch('/api/csgo', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          searchType: 'steamId',
          searchId: account.steamId
        }),
      });

      const result = await response.json();
      if (!response.ok) { throw new Error(result.error || '查询失败'); }
      setPlayerData(result);

      if (isLoggedIn && authToken && result?.playerInfo?.steamId64Str) {
          console.log('[页面] 搜索成功后触发 updatePlayerData');
          updatePlayerData(result.playerInfo.steamId64Str, authToken);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '查询时出现错误');
      console.error('查询错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('loggedInUserPhone');
    sessionStorage.removeItem('loggedInUserId');
    setIsLoggedIn(false);
    setUserPhone(null);
    setUserToken(null);
    setUserId(null);
    toast.success('已退出登录');
    
    if (playerData) {
      setPlayerData(prevData => {
        if (!prevData) return null;
        return { ...prevData, playerStats: null };
      });
    }
  };

  const handleViewDetails = () => {
    // 设置一个标记，表示用户正在查看详情页
    sessionStorage.setItem('viewingDetails', 'true');
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
          <div className="flex flex-col items-end">
            {isLoggedIn && userPhone && (
              <div className="text-xs text-gray-600 mb-1 text-right">
                <p>用户ID: {userId || '-'}</p>
                <p>手机号: {maskPhoneNumber(userPhone)}</p>
                {userToken && <p title={userToken}>Token: {userToken.substring(0, 6)}...{userToken.substring(userToken.length - 4)}</p>}
              </div>
            )}
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

        {/* 账号卡片列表 */}
        {accounts.length > 0 && !activeAccount && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-6 text-center">选择玩家查看战绩</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  id={account.id}
                  username={account.username}
                  userId={account.userId}
                  steamId={account.steamId}
                  status={account.status}
                  onClick={() => handleAccountSelect(account)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 返回按钮 */}
        {activeAccount && (
          <div className="mb-6">
            <button
              onClick={() => setActiveAccount(null)}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              返回玩家列表
            </button>
          </div>
        )}

        {/* 加载提示 */}
        {isLoading && (
          <div className="text-center py-10">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-600">正在获取数据，请稍候...</p>
          </div>
        )}

        {/* 结果展示 */}
        {!isLoading && playerData && (
          <div>
            {activeAccount && (
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  正在查看: {activeAccount.username || activeAccount.steamId}
                </h2>
              </div>
            )}
            <ResultDisplay 
              data={playerData} 
              isLoggedIn={isLoggedIn} 
              onViewDetails={handleViewDetails}
            />
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && accounts.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-600">没有找到可用的玩家账号，请联系管理员添加账号。</p>
          </div>
        )}
      </div>
    </main>
  );
}
