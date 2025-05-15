/*
 * @Author: 择安网络
 * @Code function: 
 * @Date: 2025-05-15 08:45:19
 * @FilePath: /csgo-stats-tracker/src/app/api/init-db/route.ts
 * @LastEditTime: 2025-05-15 08:47:40
 */
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';

/**
 * 初始化数据库，创建必要的表
 * 
 * 此接口无需令牌即可访问，用于初始化部署
 * 
 * 返回:
 * {
 *   success: true,
 *   message: '数据库初始化成功',
 *   token: '如果新创建了令牌，会返回此令牌'
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 创建api_tokens表（如果不存在）
    await sql`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        token_expiry TIMESTAMP,
        last_used TIMESTAMP
      )
    `;

    // 创建player_elo表（如果不存在）
    await sql`
      CREATE TABLE IF NOT EXISTS player_elo (
        id SERIAL PRIMARY KEY,
        steam_id VARCHAR(255) NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;

    // 创建player_bans表（如果不存在）
    await sql`
      CREATE TABLE IF NOT EXISTS player_bans (
        id SERIAL PRIMARY KEY,
        steam_id VARCHAR(255) NOT NULL UNIQUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `;

    // 检查是否已有令牌，如果没有则创建一个初始令牌
    const tokens = await sql`SELECT * FROM api_tokens LIMIT 1`;
    
    let newToken: string | null = null;
    
    if (!tokens || tokens.length === 0) {
      // 创建一个默认令牌，1年后过期
      newToken = crypto.randomBytes(32).toString('hex');
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      await sql`
        INSERT INTO api_tokens (token, description, status, token_expiry)
        VALUES (${newToken}, '初始化默认令牌', 'active', ${oneYearLater.toISOString()})
      `;
    }

    return NextResponse.json({
      success: true,
      message: '数据库初始化成功',
      token: newToken // 如果创建了新令牌，则返回它
    });
  } catch (error) {
    console.error('[API] 数据库初始化失败:', error);
    return NextResponse.json({
      success: false,
      message: '数据库初始化失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 