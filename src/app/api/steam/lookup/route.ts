import { NextRequest, NextResponse } from 'next/server';

/**
 * 通过用户ID查询Steam ID的API端点
 */
export async function GET(request: NextRequest) {
  try {
    // 获取用户ID参数
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: '缺少必要的userId参数' 
      }, { status: 400 });
    }
    
    console.log(`正在查询用户ID: ${userId} 的Steam ID`);
    
    // 调用外部API或服务获取Steam ID
    // 注意：这里是一个示例，您需要替换为实际的API调用
    // 例如调用Steam API或您自己的用户数据库
    
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟找到Steam ID (实际应用中应该是真实API调用)
    const steamId = await mockFindSteamId(userId);
    
    if (steamId) {
      return NextResponse.json({
        success: true,
        userId,
        steamId,
        message: '成功获取Steam ID'
      });
    } else {
      return NextResponse.json({
        success: false,
        userId,
        message: '未找到对应的Steam ID'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('获取Steam ID时出错:', error);
    
    return NextResponse.json({
      success: false,
      message: '查询Steam ID时发生错误',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 模拟查找Steam ID的函数
 * 在实际应用中，这应该是与您的用户系统或Steam API集成的函数
 */
async function mockFindSteamId(userId: string): Promise<string | null> {
  // 特定用户ID的映射示例
  const knownIds: Record<string, string> = {
    '12345': '76561198123456789',
    'user123': '76561199126004025',
    'testuser': '76561198987654321'
  };
  
  // 为测试目的，如果输入是数字，生成一个伪Steam ID
  if (/^\d+$/.test(userId) && userId.length >= 5) {
    return `76561199${userId.padStart(9, '0')}`;
  }
  
  return knownIds[userId] || null;
} 