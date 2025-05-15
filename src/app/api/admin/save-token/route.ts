import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { sql } from '@/lib/db';
import { addLog } from '@/app/api/admin/db';

const prisma = new PrismaClient();

// 检查管理员是否已登录
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = request.cookies.get('admin_session');
  return !!session && !!session.value;
}

// 保存Token到数据库
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({
        success: false,
        message: '请先登录'
      }, { status: 401 });
    }
    
    const { phone, userId, authToken } = await request.json();
    
    if (!phone && !userId) {
      return NextResponse.json({
        success: false,
        message: '手机号或用户ID至少需要提供一个'
      }, { status: 400 });
    }
    
    if (!authToken) {
      return NextResponse.json({
        success: false,
        message: 'Token不能为空'
      }, { status: 400 });
    }
    
    console.log(`[API] 保存用户令牌，手机号: ${phone}, 用户ID: ${userId}`);
    
    // 设置Token过期时间为30天后
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 30);
    
    try {
      // 使用SQL查询更新账号信息
      let account;
      
      // 先查找是否存在账号
      let existingAccount;
      if (phone) {
        existingAccount = await sql`SELECT * FROM accounts WHERE phone = ${phone}`;
      } else if (userId) {
        existingAccount = await sql`SELECT * FROM accounts WHERE "userId" = ${userId}`;
      }
      
      // 如果账号已存在，更新令牌
      if (existingAccount && existingAccount.length > 0) {
        console.log(`[API] 找到现有账号，ID: ${existingAccount[0].id}，更新令牌`);
        
        account = await sql`
          UPDATE accounts 
          SET "authToken" = ${authToken}, 
              "tokenExpiry" = ${tokenExpiry.toISOString()},
              "lastLogin" = now()
          WHERE id = ${existingAccount[0].id}
          RETURNING *
        `;
      } else {
        // 如果账号不存在，创建新账号
        console.log(`[API] 未找到现有账号，创建新账号`);
        
        // 生成一个基于手机号或用户ID的用户名
        const username = phone ? `用户_${phone.substring(phone.length - 4)}` : `用户_${userId}`;
        
        account = await sql`
          INSERT INTO accounts (
            username, 
            phone, 
            "userId", 
            "authToken", 
            "tokenExpiry", 
            status, 
            "lastLogin"
          )
          VALUES (
            ${username}, 
            ${phone || null}, 
            ${userId || null}, 
            ${authToken}, 
            ${tokenExpiry.toISOString()}, 
            'active', 
            now()
          )
          RETURNING *
        `;
      }
      
      // 记录操作日志
      await addLog({
        action: 'SAVE_USER_TOKEN',
        details: `保存用户认证令牌，手机号: ${phone || '未提供'}, 用户ID: ${userId || '未提供'}`,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return NextResponse.json({
        success: true,
        message: '令牌保存成功',
        data: { 
          account: account[0],
          tokenExpiry: tokenExpiry.toISOString()
        }
      });
    } catch (dbError) {
      console.error('[API] 数据库操作失败:', dbError);
      return NextResponse.json({
        success: false,
        message: '保存令牌失败',
        error: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API] 保存令牌失败:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 