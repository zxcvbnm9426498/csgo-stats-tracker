'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Card, Alert, Spin, Typography } from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;

interface ApiExampleProps {
  endpoint: string;
  method?: 'GET' | 'POST';
  params?: Record<string, string>;
  description?: string;
}

const ApiExample: React.FC<ApiExampleProps> = ({
  endpoint,
  method = 'GET',
  params = {},
  description
}) => {
  const [token, setToken] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [localParams, setLocalParams] = useState<Record<string, string>>(params);

  const updateParam = (key: string, value: string) => {
    setLocalParams(prev => ({ ...prev, [key]: value }));
  };

  const fetchData = async () => {
    if (!token) {
      setError('请输入API令牌');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const config = {
        headers: {
          'x-api-token': token
        },
        params: method === 'GET' ? localParams : undefined
      };

      let response;
      if (method === 'GET') {
        response = await axios.get(endpoint, config);
      } else {
        response = await axios.post(endpoint, localParams, config);
      }

      setResult(response.data);
    } catch (error) {
      console.error('API请求失败:', error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || '请求失败');
      } else {
        setError('发生未知错误');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={<Title level={4}>{endpoint}</Title>} 
      bordered={true} 
      style={{ marginBottom: 20 }}
    >
      {description && (
        <div style={{ marginBottom: 16 }}>
          <Text>{description}</Text>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Text strong>API令牌</Text>
        <Input 
          placeholder="请输入API令牌" 
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </div>

      {Object.keys(localParams).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>参数</Text>
          {Object.keys(localParams).map(key => (
            <div key={key} style={{ marginTop: 8 }}>
              <Text>{key}: </Text>
              <Input 
                placeholder={`输入${key}`}
                value={localParams[key]}
                onChange={(e) => updateParam(key, e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
      )}

      <Button 
        type="primary" 
        onClick={fetchData} 
        loading={loading}
        style={{ marginTop: 8 }}
      >
        发送请求
      </Button>

      {error && (
        <Alert 
          message="错误" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginTop: 16 }} 
        />
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <Text strong>返回结果</Text>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: 16, 
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 300
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', margin: '16px 0' }}>
          <Spin />
        </div>
      )}
    </Card>
  );
};

export default ApiExample; 