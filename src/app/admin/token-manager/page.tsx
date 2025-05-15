'use client';

import { useState } from 'react';
import { Button, Input, Card, Alert, Form, Typography, message, Spin, Table, Tag } from 'antd';
import { LoginOutlined, SaveOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';
import AdminLayout from '@/components/admin/AdminLayout';

const { Title, Text, Paragraph } = Typography;

export default function TokenManagerPage() {
  const [loginForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<any>(null);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 模拟前台登录
  const handleLogin = async (values: any) => {
    setLoading(true);
    setLoginError(null);
    setLoginResult(null);
    setSaveResult(null);
    setSaveError(null);

    try {
      const response = await axios.post('https://csgo.274014.online/api/auth', {
        phone: values.phone,
        code: values.code
      });

      if (response.data && response.data.code === 0) {
        setLoginResult(response.data.result);
        message.success('登录成功');
      } else {
        setLoginError(response.data.description || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setLoginError('登录请求失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 保存令牌到数据库
  const handleSaveToken = async () => {
    if (!loginResult || !loginResult.loginResult || !loginResult.loginResult.accountInfo) {
      message.error('请先登录获取令牌');
      return;
    }

    setLoading(true);
    setSaveError(null);

    try {
      const accountInfo = loginResult.loginResult.accountInfo;
      const response = await axios.post('/api/admin/save-token', {
        userId: accountInfo.userId,
        mobilePhone: accountInfo.mobilePhone,
        token: accountInfo.token
      });

      if (response.data && response.data.success) {
        setSaveResult(response.data);
        message.success('令牌保存成功');
      } else {
        setSaveError(response.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存令牌失败:', error);
      setSaveError('保存令牌请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制令牌到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success('已复制到剪贴板');
      },
      () => {
        message.error('复制失败');
      }
    );
  };

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <Title level={2}>前台令牌管理</Title>
        <Paragraph>
          此页面用于模拟前台登录并保存令牌到数据库，以便前台访问API接口。
        </Paragraph>

        <Card title="步骤1: 前台登录" style={{ marginBottom: 20 }}>
          <Form 
            form={loginForm}
            layout="vertical"
            onFinish={handleLogin}
          >
            <Form.Item 
              name="phone" 
              label="手机号"
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input placeholder="输入手机号" />
            </Form.Item>
            <Form.Item 
              name="code" 
              label="验证码"
              rules={[{ required: true, message: '请输入验证码' }]}
            >
              <Input placeholder="输入验证码" />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<LoginOutlined />}
                loading={loading}
              >
                模拟登录
              </Button>
            </Form.Item>
          </Form>

          {loginError && (
            <Alert
              message="登录错误"
              description={loginError}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {loginResult && (
            <div style={{ marginTop: 16 }}>
              <Title level={4}>登录结果:</Title>
              <Table
                columns={[
                  {
                    title: '字段',
                    dataIndex: 'field',
                    key: 'field',
                    width: 150,
                  },
                  {
                    title: '值',
                    dataIndex: 'value',
                    key: 'value',
                    render: (text, record) => (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {record.field === 'token' ? (
                          <>
                            <Text ellipsis style={{ maxWidth: 300 }}>{text}</Text>
                            <Button 
                              type="text" 
                              icon={<CopyOutlined />} 
                              onClick={() => copyToClipboard(text)}
                              title="复制令牌"
                            />
                          </>
                        ) : (
                          text
                        )}
                      </div>
                    ),
                  },
                ]}
                dataSource={[
                  { key: '1', field: '用户ID', value: loginResult.loginResult.accountInfo.userId },
                  { key: '2', field: '手机号', value: loginResult.loginResult.accountInfo.mobilePhone },
                  { key: '3', field: 'SteamID', value: loginResult.loginResult.accountInfo.steamId || '无' },
                  { key: '4', field: 'token', value: loginResult.loginResult.accountInfo.token },
                  { key: '5', field: '创建时间', value: new Date(loginResult.loginResult.accountInfo.create).toLocaleString() },
                ]}
                pagination={false}
                size="small"
                bordered
              />

              <Button
                type="primary"
                icon={<SaveOutlined />}
                style={{ marginTop: 16 }}
                onClick={handleSaveToken}
                loading={loading}
              >
                保存令牌到数据库
              </Button>
            </div>
          )}
        </Card>

        {saveResult && (
          <Card title="步骤2: 保存结果" style={{ marginBottom: 20 }}>
            <Alert
              message="保存成功"
              description={`令牌已成功保存到数据库，ID: ${saveResult.data.id}，过期时间: ${new Date(saveResult.data.expiryDate).toLocaleString()}`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Text strong>现在可以使用此令牌访问前台API，请在API请求头中添加:</Text>
            <pre style={{ background: '#f5f5f5', padding: 16, marginTop: 8 }}>
              x-api-token: {loginResult.loginResult.accountInfo.token}
            </pre>
            
            <Button 
              type="primary" 
              onClick={() => copyToClipboard(loginResult.loginResult.accountInfo.token)}
              icon={<CopyOutlined />}
            >
              复制令牌
            </Button>
          </Card>
        )}

        {saveError && (
          <Alert
            message="保存错误"
            description={saveError}
            type="error"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </AdminLayout>
  );
} 