const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始数据库初始化...');

  try {
    // 检查管理员账户是否存在
    const adminCount = await prisma.admin.count();
    
    if (adminCount === 0) {
      console.log('创建默认管理员账户...');
      await prisma.admin.create({
        data: {
          username: 'admin',
          password: 'admin123',
          role: 'admin'
        }
      });
      console.log('管理员账户创建成功');
    } else {
      console.log(`已存在 ${adminCount} 个管理员账户，跳过创建`);
    }

    // 创建测试账户
    const testAccountExists = await prisma.account.findFirst({
      where: { username: 'test_user' }
    });

    if (!testAccountExists) {
      console.log('创建测试用户账户...');
      await prisma.account.create({
        data: {
          username: 'test_user',
          phone: '13800138000',
          steamId: '76561198000000000',
          status: 'active'
        }
      });
      console.log('测试用户账户创建成功');
    }

    // 创建测试日志
    console.log('创建初始系统日志...');
    await prisma.log.create({
      data: {
        action: 'SYSTEM_INIT',
        details: '系统初始化',
        ip: '127.0.0.1'
      }
    });
    console.log('系统日志创建成功');

    console.log('数据库初始化完成!');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 