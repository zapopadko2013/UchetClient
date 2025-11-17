import React, { useCallback, useMemo } from "react";
import { List, Space, Tag, Button, notification } from "antd";
import { DeleteOutlined, BugFilled, NotificationFilled, SoundFilled } from "@ant-design/icons";
import Moment from "moment";
import { Link as RouterLink } from "react-router-dom";
import type { ListProps } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from "./News.module.css";

// --- ТИПЫ ДАННЫХ ---
interface NewsItem {
  id: number;
  category: 0 | 1 | 2; 
  header: string;
  date: string; 
  [key: string]: any; 
}

interface UniqueListProps {
  news: NewsItem[];
  isAdmin: boolean;
  getAllNews: () => void;
}

// --- КОНСТАНТЫ И ХУКИ ---

const API_URL = import.meta.env.VITE_API_URL || '';

// Функция для получения заголовков авторизации
const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
});

// --- КОМПОНЕНТ ---

const NewsList: React.FC<UniqueListProps> = ({ news, isAdmin, getAllNews }) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  // --- 1. ЛОГИКА УДАЛЕНИЯ (Без изменений) ---

  const handleDelete = useCallback(async (id: number) => {
    const data = { news_id: id };

    try {
      await sendRequest(`${API_URL}/api/news/delete_news`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      
      getAllNews();
      notification.success({
        message: t('adminnews.successTitle'),
        description: t('adminnews.successDelete'),
        placement: "topRight",
      });
    } catch (err) {
      console.error(err);
      notification.error({
        message: t('adminnews.errorTitle'),
        description: t('adminnews.errorDeleteDescription'),
        placement: "topRight",
      });
    }
  }, [getAllNews, sendRequest, t]);

  // --- 2. УТИЛИТЫ ДЛЯ КАТЕГОРИЙ (Без изменений) ---

  const getCategoryInfo = useCallback((category: 0 | 1 | 2) => {
    let tagText = '';
    switch (category) {
      case 0: 
        tagText = t('adminnews.bug');
        return {
          icon: <BugFilled />,
          color: "error",
          bgColor: "#E91E63", 
          text: tagText,
        };
      case 1: 
        tagText = t('adminnews.notification');
        return {
          icon: <NotificationFilled />,
          color: "warning",
          bgColor: "#CDDC39", 
          text: tagText,
        };
      case 2: 
      default:
        tagText = t('adminnews.feature');
        return {
          icon: <SoundFilled />,
          color: "processing",
          bgColor: "#673AB7", 
          text: tagText,
        };
    }
  }, [t]);

  // --- 3. РЕНДЕРИНГ СПИСКА ---

  const renderItem: ListProps<NewsItem>['renderItem'] = (item) => {
    const { id, header, date } = item;
    const categoryInfo = getCategoryInfo(item.category);
    
    const linkPath = `${isAdmin ? "/news/" : "/news/"}${id}`;

    return (
      <List.Item
        key={id}
        actions={isAdmin ? [
            <Button 
                key="delete" 
                onClick={() => handleDelete(id)} 
                danger 
                type="text" 
                icon={<DeleteOutlined />} 
                title={t('adminnews.deleteButton')}
            />
        ] : undefined}
      >
        <List.Item.Meta
          // Аватар
          avatar={
            // ⭐️ Применяем класс, а динамический стиль оставляем минимальным
            <div 
              className={styles.categoryAvatar}
              style={{
                backgroundColor: categoryInfo.bgColor, 
              }}
            >
              {categoryInfo.icon}
            </div>
          }
          // Заголовок и подзаголовок
          title={
            <Space>
              <RouterLink to={linkPath} style={{ fontWeight: 500 }}>
                {header}
              </RouterLink>
              <Tag color={categoryInfo.color}>
                {categoryInfo.text} 
              </Tag>
            </Space>
          }
          description={Moment(date).format('DD.MM.YYYY HH:mm')}
        />
      </List.Item>
    );
  };

  return (
    <List
      dataSource={news}
      renderItem={renderItem}
      // ⭐️ Применяем класс для maxWidth и margin
      className={styles.newsListContainer} 
      bordered
      locale={{ emptyText: t('adminnews.emptyList') }}
    />
  );
};

export default NewsList;