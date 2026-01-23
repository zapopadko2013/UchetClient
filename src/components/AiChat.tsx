import React, { useState, useEffect, useRef } from "react";
import { Table, Input, Button, Tag, Spin, Avatar, List, Typography } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid'; // Импортируем генератор
import styles from './AiChat.module.css';

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

interface AiChatProps {
  initialSession?: any; // Принимаем сессию
}

export default function AiChat({ initialSession }: AiChatProps) {
  const { t, i18n } = useTranslation(); // 2. Инициализация t
  //const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  //const [sessionId] = useState<string>(uuidv4());
 const [sessionId, setSessionId] = useState<string>(
    initialSession?.id || uuidv4()
  );

  // Инициализируем сообщения сразу при создании компонента
  const [messages, setMessages] = useState<Message[]>(() => {
    if (initialSession?.messages) {
      return initialSession.messages.flatMap((m: any) => [
        { role: 'user' as const, text: m.question },
        { 
          role: 'ai' as const, 
          text: typeof m.answer === 'string' ? m.answer : m.answer?.text,
          dataType: m.answer?.dataType,
          stockData: m.answer?.stockData,
          salesData: m.answer?.salesData 
        }
      ]);
    }
    return [];
  });
  

  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);


  //////22.01.2026

/*   useEffect(() => {
    // Функция-обработчик события "продолжить сессию"
    const handleContinueSession = (event: any) => {
      const session = event.detail;
      if (!session) return;

      setSessionId(session.id);
      
      // Преобразуем сообщения из истории в формат чата
      const restoredMessages: Message[] = session.messages.flatMap((m: any) => [
        { role: 'user', text: m.question },
        { 
          role: 'ai', 
          text: typeof m.answer === 'string' ? m.answer : m.answer?.text,
          dataType: m.answer?.dataType,
          stockData: m.answer?.stockData,
          salesData: m.answer?.salesData 
        }
      ]);
      
      setMessages(restoredMessages);
    };

    // Подписываемся на событие
    window.addEventListener('continueAiSession', handleContinueSession);
    return () => window.removeEventListener('continueAiSession', handleContinueSession);
  }, []); */


   useEffect(() => {
    if (initialSession) {
      setSessionId(initialSession.id);
      const restored = initialSession.messages.flatMap((m: any) => [
        { role: 'user' as const, text: m.question },
        { 
          role: 'ai' as const, 
          text: typeof m.answer === 'string' ? m.answer : m.answer?.text,
          dataType: m.answer?.dataType,
          stockData: m.answer?.stockData,
          salesData: m.answer?.salesData 
        }
      ]);
      setMessages(restored);
    }
  }, [initialSession]);

  //////22.01.2026


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
          <div className={styles.productName}>{record.name}</div>
          <Text type="secondary" className={styles.smallText}>{record.brand} | {record.category}</Text>
        </div>
      ),
    },
    {
      title: t('aiChat.warehouse'), // 'Склад'
      dataIndex: 'point',
      key: 'point',
      render: (text: string) => <Text className={styles.smallText}>{text?.replace(/Склад точки |Point warehouse /g, '')}</Text>,
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
      render: (val) => <Text className={styles.profitText}>{Number(val).toLocaleString(i18n.language)}</Text>,
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
        body: JSON.stringify({ message: input, lang: i18n.language, sessionId: sessionId }),
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

      /////23.01.2026

     
    // Мы можем отправить либо всю сессию, либо просто сигнал "обновись"
    window.dispatchEvent(new CustomEvent('aiMessageReceived', { 
        detail: { sessionId: sessionId } 
    }));

      /////23.01.2026


    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: t('aiChat.serverError') }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.chatBox}>
        <List
          itemLayout="horizontal"
          dataSource={messages}
          renderItem={(msg) => (
            <List.Item 
            className={styles.messageRow} 
            style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div 
              className={styles.messageContent} 
              style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
              >
                <Avatar 
                  icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                  className={msg.role === 'user' ? styles.userAvatar : styles.aiAvatar}
                />
                <div 
               className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}
                >
                  <div>{msg.text}</div>
                  
                  {msg.dataType === 'stock' && msg.stockData && (
                    <Table 
                      dataSource={msg.stockData} 
                      columns={columns} 
                      pagination={{ pageSize: 5, size: 'small' }} 
                      size="small" 
                      className={styles.chatTable}
                      bordered
                      rowKey={(record) => record.name + record.point}
                    />
                  )}

                  {msg.dataType === 'sales' && msg.salesData && (
                    <div className={styles.chatTable}>
                        {msg.salesData[0]?.date && (
                        <div className={styles.periodBadge}>
                            <Text strong className={styles.periodText}>
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
          <div className={styles.loadingArea}>
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

     <div className={styles.inputArea}>
  <div className={styles.textAreaWrapper}>
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
      
      disabled={isLoading}
    />
    <Button 
      type="primary" 
      icon={<SendOutlined />} 
      onClick={sendMessage}
      loading={isLoading}
      // Убираем фиксированный height, чтобы кнопка была квадратной и аккуратной
      className={styles.sendButton}
    />
  </div>
  <Text type="secondary" className={styles.inputHint}>
    {i18n.language === 'ru' ? 'Shift + Enter для новой строки' : 'Shift + Enter for new line'}
  </Text>
</div>

    </div>
  );
}

