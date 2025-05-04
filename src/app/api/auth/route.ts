import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
// Import the conversion function (adjust path if necessary)
import { getSteamIdFromAlternativeApi } from '../csgo/utils'; 

// Helper function to check if an ID is likely a 64-bit Steam ID
function isSteamID64(id: string): boolean {
  return /^[7][6][5][6][1][1][9]\d{10}$/.test(id);
}

// Login endpoint
export async function POST(request: NextRequest) {
  console.log('[API] Received POST request to /api/auth');
  try {
    const body = await request.json();
    // 改回 steamId，但保留后续检查
    const { action, mobilePhone, securityCode, steamId } = body;
    const token = request.headers.get('x-auth-token') || '';
    
    console.log(`[API] Request Action: ${action}, Received ID: ${steamId} (Type: ${typeof steamId}), Token present: ${!!token}`);

    let steamId64: string | null = null;

    // Resolve identifier to steamId64 if needed for relevant actions
    if (action === 'checkBan' || action === 'getEloScore') {
      if (!steamId) {
        console.error(`[API] Error: SteamID is required for ${action}`);
        return NextResponse.json({ error: '需要提供 SteamID' }, { status: 400 });
      }

      if (isSteamID64(steamId)) {
        console.log(`[API] Received ID ${steamId} is a SteamID64.`);
        steamId64 = steamId;
      } else {
        // 理论上前端应该总是发送 64位ID 给这个路由
        // 但以防万一，还是尝试转换
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
    }

    // Login action
    if (action === 'login') {
      console.log('[API] Processing login action');
      if (!mobilePhone || !securityCode) {
        return NextResponse.json(
          { error: '手机号和验证码不能为空' },
          { status: 400 }
        );
      }

      const loginUrl = "https://passport.pwesports.cn/account/login";
      const payload = {
        "appId": 2,
        "mobilePhone": mobilePhone,
        "securityCode": securityCode
      };

      const response = await axios.post(loginUrl, payload, { 
        validateStatus: () => true // Accept any status code
      });

      return NextResponse.json(response.data);
    }
    
    // Check ban status
    if (action === 'checkBan') {
      console.log(`[API] Processing checkBan action for SteamID64: ${steamId64}`);
      if (!steamId64) { // Should be caught earlier, but double-check
        console.error('[API] Error: Resolved SteamID64 is missing for checkBan');
        return NextResponse.json({ error: '无法解析SteamID' }, { status: 500 });
      }
      if (!token) {
        console.warn('[API] Warning: Token is required for checkBan');
        return NextResponse.json({ error: '需要登录' }, { status: 401 });
      }

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
      const response = await axios.post(url, payload, { 
        headers: headers,
        validateStatus: () => true // Accept any status code
      });

      return NextResponse.json(response.data);
    }

    // Get ELO score and match history
    if (action === 'getEloScore') {
      console.log(`[API] Processing getEloScore action for SteamID64: ${steamId64}`);
      if (!steamId64) { // Should be caught earlier, but double-check
        console.error('[API] Error: Resolved SteamID64 is missing for getEloScore');
        return NextResponse.json({ error: '无法解析SteamID' }, { status: 500 });
      }
      if (!token) {
        console.warn('[API] Warning: Token is required for getEloScore');
        return NextResponse.json({ error: '需要登录' }, { status: 401 });
      }

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
        console.log(`[API] 发送请求到 ${url} 获取玩家 ${steamId64} 的ELO分数`);
        console.log('[API] 请求头:', JSON.stringify(headers, null, 2));
        console.log('[API] 请求体:', JSON.stringify(payload, null, 2));

        const response = await axios.post(url, payload, { 
          headers: headers,
          validateStatus: () => true // Accept any status code
        });

        console.log(`[API] 收到响应状态码: ${response.status}`);
        console.log('[API] 收到响应数据:', JSON.stringify(response.data, null, 2));
        
        // 检查响应中是否有数据
        if (response.data && response.data.statusCode === 0) {
          if (response.data.data && response.data.data.matchList && response.data.data.matchList.length > 0) {
            // 从第一条比赛记录获取pvpScore
            const firstMatch = response.data.data.matchList[0];
            const pvpScore = firstMatch.pvpScore;
            
            console.log(`[API] 成功获取比赛数据，第一条记录的ELO分数: ${pvpScore}`);
            
            // 在响应数据中添加pvpScore
            response.data.data.pvpScore = pvpScore;
            
            console.log(`[API] 将ELO分数 ${pvpScore} 添加到响应数据中`);
          } else {
            console.log('[API] 未找到比赛记录数据，matchList为空');
          }
        } else {
          console.error('[API] API响应错误或statusCode不为0:', response.data);
        }

        return NextResponse.json(response.data);
      } catch (error) {
        console.error('[API] 获取ELO分数时发生网络或请求错误:', error);
        return NextResponse.json(
          { error: '获取ELO分数失败' },
          { status: 500 }
        );
      }
    }

    console.warn(`[API] 未知的操作: ${action}`);
    return NextResponse.json(
      { error: '未知的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] 处理请求时发生内部错误:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 