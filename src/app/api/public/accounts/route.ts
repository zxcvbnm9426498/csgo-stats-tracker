import { NextRequest, NextResponse } from 'next/server';
import { getAccounts } from '@/app/api/admin/db';

/**
 * 获取公开账号列表API
 * 不需要身份验证，用于在首页展示账号
 */
export async function GET(request: NextRequest) {
  try {
    console.log('开始处理公开获取账号请求...');
    
    // 获取所有账号
    const allAccounts = await getAccounts();
    console.log(`从数据库获取了 ${allAccounts.length} 个账号`);
    
    // 去除重复的Steam ID后的账号
    const uniqueAccounts = allAccounts.filter(account => account.steamId);
    
    // 只返回需要的公开字段
    const publicAccounts = uniqueAccounts.map(account => ({
      id: account.id,
      username: account.username,
      userId: account.userId,
      steamId: account.steamId,
      status: account.status === 'active' ? 'active' : 'inactive'
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: publicAccounts
      }
    });
  } catch (error) {
    console.error('获取公开账号列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取账号列表失败',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 