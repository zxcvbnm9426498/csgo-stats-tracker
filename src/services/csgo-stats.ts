import axios from 'axios';
import { sql } from '@/lib/db';

/**
 * 获取玩家统计数据
 * @param steamId Steam ID
 * @returns 玩家统计数据
 */
export async function fetchPlayerStats(steamId: string) {
  try {
    // 首先检查数据库中是否已有缓存数据
    const cachedData = await sql`
      SELECT * FROM player_stats
      WHERE steam_id = ${steamId}
      AND updated_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `;

    if (cachedData && cachedData.length > 0) {
      return cachedData[0].stats;
    }

    // 如果没有缓存数据或数据已过期，从外部API获取
    const response = await axios.get(`https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/`, {
      params: {
        appid: '730', // CSGO的Steam AppID
        key: process.env.STEAM_API_KEY,
        steamid: steamId,
        format: 'json'
      }
    });

    if (response.data && response.data.playerstats) {
      const stats = response.data.playerstats;
      
      // 处理并格式化数据
      const formattedStats = {
        kills: findStat(stats.stats, 'total_kills'),
        deaths: findStat(stats.stats, 'total_deaths'),
        headshots: findStat(stats.stats, 'total_kills_headshot'),
        accuracy: calculateAccuracy(stats.stats),
        wins: findStat(stats.stats, 'total_wins'),
        kd_ratio: calculateKDRatio(stats.stats),
        playtime: findStat(stats.stats, 'total_time_played'),
        last_match: new Date().toISOString(),
        achievements: stats.achievements || []
      };
      
      // 更新数据库缓存
      await updateStatsCache(steamId, formattedStats);
      
      return formattedStats;
    }
    
    return null;
  } catch (error) {
    console.error('获取玩家统计数据失败:', error);
    return null;
  }
}

/**
 * 在统计数据中查找特定项
 */
function findStat(stats: any[], name: string): number {
  const stat = stats.find(s => s.name === name);
  return stat ? stat.value : 0;
}

/**
 * 计算KD比率
 */
function calculateKDRatio(stats: any[]): number {
  const kills = findStat(stats, 'total_kills');
  const deaths = findStat(stats, 'total_deaths');
  
  if (deaths === 0) return kills;
  return Number((kills / deaths).toFixed(2));
}

/**
 * 计算命中率
 */
function calculateAccuracy(stats: any[]): number {
  const shots = findStat(stats, 'total_shots_fired');
  const hits = findStat(stats, 'total_shots_hit');
  
  if (shots === 0) return 0;
  return Number(((hits / shots) * 100).toFixed(2));
}

/**
 * 更新数据库中的统计数据缓存
 */
async function updateStatsCache(steamId: string, stats: any) {
  try {
    // 首先检查记录是否存在
    const existingRecord = await sql`
      SELECT * FROM player_stats
      WHERE steam_id = ${steamId}
    `;
    
    if (existingRecord && existingRecord.length > 0) {
      // 更新现有记录
      await sql`
        UPDATE player_stats
        SET stats = ${JSON.stringify(stats)},
            updated_at = NOW()
        WHERE steam_id = ${steamId}
      `;
    } else {
      // 插入新记录
      await sql`
        INSERT INTO player_stats (steam_id, stats, updated_at)
        VALUES (${steamId}, ${JSON.stringify(stats)}, NOW())
      `;
    }
  } catch (error) {
    console.error('更新统计数据缓存失败:', error);
  }
} 