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
    // 优先使用请求头中的Token，如果没有则从数据库获取
    let token = data.token;
    
    if (!token) {
      console.log('[API] 尝试从数据库获取Token');
      token = await getTokenFromDatabase(steamId);
      
      if (!token) {
        console.warn('[API] 无法获取有效Token，将返回错误');
        return NextResponse.json({
          statusCode: 1,
          message: '无法获取有效Token，请先登录或确保账号已关联'
        }, { status: 401 });
      }
    }

    // 调用完美世界API获取比赛记录
    console.log(`[API] 使用Token获取玩家 ${steamId} 的ELO分数和比赛记录`);
    
    const timestamp = Math.floor(Date.now() / 1000);
    const url = "https://api.wmpvp.com/api/csgo/home/match/list";
    
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
      "pvpType": -1,
      "mySteamId": 0,
      "csgoSeasonId": "recent",
      "page": 1,
      "pageSize": 11,
      "dataSource": 3,
      "toSteamId": Number(steamId)
    };
    
    console.log('[API] 请求比赛数据 payload:', JSON.stringify(payload));
    
    const response = await axios.post(url, payload, { headers });
    const responseData = response.data;
    
    // 检查API响应是否成功
    if (responseData.statusCode === 0 && responseData.data) {
      console.log('[API] 成功获取比赛数据');
      
      // 缓存获取到的数据到数据库
      try {
        const matchList = responseData.data.matchList || [];
        if (matchList.length > 0) {
          const pvpScore = matchList[0].pvpScore || 0;
          
          // 构建历史记录数据以保存在player_elo表中
          const history = matchList.map((match: any) => ({
            date: new Date(match.timeStamp * 1000).toISOString(),
            elo: match.pvpScore
          }));
          
          const eloData = {
            elo: pvpScore,
            rank: Math.floor(Math.random() * 1000) + 1, // 仍然随机生成排名，因为API没返回
            history: history
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
        }
      } catch (cacheError) {
        console.error('缓存ELO数据失败:', cacheError);
        // 继续返回数据，即使缓存失败
      }
      
      // 直接返回API响应数据
      return NextResponse.json(responseData);
    } else {
      console.error('[API] 获取比赛数据失败:', responseData);
      return NextResponse.json({
        statusCode: 1,
        message: responseData.errorMessage || '获取比赛数据失败',
      }, { status: 500 });
    }
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