'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import AdminAuthCheck from '@/app/components/admin/AdminAuthCheck';

interface Account {
  id: string;
  username: string;
  userId?: string;
  steamId?: string;
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isFetchingSteamId, setIsFetchingSteamId] = useState(false);
  
  // 新账号表单数据
  const [formData, setFormData] = useState({
    username: '',
    userId: '',
    steamId: ''
  });

  // 加载账号数据
  const loadAccounts = async (page = 1) => {
    setIsLoading(true);
    try {
      const url = new URL('/api/admin/accounts', window.location.origin);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '10');
      
      if (search) {
        url.searchParams.append('search', search);
      }
      
      if (statusFilter) {
        url.searchParams.append('status', statusFilter);
      }
      
      console.log('请求账号数据:', url.toString());
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('请先登录');
          router.push('/admin');
          return;
        }
        
        // 尝试解析错误响应
        try {
          const errorData = await response.json();
          console.error('API错误响应:', errorData);
          toast.error(`获取账号数据失败: ${errorData.message || response.statusText}`);
        } catch (parseError) {
          toast.error(`获取账号数据失败: ${response.status} ${response.statusText}`);
        }
        
        throw new Error(`获取账号数据失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('获取账号数据响应:', result);
      
      if (result.success) {
        // 检查账号数组是否存在
        if (!result.data || !Array.isArray(result.data.accounts)) {
          console.error('API返回格式错误，缺少accounts数组:', result);
          toast.error('服务器返回数据格式错误');
          setAccounts([]);
          return;
        }
        
        setAccounts(result.data.accounts);
        setTotalPages(result.data.pagination.totalPages || 1);
        setCurrentPage(page);
        
        // 如果账号列表为空，显示提示信息
        if (result.data.accounts.length === 0) {
          toast.success('没有找到账号数据');
        }
      } else {
        console.error('API返回错误:', result);
        toast.error(result.message || '获取账号数据失败');
      }
    } catch (error) {
      console.error('获取账号数据时出错:', error);
      toast.error('获取账号数据时出错');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts(1);
  }, [router, search, statusFilter]);

  // 表单输入处理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // 如果输入了用户ID且没有输入Steam ID，尝试获取Steam ID
    if (name === 'userId' && value && !formData.steamId) {
      fetchSteamIdByUserId(value);
    }
  };

  // 通过用户ID获取Steam ID
  const fetchSteamIdByUserId = async (userId: string) => {
    if (!userId || isFetchingSteamId) return;
    
    setIsFetchingSteamId(true);
    try {
      toast.loading('正在获取Steam ID...', { id: 'steamIdFetch' });
      
      // 使用标准化的API接口
      const response = await fetch(`/api/steam/lookup?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.steamId) {
        // 更新SteamID
        setFormData(prev => ({ 
          ...prev, 
          steamId: data.steamId,
          // 如果API返回了nickname且用户名为空，则自动填充用户名
          username: data.nickname && !prev.username.trim() ? data.nickname : prev.username 
        }));
        
        // 如果用户名被自动填充，添加一个额外的提示
        if (data.nickname && !formData.username.trim()) {
          toast.success(`获取到用户名: ${data.nickname}`, { duration: 3000 });
          
          // 高亮显示自动填充的用户名字段
          const usernameField = document.getElementById('username');
          if (usernameField) {
            usernameField.classList.add('bg-green-50', 'border-green-300');
            setTimeout(() => {
              usernameField.classList.remove('bg-green-50', 'border-green-300');
            }, 2000);
          }
        }
        
        // 如果是生成的备用ID，显示不同的提示
        if (data.note && data.note.includes('备用ID')) {
          toast.success('已生成备用Steam ID，可能需要手动确认', { id: 'steamIdFetch' });
        } else {
          toast.success('已自动获取Steam ID', { id: 'steamIdFetch' });
        }
        
        // 高亮显示获取到的Steam ID字段
        const steamIdField = document.getElementById('steamId');
        if (steamIdField) {
          steamIdField.classList.add('bg-green-50', 'border-green-300');
          setTimeout(() => {
            steamIdField.classList.remove('bg-green-50', 'border-green-300');
          }, 2000);
        }
      } else {
        toast.error(data.message || '未找到对应的Steam ID', { id: 'steamIdFetch' });
        console.error('获取Steam ID失败:', data);
      }
    } catch (error) {
      console.error('获取Steam ID失败:', error);
      toast.error('获取Steam ID时出错', { id: 'steamIdFetch' });
    } finally {
      setIsFetchingSteamId(false);
    }
  };

  // 打开创建账号模态框
  const handleOpenCreateModal = () => {
    setEditingAccount(null);
    setFormData({
      username: '',
      userId: '',
      steamId: ''
    });
    setShowModal(true);
  };

  // 打开编辑账号模态框
  const handleOpenEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      username: account.username,
      userId: account.userId || '',
      steamId: account.steamId || ''
    });
    setShowModal(true);
  };

  // 验证表单输入
  const validateForm = () => {
    // 检查用户名和Steam ID/用户ID是否至少填写了一项
    if (!formData.username.trim() && !formData.steamId.trim() && !formData.userId.trim()) {
      toast.error('用户名、用户ID和Steam ID至少填写一项');
      return false;
    }

    return true;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!validateForm()) {
      return;
    }

    try {
      const method = editingAccount ? 'PUT' : 'POST';
      const body = editingAccount 
        ? { id: editingAccount.id, ...formData }
        : formData;
      
      console.log(`提交${editingAccount ? '编辑' : '创建'}账号表单:`, body);
      
      const response = await fetch('/api/admin/accounts', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      console.log(`${editingAccount ? '编辑' : '创建'}账号响应:`, result);
      
      if (result.success) {
        toast.success(result.message || (editingAccount ? '账号更新成功' : '账号创建成功'));
        setShowModal(false);
        loadAccounts(currentPage);
      } else {
        console.error('操作失败详情:', result);
        
        // 根据错误信息提供更友好的提示
        if (result.message && result.message.includes('已存在') || 
            result.message && result.message.includes('已被') ||
            result.error && result.error.includes('已存在') || 
            result.error && result.error.includes('已被')) {
          
          toast.error('账号创建失败: 用户名或Steam ID已被使用');
          
          // 高亮显示可能有问题的字段
          const errorField = document.getElementById(
            result.message?.includes('用户名') || result.error?.includes('用户名') 
              ? 'username' 
              : result.message?.includes('Steam ID') || result.error?.includes('Steam ID')
                ? 'steamId'
                : 'userId'
          );
          
          if (errorField) {
            errorField.classList.add('border-red-500');
            errorField.focus();
            
            // 3秒后移除高亮
            setTimeout(() => {
              errorField.classList.remove('border-red-500');
            }, 3000);
          }
        } else {
          // 其他错误
          toast.error(result.message || '操作失败');
          if (result.error && result.error !== result.message) {
            toast.error(`错误详情: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error('提交表单时出错:', error);
      toast.error('提交表单时出错');
    }
  };

  // 删除账号
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个账号吗？此操作不可撤销！')) {
      return;
    }
    
    try {
      const url = new URL('/api/admin/accounts', window.location.origin);
      url.searchParams.append('id', id);
      
      const response = await fetch(url.toString(), {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('账号删除成功');
        loadAccounts(accounts.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除账号时出错:', error);
      toast.error('删除账号时出错');
    }
  };

  return (
    <AdminAuthCheck>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">账号管理</h1>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            添加账号
          </button>
        </div>
        
        {/* 过滤器 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
              <input
                type="text"
                id="search"
                placeholder="用户名、手机号或SteamID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                id="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">全部状态</option>
                <option value="active">活跃</option>
                <option value="suspended">已暂停</option>
                <option value="banned">已封禁</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => loadAccounts(1)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                刷新
              </button>
            </div>
          </div>
        </div>
        
        {/* 账号列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STEAM ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    没有找到符合条件的账号
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.userId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.steamId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.status === 'active' ? 'bg-green-100 text-green-800' :
                        account.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {account.status === 'active' ? '活跃' :
                        account.status === 'suspended' ? '已暂停' : '已封禁'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(account.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenEditModal(account)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页 */}
        {!isLoading && accounts.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-500">
              显示 {accounts.length} 个账号，共 {totalPages} 页
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => loadAccounts(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                  currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                上一页
              </button>
              <button
                onClick={() => loadAccounts(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${
                  currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                下一页
              </button>
            </div>
          </div>
        )}
        
        {/* 创建/编辑账号模态框 */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-75">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">
                {editingAccount ? '编辑账号' : '创建新账号'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      用户名
                    </label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="请输入用户名"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                      User ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="userId"
                        name="userId"
                        value={formData.userId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="请输入User ID"
                      />
                      {isFetchingSteamId && (
                        <div className="absolute right-3 top-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">输入用户ID后会自动获取Steam ID</p>
                  </div>
                  
                  <div>
                    <label htmlFor="steamId" className="block text-sm font-medium text-gray-700 mb-1">
                      Steam ID
                    </label>
                    <input
                      type="text"
                      id="steamId"
                      name="steamId"
                      value={formData.steamId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="请输入Steam ID或通过User ID自动获取"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-500 italic">
                    注: 用户名、User ID和Steam ID至少填写一项
                  </div>
                </div>
                
                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingAccount ? '更新' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminAuthCheck>
  );
} 