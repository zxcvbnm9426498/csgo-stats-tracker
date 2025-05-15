import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { createAuthConfig } from '@/utils/api-token';

// 类型定义
interface Weapon {
  rank: string;
  name: string;
  kills: string;
  shots: string;
  hits: string;
  accuracy: string;
}

interface Map {
  rank: string;
  name: string;
  rounds: string;
  wins: string;
  winrate: string;
}

// Remove unused DetailedStats interface or keep it and use it
interface DetailedData {
  player_name: string;
  main_stats: Record<string, string>;
  detailed_stats: Record<string, Record<string, string>>;
  weapons: Weapon[];
  maps: Map[];
}

interface PlayerInfo {
  steamId64Str: string;
  name: string | null;
}

interface MatchData {
  matchId: string;
  mapName: string;
  score1: number;
  score2: number;
  startTime: string;
  pvpScore: number;
  pvpScoreChange: number;
  timeStamp: number;
  mapLogo?: string;
  team: number;
  winTeam: number;
  kill: number;
  death: number;
  assist: number;
  rating: number;
  // ... other match properties
}

interface PlayerStatsData {
  code: number;
  data: {
    pvpScore?: number;
    matchList?: MatchData[];
    // ... other stats data
  };
}

interface UserInfo {
  code: number;
  data?: {
    player?: {
      personaname: string;
    };
    vac_banned: boolean;
    game_ban_count: number;
    expireTime?: number;
  };
  banInfo?: {
    desc: string;
    expireTime?: number;
  };
}

interface PlayerData {
  playerInfo: PlayerInfo;
  userInfo: UserInfo | null;
  detailedStats: DetailedData | null;
  playerStats?: PlayerStatsData | null;
}

type ResultDisplayProps = {
  data: PlayerData;
  isLoggedIn?: boolean;
  onViewDetails?: () => void;
};

// Helper function to format Unix timestamp to readable string
const formatTimestamp = (timestamp: number | null): string => {
  if (!timestamp) return '未知时间';
  try {
    // Multiply by 1000 because JS Date expects milliseconds
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '无效时间格式';
  }
};

