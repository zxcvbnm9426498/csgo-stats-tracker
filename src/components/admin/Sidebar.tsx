import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
  FileSearchOutlined,
  WarningOutlined,
  DollarOutlined,
  KeyOutlined,
  ApiOutlined
} from '@ant-design/icons';

const Sidebar = () => {
  const pathname = usePathname();
  const [selectedKeys, setSelectedKeys] = useState(['dashboard']);

  useEffect(() => {
    const path = pathname?.split('/').pop() || 'dashboard';
    setSelectedKeys([path]);
  }, [pathname]);

  return (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <span className="logo">CSGO管理后台</span>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        style={{ borderRight: 0 }}
        items={[
          {
            key: 'dashboard',
            icon: <DashboardOutlined />,
            label: <Link href="/admin/dashboard">控制台</Link>,
          },
          {
            key: 'accounts',
            icon: <UserOutlined />,
            label: <Link href="/admin/accounts">用户管理</Link>,
          },
          {
            key: 'tokens',
            icon: <KeyOutlined />,
            label: <Link href="/admin/tokens">API令牌管理</Link>,
          },
          {
            key: 'token-manager',
            icon: <ApiOutlined />,
            label: <Link href="/admin/token-manager">前台令牌工具</Link>,
          },
          {
            key: 'bans',
            icon: <WarningOutlined />,
            label: <Link href="/admin/bans">封禁记录</Link>,
          },
          {
            key: 'logs',
            icon: <FileSearchOutlined />,
            label: <Link href="/admin/logs">操作日志</Link>,
          },
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: <Link href="/admin/settings">系统设置</Link>,
          },
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: <Link href="/admin/logout">退出登录</Link>,
          },
        ]}
      />
    </div>
  );
};

export default Sidebar; 