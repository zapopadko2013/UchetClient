import React , { useState } from 'react';
import { Form, Input, Button, Typography, Select, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Flag from 'react-flagkit';
import useApiRequest from '../hooks/useApiRequest';
import './Login.css';
import LanguageSelector from '../components/LanguageSelector';

const { Title } = Typography;
const { Option } = Select;

/**
 * Компонент страницы входа.
 *
 * @param {object} props - Свойства компонента.
 * @param {Function} props.onLogin - Функция обратного вызова при успешном входе.
 */
const Login = ({ onLogin }) => {
  const { t, i18n } = useTranslation();
  const { loading, error, sendRequest } = useApiRequest();
  const navigate = useNavigate();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Обработка отправки формы
  const onFinish = async (values) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL + '/auth/signin';
      const data = await sendRequest(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (data && data.accessToken) {


        ///////09.02.2026
        const headers = { Authorization: `Bearer ${data.accessToken}` };
        // 1. Получаем роли пользователя
      const roles = await sendRequest(`${import.meta.env.VITE_API_URL}/api/erpuser/user/roles`, {
        headers,
      });

      // Проверяем, есть ли среди ролей роль с id === 1
      const hasAdminRole = roles.some((role) => Number(role.id) === 1);


        ///////09.02.2026

        //////
         
        const data11 = await sendRequest(`${import.meta.env.VITE_API_URL}/api/erpuser/getuseraccessesun`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        
       // let flatAccesses = data11.flatMap(group => group.accesses || []);
        //////

        ///////09.02.2026
      // Копируем данные, чтобы не мутировать исходный ответ, и гарантируем, что это массив
let groupedAccesses = Array.isArray(data11) ? [...data11] : [{ accesses: [] }];

const portalUserCode = "setting_portal_user";

if (hasAdminRole) {
    // Проверяем, есть ли этот код хотя бы в одной группе
    const alreadyHas = groupedAccesses.some(group => 
        Array.isArray(group?.accesses) && group.accesses.some(a => a.code === portalUserCode)
    );

    if (!alreadyHas) {
        // Если группы пустые или первая группа null — подготавливаем её
        if (!groupedAccesses[0]) groupedAccesses[0] = { accesses: [] };
        if (!Array.isArray(groupedAccesses[0].accesses)) groupedAccesses[0].accesses = [];

        // Добавляем в массив accesses первой группы
        groupedAccesses[0].accesses.push({
            "id": 1,
            "code": portalUserCode,
            "category": "Пользователи",
            "name": "Пользователи программы"
        });
    }
} else {
    // Если не админ — удаляем код из всех групп
    groupedAccesses.forEach(group => {
        if (Array.isArray(group?.accesses)) {
            group.accesses = group.accesses.filter(a => a.code !== portalUserCode);
        }
    });
}

// 3. Теперь делаем финальный плоский массив для onLogin
// Это ВАЖНО, так как фронтенд обычно ожидает список объектов для проверки прав
const flatAccesses = groupedAccesses.flatMap(group => 
    Array.isArray(group?.accesses) ? group.accesses : []
);
//console.log(flatAccesses);
        ///////09.02.2026

        // Вызываем onLogin и передаем токен и имя пользователя
        //onLogin(data.accessToken, values.username);
        onLogin(data.accessToken, values.username, flatAccesses); 
        
        navigate('/');
      } else {
        message.error(t('login.errorInvalid'));
      }
    } catch (err) {
      if (error) {
        message.error(error);
      } else {
        message.error(t('login.errorNetwork'));
      }
    }
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
  };

  return (
    <div className="login-wrapper">

     
      <Card className="login-card">
        <div className="card-header-container">
          <Title level={4} className="login-title">
            {t('login.title')}
          </Title>
          <div className="language-selector-container">
             <LanguageSelector />
          </div>
        </div>

        <Form
          id="login-form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('login.usernameRequired') }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('login.usernamePlaceholder')} />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('login.passwordRequired') }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('login.passwordPlaceholder')} />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="login-form-button"
              loading={loading}
              block
            >
              {t('login.button')}
            </Button>
          </Form.Item>
        </Form>
      </Card>

    </div>
  );
};

export default Login;
