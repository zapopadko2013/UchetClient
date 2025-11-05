import React, { useEffect, useState } from 'react';
import { Typography, Spin, Alert, List, Empty, message, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../hooks/useApiRequest';
import { useNavigate } from 'react-router-dom'; // Импортируем useNavigate

const { Title, Paragraph, Text } = Typography;

type News = {
  id: string;
  date: string;
  category: string;
  header: string;
  content: string;
};

type Category = {
  id: string;
  name: string;
};

interface NewsPageProps {
  onNewsClick: (news: News) => void;
}

const russianMonths = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const NewsPage: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const { t } = useTranslation();
  const navigate = useNavigate(); // Хук для программной навигации

  const { loading: newsLoading, error: newsError, sendRequest: sendNewsRequest } = useApiRequest();
  const { loading: categoriesLoading, error: categoriesError, sendRequest: sendCategoriesRequest } = useApiRequest();

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = russianMonths[date.getMonth()]; 
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

 const handleNewsClick = (item: News) => {
        navigate(`/news/${item.id}`); // Переход на новую страницу
    };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, newsData] = await Promise.all([
          sendCategoriesRequest(import.meta.env.VITE_API_URL + '/api/categories/getcategories', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
          }),
          sendNewsRequest(import.meta.env.VITE_API_URL + '/api/news/all', {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
          }),
        ]);

        const newsArray = newsData && (Array.isArray(newsData) ? newsData : Object.values(newsData));
        const categoriesArray = categoriesData && (Array.isArray(categoriesData) ? categoriesData : Object.values(categoriesData));

        if (newsArray && categoriesArray) {
          const newsWithCategoryNames = newsArray.map((item: any) => {
            const categoryObject = categoriesArray.find((cat: any) => cat.id == item.category);
            return {
              ...item,
              category: categoryObject ? categoryObject.name : t('notifications.uncategorized'),
            };
          });
          setNews(newsWithCategoryNames as News[]);
        }
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        message.error(t('notifications.apiError'));
      }
    };
    fetchData();
  }, []); // ИЗМЕНЕНИЕ: Убираем зависимости

  if (newsLoading || categoriesLoading) {
    /* return <Spin tip={t('notifications.loading')} style={{ display: 'block', margin: 'auto' }} />; */
    return (
     /*  <div style={{ textAlign: 'center', padding: '50px' }}> */
      <div>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Typography.Text>{t('notifications.loading')}</Typography.Text>
        </Space>
      </div>
    );
  }

  if (newsError || categoriesError) {
    return <Alert message={t('notifications.apiError')} type="error" showIcon />;
  }

  if (news.length === 0) {
    return <Empty description={t('notifications.noNews')} />;
  }

  return (
    <div>
      <Title level={2}>{t('notifications.title')}</Title>
      <List
        itemLayout="vertical"
        dataSource={news}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            onClick={() => handleNewsClick(item)}
            style={{ cursor: 'pointer' }}
          >
            <List.Item.Meta
              
              title={<Text>{item.header}</Text>}
              description={<Text type="secondary">{formatDate(item.date)}</Text>}
            />
          </List.Item>
        )}
      />
    </div>
  );
};

export default NewsPage;