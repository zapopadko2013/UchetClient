import React, { useState, useMemo, useCallback } from "react";
import { Tabs, Typography } from "antd";
import { PlusSquareOutlined, EditOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import News from "./News"; 
import CreateNews from "./CreateNews";
import styles from "./News.module.css"; 

// --- ТИПЫ ДАННЫХ ---

// Определяем ожидаемые пропсы для AdminNews
interface AdminNewsProps {
  user?: any; // Используем 'any' или определите интерфейс User
}

const { Title } = Typography;

// --- КОМПОНЕНТ ---

const AdminNews: React.FC<AdminNewsProps> = ({ user }) => {
  // Инициализируем функцию перевода
  const { t } = useTranslation(); 
  
  const [activeKey, setActiveKey] = useState<'createnews' | 'changenews'>("createnews");
  const [updateKey, setUpdateKey] = useState(0); 

  // Функция для обработки успешного создания новости
  const handleNewsCreated = useCallback(() => {
    setUpdateKey(prev => prev + 1);
    // Переключаемся на вкладку "Изменение новостей"
    setActiveKey('changenews'); 
  }, []);

  // Адаптируем данные для навигации, используя локализацию
  const newspagesData = useMemo(() => [
    { 
      route: "createnews" as const, 
      caption: t('adminnews.createNews'), 
      icon: <PlusSquareOutlined />,
      component: <CreateNews user={user} onNewsCreated={handleNewsCreated} />
    },
    { 
      route: "changenews" as const, 
      caption: t('adminnews.changeNews'), 
      icon: <EditOutlined />,
      component: <News isAdmin={true} updateKey={updateKey} />
    },
  ], [t, user, updateKey, handleNewsCreated]);

  // Подготовка элементов Tabs
  const tabItems = useMemo(() => {
    return newspagesData.map((item) => ({
      key: item.route, 
      label: (
        <span>
          {item.icon}
          {item.caption}
        </span>
      ),
      children: (
        // Используем класс для div внутри children
        <div className={styles.tabContent}> 
          {item.component}
        </div>
      ),
    }));
  }, [newspagesData]);

  // Функция для смены активной вкладки
  const handleTabChange = (key: string) => {
    setActiveKey(key as 'createnews' | 'changenews');
  };

  return (
    // Используем класс для корневого div
    <div className={styles.adminNewsContainer}> 
      
      <Title level={4}>
        {t('adminnews.news')}
      </Title>
      
      <Tabs 
        defaultActiveKey="createnews" 
        activeKey={activeKey} 
        items={tabItems}
        onChange={handleTabChange}
        size="large"
      />
    </div>
  );
};

export default AdminNews;