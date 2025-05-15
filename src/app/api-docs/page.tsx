'use client';

import { useState } from 'react';
import { Typography, Card, Tabs, Divider, Alert, Table, Space, Tag, Input, Button } from 'antd';
import { CodeOutlined, KeyOutlined, ApiOutlined } from '@ant-design/icons';
import ApiExample from '@/components/ApiExample';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

export default function ApiDocsPage() {
  const [token, setToken] = useState('');

  const endpointColumns = [
    {
      title: 'API路径',
      dataIndex: 'path',
      key: 'path',
      render: text => <Text code>{text}</Text>
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      render: text => <Tag color={text === 'GET' ? 'blue' : 'green'}>{text}</Tag>
    },
    {
      title: '参数',
      dataIndex: 'params',
      key: 'params',
      render: params => (
        <Space direction="vertical">
          {params && params.map(param => (
            <div key={param.name}>
              <Text code>{param.name}</Text>: {param.description}
              {param.required && <Tag color="red" style={{ marginLeft: 8 }}>必填</Tag>}
            </div>
          ))}
          {!params || params.length === 0 ? '无' : null}
        </Space>
      )
    }
  ];

  const endpoints = [
    {
      key: '1',
      path: '/api/stats/player',
      description: '获取玩家统计数据',
      method: 'GET',
      params: [
        { name: 'steamId', description: '玩家的Steam ID', required: true }
      ]
    },
    {
      key: '2',
      path: '/api/elo/player',
      description: '获取玩家ELO分数',
      method: 'GET',
      params: [
        { name: 'steamId', description: '玩家的Steam ID', required: true }
      ]
    },
    {
      key: '3',
      path: '/api/bans/list',
      description: '获取封禁记录',
      method: 'GET',
      params: [
        { name: 'steamId', description: '玩家的Steam ID（可选）', required: false },
        { name: 'page', description: '页码，默认为1', required: false },
        { name: 'limit', description: '每页数量，默认为10', required: false }
      ]
    },
    {
      key: '4',
      path: '/api/matches/recent',
      description: '获取最近比赛',
      method: 'GET',
      params: [
        { name: 'steamId', description: '玩家的Steam ID', required: true },
        { name: 'limit', description: '比赛数量，默认为5', required: false }
      ]
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <Title level={1}>CSGO数据API文档</Title>
      <Paragraph>
        本文档提供CSGO数据查询API的使用说明。所有API都需要使用有效的API令牌进行访问。
      </Paragraph>

      <Divider />

      <Tabs defaultActiveKey="1">
        <TabPane 
          tab={<span><KeyOutlined />授权认证</span>}
          key="1"
        >
          <Card>
            <Title level={3}>API令牌认证</Title>
            <Paragraph>
              所有API请求都需要通过<Text code>x-api-token</Text>请求头提供有效的API令牌。
              未提供令牌或令牌无效将返回401错误。
            </Paragraph>

            <Alert 
              type="info" 
              message="如何获取API令牌" 
              description="请联系管理员获取API令牌。每个令牌有效期为90天。"
              showIcon
              style={{ marginBottom: 20 }}
            />

            <Title level={4}>令牌使用示例</Title>
            <Paragraph>
              使用下面的方式在请求头中包含您的API令牌：
            </Paragraph>

            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, marginBottom: 20 }}>
              <Text code>{'x-api-token: your-api-token-here'}</Text>
            </div>

            <Title level={4}>测试您的令牌</Title>
            <div style={{ marginBottom: 20 }}>
              <Input.Password
                placeholder="输入您的API令牌"
                value={token}
                onChange={e => setToken(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <Button 
                type="primary"
                onClick={() => {
                  window.open(`/api/auth/verify-token?token=${token}`, '_blank');
                }}
                disabled={!token}
              >
                验证令牌
              </Button>
            </div>
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><ApiOutlined />API端点</span>}
          key="2"
        >
          <Card>
            <Title level={3}>可用API端点</Title>
            <Table 
              columns={endpointColumns} 
              dataSource={endpoints} 
              rowKey="key"
              pagination={false}
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><CodeOutlined />示例</span>}
          key="3"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <ApiExample 
              endpoint="/api/stats/player"
              method="GET"
              params={{ steamId: '' }}
              description="获取玩家统计数据，需要输入有效的Steam ID"
            />
            
            <ApiExample 
              endpoint="/api/elo/player"
              method="GET"
              params={{ steamId: '' }}
              description="获取玩家ELO分数，需要输入有效的Steam ID"
            />
            
            <ApiExample 
              endpoint="/api/bans/list"
              method="GET"
              params={{ page: '1', limit: '10' }}
              description="获取封禁列表，可选过滤特定玩家"
            />
            
            <ApiExample 
              endpoint="/api/matches/recent"
              method="GET"
              params={{ steamId: '', limit: '5' }}
              description="获取玩家最近的比赛记录"
            />
          </Space>
        </TabPane>
      </Tabs>
    </div>
  );
} 