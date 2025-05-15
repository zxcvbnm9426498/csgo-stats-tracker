import { NextRequest, NextResponse } from 'next/server';
import { getSteamIdFromAlternativeApi } from '@/app/api/csgo/utils';
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

    // 使用csgo/utils中的方法获取Steam ID
    const result = await getSteamIdFromAlternativeApi(userId);

    if (result && result.steam_id) {
      return NextResponse.json({
        success: true,
        userId: userId,
        steamId: result.steam_id,
        nickname: result.nickname
      });
    } else {
      return NextResponse.json(
        { success: false, message: '未找到对应的Steam ID' },
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