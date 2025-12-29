import React, { useState, useEffect, useRef } from "react";
import { Table, Input, Button, Tag, Spin, Avatar, List, Typography } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "";
  
  // Если это период (содержит " - "), разбиваем его и форматируем каждую часть
  if (dateStr.includes(" - ")) {
    return dateStr
      .split(" - ")
      .map(part => part.split("-").reverse().join("."))
      .join(" - ");
  }
  
  // Если это одиночная дата (YYYY-MM-DD -> DD.MM.YYYY)
  return dateStr.split("-").reverse().join(".");
};

  const columns: ColumnsType<StockItem> = [
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color = status.includes('Дефицит') ? 'error' : (status.includes('Много') ? 'success' : 'default');
        return <Tag color={color}>{status.replace('⚠️ ', '').replace('📦 ', '').replace('✅ ', '')}</Tag>;
      },
    },
    {
      title: 'Товар',
      key: 'product',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}</div>
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.brand} | {record.category}</Text>
        </div>
      ),
    },
    {
      title: 'Склад',
      dataIndex: 'point',
      key: 'point',
      render: (text: string) => <Text style={{ fontSize: '11px' }}>{text?.replace('Склад точки ', '')}</Text>,
    },
    {
      title: 'Остаток',
      dataIndex: 'stock',
      key: 'stock',
      align: 'center',
      render: (stock) => <b>{stock}</b>,
    },
    {
      title: 'Закуп', 
      dataIndex: 'purchaseprice',
      key: 'purchaseprice',
      align: 'right',
      render: (val) => <Text type="secondary">{Number(val).toLocaleString()}</Text>,
    },
    {
      title: 'Розница',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (val) => <b>{Number(val).toLocaleString()}</b>,
    },
  ];

  ////

  const salesColumns: ColumnsType<SalesItem> = [
    {
      title: 'Товар',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <b>{text}</b>,
    },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
     {
      title: 'Себестоимость',
      dataIndex: 'cost',
      key: 'cost',
      align: 'right',
      render: (val) => <b>{Number(val).toLocaleString()} </b>,
    },
    {
      title: 'Сумма реализации',
      dataIndex: 'sum',
      key: 'sum',
      align: 'right',
      render: (val) => <b>{Number(val).toLocaleString()} </b>,
    },
    {
      title: 'Прибыль',
      dataIndex: 'profit',
      key: 'profit',
      align: 'right',
      render: (val) => <Text style={{ color: '#52c41a' }}>{Number(val).toLocaleString()}</Text>,
    },
    {
        title: 'Период',
        dataIndex: 'date',
        key: 'date',
        render: (date) => <Text type="secondary" style={{ fontSize: '10px' }}>{date}</Text>
    }
  ];

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/apichat/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}` 
        },
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();
      
      if (!response.ok && response.status === 401) {
        setMessages(prev => [...prev, { role: 'ai', text: '❌ Сессия истекла. Перезайдите.' }]);
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
      setMessages(prev => [...prev, { role: 'ai', text: 'Ошибка сервера.' }]);
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

                  {/* Таблица продаж (Добавлено) */}
                  {msg.dataType === 'sales' && msg.salesData && (
  <div style={{ marginTop: 10 }}>
    {/* Вывод периода сверху таблицы */}
    {msg.salesData[0]?.date && (
      <div style={{ 
        marginBottom: 8, 
        padding: '4px 8px', 
        backgroundColor: '#e6f7ff', 
        borderRadius: '4px',
        display: 'inline-block',
        border: '1px solid #91d5ff'
      }}>
        <Text strong style={{ fontSize: '12px', color: '#0050b3' }}>
          📅 Период: {formatDisplayDate(msg.salesData[0].date)}
        </Text>
      </div>
    )}
    
    <Table 
      dataSource={msg.salesData} 
      columns={salesColumns.filter(col => col.key !== 'date')} // Убираем колонку даты из самой таблицы
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
    <Text type="secondary">Думаю...</Text>
  </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div style={inputAreaStyle}>
        <Input.Search
          placeholder="Спроси про остатки..."
          enterButton={<SendOutlined />}
          size="large"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSearch={sendMessage}
          loading={isLoading}
        />
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

const inputAreaStyle: React.CSSProperties = {
  padding: '16px',
  borderTop: '1px solid #f0f0f0',
};