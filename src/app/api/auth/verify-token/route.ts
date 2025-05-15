import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({
        success: false,
        message: '缺少令牌参数'
      }, { status: 400 });
    }

    // 查询令牌是否存在且有效
    const tokens = await sql`
      SELECT * FROM api_tokens 
      WHERE token = ${token} 
        AND status = 'active' 
        AND token_expiry > CURRENT_TIMESTAMP
    `;

    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: '无效的令牌或令牌已过期'
      }, { status: 401 });
    }

    // 更新最后使用时间
    await sql`
      UPDATE api_tokens 
      SET last_used = CURRENT_TIMESTAMP 
      WHERE id = ${tokens[0].id}
    `;

    return NextResponse.json({
      success: true,
      message: '令牌有效',
      data: {
        tokenValid: true,
        expiresAt: tokens[0].token_expiry
      }
    });
  } catch (error) {
    console.error('[API] 验证令牌失败:', error);
    return NextResponse.json({
      success: false,
      message: '验证令牌时发生错误',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 