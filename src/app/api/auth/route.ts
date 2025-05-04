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