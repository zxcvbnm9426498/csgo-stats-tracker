import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/edge-config';

// 直接初始化Edge Config数据
export async function GET(request: NextRequest) {
  try {
    // 安全检查
    const authHeader = request.headers.get('x-api-key') || '';
    const expectedApiKey = process.env.INIT_API_KEY || 'csgo-stats-tracker-init';
    
    if (authHeader !== expectedApiKey) {
      return NextResponse.json({ success: false, message: '未授权访问' }, { status: 401 });
    }
    
    // 记录环境变量情况
    const envInfo = {
      EDGE_CONFIG: process.env.EDGE_CONFIG || '未设置',
      NODE_ENV: process.env.NODE_ENV || '未设置'
    };
    
    // 初始化结果
    const result = {
      success: false,
      message: '',
      envInfo,
      error: null as string | null,
      operations: [] as string[],
      timestamp: new Date().toISOString()
    };
    
    try {
      // 尝试直接使用Edge Config API
      console.log('Edge Config ID:', process.env.EDGE_CONFIG);
      
      // 替换为使用边缘配置客户端
      const { createClient } = await import('@vercel/edge-config');
      
      // 创建一个新的客户端实例
      console.log('创建Edge Config客户端');
      const edgeConfig = createClient(process.env.EDGE_CONFIG || '') as any;
      result.operations.push('已创建Edge Config客户端');
      
      // 准备默认管理员数据
      const defaultAdmin = {
        id: crypto.randomUUID(),
        username: 'admin',
        password: hashPassword('admin123'),
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      
      console.log('开始设置Edge Config数据');
      
      // 使用try-catch分别处理每个操作
      try {
        console.log('写入admins数据');
        await edgeConfig.set('admins', [defaultAdmin]);
        result.operations.push('已设置admins数据');
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        result.operations.push(`设置admins数据失败: ${error}`);
        result.error = error;
      }
      
      try {
        console.log('写入logs数据');
        await edgeConfig.set('logs', []);
        result.operations.push('已设置logs数据');
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        result.operations.push(`设置logs数据失败: ${error}`);
        if (!result.error) result.error = error;
      }
      
      try {
        console.log('写入accounts数据');
        await edgeConfig.set('accounts', []);
        result.operations.push('已设置accounts数据');
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        result.operations.push(`设置accounts数据失败: ${error}`);
        if (!result.error) result.error = error;
      }
      
      try {
        console.log('写入sessions数据');
        await edgeConfig.set('sessions', []);
        result.operations.push('已设置sessions数据');
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        result.operations.push(`设置sessions数据失败: ${error}`);
        if (!result.error) result.error = error;
      }
      
      // 验证设置是否成功
      try {
        console.log('验证admins数据');
        const admins = await edgeConfig.get('admins');
        if (admins && Array.isArray(admins) && admins.length > 0) {
          result.operations.push(`验证成功: 找到${admins.length}个管理员`);
          result.success = true;
          result.message = '数据库初始化成功';
        } else {
          result.operations.push('验证失败: 未找到管理员数据');
          result.success = false;
          result.message = '数据验证失败';
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        result.operations.push(`验证失败: ${error}`);
        if (!result.error) result.error = error;
        result.success = false;
        result.message = '数据验证失败';
      }
    } catch (configError) {
      result.success = false;
      result.message = 'Edge Config操作失败';
      result.error = configError instanceof Error ? configError.message : String(configError);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('直接初始化失败:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 