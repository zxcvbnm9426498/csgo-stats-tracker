import { NextRequest, NextResponse } from 'next/server';
import { getAccounts, addAccount, updateAccount, deleteAccount, addLog } from '../db';
import { cookies } from 'next/headers';

// 检查管理员是否已登录
async function isAuthenticated(): Promise<boolean> {
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    
    // 获取所有账号
    let accounts = await getAccounts();
    
    // 应用过滤器
    if (search) {
      accounts = accounts.filter(acc => 
        acc.username.toLowerCase().includes(search.toLowerCase()) || 
        acc.phone.includes(search) ||
        (acc.steamId && acc.steamId.includes(search))
      );
    }
    
    if (status) {
      accounts = accounts.filter(acc => acc.status === status);
    }
    
    // 计算分页
    const total = accounts.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAccounts = accounts.slice(startIndex, endIndex);
    
    // 记录查询日志
    await addLog({
      action: 'VIEW_ACCOUNTS',
      details: `查看账号列表，页码: ${page}, 每页数量: ${limit}${search ? ', 搜索: ' + search : ''}`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: paginatedAccounts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取账号列表时出错:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }
  
  try {
    const data = await request.json();
    const { username, phone, steamId, status = 'active' } = data;
    
    if (!username || !phone) {
      return NextResponse.json(
        { success: false, message: '用户名和手机号不能为空' },
        { status: 400 }
      );
    }
    
    // 检查用户名或手机号是否已存在
    const accounts = await getAccounts();
    if (accounts.some(acc => acc.username === username)) {
      return NextResponse.json(
        { success: false, message: '用户名已存在' },
        { status: 400 }
      );
    }
    
    if (accounts.some(acc => acc.phone === phone)) {
      return NextResponse.json(
        { success: false, message: '手机号已存在' },
        { status: 400 }
      );
    }
    
    // 创建新账号
    const newAccount = await addAccount({
      username,
      phone,
      steamId,
      status
    });
    
    // 记录操作日志
    await addLog({
      action: 'CREATE_ACCOUNT',
      details: `创建账号 ${username} (ID: ${newAccount.id})`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: '账号创建成功',
      data: newAccount
    });
  } catch (error) {
    console.error('创建账号时出错:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }
  
  try {
    const data = await request.json();
    const { id, username, phone, steamId, status } = data;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '账号ID不能为空' },
        { status: 400 }
      );
    }
    
    // 检查账号是否存在
    const accounts = await getAccounts();
    const existingAccount = accounts.find(acc => acc.id === id);
    if (!existingAccount) {
      return NextResponse.json(
        { success: false, message: '账号不存在' },
        { status: 404 }
      );
    }
    
    // 检查用户名或手机号是否与其他账号冲突
    if (username && username !== existingAccount.username) {
      if (accounts.some(acc => acc.id !== id && acc.username === username)) {
        return NextResponse.json(
          { success: false, message: '用户名已被其他账号使用' },
          { status: 400 }
        );
      }
    }
    
    if (phone && phone !== existingAccount.phone) {
      if (accounts.some(acc => acc.id !== id && acc.phone === phone)) {
        return NextResponse.json(
          { success: false, message: '手机号已被其他账号使用' },
          { status: 400 }
        );
      }
    }
    
    // 更新账号
    const updatedAccount = await updateAccount(id, {
      username,
      phone,
      steamId,
      status
    });
    
    // 记录操作日志
    await addLog({
      action: 'UPDATE_ACCOUNT',
      details: `更新账号 ${username || existingAccount.username} (ID: ${id})`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: '账号更新成功',
      data: updatedAccount
    });
  } catch (error) {
    console.error('更新账号时出错:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }
  
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: '账号ID不能为空' },
        { status: 400 }
      );
    }
    
    // 检查账号是否存在
    const accounts = await getAccounts();
    const existingAccount = accounts.find(acc => acc.id === id);
    if (!existingAccount) {
      return NextResponse.json(
        { success: false, message: '账号不存在' },
        { status: 404 }
      );
    }
    
    // 删除账号
    const isDeleted = await deleteAccount(id);
    
    if (!isDeleted) {
      return NextResponse.json(
        { success: false, message: '删除账号失败' },
        { status: 500 }
      );
    }
    
    // 记录操作日志
    await addLog({
      action: 'DELETE_ACCOUNT',
      details: `删除账号 ${existingAccount.username} (ID: ${id})`,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: '账号删除成功'
    });
  } catch (error) {
    console.error('删除账号时出错:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误' },
      { status: 500 }
    );
  }
} 