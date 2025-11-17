import React from 'react';
import { Spin, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styles from './News.module.css'; 

const { Text } = Typography;

/**
 * Компонент, отображающий сообщение "Идет поиск..." с индикатором загрузки.
 */
const Searching: React.FC = () => {
  const { t } = useTranslation();
  
  const searchingText = t('adminnews.searching'); 

  return (
    // Применяем класс к корневому div
    <div className={styles.searchingContainern}> 
      <Spin 
        size="large" 
        // ⭐️ Используем класс для иконки. Примечание: в Ant Design, когда 
        // иконка передается как indicator, стиль часто остается инлайн, 
        // но мы используем className для лучшей практики.
        indicator={<SearchOutlined className={styles.searchingSpinnerIcon} spin />} 
      >
        {/* AntD Spin Content */}
      </Spin>
      <Text 
        type="secondary" 
        // ⭐️ Применяем класс для текста
        className={styles.searchingText}
      >
        {searchingText}...
      </Text>
    </div>
  );
};

export default Searching;