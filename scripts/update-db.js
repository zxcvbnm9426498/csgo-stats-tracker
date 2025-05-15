// 数据库更新脚本
const { exec } = require('child_process');
const path = require('path');

// 执行API调用以更新数据库结构
console.log('正在调用更新数据库API...');

// 使用curl发送请求到API
exec('curl -X POST http://localhost:3000/api/admin/update-db', (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error.message}`);
    console.error('请确保:');
    console.error('1. 应用正在运行 (npm run dev)');
    console.error('2. 您已登录到管理员账户');
    process.exit(1);
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    process.exit(1);
  }
  
  try {
    const response = JSON.parse(stdout);
    
    if (response.success) {
      console.log('✅ 数据库更新成功!');
      console.log('更新内容:');
      console.log(response.details.updates);
    } else {
      console.error('❌ 数据库更新失败:');
      console.error(response.message);
    }
  } catch (e) {
    console.error('解析响应失败:', e);
    console.log('原始响应:', stdout);
  }
}); 