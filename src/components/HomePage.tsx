import React, { useEffect, useState } from 'react';
import { Typography, Space, Spin, message, Card, Button, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import useApiRequest from '../hooks/useApiRequest';
import EditCompanyModal from '../components/EditCompanyModal';
import './HomePage.css';

const { Title, Paragraph, Text } = Typography;

// Определение типа для данных компании
interface CompanyData {
  name: string;
  bin: string;
  address: string;
  head: string;
  headIin: string;
  accountant: string;
  accountantIin: string;
  id: string;
  certificatenum: number;
  certificateseries: number;
  certificatedate: string;
  holding: boolean;
  holding_parent: string | null;
  wholesale: boolean;
}

/**
 * Компонент главной страницы.
 * Загружает данные компании с сервера и отображает их.
 */
const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const { loading, error, sendRequest } = useApiRequest();

  // Функция для загрузки данных компании
  const fetchCompanyData = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/company`;
      const data = await sendRequest(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });
      setCompanyData(data);
    } catch (err) {
      message.error(t('companyPage.errorLoading')+err);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleEditClick = () => {
    setIsEditModalVisible(true);
  };

  const handleUpdateSuccess = () => {
    fetchCompanyData();
    setIsEditModalVisible(false);
  };

  if (loading) {
    return (
      <Space direction="vertical" align="center" style={{ width: '100%', padding: '24px' }}>
        <Spin size="large" />
        <Paragraph>{t('companyPage.loading')}</Paragraph>
      </Space>
    );
  }

  if (error) {
    return (
      <Space direction="vertical" style={{ padding: '24px' }}>
        <Paragraph type="danger">{t('companyPage.error')+error}</Paragraph>
      </Space>
    );
  }

  return (
    <div className="news-container">
      <Title level={2}>{t('companyPage.title')}</Title>
      {/* <Paragraph>{t('companyPage.readOnlyInfo')}</Paragraph> */}

      <Button
        type="primary"
        className="edit-button"
        onClick={handleEditClick}
      >
        {t('companyPage.editButton')}
      </Button>
      
      {companyData && (
        <Card className="company-info-card">
          <div className="info-item">
            <Text strong>{t('companyPage.bin')}:</Text>
            <Text>{companyData.bin}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.name')}:</Text>
            <Text>{companyData.name}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.address')}:</Text>
            <Text>{companyData.address}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.head')}:</Text>
            <Text>{companyData.head}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.headIin')}:</Text>
            <Text>{companyData.headIin}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.accountant')}:</Text>
            <Text>{companyData.accountant}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.accountantIin')}:</Text>
            <Text>{companyData.accountantIin}</Text>
          </div>
          <div className="info-item-wholesale">
            <Text strong>{t('companyPage.wholesale')}:</Text>
            <Switch checked={companyData.wholesale} disabled />
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.certificateseries')}:</Text>
            <Text>{companyData.certificateseries}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.certificatenum')}:</Text>
            <Text>{companyData.certificatenum}</Text>
          </div>
          <div className="info-item">
            <Text strong>{t('companyPage.certificatedate')}:</Text>
            <Text>{companyData.certificatedate}</Text>
          </div>
        </Card>
      )}

      {companyData && (
        <EditCompanyModal
          visible={isEditModalVisible}
          initialData={companyData}
          onClose={() => setIsEditModalVisible(false)}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default HomePage;
