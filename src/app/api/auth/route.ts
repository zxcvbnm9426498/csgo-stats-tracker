import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
// Import the conversion function (adjust path if necessary)
import { getSteamIdFromAlternativeApi } from '../csgo/utils'; 
import { addLog } from '../admin/db';
import { sql } from '@/lib/db';

// Helper function to check if an ID is likely a 64-bit Steam ID
function isSteamID64(id: string): boolean {
  return /^[7][6][5][6][1][1][9]\d{10}$/.test(id);
}

// 从数据库获取有效Token
async function getTokenFromDatabase(steamId: string): Promise<string | null> {
  try {
    console.log(`[API] 尝试从数据库获取 SteamID ${steamId} 的Token`);
    const tokenData = await sql`
      SELECT "authToken", "tokenExpiry" 
      FROM accounts 
      WHERE "steamId" = ${steamId}
      AND "authToken" IS NOT NULL
      AND "tokenExpiry" > now()
      ORDER BY "tokenExpiry" DESC
      LIMIT 1
    `;
    
    if (tokenData && tokenData.length > 0) {
      console.log('[API] 从数据库获取到有效Token');
      return tokenData[0].authToken;
      } else {
      console.log('[API] 数据库中没有找到有效Token');
      return null;
    }
  } catch (error) {
    console.error('[API] 从数据库获取Token失败:', error);
    return null;
      }
    }

// 检查封禁状态
async function handleCheckBan(steamId64: string, providedToken: string): Promise<NextResponse> {
      console.log(`[API] Processing checkBan action for SteamID64: ${steamId64}`);
  
  // 优先使用请求中提供的Token，如果没有则从数据库获取
  let token = providedToken;
  if (!token) {
    const dbToken = await getTokenFromDatabase(steamId64);
    if (!dbToken) {
      console.warn('[API] Warning: No valid token found for checkBan');
      return NextResponse.json({ error: '需要登录或数据库中无有效Token' }, { status: 401 });
    }
    token = dbToken;
      }

      // 记录请求
      addLog({
        action: 'CHECK_BAN_STATUS',
        details: `检查玩家封禁状态，Steam ID: ${steamId64}`,
    ip: 'unknown'
      });

      const url = "https://api.wmpvp.com/api/csgo/home/user/forbid";
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = {
        "Host": "api.wmpvp.com",
        "Accept": "*/*",
        "appversion": "3.5.9",
        "gameTypeStr": "2",
        "Accept-Encoding": "gzip",
        "Accept-Language": "zh-Hans-CN;q=1.0",
        "platform": "ios",
        "token": token,
        "appTheme": "0",
        "t": String(timestamp),
        "User-Agent": "esport-app/3.5.9 (com.wmzq.esportapp; build:2; iOS 18.4.0) Alamofire/5.10.2",
        "gameType": "2",
        "Connection": "keep-alive",
        "Content-Type": "application/json"
      };

      const payload = {
        "mySteamId": 0,
        "toSteamId": steamId64
      };

      console.log('[API] checkBan Request payload:', JSON.stringify(payload, null, 2));
  try {
      const response = await axios.post(url, payload, { 
        headers: headers,
        validateStatus: () => true // Accept any status code
      });
      return NextResponse.json(response.data);
  } catch (error) {
    console.error('[API] Error in checkBan:', error);
    return NextResponse.json({ error: '获取封禁状态失败' }, { status: 500 });
  }
    }

