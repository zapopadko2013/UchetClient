import React, { useState, useCallback, useMemo } from 'react';
import { Select, Input, Button, Space, message, notification, Typography } from 'antd';
import { UploadOutlined, PlusCircleOutlined } from '@ant-design/icons';
import Moment from 'moment';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import MarkedDownEditor from './MarkedDownEditor';
import Searching from '../../Searching';
import styles from './News.module.css'; 

// --- ТИПЫ ДАННЫХ ---
interface User {
  partner_id: string;
}

interface CategoryOption {
  value: string;
  label: string;
}

interface CreateNewsProps {
  user: User | null;
  onNewsCreated: () => void;
}

const { Text } = Typography;

const API_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_PARTNER_ID = '-22';

// --- КОМПОНЕНТ ---

const CreateNews: React.FC<CreateNewsProps> = ({ user, onNewsCreated }) => {
  const { t } = useTranslation();

  // --- ЛОКАЛИЗАЦИЯ ОПЦИЙ КАТЕГОРИЙ ---
  const categoriesOptions = useMemo(() => ([
    { value: '0', label: t('adminnews.bug') }, 
    { value: '1', label: t('adminnews.notification') },
    { value: '2', label: t('adminnews.feature') },
  ]), [t]);
  
  const [categoryValue, setCategoryValue] = useState<string>('0');
  
  const categoryObject = useMemo(() => {
    return categoriesOptions.find(opt => opt.value === categoryValue) || categoriesOptions[0];
  }, [categoryValue, categoriesOptions]);

  const handleCategoryChange = useCallback((value: CategoryOption) => {
    setCategoryValue(value.value);
  }, []);


  const [header, setHeader] = useState('');
  const [markedText, setMarkedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isFileLoading, setFileLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filePath, setFilePath] = useState('');
  
  const { sendRequest } = useApiRequest();

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
  }), []);

  // --- ФУНКЦИИ ОЧИСТКИ И ИЗМЕНЕНИЯ СОСТОЯНИЯ ---

  const clear = useCallback(() => {
    setHeader('');
    setMarkedText('');
    setSelectedFile(null);
    setFilePath('');
    setFileLoading(false);
    setCategoryValue('0'); 
  }, []);

  // --- ЛОГИКА ЗАГРУЗКИ ИЗОБРАЖЕНИЙ ---

  const handleImageUpload = useCallback(async () => {
    if (!selectedFile) {
      message.info(t('adminnews.selectFile'));
      return;
    }
    
    setFileLoading(true);
    
    const formData = new FormData();
    formData.append('file', selectedFile, selectedFile.name);
    formData.append('type', 'news');
    
    try {
      const res = await sendRequest(`${API_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
        headers: getHeaders(),
      });
      
      message.success(t('adminnews.successUpload'));
      setFilePath(res.file.substr(1)); 
      
    } catch (err) {
      console.error(err);
      notification.error({
        message: t('adminnews.errorUploadTitle'),
        description: `${t('adminnews.errorUploadDescription')}: ${err}`,
      });
    } finally {
      setFileLoading(false);
    }
  }, [selectedFile, sendRequest, getHeaders, t]);


  // --- ЛОГИКА ОТПРАВКИ НОВОСТИ ---

  const sendNews = useCallback(async () => {
    if (!header || !markedText) {
      message.warning(t('adminnews.warningFields'));
      return;
    }

    setIsSending(true);
    
    const date = Moment(new Date()).format('MM.DD.YYYY HH:mm:ss');
    const data = {
      category: categoryObject.value, 
      header,
      content: markedText,
      date,
      partner_id: user?.partner_id || DEFAULT_PARTNER_ID,
    };
    
    try {
      await sendRequest(`${API_URL}/api/news`, {
        method: 'POST',
        headers: { 
                'Content-Type': 'application/json', 
                ...getHeaders(), 
            },
        body: JSON.stringify(data),
      });

      notification.success({
        message: t('adminnews.successTitle'),
        description: t('adminnews.successAdd'),
      });
      clear();

      onNewsCreated();
      
    } catch (err) {
      console.error(err);
      notification.error({
        message: t('adminnews.errorTitle'),
        description: `${t('adminnews.errorAdd')}: ${err}`,
      });
    } finally {
      setIsSending(false);
    }
  }, [header, markedText, categoryObject.value, user, sendRequest, clear, getHeaders, onNewsCreated, t]);

  
  return (
    <div className={styles.createNewsContainer}> 
      
      {/* ⭐️ Используем класс для width: '100%' */}
      <Space direction="vertical" className={styles.fullWidthSpace} size="large">
        
        {/* --- 1. КАТЕГОРИЯ --- */}
        <div>
          <label>{t('adminnews.category')}</label>
          <Select
            value={categoryObject}
            onChange={handleCategoryChange} 
            options={categoriesOptions}
            placeholder={t('adminnews.selectCategory')} 
            // ⭐️ Используем класс для width: 250
            className={styles.categorySelect} 
            labelInValue
          />
        </div>

        {/* --- 2. ЗАГОЛОВОК --- */}
        <div>
          <label>{t('adminnews.header')}</label>
          <Input
            value={header}
            onChange={(e) => setHeader(e.target.value)} 
            placeholder={t('adminnews.headerPlaceholder')}
          />
        </div>

        {/* --- 3. ЗАГРУЗКА ИЗОБРАЖЕНИЙ --- */}
        <div>
          <label>{t('adminnews.image')}</label> 
          <Space>
            <input
              type="file"
              name="file"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleImageUpload}
              loading={isFileLoading}
              disabled={!selectedFile}
            >
              {t('adminnews.imageUpload')}
            </Button>
            {isFileLoading && <Searching />} 
          </Space>
          
          {filePath && (
            <Text type="secondary" className={styles.imagePathText}>
              {t('adminnews.imagePath')}: <a href={`http://ushetpro.kz${filePath}`} target="_blank" rel="noopener noreferrer">http://ushetpro.kz{filePath}</a>
            </Text>
          )}
        </div>

        {/* --- 4. MARKDOWN РЕДАКТОР --- */}
        <MarkedDownEditor 
          markedText={markedText}
          onMarkedChange={(e) => setMarkedText(e.target.value)}
        />
        
        {/* --- 5. КНОПКА СОЗДАТЬ --- */}
        <div className={styles.createButtonContainer}>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={sendNews}
            loading={isSending}
            disabled={!header || !markedText}
          >
            {t('adminnews.createButton')}
          </Button>
        </div>
      </Space>
    </div>
  );
};

export default CreateNews;