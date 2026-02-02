import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Spin, Alert, Empty, Space } from 'antd';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../hooks/useApiRequest';
import { marked } from 'marked';
import styles from './NewsDetail.module.css';

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
  const { id } = useParams<{ id: string }>();
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
        if (data) setNews(data[0]);
        else setNews(null);
      })
      .catch(err => console.error(err));
  }, [id, sendRequest]);

  // --- Используем marked для преобразования Markdown в HTML ---
  const contentHtml = useMemo(() => {
    if (!news) return '';
    return marked(news.content, { breaks: true }); // breaks: true — для перевода строк в <br>
  }, [news]);

  if (loading) {
    return (
      <Space direction="vertical" align="center">
        <Spin size="large" />
        <Typography.Text>{t('newsDetail.loading')}</Typography.Text>
      </Space>
    );
  }

  if (error) {
    return <Alert message={t('newsDetail.errorTitle')} description={error} type="error" showIcon />;
  }

  if (!news) {
    return <Empty description={t('newsDetail.noContentAvailable')} />;
  }

  return (
    <div className={styles.container}>
      <Title level={2}>{news.header}</Title>
      <Paragraph type="secondary">{formatDate(news.date)}</Paragraph>

      {/* Рендерим Markdown через dangerouslySetInnerHTML */}
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </div>
  );
};

export default NewsDetail;
