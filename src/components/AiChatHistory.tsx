import React, { useEffect, useState } from "react";
import { List, Typography, Card, Tag, Skeleton, Collapse, Divider, Empty, message, Space, Table, Avatar } from 'antd';
import { 
  ClockCircleOutlined, 
  MessageOutlined, 
  RobotOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  HistoryOutlined 
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../hooks/useApiRequest';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;

// --- Интерфейсы данных (как в AiChat) ---
interface StockItem {
  name: string;
  brand: string;
  category: string;
  stock: number;
  price: number | string;
  purchaseprice: number | string;
  status: string;
  point: string;
}


interface SalesItem {
  name: string;
  quantity: number;
  sum: number | string;
  profit: number | string;
  cost: number | string;
  date: string;
}


interface ChatMessage {
  step: number;
  question: string;
  answer: any; 
  timestamp: string;
  isSupportRequest?: boolean;
  specialistAnswer?: string;
  answeredAt?: string;
}

interface ChatSession {
  id: string;
  updated_at: string;
  messages: ChatMessage[];
}

export default function AiChatHistory() {
  const { t, i18n } = useTranslation();
  const [history, setHistory] = useState<ChatSession[]>([]);
  const { loading, sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  // --- Вспомогательные функции (Копия логики из AiChat) ---
  
  const getBotText = (answer: any): string => {
    if (!answer) return "";
    if (typeof answer === 'string') return answer;
    if (typeof answer === 'object') return answer.text || "";
    return "";
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const formatDate = (str: string) => {
      const [y, m, d] = str.split("-");
      return new Date(+y, +m - 1, +d).toLocaleDateString(locale);
    };
    return dateStr.includes(" - ") ? dateStr.split(" - ").map(formatDate).join(" - ") : formatDate(dateStr);
  };

  const formatDateLabel = (date: string) => {
    return new Date(date).toLocaleString(i18n.language, {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  // --- Колонки Таблиц (Копия из AiChat) ---

  const stockColumns: ColumnsType<StockItem> = [
    {
      title: t('aiChat.status'), // 'Статус'
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        let color = 'default';
        let label = status;

        if (status.includes('Дефицит')) { color = 'error'; label = t('aiChat.deficit'); }
        else if (status.includes('Много')) { color = 'success'; label = t('aiChat.surplus'); }
        else if (status.includes('Норма')) { label = t('aiChat.normal'); }

        return <Tag color={color}>{label.replace(/[⚠️📦✅]\s?/, '')}</Tag>;
      },
    },
    {
      title: t('aiChat.product'), // 'Товар'
      key: 'product',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.brand} | {record.category}</Text>
        </div>
      ),
    },
    {
      title: t('aiChat.warehouse'), // 'Склад'
      dataIndex: 'point',
      key: 'point',
      render: (text: string) => <Text style={{ fontSize: '11px' }}>{text?.replace(/Склад точки |Point warehouse /g, '')}</Text>,
    },
    {
      title: t('aiChat.stockQty'), // 'Остаток'
      dataIndex: 'stock',
      key: 'stock',
      align: 'center',
      render: (stock) => <b>{stock}</b>,
    },
    {
        title: t('aiChat.price'), // 'Розница'
        dataIndex: 'price',
        key: 'price',
        align: 'right',
        render: (val) => <b>{Number(val).toLocaleString(i18n.language)}</b>,
    },
  ];

  const salesColumns: ColumnsType<SalesItem> = [
    {
      title: t('aiChat.product'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('aiChat.qty'), // 'Кол-во'
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: t('aiChat.costPrice'), // 'Себестоимость'
      dataIndex: 'cost',
      key: 'cost',
      align: 'right',
      render: (val) => <b>{Number(val).toLocaleString(i18n.language)}</b>,
    },
    {
      title: t('aiChat.sum'), 
      dataIndex: 'sum',
      key: 'sum',
      align: 'right',
      render: (val) => <b>{Number(val).toLocaleString(i18n.language)}</b>,
    },
    {
      title: t('aiChat.profit'), // 'Прибыль'
      dataIndex: 'profit',
      key: 'profit',
      align: 'right',
      render: (val) => <Text style={{ color: '#52c41a' }}>{Number(val).toLocaleString(i18n.language)}</Text>,
    },
  ];

  // --- Загрузка данных ---

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await sendRequest(`${API_URL}/api/chatroute/history`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}` },
        });
        setHistory(data || []);
      } catch (err) {
        message.error(t('aiChat.errorLoading'));
      }
    };
    fetchHistory();
  }, [API_URL, sendRequest, t]);

  if (loading) return <Skeleton active title paragraph={{ rows: 10 }} />;
  if (history.length === 0) return <Empty description={t('aiChat.noHistory')} />;

  // --- Сборка Collapse Items ---

  const collapseItems = history.map((session) => ({
    key: session.id,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '95%', alignItems: 'center' }}>
        <Space>
          <MessageOutlined />
          <Text strong>{session.messages[0]?.question.slice(0, 35)}...</Text>
          {session.messages.some(m => m.isSupportRequest) && <Tag color="gold">{t('aiChat.supportTag')}</Tag>}
        </Space>
        <Text type="secondary" style={{ fontSize: '11px' }}>{formatDateLabel(session.updated_at)}</Text>
      </div>
    ),
    children: (
      <List
        itemLayout="vertical"
        dataSource={session.messages}
        renderItem={(msg) => {
          const isObj = typeof msg.answer === 'object';
          return (
            <div key={msg.step} style={{ marginBottom: '20px' }}>
              {/* Вопрос */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <Text italic style={{ background: '#f0f5ff', padding: '6px 12px', borderRadius: '8px', flex: 1 }}>
                  {msg.question}
                </Text>
              </div>
              
              {/* Ответ AI */}
              <div style={{ display: 'flex', gap: '10px', paddingLeft: '24px', marginBottom: '8px' }}>
                <Avatar size="small" icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    whiteSpace: 'pre-wrap', backgroundColor: '#f9f9f9', padding: '10px', 
                    borderRadius: '8px', border: '1px solid #d9d9d9' 
                  }}>
                    {getBotText(msg.answer)}
                  </div>

                  {/* ТАБЛИЦА ОСТАТКОВ */}
                  {isObj && msg.answer?.dataType === 'stock' && msg.answer?.stockData?.length > 0 && (
                    <Table 
                      dataSource={msg.answer.stockData} 
                      columns={stockColumns} 
                      size="small" pagination={false} bordered
                      style={{ marginTop: 8 }} rowKey={(r) => r.name + r.point}
                      scroll={{ x: true }}
                    />
                  )}

                  {/* ТАБЛИЦА ПРОДАЖ */}
                  {isObj && msg.answer?.dataType === 'sales' && msg.answer?.salesData?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                       {msg.answer.salesData[0]?.date && (
                         <Tag color="processing" style={{ marginBottom: 4 }}>
                           📅 {t('aiChat.period')}: {formatDisplayDate(msg.answer.salesData[0].date)}
                         </Tag>
                       )}
                       <Table 
                        dataSource={msg.answer.salesData} 
                        columns={salesColumns} 
                        size="small" pagination={false} bordered
                        rowKey={(r, i) => r.name + i} scroll={{ x: true }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Техподдержка */}
              {msg.isSupportRequest && (
                <div style={{ paddingLeft: '50px', marginTop: '8px' }}>
                  {msg.specialistAnswer ? (
                    <Card size="small" style={{ backgroundColor: '#fffbe6' }}>
                      <Text strong><CheckCircleOutlined /> {t('aiChat.specialistAnswer')}</Text>
                      <br /><Text>{msg.specialistAnswer}</Text>
                    </Card>
                  ) : (
                    <Tag color="orange" icon={<ClockCircleOutlined />}>{t('aiChat.waitingAnswer')}</Tag>
                  )}
                </div>
              )}
              <Divider dashed style={{ margin: '12px 0' }} />
            </div>
          );
        }}
      />
    )
  }));

  return (
    <div style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
      <Title level={4}>
        <HistoryOutlined /> {t('aiChat.historyTitle')}
      </Title>
      <Collapse accordion items={collapseItems} expandIconPosition="end" />
    </div>
  );
}
