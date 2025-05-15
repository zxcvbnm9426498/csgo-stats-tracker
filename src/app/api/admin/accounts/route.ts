import { NextRequest, NextResponse } from 'next/server';
import { getAccounts, addAccount, updateAccount, deleteAccount, addLog } from '@/app/api/admin/db';
import { cookies } from 'next/headers';

// 检查管理员是否已登录
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get('admin_session');
  return !!session && !!session.value;
}

// 获取账号列表
export async function GET(request: NextRequest) {
  try {
    console.log('开始处理获取账号请求...');
    
    // 获取请求URL和参数
    const url = new URL(request.url);
    console.log('请求URL:', url.toString());
    
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      console.log('验证失败: 用户未登录');
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    console.log('验证通过: 用户已登录');

    // 获取查询参数
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    console.log('查询参数:', { page, limit, search, status });

    // 获取所有账号
    console.log('开始从数据库获取账号...');
    const allAccounts = await getAccounts();
    console.log(`从数据库获取了 ${allAccounts.length} 个账号`);
    
    // 日志打印前5个账号的ID和用户名，帮助排查问题
    if (allAccounts.length > 0) {
      const accountSamples = allAccounts.slice(0, 5).map(acc => ({ id: acc.id, username: acc.username }));
      console.log('账号示例:', JSON.stringify(accountSamples));
    } else {
      console.log('警告: 数据库中没有账号');
      
      // 尝试重新查询一遍，直接使用SQL，绕过getAccounts函数
      try {
        console.log('尝试直接使用SQL查询账号...');
        const { sql } = require('@/lib/db');
        const directResult = await sql`SELECT * FROM accounts LIMIT 5`;
        console.log('直接SQL查询结果:', JSON.stringify(directResult));
      } catch (sqlError) {
        console.error('直接SQL查询失败:', sqlError);
      }
    }
    
    // 过滤
    let filteredAccounts = [...allAccounts];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAccounts = filteredAccounts.filter(acc => 
        acc.username.toLowerCase().includes(searchLower) ||
        (acc.userId && acc.userId.toLowerCase().includes(searchLower)) ||
        (acc.steamId && acc.steamId.toLowerCase().includes(searchLower))
      );
      console.log(`按搜索过滤后剩余 ${filteredAccounts.length} 个账号`);
    }
    
    if (status) {
      filteredAccounts = filteredAccounts.filter(acc => acc.status === status);
      console.log(`按状态过滤后剩余 ${filteredAccounts.length} 个账号`);
    }
    
    // 分页
    const total = filteredAccounts.length;
    const totalPages = Math.ceil(total / limit) || 1; // 确保至少有1页
    const startIndex = (page - 1) * limit;
    const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + limit);
    console.log(`分页结果: 总计 ${total} 个账号, ${totalPages} 页, 当前页 ${page}, 返回 ${paginatedAccounts.length} 条记录`);
    
    // 记录访问日志
    try {
      await addLog({
        action: 'VIEW_ACCOUNTS',
        details: `查看账号列表，页码: ${page}, 每页数量: ${limit}`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      console.log('访问日志已记录');
    } catch (logError) {
      console.error('记录日志失败:', logError);
      // 继续处理，不因为日志错误中断整个请求
    }
    
    // 返回响应
    const response = {
      success: true,
      data: {
        accounts: paginatedAccounts,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit
        }
      }
    };
    console.log('返回响应:', JSON.stringify(response.data.pagination));
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('获取账号列表失败:', error);
    console.error('错误堆栈:', error instanceof Error ? error.stack : '未知错误');
    
    // 返回更详细的错误信息
    return NextResponse.json({
      success: false,
      message: '获取账号列表失败',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 创建新账号
export async function POST(request: NextRequest) {
  try {
    console.log('处理创建账号请求...');
    
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }
    
    // 获取请求数据
    const body = await request.json();
    const { username, userId, steamId } = body;
    
    console.log('创建账号请求数据:', { username, userId, steamId });
    
    // 简化验证逻辑：用户名、用户ID和Steam ID至少有一个
    if (!username && !userId && !steamId) {
      return NextResponse.json({
        success: false,
        message: '用户名、用户ID和Steam ID至少填写一项'
      }, { status: 400 });
    }
    
    // 创建账号
    try {
      const account = await addAccount({
        username: username || `用户_${Date.now().toString().slice(-6)}`, // 如果没有用户名，使用时间戳后6位作为默认名称
        userId,
        steamId,
        status: 'active' // 默认为活跃状态
      });
      
      // 记录操作日志
      await addLog({
        action: 'CREATE_ACCOUNT',
        details: `创建账号: ${username || userId || steamId}`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json({
        success: true,
        message: '账号创建成功',
        data: { account }
      });
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      return NextResponse.json({
        success: false,
        message: '创建账号失败',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('创建账号失败:', error);
    return NextResponse.json({
      success: false,
      message: '创建账号失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 更新账号
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }
    
    // 获取请求数据
    const body = await request.json();
    const { id, username, userId, steamId } = body;
    
    console.log('更新账号请求数据:', { id, username, userId, steamId });
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: '账号ID是必需的'
      }, { status: 400 });
    }
    
    // 简化验证逻辑：用户名、用户ID和Steam ID至少有一个
    if (!username && !userId && !steamId) {
      return NextResponse.json({
        success: false,
        message: '用户名、用户ID和Steam ID至少填写一项'
      }, { status: 400 });
    }
    
    // 更新账号
    try {
      const account = await updateAccount(id, {
        username,
        userId,
        steamId
      });
      
      if (!account) {
        return NextResponse.json({
          success: false,
          message: '账号不存在'
        }, { status: 404 });
      }
      
      // 记录操作日志
      await addLog({
        action: 'UPDATE_ACCOUNT',
        details: `更新账号: ${account.username}`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json({
        success: true,
        message: '账号更新成功',
        data: { account }
      });
    } catch (updateError) {
      console.error('更新账号操作失败:', updateError);
      // 返回更详细的错误信息
      return NextResponse.json({
        success: false,
        message: updateError instanceof Error ? updateError.message : '更新账号失败',
        error: updateError instanceof Error ? updateError.message : String(updateError)
      }, { status: 400 }); // 使用400错误码表示客户端请求有问题
    }
  } catch (error) {
    console.error('更新账号失败:', error);
    return NextResponse.json({
      success: false,
      message: '更新账号失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 删除账号
export async function DELETE(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }
    
    // 获取请求数据
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: '账号ID是必需的'
      }, { status: 400 });
    }
    
    // 获取所有账号，找到要删除的账号信息用于记录日志
    const accounts = await getAccounts();
    const accountToDelete = accounts.find(acc => acc.id === id);
    
    // 删除账号
    const deleted = await deleteAccount(id);
    
    if (!deleted) {
      return NextResponse.json({
        success: false,
        message: '账号不存在或删除失败'
      }, { status: 404 });
    }
    
    // 记录操作日志
    await addLog({
      action: 'DELETE_ACCOUNT',
      details: `删除账号: ${accountToDelete?.username || id}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: '账号删除成功'
    });
  } catch (error) {
    console.error('删除账号失败:', error);
    return NextResponse.json({
      success: false,
      message: '删除账号失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 