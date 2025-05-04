import { NextRequest, NextResponse } from 'next/server';
import { searchById, searchBySteamId } from '../utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchType, searchId } = body;

    if (!searchId) {
      return NextResponse.json(
        { error: '请输入有效的ID' },
        { status: 400 }
      );
    }

    let result;
    if (searchType === 'userId') {
      // 通过用户ID搜索
      result = await searchById(searchId);
    } else if (searchType === 'steamId') {
      // 通过Steam ID搜索
      result = await searchBySteamId(searchId);
    } else {
      return NextResponse.json(
        { error: '无效的搜索类型' },
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: '未找到玩家信息' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
} 