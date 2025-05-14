import { NextRequest, NextResponse } from 'next/server';
import { initializeData, testConnection } from '@/lib/edge-config';

// 初始化数据库
export async function GET(request: NextRequest) {
  try {
    // 添加一个简单的安全检查，避免API被公开访问
    const authHeader = request.headers.get('x-api-key') || '';
    const expectedApiKey = process.env.INIT_API_KEY || 'csgo-stats-tracker-init';
    
    if (authHeader !== expectedApiKey) {
      return NextResponse.json({ success: false, message: '未授权访问' }, { status: 401 });
    }
    
    // 先测试连接
    const connectionTest = await testConnection();
    
    if (!connectionTest.connected) {
      return NextResponse.json({ 
        success: false, 
        message: 'Edge Config 连接失败',
        error: connectionTest.message,
        edgeConfigId: process.env.EDGE_CONFIG || '未设置',
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }
    
    console.log('[Init API] Edge Config 连接成功，开始初始化数据');
    
    // 直接使用Edge Config
    try {
      const { createClient } = await import('@vercel/edge-config');
      const edgeConfig = createClient(process.env.EDGE_CONFIG || '');
      
      // 尝试读取管理员数据
      const admins = await edgeConfig.get('admins');
      console.log('[Init API] 当前管理员数据:', admins);
      
      // 如果没有管理员，创建默认管理员
      if (!admins || !Array.isArray(admins) || admins.length === 0) {
        // 导入哈希函数
        const { hashPassword } = await import('@/lib/edge-config');
        
        const defaultAdmin = {
          id: crypto.randomUUID(),
          username: 'admin',
          password: hashPassword('admin123'), // 使用哈希存储密码
          role: 'admin',
          createdAt: new Date().toISOString()
        };
        
        console.log('[Init API] 创建默认管理员:', defaultAdmin.username);
        
        // 保存管理员数据
        await (edgeConfig as any).set('admins', [defaultAdmin]);
        console.log('[Init API] 管理员数据已保存');
        
        // 初始化其他集合
        await (edgeConfig as any).set('logs', []);
        await (edgeConfig as any).set('accounts', []);
        await (edgeConfig as any).set('sessions', []);
        
        return NextResponse.json({ 
          success: true, 
          message: '数据库初始化成功 - 已创建默认管理员',
          admin: {
            username: defaultAdmin.username,
            role: defaultAdmin.role
          },
          timestamp: new Date().toISOString() 
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          message: '数据库已经初始化',
          adminCount: Array.isArray(admins) ? admins.length : 0,
          timestamp: new Date().toISOString() 
        });
      }
    } catch (edgeConfigError) {
      console.error('[Init API] Edge Config 操作失败:', edgeConfigError);
      return NextResponse.json({ 
        success: false, 
        message: 'Edge Config 操作失败',
        error: edgeConfigError instanceof Error ? edgeConfigError.message : String(edgeConfigError),
        timestamp: new Date().toISOString() 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Init API] 初始化数据库时出错:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 