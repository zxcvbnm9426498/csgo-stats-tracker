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

    // 添加调试日志
    console.log(`[API] 正在查询用户ID: ${userId} 的Steam ID`);

    // 使用csgo/utils中的方法获取Steam ID
    const result = await getSteamIdFromAlternativeApi(userId);
    
    console.log(`[API] getSteamIdFromAlternativeApi 返回结果:`, result);

    if (result && result.steam_id) {
      console.log(`[API] 成功查询到Steam ID: ${result.steam_id}`);
      return NextResponse.json({
        success: true,
        userId: userId,
        steamId: result.steam_id,
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