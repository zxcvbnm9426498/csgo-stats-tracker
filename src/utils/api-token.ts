import axios from 'axios';

// 用于缓存令牌的变量
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * 获取API令牌，如果本地已缓存且未过期则使用缓存的令牌
 */
export async function getApiToken(): Promise<string> {
  // 检查缓存的令牌是否存在且未过期
  const now = Date.now();
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    // 获取新令牌
    const response = await axios.get('/api/token/get-public-token');
    
    if (response.data && response.data.success && response.data.token) {
      // 缓存令牌并设置过期时间（1小时后）
      cachedToken = response.data.token;
      tokenExpiry = now + 3600000; // 1小时 = 3600000毫秒
      return response.data.token;
    } else {
      throw new Error(response.data?.message || '获取令牌失败');
    }
  } catch (error) {
    console.error('获取API令牌失败:', error);
    throw new Error('无法获取API令牌');
  }
}

/**
 * 使用API令牌创建带有认证头的axios请求配置
 */
export async function createAuthConfig() {
  try {
    const token = await getApiToken();
    return {
      headers: {
        'x-api-token': token
      }
    };
  } catch (error) {
    console.error('创建认证配置失败:', error);
    return {};
  }
} 