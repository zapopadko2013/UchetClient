import React, { useEffect, useState } from 'react';
import { Typography, Card, Button, Input, List, Tag, message, Space, Badge, Alert } from 'antd'; // Добавил Alert
import { useTranslation } from 'react-i18next';
import { SendOutlined, QuestionCircleOutlined, MessageOutlined } from '@ant-design/icons';
import useApiRequest from '../../hooks/useApiRequest';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography; // Добавил Paragraph

export default function SupportAdminPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const { loading, sendRequest } = useApiRequest();
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchRequests = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/chatroute/admin/support-requests`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setRequests(data);
    } catch (err) {
      message.error("Ошибка загрузки запросов");
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSendReply = async (sessionId: string, step: number, targetCompanyId: any) => {
  const text = replyText[`${sessionId}-${step}`];
  if (!text) return message.warning("Введите текст ответа");

  try {
    await sendRequest(`${API_URL}/api/chatroute/admin/reply`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` 
      },
      // Теперь мы передаем конкретный ID компании, которой принадлежит сессия
      body: JSON.stringify({ 
        sessionId, 
        step, 
        answerText: text, 
        companyId: targetCompanyId 
      })
    });
    message.success("Ответ отправлен");
    setReplyText(prev => ({ ...prev, [`${sessionId}-${step}`]: '' }));
    fetchRequests(); 
  } catch (err) {
    message.error("Ошибка при отправке");
  }
};

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={3}><QuestionCircleOutlined /> Вопросы по программе</Title>
      
      <List
        dataSource={requests}
        loading={loading}
        renderItem={(session) => (
          <Card 
            key={session.sessionId} 
            style={{ marginBottom: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            title={<span><MessageOutlined /> Компания: {session.company}</span>}
            extra={<Text type="secondary">{new Date(session.date).toLocaleString()}</Text>}
          >
            <List
              dataSource={session.questions}
              renderItem={(q: any) => (
                <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '15px', marginBottom: '15px' }}>
                  <Space align="start">
                    <Badge status={q.specialistAnswer ? "success" : "processing"} />
                    <Text strong>Вопрос (Шаг {q.step}):</Text>
                  </Space>
                  
                  {/* ИСПРАВЛЕНО: используем q.question вместо q.text */}
                  <Paragraph style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginTop: '8px' }}>
                    {q.question}
                  </Paragraph>
                  
                  {q.specialistAnswer ? (
                    <Alert 
                      message={<Text><b>Ответ:</b> {q.specialistAnswer}</Text>} 
                      type="success" 
                      showIcon 
                    />
                  ) : (
                    <div style={{ marginTop: '12px' }}>
                      <Space.Compact style={{ width: '100%' }}>
                        <TextArea 
                          placeholder="Введите ваш ответ для пользователя..." 
                          autoSize={{ minRows: 3, maxRows: 6 }}
                          value={replyText[`${session.sessionId}-${q.step}`]}
                          onChange={(e) => setReplyText({ ...replyText, [`${session.sessionId}-${q.step}`]: e.target.value })}
                        />
                        <Button 
                          type="primary" 
                          icon={<SendOutlined />} 
                          onClick={() => handleSendReply(session.sessionId, q.step, session.companyId)}
                          loading={loading}
                        >
                          Ответить
                        </Button>
                      </Space.Compact>
                    </div>
                  )}
                </div>
              )}
            />
          </Card>
        )}
      />
    </div>
  );
}
