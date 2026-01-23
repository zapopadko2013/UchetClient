import React, { useEffect, useState } from "react";
import { List, Typography, Card, Tag, Skeleton, Collapse, Divider, Empty, message, Space, Table, Avatar,Button } from 'antd';
import { 
  ClockCircleOutlined, 
  MessageOutlined, 
  RobotOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  HistoryOutlined , PlayCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../hooks/useApiRequest';
import type { ColumnsType } from 'antd/es/table';
import styles from './AiChatHistory.module.css';

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
          <div className={styles.productName}>{record.name}</div>
          <Text type="secondary" className={styles.dateLabel}>{record.brand} | {record.category}</Text>
        </div>
      ),
    },
    {
      title: t('aiChat.warehouse'), // 'Склад'
      dataIndex: 'point',
      key: 'point',
      render: (text: string) => <Text className={styles.dateLabel}>{text?.replace(/Склад точки |Point warehouse /g, '')}</Text>,
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
      render: (val) => <Text className={styles.profitText}>{Number(val).toLocaleString(i18n.language)}</Text>,
    },
  ];

  // --- Загрузка данных ---

  //////23.01.2026

  const fetchHistory = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/chatroute/history`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}` },
      });
      setHistory(data || []);
    } catch (err) {
      // Не будем спамить ошибкой при фоновом обновлении
      console.error("Error updating history");
    }
  };

  useEffect(() => {
    fetchHistory(); // Начальная загрузка

    const handleNewMessage = () => {
      fetchHistory(); // Перезагружаем список, когда в чате что-то произошло
    };

    window.addEventListener('aiMessageReceived', handleNewMessage);
    return () => window.removeEventListener('aiMessageReceived', handleNewMessage);
  }, [API_URL, sendRequest]); // Убираем t из зависимостей, чтобы не перезагружать при смене языка лишний раз

 /*  useEffect(() => {
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
  }, [API_URL, sendRequest, t]); */
  ///////23.01.2026

  if (loading) return <Skeleton active title paragraph={{ rows: 10 }} />;
  if (history.length === 0) return <Empty description={t('aiChat.noHistory')} />;

  // --- Сборка Collapse Items ---

  const collapseItems = history.map((session) => ({
    key: session.id,
    label: (
      <div className={styles.sessionHeader}>
        <Space>
          <MessageOutlined />
          <Text strong>{session.messages[0]?.question.slice(0, 35)}...</Text>
          {session.messages.some(m => m.isSupportRequest) && <Tag color="gold">{t('aiChat.supportTag')}</Tag>}
        </Space>
        <Space>
        <Button 
            type="primary" 
            size="small"
            ghost
            icon={<PlayCircleOutlined />} 
            onClick={(e) => {
                e.stopPropagation();
                // Генерируем событие
                const event = new CustomEvent('continueAiSession', { detail: session });
                window.dispatchEvent(event);
                //message.success(t('aiChat.sessionRestored') || 'Тема перенесена в чат');
            }}
        >
            {t('aiChat.continue') || 'Продолжить'}
        </Button>
        <Text type="secondary" className={styles.dateLabel}>{formatDateLabel(session.updated_at)}</Text>
    </Space>
        {/* <Text type="secondary" className={styles.dateLabel}>{formatDateLabel(session.updated_at)}</Text>
      */} 
      </div>
    ),
    children: (
      <List
        itemLayout="vertical"
        dataSource={session.messages}
        renderItem={(msg) => {
          const isObj = typeof msg.answer === 'object';
          return (
            <div key={msg.step} className={styles.messageWrapper}>
              {/* Вопрос */}
              <div className={styles.questionBox}>
                <Avatar size="small" icon={<UserOutlined />} className={styles.userAvatar} />
                <Text italic className={styles.questionText}>
                  {msg.question}
                </Text>
              </div>
              
              {/* Ответ AI */}
              <div className={styles.answerBox}>
                <Avatar size="small" icon={<RobotOutlined />} className={styles.botAvatar} />
                <div className={styles.answerContent}>
                  <div className={styles.botTextBubble}>
                    {getBotText(msg.answer)}
                  </div>

                  {/* ТАБЛИЦА ОСТАТКОВ */}
                  {isObj && msg.answer?.dataType === 'stock' && msg.answer?.stockData?.length > 0 && (
                    <Table 
                      dataSource={msg.answer.stockData} 
                      columns={stockColumns} 
                      size="small" 
                      pagination={{ pageSize: 5, size: 'small' }}  
                      bordered
                      className={styles.tableContainer} rowKey={(r) => r.name + r.point}
                      scroll={{ x: true }}
                    />
                  )}

                  {/* ТАБЛИЦА ПРОДАЖ */}
                  {isObj && msg.answer?.dataType === 'sales' && msg.answer?.salesData?.length > 0 && (
                    <div className={styles.tableContainer}>
                       {msg.answer.salesData[0]?.date && (
                         <Tag color="processing" className={styles.periodTag}>
                           📅 {t('aiChat.period')}: {formatDisplayDate(msg.answer.salesData[0].date)}
                         </Tag>
                       )}
                       <Table 
                        dataSource={msg.answer.salesData} 
                        columns={salesColumns} 
                        size="small"
                        pagination={{ pageSize: 5, size: 'small' }} 
                         bordered
                        rowKey={(r, i) => r.name + i} scroll={{ x: true }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Техподдержка */}
              {msg.isSupportRequest && (
                <div className={styles.supportSection}>
                  {msg.specialistAnswer ? (
                    <Card size="small" className={styles.specialistCard}>
                      <Text strong><CheckCircleOutlined /> {t('aiChat.specialistAnswer')}</Text>
                      <br /><Text>{msg.specialistAnswer}</Text>
                    </Card>
                  ) : (
                    <Tag color="orange" icon={<ClockCircleOutlined />}>{t('aiChat.waitingAnswer')}</Tag>
                  )}
                </div>
              )}
              <Divider dashed className={styles.divider} />
            </div>
          );
        }}
      />
    )
  }));

  return (
    <div className={styles.container}>
      <Title level={4}>
        <HistoryOutlined /> {t('aiChat.historyTitle')}
      </Title>
      <Collapse accordion items={collapseItems} expandIconPosition="end" />
    </div>
  );
}
