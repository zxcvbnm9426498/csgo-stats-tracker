import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import axios from 'axios';

/**
 * 获取玩家ELO分数
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
 *     elo: 数值,
 *     rank: 排名,
 *     history: [...] // ELO历史记录
 *   }
 * }
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

    // 查询数据库中是否有缓存的ELO数据
    const cachedData = await sql`
      SELECT * FROM player_elo
      WHERE steam_id = ${steamId}
      AND updated_at > NOW() - INTERVAL '1 day'
      LIMIT 1
    `;

    if (cachedData && cachedData.length > 0) {
      return NextResponse.json({
        success: true,
        data: cachedData[0].data
      });
    }

    // 如果没有缓存数据或数据已过期，从外部API获取
    // 这里模拟从外部API获取数据，实际项目中应替换为真实的API调用
    const eloData = {
      elo: Math.floor(Math.random() * 2500) + 500, // 模拟 500-3000 的ELO分数
      rank: Math.floor(Math.random() * 1000) + 1, // 模拟 1-1000 的排名
      history: [
        { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), elo: Math.floor(Math.random() * 2500) + 500 },
        { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), elo: Math.floor(Math.random() * 2500) + 500 },
        { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), elo: Math.floor(Math.random() * 2500) + 500 },
        { date: new Date().toISOString(), elo: Math.floor(Math.random() * 2500) + 500 }
      ]
    };

    // 将数据保存到缓存
    try {
      // 检查是否已有记录
      const existingRecord = await sql`
        SELECT * FROM player_elo
        WHERE steam_id = ${steamId}
      `;
      
      if (existingRecord && existingRecord.length > 0) {
        // 更新现有记录
        await sql`
          UPDATE player_elo
          SET data = ${JSON.stringify(eloData)},
              updated_at = NOW()
          WHERE steam_id = ${steamId}
        `;
      } else {
        // 插入新记录
        await sql`
          INSERT INTO player_elo (steam_id, data, created_at, updated_at)
          VALUES (${steamId}, ${JSON.stringify(eloData)}, NOW(), NOW())
        `;
      }
    } catch (cacheError) {
      console.error('缓存ELO数据失败:', cacheError);
      // 继续返回数据，即使缓存失败
    }

    return NextResponse.json({
      success: true,
      data: eloData
    });
  } catch (error) {
    console.error('[API] 获取玩家ELO分数失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取玩家ELO分数失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 