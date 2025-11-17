import React, { useState, useEffect, useCallback } from "react";
import { List, Typography, message, Empty, Spin } from "antd";
import { useTranslation } from 'react-i18next';
import Searching from "./Searching"; 
import NewsList from "./NewsList"; 
import useApiRequest from "../../../hooks/useApiRequest"; 
import styles from "./News.module.css"; // <-- Импорт стилей

// --- ТИПЫ ДАННЫХ ---

interface NewsItem {
  id: number;
  category: 0 | 1 | 2;
  header: string;
  date: string;
  [key: string]: any; 
}

interface NewsProps {
  isAdmin: boolean;
  updateKey: number;
}

// --- КОНСТАНТЫ И УТИЛИТЫ ---

const { Title } = Typography;
const API_URL = import.meta.env.VITE_API_URL || '';

// Функция для получения заголовков (для запросов, требующих авторизации)
const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
});

// --- КОМПОНЕНТ ---

const News: React.FC<NewsProps> = ({ isAdmin, updateKey }) => {
  const { t } = useTranslation();
    
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isEmpty, setEmpty] = useState(false);
  
  const { sendRequest } = useApiRequest();

  // --- ЛОГИКА ЗАГРУЗКИ НОВОСТЕЙ ---

  const getAllNews = useCallback(async () => {
    setLoading(true);
    setEmpty(false);
    
    try {
      const data: NewsItem[] = await sendRequest(`${API_URL}/api/news/all`, {
        method: 'GET',
        headers: getHeaders(), 
      });

      if (data.length === 0) {
        setEmpty(true);
      } else {
        setNews(data);
        setEmpty(false);
      }
    } catch (err) {
      console.error(err);
      message.error(t('adminnews.errorLoadList')); 
    } finally {
      setLoading(false);
    }
  }, [sendRequest, t]);

  // Вызов при монтировании компонента или изменении updateKey
  useEffect(() => {
    getAllNews();
  }, [getAllNews, updateKey]);

  // --- РЕНДЕРИНГ КОНТЕНТА ---

  let content;

  if (isLoading) {
    content = <Searching />;
  } else if (isEmpty) {
    // ⭐️ Используем класс для style={{ marginTop: 50 }}
    content = <Empty description={t('adminnews.emptyNewsList')} className={styles.emptyListMargin} />;
  } else {
    content = <NewsList news={news} isAdmin={isAdmin} getAllNews={getAllNews} />;
  }

  return (
    // ⭐️ Используем класс для style={{ padding: '20px' }}
    <div className={styles.newsContainer}> 
      <Title 
        level={4} 
        // ⭐️ Используем класс для style={{ textAlign: "center" }}
        className={styles.titleCenter} 
      >
        {isAdmin ? t('adminnews.manageNewsTitle') : t('adminnews.latestNewsTitle')}
      </Title>
      
      <List>
        {content}
      </List>
    </div>
  );
};

export default News;