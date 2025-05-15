import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import axios from 'axios';

/**
 * 获取玩家封禁记录
 * 
 * 请求参数:
 * - steamId: 玩家的Steam ID (可选)
 * - page: 页码 (默认1)
 * - limit: 每页数量 (默认10)
 * 
 * 请求头:
 * - x-api-token: API访问令牌（必需）
 * 
 * 返回格式:
 * {
 *   success: true,
 *   data: {
 *     bans: [...], // 封禁记录列表
 *     total: 总记录数,
 *     page: 当前页码,
 *     limit: 每页数量
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamId = searchParams.get('steamId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 如果指定了steamId，查询特定玩家的封禁记录
    if (steamId) {
      // 查询数据库中是否有缓存的封禁数据
      const cachedData = await sql`
        SELECT * FROM player_bans
        WHERE steam_id = ${steamId}
        AND updated_at > NOW() - INTERVAL '1 day'
        LIMIT 1
      `;

      if (cachedData && cachedData.length > 0) {
        return NextResponse.json({
          success: true,
          data: {
            bans: cachedData[0].data.bans || [],
            total: cachedData[0].data.bans?.length || 0,
            page: 1,
            limit: cachedData[0].data.bans?.length || 0
          }
        });
      }

      // 模拟从外部API获取数据
      const hasBan = Math.random() > 0.7; // 30%的概率有封禁记录
      const banData = {
        bans: hasBan ? [
          {
            id: `ban_${Date.now()}`,
            reason: ['作弊', '骚扰其他玩家', '使用不当语言', '团队伤害'][Math.floor(Math.random() * 4)],
            start_date: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString(),
            end_date: Math.random() > 0.5 
              ? new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString() 
              : null,
            is_permanent: Math.random() > 0.5,
            source: ['VAC', 'GameBan', '社区举报', '管理员封禁'][Math.floor(Math.random() * 4)]
          }
        ] : []
      };

      // 将数据保存到缓存
      try {
        // 检查是否已有记录
        const existingRecord = await sql`
          SELECT * FROM player_bans
          WHERE steam_id = ${steamId}
        `;
        
        if (existingRecord && existingRecord.length > 0) {
          // 更新现有记录
          await sql`
            UPDATE player_bans
            SET data = ${JSON.stringify(banData)},
                updated_at = NOW()
            WHERE steam_id = ${steamId}
          `;
        } else {
          // 插入新记录
          await sql`
            INSERT INTO player_bans (steam_id, data, created_at, updated_at)
            VALUES (${steamId}, ${JSON.stringify(banData)}, NOW(), NOW())
          `;
        }
      } catch (cacheError) {
        console.error('缓存封禁数据失败:', cacheError);
        // 继续返回数据，即使缓存失败
      }

      return NextResponse.json({
        success: true,
        data: {
          bans: banData.bans,
          total: banData.bans.length,
          page: 1,
          limit: banData.bans.length
        }
      });
    } else {
      // 未指定steamId时，返回所有封禁记录（带分页）
      
      // 模拟生成随机封禁记录
      const totalBans = 25; // 总共25条记录
      const allBans = Array.from({ length: totalBans }, (_, i) => ({
        id: `ban_${i + 1}`,
        player_name: `player_${Math.floor(Math.random() * 1000)}`,
        steam_id: `7656119${Math.floor(Math.random() * 10000000) + 80000000}`,
        reason: ['作弊', '骚扰其他玩家', '使用不当语言', '团队伤害'][Math.floor(Math.random() * 4)],
        start_date: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString(),
        end_date: Math.random() > 0.5 
          ? new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString() 
          : null,
        is_permanent: Math.random() > 0.5,
        source: ['VAC', 'GameBan', '社区举报', '管理员封禁'][Math.floor(Math.random() * 4)]
      }));

      // 计算分页
      const start = (page - 1) * limit;
      const end = Math.min(start + limit, allBans.length);
      const paginatedBans = allBans.slice(start, end);

      return NextResponse.json({
        success: true,
        data: {
          bans: paginatedBans,
          total: allBans.length,
          page,
          limit
        }
      });
    }
  } catch (error) {
    console.error('[API] 获取封禁记录失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取封禁记录失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 