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
async function handleGetEloScore(steamId64: string, providedToken: string): Promise<NextResponse> {
      console.log(`[API] Processing getEloScore action for SteamID64: ${steamId64}`);
  
  // 优先使用请求中提供的Token，如果没有则从数据库获取
  let token = providedToken;
  if (!token) {
    const dbToken = await getTokenFromDatabase(steamId64);
    if (!dbToken) {
      console.warn('[API] Warning: No valid token found for getEloScore');
      return NextResponse.json({ error: '需要登录或数据库中无有效Token' }, { status: 401 });
    }
    token = dbToken;
      }

      // 记录请求
      addLog({
        action: 'GET_ELO_SCORE',
        details: `获取玩家ELO分数，Steam ID: ${steamId64}`,
    ip: 'unknown'
      });

      const url = "https://api.wmpvp.com/api/csgo/home/match/list";
      const timestamp = Math.floor(Date.now() / 1000);
      const headers = {
        "Host": "api.wmpvp.com",
        "Accept": "*/*",
        "appversion": "3.5.9",
        "gameTypeStr": "2",
        "Accept-Encoding": "br;q=1.0, gzip;q=0.9, deflate;q=0.8",
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
        "toSteamId": steamId64
      };

      try {
        const response = await axios.post(url, payload, { 
          headers: headers,
          validateStatus: () => true // Accept any status code
        });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[API] Error in getEloScore:', error);
    return NextResponse.json({ error: '获取ELO分数失败' }, { status: 500 });
  }
}

// Login endpoint
export async function POST(request: NextRequest) {
  console.log('[API] Received POST request to /api/auth');
  try {
    const body = await request.json();
    const { action, mobilePhone, securityCode, steamId } = body;
    const providedToken = request.headers.get('x-auth-token') || '';
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    
    console.log(`[API] Request Action: ${action}, Received ID: ${steamId} (Type: ${typeof steamId}), Token present: ${!!providedToken}`);
        
    // Login action
    if (action === 'login') {
      console.log('[API] Processing login action');
      if (!mobilePhone || !securityCode) {
        return NextResponse.json(
          { error: '手机号和验证码不能为空' },
          { status: 400 }
        );
      }

      // 记录登录尝试
      addLog({
        action: 'USER_LOGIN_ATTEMPT',
        details: `用户尝试登录，手机号: ${mobilePhone}`,
        ip: clientIp
      });

      const loginUrl = "https://passport.pwesports.cn/account/login";
      const payload = {
        "appId": 2,
        "mobilePhone": mobilePhone,
        "securityCode": securityCode
      };

      const response = await axios.post(loginUrl, payload, { 
        validateStatus: () => true // Accept any status code
      });

      if (response.data && response.data.code === 0) {
        // 登录成功
        addLog({
          action: 'USER_LOGIN_SUCCESS',
          details: `用户登录成功，手机号: ${mobilePhone}`,
          ip: clientIp
        });
      } else {
        // 登录失败
        addLog({
          action: 'USER_LOGIN_FAILED',
          details: `用户登录失败，手机号: ${mobilePhone}, 原因: ${response.data?.description || '未知'}`,
          ip: clientIp
        });
      }

      return NextResponse.json(response.data);
    }
    
    // 处理需要Steam ID 的功能
    if (action === 'checkBan' || action === 'getEloScore') {
      if (!steamId) {
        console.error(`[API] Error: SteamID is required for ${action}`);
        return NextResponse.json({ error: '需要提供 SteamID' }, { status: 400 });
      }
      
      // 解析Steam ID
      let steamId64: string;
      if (isSteamID64(steamId)) {
        console.log(`[API] Received ID ${steamId} is a SteamID64.`);
        steamId64 = steamId;
      } else {
        console.warn(`[API] Received ID ${steamId} is NOT a SteamID64, attempting conversion...`); 
        try {
          const conversionResult = await getSteamIdFromAlternativeApi(steamId);
          if (conversionResult && conversionResult.steam_id) {
            steamId64 = conversionResult.steam_id;
            console.log(`[API] Successfully converted short ID ${steamId} to SteamID64 ${steamId64}`);
          } else {
            console.error(`[API] Failed to convert short ID ${steamId} to SteamID64. Conversion result:`, conversionResult);
            return NextResponse.json({ error: '无法将用户ID转换为SteamID' }, { status: 404 });
          }
        } catch (conversionError) {
          console.error(`[API] Error during short ID to SteamID64 conversion for ${steamId}:`, conversionError);
          return NextResponse.json({ error: '转换用户ID时出错' }, { status: 500 });
      }
    }

      // 执行对应的功能处理
      if (action === 'checkBan') {
        return handleCheckBan(steamId64, providedToken);
      } else if (action === 'getEloScore') {
        return handleGetEloScore(steamId64, providedToken);
      }
    }
    
    // 未知操作
    return NextResponse.json({ error: '未知操作类型' }, { status: 400 });
  } catch (error) {
    console.error('[API] 处理请求出错:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
} 