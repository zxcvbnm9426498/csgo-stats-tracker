import React from 'react';

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

interface PlayerData {
  playerInfo: PlayerInfo;
  userInfo: UserInfo | null;
  detailedStats: DetailedData | null;
}

type ResultDisplayProps = {
  data: PlayerData;
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data }) => {
  if (!data) return null;

  const { playerInfo, userInfo, detailedStats } = data;
  const mainStats = detailedStats?.main_stats as Record<string, string> | undefined;
  const detailStats = detailedStats?.detailed_stats as Record<string, Record<string, string>> | undefined;
  const weapons = detailedStats?.weapons as Weapon[] | undefined;
  const maps = detailedStats?.maps as Map[] | undefined;

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">玩家信息</h2>
      
      {/* 玩家基本信息 */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">基本资料</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-700">玩家名称</p>
            <p className="font-medium text-gray-900">{playerInfo?.name || detailedStats?.player_name || '未知'}</p>
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
              <p className="text-sm font-medium text-gray-700">VAC 封禁</p>
              <p className={`font-medium ${userInfo.data.vac_banned ? 'text-red-600' : 'text-green-600'}`}>
                {userInfo.data.vac_banned ? '是' : '否'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">游戏封禁</p>
              <p className={`font-medium ${userInfo.data.game_ban_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {userInfo.data.game_ban_count || '0'}
              </p>
            </div>
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
      {!userInfo && !detailedStats && (
        <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md">
          <p className="text-yellow-700 font-medium">未能获取玩家详细数据，仅有基本信息可用。</p>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay; 