import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  Spin,
  Typography,
  Empty,
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../hooks/useApiRequest';

type Notification = {
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

const russianMonths = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const NotificationDrawer: React.FC<{ visible: boolean; onClose: () => void; onNewsClick: (item: Notification) => void }> = ({ visible, onClose, onNewsClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { t } = useTranslation();

  const { loading: newsLoading, error: newsError, sendRequest: sendNewsRequest } = useApiRequest();
  const { loading: categoriesLoading, error: categoriesError, sendRequest: sendCategoriesRequest } = useApiRequest();

  useEffect(() => {
    if (visible) {
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

          if (categoriesData && Array.isArray(categoriesData)) {
            setCategories(categoriesData);
          } else {
            console.error('Ошибка: данные категорий не являются массивом.');
            return;
          }

          if (newsData && Array.isArray(newsData)) {
            const notificationsWithCategoryNames = newsData.map((notification: Notification) => {
              const categoryObject = categoriesData.find(cat => cat.id == notification.category);
              return {
                ...notification,
                category: categoryObject ? categoryObject.name : t('notifications.uncategorized'),
              };
            });
            setNotifications(notificationsWithCategoryNames);
          } else {
            setNotifications([]);
          }
        } catch (err) {
          console.error('Ошибка загрузки данных:', err);
          message.error(t('notifications.apiError'));
        }
      };
      fetchData();
    }
  }, [visible]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = russianMonths[date.getMonth()]; 
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  return (
  <Drawer
    title={t('notifications.title')}
    placement="right"
    onClose={onClose}
    open={visible}
    width={360}
  >
    <Spin spinning={newsLoading || categoriesLoading} tip={t('notifications.loading')}>
      {(newsError || categoriesError) ? (
        <Empty description={t('notifications.apiError')} />
      ) : notifications.length === 0 ? (
        <Empty description={t('notifications.noNews')} />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              onClick={() => onNewsClick(item)}
              style={{ cursor: 'pointer' }}
            >
              <List.Item.Meta
                title={<Typography.Text strong>{item.category}</Typography.Text>}
                description={
                  <span>
                    <Typography.Title level={4}>{item.header}</Typography.Title>
                    {formatDate(item.date)}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Spin>
  </Drawer>
);
};

export default NotificationDrawer;
