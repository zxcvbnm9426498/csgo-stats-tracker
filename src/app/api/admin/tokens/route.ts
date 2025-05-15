import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { addLog } from '@/app/api/admin/db';
import { nanoid } from 'nanoid';

// 检查管理员是否已登录
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get('admin_session');
  return !!session && !!session.value;
}

// 获取所有API令牌
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    const tokens = await sql`
      SELECT * FROM api_tokens 
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('[API] 获取API令牌列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取API令牌列表失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 添加新的API令牌
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    const data = await request.json();
    const { phone, token, source } = data;

    if (!phone || !token) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数：手机号和令牌'
      }, { status: 400 });
    }

    // 计算令牌过期时间为90天后
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);

    const id = nanoid();
    await sql`
      INSERT INTO api_tokens (
        id, phone, token, token_expiry, source, created_at, status
      ) VALUES (
        ${id}, ${phone}, ${token}, ${expiryDate.toISOString()}, ${source || 'manual'}, 
        CURRENT_TIMESTAMP, 'active'
      )
    `;

    // 记录日志
    addLog({
      action: 'ADD_API_TOKEN',
      details: `添加API令牌，手机号: ${phone}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'API令牌添加成功',
      data: { id }
    });
  } catch (error) {
    console.error('[API] 添加API令牌失败:', error);
    return NextResponse.json({
      success: false,
      message: '添加API令牌失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 删除API令牌
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数：令牌ID'
      }, { status: 400 });
    }

    // 查找要删除的令牌
    const tokens = await sql`
      SELECT * FROM api_tokens WHERE id = ${id}
    `;

    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: '未找到指定的API令牌'
      }, { status: 404 });
    }

    // 删除令牌
    await sql`
      DELETE FROM api_tokens WHERE id = ${id}
    `;

    // 记录日志
    addLog({
      action: 'DELETE_API_TOKEN',
      details: `删除API令牌，ID: ${id}, 手机号: ${tokens[0].phone}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'API令牌删除成功'
    });
  } catch (error) {
    console.error('[API] 删除API令牌失败:', error);
    return NextResponse.json({
      success: false,
      message: '删除API令牌失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 