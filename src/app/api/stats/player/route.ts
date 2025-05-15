import { NextRequest, NextResponse } from 'next/server';
import { fetchPlayerStats } from '@/services/csgo-stats';

/**
 * 获取玩家统计数据
 * 
 * 请求参数:
 * - steamId: 玩家的Steam ID
 * 
 * 请求头:
 * - x-api-token: API访问令牌（必需）
 * 
 * 返回格式:
 * {
 *   success: true,
 *   data: {
 *     // 玩家统计数据
 *   }
 * }
 * 
 * 错误码:
 * - 400: 参数错误
 * - 401: 未授权 (TOKEN_MISSING, INVALID_TOKEN)
 * - 404: 玩家不存在
 * - 500: 服务器错误
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');

    if (!steamId) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数: steamId'
      }, { status: 400 });
    }

    const stats = await fetchPlayerStats(steamId);
    
    if (!stats) {
      return NextResponse.json({
        success: false,
        message: '未找到玩家数据'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] 获取玩家统计数据失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取玩家统计数据失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 