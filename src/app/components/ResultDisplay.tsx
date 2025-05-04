import React, { useEffect, useCallback } from 'react';

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
};

// Add global window interface extensions
declare global {
  interface Window {
    eloScoreModal?: HTMLDialogElement;
    loginModal?: HTMLDialogElement;
    banInfoModal?: HTMLDialogElement;
    login?: () => void;
  }
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ data }) => {
  // 检查封禁状态的函数
  const checkBanStatus = useCallback(async (steamId: string, token: string) => {
    try {
      // 显示封禁信息模态框，并显示加载中
      const banInfoModal = window.banInfoModal as HTMLDialogElement;
      const banInfoContent = document.getElementById('banInfoContent');
      
      if (banInfoContent) {
        banInfoContent.innerHTML = '<p class="text-center">正在获取封禁信息...</p>';
      }
      
      banInfoModal?.showModal();

      // 提交封禁检查请求
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          action: 'checkBan',
          steamId,
        }),
      });

      const result = await response.json();
      
      // 使用封禁信息更新模态框内容
      if (banInfoContent) {
        if (result.data && result.data.desc) {
          const expireTime = result.data.expireTime 
            ? new Date(result.data.expireTime * 1000).toLocaleString() 
            : '未知';
            
          banInfoContent.innerHTML = `
            <div class="space-y-3">
              <p class="text-red-600 font-medium">该用户已被封禁</p>
              <p>${result.data.desc}</p>
              <p>解封时间: ${expireTime}</p>
            </div>
          `;
        } else {
          banInfoContent.innerHTML = '<p class="text-green-600 font-medium text-center">该用户未被封禁</p>';
        }
      }
    } catch (error) {
      console.error('Ban check error:', error);
      const banInfoContent = document.getElementById('banInfoContent');
      if (banInfoContent) {
        banInfoContent.innerHTML = '<p class="text-red-600 text-center">获取封禁信息失败，请稍后再试</p>';
      }
    }
  }, []);

  useEffect(() => {
    // 初始化登录函数
    window.login = async () => {
      const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
      const code = (document.getElementById('code') as HTMLInputElement)?.value;

      if (!phone || !code) {
        alert('请输入手机号和验证码');
        return;
      }

      try {
        // 显示加载状态
        const loginButton = document.querySelector('#loginModal button.btn-blue') as HTMLButtonElement;
        if (loginButton) {
          loginButton.disabled = true;
          loginButton.textContent = '登录中...';
        }

        // 提交登录请求
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'login',
            mobilePhone: phone,
            securityCode: code,
          }),
        });

        const result = await response.json();
        
        // 重置按钮状态
        if (loginButton) {
          loginButton.disabled = false;
          loginButton.textContent = '登录';
        }
        
        if (result.code === 0 && result.description === 'Success') {
          const token = result.result?.loginResult?.accountInfo?.token;
          
          if (token) {
            // 将令牌存储在 sessionStorage 中
            sessionStorage.setItem('authToken', token);
            
            // 关闭登录模态框
            window.loginModal?.close();
            
            // 检查封禁状态
            await checkBanStatus(data.playerInfo.steamId64Str, token);
          } else {
            alert('登录成功，但未获取到token');
          }
        } else {
          alert(`登录失败: ${result.description || '未知错误'}`);
        }
      } catch (error) {
        console.error('Login error:', error);
        alert('登录请求失败，请稍后再试');
        
        // 出错时重置按钮状态
        const loginButton = document.querySelector('#loginModal button.btn-blue') as HTMLButtonElement;
        if (loginButton) {
          loginButton.disabled = false;
          loginButton.textContent = '登录';
        }
      }
    };

    return () => {
      // 组件卸载时清理窗口函数
      delete window.login;
    };
  }, [data.playerInfo.steamId64Str, checkBanStatus]);

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
            <div className="p-4 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100" onClick={() => {
              if (data.playerStats?.data?.pvpScore) {
                window.eloScoreModal?.showModal();
              } else {
                window.loginModal?.showModal();
              }
            }}>
              <p className="text-sm font-medium text-gray-700">ELO 分数</p>
              <p className="font-medium text-blue-600">{data.playerStats?.data?.pvpScore || '未知'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100" onClick={() => {
              const token = sessionStorage.getItem('authToken');
              if (token) {
                checkBanStatus(data.playerInfo.steamId64Str, token);
              } else {
                window.loginModal?.showModal();
              }
            }}>
              <p className="text-sm font-medium text-gray-700">游戏封禁</p>
              <p className={`font-medium ${userInfo.data.game_ban_count > 0 ? 'text-red-600' : 'text-blue-600 underline'}`}>
                {userInfo.data.game_ban_count > 0 ? userInfo.data.game_ban_count : '查看详情'}
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

      {/* ELO Score Modal */}
      <dialog id="eloScoreModal" className="modal">
        <div className="modal-box max-w-xl">
          <h3 className="font-bold text-lg text-center border-b pb-2 mb-3">ELO 分数详情</h3>
          <div className="py-4">
            <p className="mb-2 text-center">当前分数: <span className="font-bold text-blue-600">{data.playerStats?.data?.pvpScore || '未知'}</span></p>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">日期</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">地图</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">比分</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">得分变化</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.playerStats?.data?.matchList?.slice(0, 5).map((match: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{match.startTime?.split(' ')[0] || '未知'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{match.mapName || '未知'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{match.score1}:{match.score2}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                        <span className={match.pvpScoreChange > 0 ? 'text-green-600' : match.pvpScoreChange < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {match.pvpScoreChange > 0 ? `+${match.pvpScoreChange}` : match.pvpScoreChange}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-action center border-t pt-2">
            <form method="dialog">
              <button className="btn btn-blue px-8">关闭</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Login Modal */}
      <dialog id="loginModal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-center border-b pb-2 mb-4">登录查看详情</h3>
          <div className="py-2 px-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                <input
                  type="tel"
                  id="phone"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入手机号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                <input
                  type="text"
                  id="code"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入验证码"
                />
              </div>
            </div>
          </div>
          <div className="modal-action center border-t pt-4">
            <button
              className="btn btn-blue px-8 mr-2"
              onClick={() => window.login?.()}
            >
              登录
            </button>
            <form method="dialog">
              <button className="btn btn-gray px-8">取消</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Ban Info Modal */}
      <dialog id="banInfoModal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-center border-b pb-2 mb-2">封禁信息</h3>
          <div id="banInfoContent" className="py-6 px-4">
            <p className="text-center">正在获取封禁信息...</p>
          </div>
          <div className="modal-action center border-t pt-2">
            <form method="dialog">
              <button className="btn btn-blue px-8">关闭</button>
            </form>
          </div>
        </div>
      </dialog>

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