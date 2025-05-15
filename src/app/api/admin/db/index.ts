import { sql } from '@/lib/db';
import { nanoid } from 'nanoid';

interface LogEntry {
  userId?: string;
  action: string;
  details?: string;
  ip?: string;
}

/**
 * 添加操作日志
 */
export async function addLog(logData: LogEntry): Promise<void> {
  try {
    const id = nanoid();
    const { userId, action, details, ip } = logData;

    await sql`
      INSERT INTO logs (id, "userId", action, details, ip, timestamp)
      VALUES (${id}, ${userId || null}, ${action}, ${details || null}, ${ip || null}, CURRENT_TIMESTAMP)
    `;
  } catch (error) {
    console.error('添加日志失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 获取操作日志列表
 */
export async function getLogs(page = 1, limit = 20): Promise<any[]> {
  try {
    const offset = (page - 1) * limit;

    const logs = await sql`
      SELECT * FROM logs
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return logs;
  } catch (error) {
    console.error('获取日志列表失败:', error);
    return [];
  }
}

/**
 * 获取操作日志总数
 */
export async function getLogsCount(): Promise<number> {
  try {
    const result = await sql`SELECT COUNT(*) as count FROM logs`;
    return parseInt(result[0].count, 10);
  } catch (error) {
    console.error('获取日志总数失败:', error);
    return 0;
  }
} 