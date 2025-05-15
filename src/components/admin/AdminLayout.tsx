'use client';

import { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';

const { Header, Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header style={{ padding: 0, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 24 }}>
            <span style={{ fontWeight: 'bold' }}>CSGO 数据后台管理</span>
          </div>
        </Header>
        <Content style={{ margin: '0 16px' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout; 