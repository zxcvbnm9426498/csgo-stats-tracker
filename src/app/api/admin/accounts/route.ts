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
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }

    // 获取查询参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';

    // 获取所有账号
    const allAccounts = await getAccounts();
    
    // 过滤
    let filteredAccounts = [...allAccounts];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAccounts = filteredAccounts.filter(acc => 
        acc.username.toLowerCase().includes(searchLower) ||
        acc.phone.toLowerCase().includes(searchLower) ||
        (acc.steamId && acc.steamId.toLowerCase().includes(searchLower))
      );
    }
    
    if (status) {
      filteredAccounts = filteredAccounts.filter(acc => acc.status === status);
    }
    
    // 分页
    const total = filteredAccounts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + limit);
    
    // 记录访问日志
    await addLog({
      action: 'VIEW_ACCOUNTS',
      details: `查看账号列表，页码: ${page}, 每页数量: ${limit}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('获取账号列表失败:', error);
    return NextResponse.json({
      success: false,
      message: '获取账号列表失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 创建新账号
export async function POST(request: NextRequest) {
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
    const { username, phone, steamId, status } = body;
    
    // 修改验证逻辑：必须有手机号，且用户名或Steam ID至少有一个
    if (!phone) {
      return NextResponse.json({
        success: false,
        message: '手机号是必填字段'
      }, { status: 400 });
    }
    
    if (!username && !steamId) {
      return NextResponse.json({
        success: false,
        message: '用户名和Steam ID至少填写一项'
      }, { status: 400 });
    }
    
    // 创建账号
    const account = await addAccount({
      username: username || `用户_${phone.substring(phone.length-4)}`, // 如果没有用户名，使用手机号后4位作为默认名称
      phone,
      steamId,
      status: status || 'active'
    });
    
    // 记录操作日志
    await addLog({
      action: 'CREATE_ACCOUNT',
      details: `创建账号: ${username || steamId || phone}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: '账号创建成功',
      data: { account }
    });
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
    const { id, username, phone, steamId, status } = body;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: '账号ID是必需的'
      }, { status: 400 });
    }
    
    // 更新账号
    const account = await updateAccount(id, {
      username,
      phone,
      steamId,
      status
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