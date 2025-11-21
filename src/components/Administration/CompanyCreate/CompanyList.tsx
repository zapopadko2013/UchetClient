import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Table,
  Button,
  Tag,
  Typography,
  Spin,
  message,
  Modal,
  Space,
  Card,
  Alert,
} from "antd";
import type { ColumnsType } from 'antd/es/table';
import {
  InfoCircleOutlined,
  UnlockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  RollbackOutlined
} from "@ant-design/icons";

// --- РЕАЛЬНЫЕ ИМПОРТЫ БЕЗ ЗАГЛУШЕК ---
// Предполагаем, что useTranslation и useApiRequest импортируются из этих путей
import { useTranslation } from 'react-i18next';
import useApiRequest from "../../../hooks/useApiRequest";
import PasswordResetForm from "./PasswordResetForm";

// Импорт стилей
import styles from './RegisterPage.module.css';
// --- КОНЕЦ РЕАЛЬНЫХ ИМПОРТОВ ---


const { Title } = Typography;
// Используем переменную окружения для API URL
const API_URL = import.meta.env.VITE_API_URL || ''; 

// --- ТИПЫ ДАННЫХ ---
interface Company {
  id: string;
  bin: string;
  name: string;
  status: 'ACTIVE' | 'CLOSE';
  key: string;
}



