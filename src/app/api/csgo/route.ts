import { NextRequest, NextResponse } from 'next/server';
import { searchById, searchBySteamId } from './utils';
import { addLog } from '../admin/db';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchType, searchId } = body;
    const token = request.headers.get('x-auth-token') || '';

    if (!searchType || !searchId) {
      return NextResponse.json(
        { error: 'Search type and search ID are required' },
        { status: 400 }
      );
    }

    // 记录搜索日志
    addLog({
      action: 'SEARCH_CSGO',
      details: `${searchType === 'steamId' ? 'Steam ID' : '用户ID'} 搜索: ${searchId}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    const result = searchType === 'steamId' 
      ? await searchBySteamId(searchId) 
      : await searchById(searchId);

    if (!result) {
      addLog({
        action: 'SEARCH_FAILED',
        details: `搜索失败: ${searchId}`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        { error: 'Failed to find player data' },
        { status: 404 }
      );
    }

    // 优先使用请求头中的Token，如果没有提供，则尝试从数据库获取Token
    let tokenToUse = token;
    
    if (!tokenToUse && result.playerInfo?.steamId64Str) {
      try {
        // 查询数据库中的Token
        console.log('[CSGO API] 尝试从数据库获取Token');
        const tokenData = await sql`
          SELECT "authToken", "tokenExpiry" 
          FROM accounts 
          WHERE "steamId" = ${result.playerInfo.steamId64Str}
          AND "authToken" IS NOT NULL
          AND "tokenExpiry" > now()
          ORDER BY "tokenExpiry" DESC
          LIMIT 1
        `;
        
        if (tokenData && tokenData.length > 0) {
          console.log('[CSGO API] 从数据库获取到有效Token');
          tokenToUse = tokenData[0].authToken;
        } else {
          console.log('[CSGO API] 数据库中没有找到有效Token');
        }
      } catch (dbError) {
        console.error('[CSGO API] 从数据库获取Token失败:', dbError);
      }
    }

    // 如果有Token，添加额外数据到响应
    if (result.playerInfo?.steamId64Str && tokenToUse) {
      try {
        console.log('[CSGO API] 使用Token获取额外数据');
        // 获取比赛数据（ELO分数详情）
        const matchData = await fetchMatchData(result.playerInfo.steamId64Str, tokenToUse);
        if (matchData && matchData.statusCode === 0) {
          // 包含比赛数据在响应中
          result.playerStats = matchData;
        }
      } catch (error) {
        console.error('Error fetching match data:', error);
        // 即使获取比赛数据失败，也继续返回响应
      }
    }

    // 记录搜索成功日志
    addLog({
      action: 'SEARCH_SUCCESS',
      details: `成功查询玩家: ${result.playerInfo?.name || searchId}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to fetch match data (ELO score)
async function fetchMatchData(steamId: string, token: string) {
  try {
    const url = 'https://api.wmpvp.com/api/csgo/home/match/list';
    const timestamp = Math.floor(Date.now() / 1000);
    
    const headers = {
      'Host': 'api.wmpvp.com',
      'Accept': '*/*',
      'appversion': '3.5.9',
      'gameTypeStr': '2',
      'Accept-Encoding': 'gzip',
      'Accept-Language': 'zh-Hans-CN;q=1.0',
      'platform': 'ios',
      'token': token,
      'appTheme': '0',
      't': String(timestamp),
      'User-Agent': 'esport-app/3.5.9 (com.wmzq.esportapp; build:2; iOS 18.4.0) Alamofire/5.10.2',
      'gameType': '2',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json'
    };
    
    const data = {
      'pvpType': -1,
      'mySteamId': 0,
      'csgoSeasonId': 'recent',
      'page': 1,
      'pageSize': 11,
      'dataSource': 3,
      'toSteamId': Number(steamId)
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching match data:', error);
    return null;
  }
} 