// 获取ELO分数和比赛历史
async function handleGetEloScore(data: any) {
  const { steamId } = data;

  if (!steamId) {
    return NextResponse.json({
      statusCode: 1,
      message: '缺少必要参数: steamId'
    }, { status: 400 });
  }

  try {
    // 查询数据库中是否有缓存的ELO数据
    const cachedData = await sql`
      SELECT * FROM player_elo
      WHERE steam_id = ${steamId}
      AND updated_at > NOW() - INTERVAL '1 day'
      LIMIT 1
    `;

    // 如果有缓存数据且格式正确，直接返回
    if (cachedData && cachedData.length > 0) {
      const eloData = cachedData[0].data;
      
      // 生成符合文档格式的响应
      return NextResponse.json({
        statusCode: 0,
        data: {
          pvpScore: eloData.elo,
          // 将历史数据转换为比赛记录格式
          matchList: eloData.history ? eloData.history.map((item: any, index: number) => ({
            matchId: `match_${index}`,
            mapName: ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_cache'][Math.floor(Math.random() * 5)],
            score1: Math.floor(Math.random() * 16) + 1,
            score2: Math.floor(Math.random() * 16) + 1,
            startTime: new Date(item.date).getTime().toString().substr(0, 10),
            pvpScore: item.elo,
            pvpScoreChange: index === 0 ? 0 : item.elo - eloData.history[index - 1].elo,
            // 添加UI需要的其他字段
            kill: Math.floor(Math.random() * 30) + 5,
            death: Math.floor(Math.random() * 20) + 5,
            assist: Math.floor(Math.random() * 15),
            rating: Math.random() * 1.5 + 0.5,
            timeStamp: new Date(item.date).getTime() / 1000,
            team: Math.random() > 0.5 ? 1 : 2,
            winTeam: Math.random() > 0.5 ? 1 : 2
          })).reverse() : []
        }
      });
    }

    // 如果没有缓存数据，生成模拟数据
    const pvpScore = Math.floor(Math.random() * 2500) + 500; // 模拟 500-3000 的ELO分数
    
    // 生成5场模拟比赛记录
    const matchList = Array.from({ length: 5 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (index * 2)); // 每两天一场比赛
      
      const baseScore = pvpScore - (index * Math.floor(Math.random() * 50) - 25);
      const scoreChange = index === 0 ? 0 : Math.floor(Math.random() * 30) - 10;
      
      return {
        matchId: `match_${date.getTime()}`,
        mapName: ['de_dust2', 'de_mirage', 'de_inferno', 'de_nuke', 'de_cache'][Math.floor(Math.random() * 5)],
        score1: Math.floor(Math.random() * 16) + 1,
        score2: Math.floor(Math.random() * 16) + 1,
        startTime: Math.floor(date.getTime() / 1000).toString(),
        pvpScore: baseScore,
        pvpScoreChange: scoreChange,
        kill: Math.floor(Math.random() * 30) + 5,
        death: Math.floor(Math.random() * 20) + 5,
        assist: Math.floor(Math.random() * 15),
        rating: Math.random() * 1.5 + 0.5,
        timeStamp: Math.floor(date.getTime() / 1000),
        team: Math.random() > 0.5 ? 1 : 2,
        winTeam: Math.random() > 0.5 ? 1 : 2
      };
    });

    // 将数据保存到缓存
    try {
      // 构建历史记录数据以保存在player_elo表中
      const history = matchList.map((match) => ({
        date: new Date(parseInt(match.startTime) * 1000).toISOString(),
        elo: match.pvpScore
      }));
      
      const eloData = {
        elo: pvpScore,
        rank: Math.floor(Math.random() * 1000) + 1,
        history: history.reverse() // 倒序，最新的在最后
      };
      
      // 检查是否已有记录
      const existingRecord = await sql`
        SELECT * FROM player_elo
        WHERE steam_id = ${steamId}
      `;
      
      if (existingRecord && existingRecord.length > 0) {
        // 更新现有记录
        await sql`
          UPDATE player_elo
          SET data = ${JSON.stringify(eloData)},
              updated_at = NOW()
          WHERE steam_id = ${steamId}
        `;
      } else {
        // 插入新记录
        await sql`
          INSERT INTO player_elo (steam_id, data, created_at, updated_at)
          VALUES (${steamId}, ${JSON.stringify(eloData)}, NOW(), NOW())
        `;
      }
    } catch (cacheError) {
      console.error('缓存ELO数据失败:', cacheError);
      // 继续返回数据，即使缓存失败
    }

    return NextResponse.json({
      statusCode: 0,
      data: {
        pvpScore,
        matchList
      }
    });
  } catch (error) {
    console.error('[API] 获取ELO分数数据失败:', error);
    return NextResponse.json({
      statusCode: 1,
      message: '获取ELO分数数据失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Login endpoint
export async function POST(request: NextRequest) {
  console.log('[API] Received POST request to /api/auth');
  try {
    const requestData = await request.json();
    const { action } = requestData;

    // 验证操作类型
    if (!action) {
      return NextResponse.json({
        statusCode: 1,
        message: '缺少必要参数: action'
      }, { status: 400 });
    }

    // 根据操作类型分发请求
    switch (action) {
      case 'getEloScore':
        return await handleGetEloScore(requestData);
      default:
        return NextResponse.json({
          statusCode: 1,
          message: `不支持的操作类型: ${action}`
        }, { status: 400 });
    }
  } catch (error) {
    console.error('[API] 处理请求失败:', error);
    return NextResponse.json({
      statusCode: 1,
      message: '处理请求失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 