const CompanyList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sendRequest } = useApiRequest();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isOpenDialog, setOpenDialog] = useState(false);
  const [compID, setCompID] = useState<string>('');

  // Получение данных пользователя из сессии
  const user = JSON.parse(sessionStorage.getItem("isme-user-data") || "{}");

  // --- API HEADERS ---
  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  // --- DATA FETCHING ---
  
  const fetchUserPartnerId = useCallback(async () => {
    try {
        // Логика getUser из оригинального компонента
        const res = await sendRequest(`${API_URL}/api/erpuser/info`, { 
            method: 'GET',
            headers: getHeaders()
        });
        return res.partner_id;
    } catch (err) {
        console.error("Error fetching user info:", err);
        return null;
    }
  }, [API_URL, sendRequest, getHeaders]);


  const fetchCompanies = useCallback(async (partnerId?: string) => {
    setLoading(true);
    setUpdating(false);

    let currentPartnerId = partnerId || user.partner_id;

    // Восстановление логики getUser: если partner_id нет, но находимся на /adminpage, пытаемся его получить
    if (!currentPartnerId ) {
      currentPartnerId = await fetchUserPartnerId();
    }
    
    if (!currentPartnerId) {
        // Если ID партнера не найден, прекращаем загрузку
        //setLoading(false);
        //return;
        currentPartnerId=null;
    }

   

    try {
      // Вызов API для получения списка компаний
      const companiesList: Company[] = await sendRequest(`${API_URL}/api/adminpage/companies`, {
        method: 'GET',
        params: { partner_id: currentPartnerId },
        headers: getHeaders(),
      });
      
      const list = companiesList.map((comp, __) => ({
        ...comp,
        key: comp.id.toString(), // Key для AntD Table
      }));

      setCompanies(list);
      
    } catch (err: any) {
      console.error("Error fetching companies:", err);
      message.error(t('companyList.general.raiseError'));
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, [API_URL, sendRequest, getHeaders, t, user.partner_id, location.pathname, fetchUserPartnerId]);


  useEffect(() => {
    // В зависимости от маршрута и наличия partner_id, вызываем загрузку
    fetchCompanies();
  }, [fetchCompanies]); 

  // --- HANDLERS ---

  const handleUpdateStatus = useCallback(async (id: string, currentStatus: 'ACTIVE' | 'CLOSE') => {
    const newStatus = currentStatus === "ACTIVE" ? "CLOSE" : "ACTIVE";
    let company = { id, status: newStatus };
    setUpdating(true);

    try {
      // Вызов API для управления статусом
      await sendRequest(`${API_URL}/api/adminpage/companies/manage`, {
        method: 'POST',
        body: JSON.stringify({ company }),
        headers: getHeaders(),
      });

      message.success(t('companyList.successUpdate'), 2);
      // Перезагрузка списка после успешного изменения
      fetchCompanies(); 

    } catch (err: any) {
      console.error("Error updating company status:", err);
      setUpdating(false);
      const errorMessage = err.response?.data?.text || t('companyList.general.raiseError');
      message.error(errorMessage);
    }
  }, [fetchCompanies, sendRequest, getHeaders, t, API_URL]);

  /* const handleInfo = useCallback((companyData: Company) => {
    // Определение пути, как в оригинале
    let path = "../companies/info"; 
    
    if (location.pathname.endsWith('/adminpage')) {
        path = 'adminpage/companies/info';
    } else if (location.pathname.endsWith('/companies')) {
        path = 'companies/info';
    }

    navigate(path, {
      state: { companyData },
    });
  }, [navigate, location.pathname]); */

  const handleInfo = useCallback((companyData: Company) => {
  navigate("/admincompanylist/admincompanyinfo", {
    state: { companyData },
  });
}, [navigate]);

  const handleResetPassword = useCallback((id: string) => {
    setCompID(id);
    setOpenDialog(true);
  }, []);

  // --- TABLE COLUMNS ---
  const columns: ColumnsType<Company> = useMemo(() => [
    {
      title: t('companyList.tableHeader.name'),
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('companyList.tableHeader.status'),
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      width: '10%',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: 'ACTIVE' | 'CLOSE') => (
        <Tag 
          icon={status === 'ACTIVE' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={status === 'ACTIVE' ? 'success' : 'error'}
          className={styles.statusTag}
        >
          {t(`companyList.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('companyList.tableHeader.id'),
      dataIndex: 'id',
      key: 'id',
      align: 'center',
      width: '12%',
     // sorter: (a, b) => a.id - b.id,
     sorter: (a, b) => +a.id - +b.id,
    },
    {
      title: t('companyList.tableHeader.bin'),
      dataIndex: 'bin',
      key: 'bin',
      align: 'center',
      width: '16%',
      sorter: (a, b) => a.bin.localeCompare(b.bin),
    },
    {
      title: t('companyList.tableHeader.actions'),
      key: 'actions',
      align: 'right',
      width: '32%',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<InfoCircleOutlined />}
            onClick={() => handleInfo(record)}
            disabled={updating}
          >
            {t('companyList.actions.info')}
          </Button>
          <Button
            type="default"
            size="small"
            icon={<UnlockOutlined />}
            onClick={() => handleResetPassword(record.id)}
            disabled={updating}
          >
            {t('companyList.actions.resetPass')}
          </Button>
          <Button
            danger={record.status === 'ACTIVE'}
            type={record.status === 'CLOSE' ? 'default' : 'primary'}
            size="small"
            onClick={() => handleUpdateStatus(record.id, record.status)}
            disabled={updating}
            loading={updating}
            icon={record.status === 'ACTIVE' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
          >
            {record.status === "ACTIVE"
              ? t('companyList.actions.deactivate')
              : t('companyList.actions.activate')}
          </Button>
        </Space>
      ),
    },
  ], [updating, handleInfo, handleResetPassword, handleUpdateStatus, t]);


  // --- RENDER ---
  
  if (loading) {
    return (
      <Card className={styles.card}>
        <Title level={4}>{t('companyList.title')}</Title>
        <Spin 
          indicator={<LoadingOutlined className={styles.spinnerIcon} spin />} 
          //tip={t('general.loading')} 
          size="large" 
          className={styles.spinner} 
        />
      </Card>
    );
  }

  return (
    <Card className={styles.card} title={<Title level={4} className={styles.title}>{t('companyList.title')}</Title>}>
      
      {companies.length === 0 ? (
        <Alert 
          message={t('companyList.emptyList')} 
          type="info" 
          showIcon 
          className={styles.emptyAlert}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={companies}
          pagination={{ pageSize: 10 }}
          loading={updating}
          scroll={{ x: 'max-content' }}
          className={styles.table}
          rowKey="id"
        />
      )}

      <PasswordResetForm
        comp_id={compID}
        isOpenDialog={isOpenDialog}
        handleCloseDialog={() => setOpenDialog(false)}
      />
    </Card>
  );
};

export default CompanyList;