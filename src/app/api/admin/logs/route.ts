import { NextRequest, NextResponse } from 'next/server';
import { getLogs, addLog } from '../db';
import { cookies } from 'next/headers';

// 简单的中间件函数，检查管理员是否已登录
async function isAuthenticated(): Promise<boolean> {
  // 在实际项目中，应该验证session的有效性，这里简化处理
  return (await cookies()).has('admin_session');
}

export async function GET(request: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }
  
  try {
    // 获取分页参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // 过滤参数
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let logs = getLogs();
    
    // 应用过滤器
    if (action) {
      logs = logs.filter(log => log.action.toLowerCase().includes(action.toLowerCase()));
    }
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= end);
    }
    
    // 计算分页
    const total = logs.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = logs.slice(startIndex, endIndex);
    
    // 记录查询日志
    addLog({
      action: 'VIEW_LOGS',
      details: `查看日志，页码: ${page}, 每页数量: ${limit}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取日志时出错:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
} 