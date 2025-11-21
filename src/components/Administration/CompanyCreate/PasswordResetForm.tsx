import React, { useState, useEffect, useCallback } from "react";
import { 
  Modal, 
  Button, 
  Select, 
  Typography, 
  message, 
  Spin,
  Alert,
} from "antd";
import { UserOutlined, UnlockOutlined } from '@ant-design/icons';


 import { useTranslation } from 'react-i18next';
 import useApiRequest from '../../../hooks/useApiRequest'; 
 import styles from './RegisterPage.module.css';


const { Title, Text } = Typography;
const { Option } = Select;

// Базовый путь API
const API_BASE_PATH = import.meta.env.VITE_API_URL +"/api"; 

// Интерфейсы для типизации
interface User {
  login: string;
}

interface OrderFormProps {
  /** Функция закрытия модального окна. */
  handleCloseDialog: (reset?: boolean) => void; 
  /** ID компании. */
  comp_id: string;
  /** Флаг состояния открытия модального окна. */
  isOpenDialog: boolean;
}

interface ResetResult {
  code?: 'success' | 'error';
  text?: string;
  passreset?: string;
}

/**
 * Модальное окно для сброса пароля выбранного пользователя компании,
 * использующее Ant Design и кастомный хук useApiRequest.
 */
const PasswordResetForm: React.FC<OrderFormProps> = ({
  handleCloseDialog,
  comp_id,
  isOpenDialog,
}) => {
  // Используем заглушку useTranslation
  const { t } = useTranslation();
  // Используем заглушку useApiRequest
  const { sendRequest } = useApiRequest(); 
  
  const [username, setUsername] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // --- API HEADERS ---
  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  // Сброс состояния и загрузка списка пользователей при открытии
  useEffect(() => {
    if (isOpenDialog) {
      setUsername("");
      setResult(null);
      setEnabled(false);
      setTried(false);
      getUsernames();
    }
  }, [isOpenDialog, comp_id]);

  // --- API CALLS ---
  
  /** Загружает список логинов пользователей для текущей компании (comp_id). */
  const getUsernames = useCallback(async () => {
    setUsersLoading(true);
    setUsers([]); // Очистка списка
    try {

      const url = new URL(`${API_BASE_PATH}/adminpage/usernames`);
      url.search = new URLSearchParams({ comp_id }).toString(); 

      const responseData = await sendRequest(url, {
        method: 'GET',
        headers: getHeaders()
      });

      // Критическое исправление: Проверка, что ответ является массивом
      if (Array.isArray(responseData)) {
        setUsers(responseData as User[]); 
      } else {
        // Именно здесь сработала ваша ошибка!
        console.error("API Response Error: Expected an array for users, received:", responseData);
        message.error(t('companyList.reset.error.format', { defaultValue: 'Неверный формат данных пользователей от API.' }));
        setUsers([]);
      }
    } catch (err) {
      console.error("Error fetching usernames:", err);
      message.error(t('companyList.reset.error.fetchUsers', { defaultValue: 'Ошибка при загрузке пользователей.' }));
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [comp_id, sendRequest, t, getHeaders]);

  /** Выполняет сброс пароля для выбранного пользователя. */
  const resetPassword = useCallback(async () => {
    if (!username) return;
    
    setLoading(true);
    setTried(false);
    setResult(null);

    try {

      const url = new URL(`${API_BASE_PATH}/adminpage/passreset`);
      url.searchParams.set('comp_id', comp_id);
      url.searchParams.set('username', username);

      const results = await sendRequest(url.toString(), {
        method: 'GET',
        headers: getHeaders()
      });
      
      // Предполагаем, что ответ - массив, и нам нужен первый элемент
      const resetDataRaw = Array.isArray(results) ? results[0]?.passreset : null;
      const resetData = resetDataRaw as ResetResult | null;

      setResult(resetData);

      if (resetData?.code === "success") {
        message.success(t('companyList.reset.success', { defaultValue: 'Пароль успешно сброшен' }));
      } else if (resetData?.code === "error") {
        message.error(resetData.text || t('companyList.reset.error.generic', { defaultValue: 'При сбросе пароля произошла ошибка.' }));
      } else {
         message.error(t('companyList.reset.error.unknown', { defaultValue: 'Получен неожиданный ответ от API.' }));
      }

    } catch (err) {
      console.error("Error resetting password:", err);
      setResult({ code: "error", text: t('companyList.reset.error.api', { defaultValue: 'Сетевая ошибка при сбросе пароля.' }) });
      message.error(t('companyList.reset.error.api', { defaultValue: 'Сетевая ошибка при сбросе пароля.' }));
    } finally {
      setTried(true);
      setLoading(false);
    }
  }, [comp_id, username, sendRequest, t, getHeaders]);

  /** Обработчик изменения выбора пользователя. */
  const handleUsernameChange = useCallback((value: string) => {
    const selectedUsername = value || ""; 
    setUsername(selectedUsername);
    setEnabled(!!selectedUsername);
    setTried(false); 
    setResult(null);
  }, []);

  /** Обработчик закрытия модального окна. */
  const handleClose = () => {
    handleCloseDialog(tried && result?.code === 'success');
  };

  const isSuccess = tried && result?.code === "success";
  const currentActionLoading = loading && tried === false;

  return (
    <Modal
      title={
        <Title level={4} className={styles.modalTitle}>
          <UnlockOutlined className={styles.modalIcon} />
          {t('companyList.reset.title', { defaultValue: "Сброс пароля" })}
        </Title>
      }
      open={isOpenDialog}
      onCancel={handleClose}
      maskClosable={false} 
      keyboard={false} 
      width={400}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {isSuccess ? t('companyList.reset.close', { defaultValue: "Закрыть" }) : t('companyList.reset.cancel', { defaultValue: "Отмена" })}
        </Button>,
      ]}
    >
      <div className={styles.contentContainer}>
        {/* Информация о ID компании */}
        <div className={styles.companyIdSection}>
          <Text strong>{t('companyList.reset.companyId', { defaultValue: "ID компании" })}:</Text>{" "}
          <Text code className={styles.companyIdCode}>
            {comp_id}
          </Text>
        </div>
        
        {/* Выбор пользователя */}
        <div className={styles.userSelectSection}>
          <Spin spinning={usersLoading}>
            <Select
              showSearch
              value={username || undefined}
              placeholder={t('companyList.reset.placeholder', { defaultValue: "Логин пользователя" })}
              optionFilterProp="children"
              onChange={handleUsernameChange}
              onSearch={handleUsernameChange} 
              className={styles.fullWidth}
              allowClear
              disabled={usersLoading}
              filterOption={(input, option) =>
                (option?.value as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {users.map((user) => (
                <Option key={user.login} value={user.login}>
                  <UserOutlined className={styles.iconMargin} />
                  {user.login}
                </Option>
              ))}
              {!users.length && !usersLoading && (
                 <Option disabled value="no-users">
                   {t('companyList.reset.noUsers', { defaultValue: "Нет доступных пользователей" })}
                 </Option>
              )}
            </Select>
          </Spin>
        </div>
        
        {/* Кнопка сброса */}
        <div className={styles.resetButtonContainer}>
          <Button
            type="primary"
            disabled={!enabled || isSuccess || currentActionLoading}
            loading={currentActionLoading}
            onClick={resetPassword}
            className={styles.resetButton}
            icon={<UnlockOutlined />}
          >
            {t('companyList.reset.button', { defaultValue: "Сбросить пароль" })}
          </Button>
        </div>
        
        {/* Отображение результата */}
        {tried && (
          <div className={styles.resultContainer}>
            {result?.code === "success" && (
              <Alert 
                message={t('companyList.reset.message.success', { defaultValue: "Пароль успешно сброшен" })} 
                type="success" 
                showIcon 
              />
            )}
            {result?.code === "error" && (
              <Alert 
                message={result.text || t('companyList.reset.message.error', { defaultValue: "При сбросе пароля произошла ошибка" })} 
                type="error" 
                showIcon 
              />
            )}
            {!result?.code && (
              <Alert 
                message={t('companyList.reset.message.unknown', { defaultValue: "При сбросе пароля произошла неизвестная ошибка" })} 
                type="warning" 
                showIcon 
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PasswordResetForm;