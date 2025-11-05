import React, { useEffect, useState } from 'react';
import { Typography, Spin, Alert, Empty, Space } from 'antd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../hooks/useApiRequest';

const { Title, Paragraph } = Typography;

const russianMonths = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

interface NewsItem {
  id: string;
  header: string;
  date: string;
  category: string;
  content: string;
}

const NewsDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Получаем 'id' из URL
  const { t } = useTranslation();
  const { loading, error, sendRequest } = useApiRequest<NewsItem>();
  const [news, setNews] = useState<NewsItem | null>(null);

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = russianMonths[date.getMonth()]; 
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  useEffect(() => {
    if (!id) {
      setNews(null);
      return;
    }

    sendRequest(
      import.meta.env.VITE_API_URL + `/api/news/byId?id=${id}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
      }
    )
      .then(data => {
          if (data) {
            setNews(data[0]);
          } else {
            setNews(null);
          }
      })
      .catch(err => {
        console.error('Error loading data:', err);
      });
      
  }, [id, sendRequest]);

  // Возвращаем условные рендеры
  if (loading) {
    /* return <Spin tip={t('newsDetail.loading')} style={{ display: 'block', margin: 'auto' }} />; */
    <Space direction="vertical" align="center">
          <Spin size="large" />
          <Typography.Text>{t('newsDetail.loading')}</Typography.Text>
    </Space>
  }

  if (error) {
    return <Alert message={t('newsDetail.errorTitle')} description={error} type="error" showIcon />;
  }

  if (!news) {
    return <Empty description={t('newsDetail.noContentAvailable')} />;
  }

  return (
    <div>
      <Title level={2}>{news.header}</Title>
      <Paragraph type="secondary">{formatDate(news.date)}</Paragraph>
      <Paragraph>{news.content}</Paragraph>
    </div>
  );
};

export default NewsDetail;
