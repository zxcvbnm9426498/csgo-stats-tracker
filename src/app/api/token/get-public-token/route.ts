import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 获取一个可用的公共令牌，用于前台访问API
 * 不需要用户登录即可使用
 */
export async function GET(request: NextRequest) {
  try {
    // 获取最新的有效令牌
    const tokens = await sql`
      SELECT token 
      FROM api_tokens 
      WHERE status = 'active' 
        AND token_expiry > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: '未找到有效的API令牌',
      }, { status: 404 });
    }

    // 更新最后使用时间
    await sql`
      UPDATE api_tokens 
      SET last_used = CURRENT_TIMESTAMP 
      WHERE token = ${tokens[0].token}
    `;

    return NextResponse.json({
      success: true,
      token: tokens[0].token
    });
  } catch (error) {
    console.error('[API] 获取公共令牌失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取令牌失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 