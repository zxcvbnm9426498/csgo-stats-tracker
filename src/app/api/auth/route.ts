import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Login endpoint
export async function POST(request: NextRequest) {
  try {
    const { action, mobilePhone, securityCode, steamId } = await request.json();

    // Login action
    if (action === 'login') {
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
      if (!steamId) {
        return NextResponse.json(
          { error: 'SteamID 不能为空' },
          { status: 400 }
        );
      }

      const token = request.headers.get('x-auth-token');
      if (!token) {
        return NextResponse.json(
          { error: '需要登录' },
          { status: 401 }
        );
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
        "toSteamId": Number(steamId)
      };

      const response = await axios.post(url, payload, { 
        headers: headers,
        validateStatus: () => true // Accept any status code
      });

      return NextResponse.json(response.data);
    }

    // Get ELO score and match history
    if (action === 'getEloScore') {
      if (!steamId) {
        return NextResponse.json(
          { error: 'SteamID 不能为空' },
          { status: 400 }
        );
      }

      const token = request.headers.get('x-auth-token');
      if (!token) {
        return NextResponse.json(
          { error: '需要登录' },
          { status: 401 }
        );
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
        "toSteamId": parseInt(steamId)
      };

      try {
        console.log(`[API] 发送请求到 ${url} 获取玩家 ${steamId} 的ELO分数`);
        console.log('[API] 请求头:', JSON.stringify(headers, null, 2));
        console.log('[API] 请求体:', JSON.stringify(payload, null, 2));

        const response = await axios.post(url, payload, { 
          headers: headers,
          validateStatus: () => true // Accept any status code
        });

        console.log(`[API] 收到响应状态码: ${response.status}`);
        
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
          console.error('[API] API响应错误:', response.data);
        }

        return NextResponse.json(response.data);
      } catch (error) {
        console.error('[API] 获取ELO分数时出错:', error);
        return NextResponse.json(
          { error: '获取ELO分数失败' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: '未知的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 