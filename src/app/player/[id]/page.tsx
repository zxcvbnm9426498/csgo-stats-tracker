'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Tabs, Spin, Alert, Tag, Typography, Statistic, Row, Col, Table, Timeline } from 'antd';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftOutlined, TrophyOutlined, WarningOutlined, HistoryOutlined } from '@ant-design/icons';
import { createAuthConfig } from '@/utils/api-token';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export default function PlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;
  
  const [playerData, setPlayerData] = useState<any>(null);
  const [eloData, setEloData] = useState<any>(null);
  const [banData, setBanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 获取玩家基本数据
    const fetchPlayerData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 获取API令牌配置
        const authConfig = await createAuthConfig();
        
        // 获取玩家基本信息
        const playerResponse = await axios.get(`/api/player/${playerId}`);
        
        if (playerResponse.data && playerResponse.data.success) {
          setPlayerData(playerResponse.data.data);
          
          // 获取玩家ELO分数
          const steamId = playerResponse.data.data.steamId;
          if (steamId) {
            try {
              // 获取ELO分数
              const eloResponse = await axios.get(`/api/elo/player?steamId=${steamId}`, authConfig);
              if (eloResponse.data && eloResponse.data.success) {
                setEloData(eloResponse.data.data);
              }

              // 获取封禁状态
              const banResponse = await axios.get(`/api/bans/list?steamId=${steamId}`, authConfig);
              if (banResponse.data && banResponse.data.success) {
                setBanData(banResponse.data.data);
              }
            } catch (apiError) {
              console.error('获取API数据失败:', apiError);
              // 不阻止页面渲染，只是这部分数据不显示
            }
          }
        } else {
          setError(playerResponse.data?.message || '获取玩家信息失败');
        }
      } catch (err) {
        console.error('获取玩家数据失败:', err);
        setError('获取玩家数据失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>加载玩家数据中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
        />
        <div style={{ marginTop: '20px' }}>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />}>返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="未找到玩家"
          description="找不到指定的玩家信息"
          type="warning"
          showIcon
        />
        <div style={{ marginTop: '20px' }}>
          <Link href="/">
            <Button icon={<ArrowLeftOutlined />}>返回首页</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 检查是否有封禁记录
  const hasBans = banData && banData.bans && banData.bans.length > 0;
  const activeBan = hasBans && banData.bans.find((ban: any) => 
    ban.is_permanent || (ban.end_date && new Date(ban.end_date) > new Date())
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/">
          <Button icon={<ArrowLeftOutlined />}>返回玩家列表</Button>
        </Link>
      </div>

      <Card>
        <Title level={2}>
          正在查看: {playerData.name || playerId}
          {activeBan && (
            <Tag color="red" style={{ marginLeft: '10px' }}>
              已封禁
            </Tag>
          )}
        </Title>

        <Row gutter={24} style={{ marginBottom: '30px' }}>
          <Col span={12}>
            <Card title="基本资料" bordered={false}>
              <p><strong>玩家名称:</strong> {playerData.name || '未知'}</p>
              <p><strong>Steam ID:</strong> {playerData.steamId || '未知'}</p>
              {playerData.lastSeen && (
                <p><strong>最后在线:</strong> {new Date(playerData.lastSeen).toLocaleString()}</p>
              )}
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="排名信息" bordered={false}>
              {eloData ? (
                <>
                  <Statistic 
                    title="ELO分数" 
                    value={eloData.elo} 
                    prefix={<TrophyOutlined />} 
                    valueStyle={{ color: '#3f8600' }}
                  />
                  <p style={{ marginTop: '10px' }}><strong>全球排名:</strong> #{eloData.rank}</p>
                </>
              ) : (
                <p>加载ELO分数中...</p>
              )}
            </Card>
          </Col>
        </Row>

        <Tabs defaultActiveKey="1">
          <TabPane tab={<span><HistoryOutlined />比赛历史</span>} key="1">
            <p>历史比赛数据加载中...</p>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <WarningOutlined />
                封禁记录
                {hasBans && <Tag color="red" style={{ marginLeft: '5px' }}>{banData.bans.length}</Tag>}
              </span>
            } 
            key="2"
          >
            {hasBans ? (
              <Table 
                dataSource={banData.bans.map((ban: any, index: number) => ({ ...ban, key: index }))}
                columns={[
                  {
                    title: '封禁原因',
                    dataIndex: 'reason',
                    key: 'reason',
                  },
                  {
                    title: '开始时间',
                    dataIndex: 'start_date',
                    key: 'start_date',
                    render: (date) => new Date(date).toLocaleString()
                  },
                  {
                    title: '结束时间',
                    dataIndex: 'end_date',
                    key: 'end_date',
                    render: (date, record: any) => record.is_permanent ? 
                      <Tag color="red">永久封禁</Tag> : 
                      (date ? new Date(date).toLocaleString() : '未知')
                  },
                  {
                    title: '来源',
                    dataIndex: 'source',
                    key: 'source',
                    render: (source) => {
                      const colorMap: Record<string, string> = {
                        'VAC': 'red',
                        'GameBan': 'orange',
                        '社区举报': 'purple',
                        '管理员封禁': 'blue'
                      };
                      return <Tag color={colorMap[source] || 'default'}>{source}</Tag>;
                    }
                  },
                  {
                    title: '状态',
                    key: 'status',
                    render: (_, record: any) => {
                      if (record.is_permanent) {
                        return <Tag color="red">永久有效</Tag>;
                      }
                      const endDate = record.end_date ? new Date(record.end_date) : null;
                      const now = new Date();
                      return endDate && endDate > now ? 
                        <Tag color="red">生效中</Tag> : 
                        <Tag color="green">已失效</Tag>;
                    }
                  }
                ]}
                pagination={false}
              />
            ) : (
              <Alert
                message="无封禁记录"
                description="该玩家目前没有任何封禁记录"
                type="success"
                showIcon
              />
            )}
          </TabPane>

          {eloData && eloData.history && (
            <TabPane tab={<span><TrophyOutlined />ELO历史</span>} key="3">
              <Timeline
                mode="left"
                items={eloData.history.map((item: any) => ({
                  label: new Date(item.date).toLocaleDateString(),
                  children: (
                    <p>
                      ELO: <strong>{item.elo}</strong>
                    </p>
                  )
                }))}
              />
            </TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  );
} 