const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 检查是否已有管理员账户
    const adminCount = await prisma.admin.count();
    
    if (adminCount > 0) {
      console.log('已存在管理员账户，跳过创建。');
      await prisma.admin.findMany().then(admins => {
        console.log('现有管理员账户:', admins);
      });
      return;
    }
    
    // 创建管理员账户
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      }
    });
    
    console.log('管理员账户创建成功:', admin);
    
    // 添加日志记录
    const log = await prisma.log.create({
      data: {
        action: 'ADMIN_CREATE',
        details: '创建默认管理员账户',
        ip: 'local'
      }
    });
    
    console.log('日志记录添加成功:', log);
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 