// 添加获取ELO分数的接口类型
interface EloResponse {
  statusCode: number;
  data: {
    pvpScore: number;
    matchList: Array<{
      matchId: string;
      mapName: string;
      score1: number;
      score2: number;
      startTime: string;
      pvpScore: number;
      pvpScoreChange: number;
      // 其他可能的字段
      timeStamp?: number;
      team?: number;
      winTeam?: number;
      kill?: number;
      death?: number;
      assist?: number;
      rating?: number;
    }>;
  };
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data, isLoggedIn = false, onViewDetails }) => {
  const router = useRouter();
  const [eloData, setEloData] = useState<EloResponse | null>(null);
  const [loadingElo, setLoadingElo] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStatsData | null>(null);
  
  // 初始化playerStats状态
  useEffect(() => {
    if (data.playerStats) {
      setPlayerStats(data.playerStats);
    }
  }, [data.playerStats]);
  
  // 获取ELO分数和比赛记录
  useEffect(() => {
    const fetchEloData = async () => {
      if (!data.playerInfo?.steamId64Str) return;
      
      setLoadingElo(true);
      try {
        // 使用API令牌获取认证配置
        const authConfig = await createAuthConfig();
        
        // 请求获取ELO数据
        const response = await axios.post('/api/auth', {
          action: 'getEloScore',
          steamId: data.playerInfo.steamId64Str
        }, authConfig);
        
        if (response.data && response.data.statusCode === 0) {
          setEloData(response.data);
          
          // 整合比赛记录数据到playerStats中
          if (response.data.data.matchList && response.data.data.matchList.length > 0) {
            // 转换数据格式以匹配组件期望的结构
            const updatedMatches = response.data.data.matchList.map(match => ({
              ...match,
              timeStamp: match.timeStamp || parseInt(match.startTime, 10), // 确保timeStamp字段存在
              // 如果需要，添加其他默认字段
              team: match.team || 1,
              winTeam: match.winTeam || (match.score1 > match.score2 ? 1 : 2),
              kill: match.kill || 0,
              death: match.death || 0,
              assist: match.assist || 0,
              rating: match.rating || 1.0
            }));
            
            // 更新playerStats状态，而不是直接修改data对象
            setPlayerStats(prevStats => {
              if (!prevStats) {
                // 如果之前没有数据，创建新的对象
                return {
                  code: 1,
                  data: {
                    pvpScore: response.data.data.pvpScore,
                    matchList: updatedMatches
                  }
                };
              } else {
                // 如果有现有数据，创建新对象并合并数据
                return {
                  ...prevStats,
                  data: {
                    ...prevStats.data,
                    pvpScore: response.data.data.pvpScore,
                    matchList: updatedMatches
                  }
                };
              }
            });
          }
        }
      } catch (error) {
        console.error('获取ELO分数数据失败:', error);
      } finally {
        setLoadingElo(false);
      }
    };
    
    fetchEloData();
  }, [data.playerInfo?.steamId64Str]);
  
  // 导航到登录页面
  const navigateToLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  // 处理查看详情
  const handleViewDetails = useCallback(() => {
    // 触发外部回调
    if (onViewDetails) {
      onViewDetails();
    }
    // 导航到详情页面...
  }, [onViewDetails]);

  useEffect(() => {
    // 初始化这部分不再需要
    return () => {
      // 组件卸载时清理
    };
  }, []);

  if (!data) return null;

  const { playerInfo, userInfo, detailedStats } = data;
  const mainStats = detailedStats?.main_stats as Record<string, string> | undefined;
  const detailStats = detailedStats?.detailed_stats as Record<string, Record<string, string>> | undefined;
  const weapons = detailedStats?.weapons as Weapon[] | undefined;
  const maps = detailedStats?.maps as Map[] | undefined;
  
  // 从playerStats获取比赛列表
  const matchList = playerStats?.data?.matchList || [];

  // 格式化日期时间
  const formatMatchDate = (timestamp: number) => {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 评分的颜色
  const getRatingColor = (rating: number) => {
    if (rating >= 2.0) return 'text-purple-600';
    if (rating >= 1.5) return 'text-green-600';
    if (rating >= 1.0) return 'text-blue-600';
    if (rating >= 0.85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">玩家信息</h2>
      
      {/* 玩家基本信息 */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">基本资料</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">玩家名称</p>
            <p className="font-medium text-gray-900">{playerInfo?.name || detailedStats?.player_name || userInfo?.data?.player?.personaname || '未知'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">Steam ID</p>
            <p className="font-medium text-gray-900">{playerInfo?.steamId64Str || '未知'}</p>
          </div>
        </div>
      </div>

      {/* 账号信息 (如果有) */}
      {userInfo && userInfo.code === 1 && userInfo.data && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">账号信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">用户名</p>
              <p className="font-medium text-gray-900">{userInfo.data.player?.personaname || '未知'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">ELO 分数</p>
              <p className="font-medium text-blue-600">
                {(playerStats?.data?.pvpScore !== null && playerStats?.data?.pvpScore !== undefined)
                  ? `${playerStats.data.pvpScore}` 
                  : eloData?.data?.pvpScore
                    ? `${eloData.data.pvpScore}` 
                    : loadingElo 
                      ? '加载中...' 
                      : '获取中...'}
              </p>
              {playerStats?.data?.matchList && playerStats.data.matchList.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  最近比赛: {playerStats.data.matchList[0].mapName} ({playerStats.data.matchList[0].score1}:{playerStats.data.matchList[0].score2})
                </p>
              )}
            </div>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">游戏封禁</p>
              <p className={`font-medium ${userInfo.data.game_ban_count > 0 || userInfo.banInfo?.desc ? 'text-red-600' : 'text-green-600'}`}>
                {userInfo.banInfo?.desc
                  ? `${userInfo.banInfo.desc} ${formatTimestamp(userInfo.banInfo.expireTime ?? null)}`
                  : userInfo.data.game_ban_count > 0 
                    ? `${userInfo.data.game_ban_count} 次` 
                    : '无封禁记录'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 比赛战绩列表 */}
      {playerStats?.data?.matchList && playerStats.data.matchList.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">近期比赛战绩</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">日期</th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">地图</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">比分</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">战绩</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">评分</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">ELO</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">变动</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {playerStats.data.matchList.map((match, index) => (
                  <tr key={match.matchId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{formatMatchDate(match.timeStamp)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {match.mapLogo && (
                          <img src={match.mapLogo} alt={match.mapName} className="w-5 h-5 mr-2" />
                        )}
                        {match.mapName}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-medium">
                      <span className={`px-2 py-1 rounded ${match.team === match.winTeam ? 'bg-green-100' : match.winTeam === -1 ? 'bg-blue-50' : 'bg-red-100'}`}>
                        {match.score1}:{match.score2}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                      {match.kill}/{match.death}/{match.assist}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-medium">
                      <span className={getRatingColor(match.rating)}>{match.rating.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center">{match.pvpScore}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-medium">
                      <span className={match.pvpScoreChange > 0 ? 'text-green-600' : 'text-red-600'}>
                        {match.pvpScoreChange > 0 ? '+' : ''}{match.pvpScoreChange}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 主要统计数据 */}
      {mainStats && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">游戏统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(mainStats).map(([key, value]) => (
              <div key={key} className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700">{key}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 武器统计数据 */}
      {weapons && weapons.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">武器统计 (Top 5)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">排名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">武器</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">击杀</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">射击次数</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">命中</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">命中率</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {weapons.map((weapon: Weapon, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{weapon.rank}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{weapon.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{weapon.kills}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{weapon.shots}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{weapon.hits}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{weapon.accuracy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 地图统计数据 */}
      {maps && maps.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">地图统计 (Top 5)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">排名</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">地图</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">回合数</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">胜利</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">胜率</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maps.map((map: Map, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{map.rank}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{map.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{map.rounds}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{map.wins}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{map.winrate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 详细统计数据 */}
      {detailStats && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">详细统计</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(detailStats).map(([category, stats]) => (
              <div key={category} className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-lg mb-3 text-gray-800">{category}</h4>
                <div className="space-y-2">
                  {Object.entries(stats).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b border-gray-200 py-2">
                      <span className="font-medium text-gray-700">{key}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 如果没有数据 */}
      {!userInfo && !detailedStats && (!playerStats?.data?.matchList || playerStats.data.matchList.length === 0) && (
        <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
          <p className="text-yellow-700 font-medium">未能获取玩家详细数据，仅有基本信息可用。</p>
        </div>
      )}

      {/* 在底部添加查看详情按钮 */}
      <div className="mt-8 text-center">
        <button
          onClick={handleViewDetails}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          查看完整战绩详情
        </button>
      </div>
    </div>
  );
};

export default ResultDisplay; 