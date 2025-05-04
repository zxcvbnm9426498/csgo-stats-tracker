import { NextRequest, NextResponse } from 'next/server';
import { searchById, searchBySteamId } from './utils';

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

    const result = searchType === 'steamId' 
      ? await searchBySteamId(searchId) 
      : await searchById(searchId);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to find player data' },
        { status: 404 }
      );
    }

    // 如果有token，添加额外数据到响应
    if (result.playerInfo?.steamId64Str && token) {
      try {
        // 获取比赛数据（ELO分数详情）
        const matchData = await fetchMatchData(result.playerInfo.steamId64Str, token);
        if (matchData && matchData.statusCode === 0) {
          // 包含比赛数据在响应中
          result.playerStats = matchData;
        }
      } catch (error) {
        console.error('Error fetching match data:', error);
        // 即使获取比赛数据失败，也继续返回响应
      }
    }

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