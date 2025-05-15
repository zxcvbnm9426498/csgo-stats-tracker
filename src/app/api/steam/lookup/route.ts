import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/app/api/admin/db';

/**
 * 通过用户ID查询Steam ID的API端点
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: '请提供用户ID' },
        { status: 400 }
      );
    }

    // 记录请求
    addLog({
      action: 'LOOKUP_STEAM_ID',
      details: `查询用户ID对应的Steam ID: ${userId}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // 添加调试日志
    console.log(`[API] 正在查询用户ID: ${userId} 的Steam ID`);

    // 使用完美世界API获取Steam ID
    const result = await getPerfectWorldSteamId(userId);
    console.log(`[API] 完美世界API 返回结果:`, result);

    if (result.steamId) {
      console.log(`[API] 成功查询到Steam ID: ${result.steamId}`);
      return NextResponse.json({
        success: true,
        userId: userId,
        steamId: result.steamId,
        nickname: result.nickname
      });
    } else {
      // 尝试使用备用方法 - 如果userId是数字且长度大于5，构造一个Steam ID
      if (/^\d+$/.test(userId) && userId.length >= 5) {
        const generatedSteamId = `76561199${userId.padStart(9, '0')}`;
        console.log(`[API] 未找到Steam ID，生成备用ID: ${generatedSteamId}`);
        
        return NextResponse.json({
          success: true,
          userId: userId,
          steamId: generatedSteamId,
          nickname: null,
          note: "使用生成的备用ID，可能不准确"
        });
      }
      
      console.log(`[API] 未找到对应的Steam ID，userId: ${userId}`);
      return NextResponse.json(
        { 
          success: false, 
          message: '未找到对应的Steam ID',
          debugInfo: {
            userId: userId,
            apiResponse: result
          }
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('查询Steam ID失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '查询Steam ID时发生错误',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * 使用完美世界API获取Steam ID
 * 使用游戏内用户ID从完美世界API查询Steam ID
 */
async function getPerfectWorldSteamId(userId: string): Promise<{steamId?: string, nickname?: string, error?: string}> {
  try {
    // 当前时间戳（秒数）
    const timestamp = Math.floor(Date.now() / 1000);
    
    // API endpoint
    const apiUrl = "https://gwapi.pwesports.cn/acty/api/v1/search";

    // 请求头
    const headers = {
      "Host": "gwapi.pwesports.cn",
      "Accept": "*/*",
      "appversion": "3.5.9",
      "gameTypeStr": "2",
      "Accept-Encoding": "br;q=1.0, gzip;q=0.9, deflate;q=0.8",
      "Accept-Language": "zh-Hans-CN;q=1.0",
      "platform": "ios",
      "t": timestamp.toString(),
      "appTheme": "0",
      "User-Agent": "esport-app/3.5.9 (com.wmzq.esportapp; build:2; iOS 18.5.0) Alamofire/5.10.2",
      "gameType": "2",
      "Connection": "keep-alive",
      "Content-Type": "application/json"
    };

    // 请求体 (JSON)
    const payload = {
      "page": 1,
      "searchType": "ALL",
      "pageSize": 20,
      "appVersion": "3.5.9",
      "gameAbbr": "CSGO",
      "platform": "ios",
      "text": userId,
      "gameTypeStr": "2",
      "t": timestamp
    };

    // 发送请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    // 解析响应JSON
    const data = await response.json();

    // 检查API返回码
    if (data.code !== 0) {
      return { error: data.message || '完美世界API返回错误' };
    }

    // 解析steamId64Str和用户名
    let steamId: string | undefined = undefined;
    let nickname: string | undefined = undefined;

    // 查找USER类型的结果
    for (const item of data.result || []) {
      if (item.itemType === "USER" && item.count > 0 && item.data && item.data.length > 0) {
        const userData = item.data[0];
        steamId = userData.steamId64Str;
        nickname = userData.name;
        console.log(`找到用户: ${nickname}, steamId64Str: ${steamId}`);
        break;
      }
    }

    if (!steamId) {
      return { error: '未找到用户的steamId64Str信息' };
    }

    return { steamId, nickname };
  } catch (error) {
    console.error('完美世界API请求失败:', error);
    return { error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 模拟查找Steam ID的函数
 * 在实际应用中，这应该是与您的用户系统或Steam API集成的函数
 */
async function mockFindSteamId(userId: string): Promise<string | null> {
  // 特定用户ID的映射示例
  const knownIds: Record<string, string> = {
    '12345': '76561198123456789',
    'user123': '76561199126004025',
    'testuser': '76561198987654321'
  };
  
  // 为测试目的，如果输入是数字，生成一个伪Steam ID
  if (/^\d+$/.test(userId) && userId.length >= 5) {
    return `76561199${userId.padStart(9, '0')}`;
  }
  
  return knownIds[userId] || null;
} 