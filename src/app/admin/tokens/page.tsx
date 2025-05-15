'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Table, message, Popconfirm, Typography, Modal, Form } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import axios from 'axios';
import AdminLayout from '@/components/admin/AdminLayout';

const { Title, Text } = Typography;

export default function ApiTokensPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载令牌列表
  const fetchTokens = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/tokens');
      if (response.data.success) {
        setTokens(response.data.data);
      } else {
        message.error(response.data.message || '加载失败');
      }
    } catch (error) {
      message.error('加载令牌列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  // 删除令牌
  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`/api/admin/tokens?id=${id}`);
      if (response.data.success) {
        message.success('删除成功');
        fetchTokens();
      } else {
        message.error(response.data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除令牌失败');
      console.error(error);
    }
  };

  // 复制令牌到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        message.success('已复制到剪贴板');
      },
      () => {
        message.error('复制失败');
      }
    );
  };

  // 添加新令牌
  const handleAddToken = async (values) => {
    try {
      const response = await axios.post('/api/admin/tokens', values);
      if (response.data.success) {
        message.success('添加令牌成功');
        setIsModalVisible(false);
        form.resetFields();
        fetchTokens();
      } else {
        message.error(response.data.message || '添加令牌失败');
      }
    } catch (error) {
      message.error('添加令牌失败');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '令牌',
      dataIndex: 'token',
      key: 'token',
      ellipsis: true,
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Text ellipsis style={{ maxWidth: 200 }}>{text}</Text>
          <Button 
            type="text" 
            icon={<CopyOutlined />} 
            onClick={() => copyToClipboard(text)} 
            title="复制令牌"
          />
        </div>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'token_expiry',
      key: 'token_expiry',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: '最后使用',
      dataIndex: 'last_used',
      key: 'last_used',
      render: (text) => text ? new Date(text).toLocaleString() : '未使用',
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定要删除此令牌吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Title level={2}>API令牌管理</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            添加令牌
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={tokens}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />

        <Modal
          title="添加API令牌"
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddToken}
          >
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ required: true, message: '请输入手机号' }]}
            >
              <Input placeholder="请输入手机号" />
            </Form.Item>
            <Form.Item
              name="token"
              label="API令牌"
              rules={[{ required: true, message: '请输入API令牌' }]}
            >
              <Input.TextArea placeholder="请输入API令牌" rows={4} />
            </Form.Item>
            <Form.Item
              name="source"
              label="来源"
            >
              <Input placeholder="可选，例如：手动添加" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                添加
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
} 