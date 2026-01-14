import React, { useState, useEffect, useRef } from "react";
import { Table, Input, Button, Tag, Spin, Avatar, List, Typography } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const { TextArea } = Input;

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

interface Message {
  role: 'user' | 'ai';
  text: string;
  dataType?: 'stock' | 'sales' | 'none';
  stockData?: StockItem[];
  salesData?: SalesItem[];
}

export default function AiChat() {
  const { t, i18n } = useTranslation(); // 2. Инициализация t
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Форматирование дат в зависимости от текущего языка
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    
    const formatDate = (str: string) => {
        const [y, m, d] = str.split("-");
        return new Date(+y, +m - 1, +d).toLocaleDateString(locale);
    };

    if (dateStr.includes(" - ")) {
      return dateStr.split(" - ").map(formatDate).join(" - ");
    }
    return formatDate(dateStr);
  };

  // Колонки остатков
  const columns: ColumnsType<StockItem> = [
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

  // Колонки продаж
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

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      //const response = await fetch(`${API_URL}/apichat/chat`, {
       const response = await fetch(`${API_URL}/api/chatroute/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'Accept-Language': i18n.language // Передаем язык на бэкенд
        },
        body: JSON.stringify({ message: input, lang: i18n.language }),
      });
      const data = await response.json();
      
      if (!response.ok && response.status === 401) {
        setMessages(prev => [...prev, { role: 'ai', text: t('aiChat.sessionExpired') }]);
        return;
      }
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.answer, 
        dataType: data.dataType,
        stockData: data.stockData,
        salesData: data.salesData 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: t('aiChat.serverError') }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={chatBoxStyle}>
        <List
          itemLayout="horizontal"
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item style={{ border: 'none', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', padding: '8px 0' }}>
              <div style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start', maxWidth: '90%' }}>
                <Avatar 
                  icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                  style={{ backgroundColor: msg.role === 'user' ? '#1677ff' : '#52c41a', flexShrink: 0 }} 
                />
                <div style={{
                  margin: msg.role === 'user' ? '0 12px 0 0' : '0 0 0 12px',
                  padding: '10px 15px',
                  borderRadius: '12px',
                  backgroundColor: msg.role === 'user' ? '#e6f4ff' : '#f5f5f5',
                  border: msg.role === 'user' ? '1px solid #91caff' : '1px solid #d9d9d9'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                  
                  {msg.dataType === 'stock' && msg.stockData && (
                    <Table 
                      dataSource={msg.stockData} 
                      columns={columns} 
                      pagination={{ pageSize: 5, size: 'small' }} 
                      size="small" 
                      style={{ marginTop: 10 }}
                      bordered
                      rowKey={(record) => record.name + record.point}
                    />
                  )}

                  {msg.dataType === 'sales' && msg.salesData && (
                    <div style={{ marginTop: 10 }}>
                        {msg.salesData[0]?.date && (
                        <div style={{ marginBottom: 8, padding: '4px 8px', backgroundColor: '#e6f7ff', borderRadius: '4px', display: 'inline-block', border: '1px solid #91d5ff' }}>
                            <Text strong style={{ fontSize: '12px', color: '#0050b3' }}>
                            📅 {t('aiChat.period')}: {formatDisplayDate(msg.salesData[0].date)}
                            </Text>
                        </div>
                        )}
                        <Table 
                        dataSource={msg.salesData} 
                        columns={salesColumns} 
                        pagination={{ pageSize: 5, size: 'small' }} 
                        size="small" 
                        bordered
                        rowKey={(record, index) => record.name + index}
                        scroll={{ x: 400 }}
                        />
                    </div>
                  )}
                </div>
              </div>
            </List.Item>
          )}
        />
        {isLoading && (
          <div style={{ textAlign: 'left', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Spin size="small" /> 
            <Text type="secondary">{t('aiChat.thinking')}</Text>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* <div style={inputAreaStyle}>
        <Input.Search
          placeholder={t('aiChat.placeholder')}
          enterButton={<SendOutlined />}
          size="large"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSearch={sendMessage}
          loading={isLoading}
        />
      </div> */}

     <div style={inputAreaStyle}>
  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
    <TextArea
      placeholder={t('aiChat.placeholder')}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      // autoSize управляет ростом. minRows: 1 гарантирует, что он начнется с одной строки
      autoSize={{ minRows: 5, maxRows: 10 }} 
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }}
      style={{ 
        borderRadius: '8px',
        paddingRight: '12px' 
      }}
      disabled={isLoading}
    />
    <Button 
      type="primary" 
      icon={<SendOutlined />} 
      onClick={sendMessage}
      loading={isLoading}
      // Убираем фиксированный height, чтобы кнопка была квадратной и аккуратной
      style={{ 
        flexShrink: 0, 
        borderRadius: '8px',
        height: '32px' // Высота одной строки TextArea
      }}
    />
  </div>
  <Text type="secondary" style={{ fontSize: '10px', marginTop: '4px', display: 'block', marginLeft: '4px' }}>
    {i18n.language === 'ru' ? 'Shift + Enter для новой строки' : 'Shift + Enter for new line'}
  </Text>
</div>

    </div>
  );
}

// Стили
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#fff',
};

const chatBoxStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
};

/* const inputAreaStyle: React.CSSProperties = {
  padding: '16px',
  borderTop: '1px solid #f0f0f0',
}; */

const inputAreaStyle: React.CSSProperties = {
  padding: '16px',
  borderTop: '1px solid #f0f0f0',
  backgroundColor: '#fff' // Чтобы текст под инпутом не просвечивал
};