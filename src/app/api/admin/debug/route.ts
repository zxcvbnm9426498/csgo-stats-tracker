import { NextRequest, NextResponse } from 'next/server';
import { getAdmins, getLogs, getAccounts, getSessions } from '@/lib/edge-config';

export async function GET(request: NextRequest) {
  try {
    // 简单的安全检查
    const authHeader = request.headers.get('x-api-key') || '';
    const expectedApiKey = process.env.INIT_API_KEY || 'csgo-stats-tracker-init';
    
    if (authHeader !== expectedApiKey) {
      return NextResponse.json({ success: false, message: '未授权访问' }, { status: 401 });
    }
    
    // 获取所有数据
    const admins = await getAdmins();
    const logs = await getLogs();
    const accounts = await getAccounts();
    const sessions = await getSessions();
    
    // 对密码进行脱敏处理
    const safeAdmins = admins.map(admin => ({
      ...admin,
      password: '******' // 不返回实际密码
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        admins: safeAdmins,
        logCount: logs.length,
        logs: logs.slice(0, 5), // 只返回最近5条日志
        accountCount: accounts.length,
        accounts: accounts.slice(0, 5), // 只返回前5个账户
        sessionCount: sessions.length,
        sessions: sessions.slice(0, 5) // 只返回最近5个会话
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取调试数据时出错:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 