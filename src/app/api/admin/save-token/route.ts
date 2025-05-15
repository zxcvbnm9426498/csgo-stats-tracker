import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { nanoid } from 'nanoid';
import { addLog } from '@/app/api/admin/db';

// 检查管理员是否已登录
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get('admin_session');
  return !!session && !!session.value;
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    // 解析请求体
    const body = await request.json();
    const { userId, phone, authToken } = body;

    if (!authToken) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数：authToken'
      }, { status: 400 });
    }

    // 计算令牌过期时间为90天后
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);

    // 生成ID
    const id = nanoid();

    // 添加到API令牌表
    await sql`
      INSERT INTO api_tokens (
        id, phone, token, token_expiry, source, created_at, status
      ) VALUES (
        ${id}, ${phone || null}, ${authToken}, ${expiryDate.toISOString()}, 'front_login', 
        CURRENT_TIMESTAMP, 'active'
      )
    `;

    // 记录日志
    addLog({
      userId: userId?.toString(),
      action: 'SAVE_API_TOKEN',
      details: `保存前台登录令牌，手机号: ${phone || '未知'}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: '令牌保存成功',
      data: { id, expiryDate }
    });
  } catch (error) {
    console.error('[API] 保存令牌失败:', error);
    return NextResponse.json({
      success: false,
      message: '保存令牌失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 