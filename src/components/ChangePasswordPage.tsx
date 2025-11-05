import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import './ChangePasswordPage.css';
import useApiRequest from '../hooks/useApiRequest';

const { Title, Paragraph } = Typography;

const ChangePasswordPage: React.FC = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { loading, error, sendRequest } = useApiRequest();

   const onFinish = async (values: any) => {
    try {
      // Подготовка данных для отправки
      const payload = {
        currentPass: values.oldPassword,
        user_password: values.newPassword,
      };

      // URL для API-запроса
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/erpuser/changepass`;

      // Отправка запроса с помощью хука useApiRequest
      await sendRequest(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(payload),
      });
      
      
      // Если запрос успешен, отображаем сообщение об успехе
      message.success(t('changePasswordPage.successMessage'));
      form.resetFields(); // Сброс полей формы
    } catch (error: any) {
      // Обработка ошибок, если запрос не удался
      message.error(error.message || t('changePasswordPage.errorChange'));
    }
  };


    return (
        <div className="change-password-container">
            <Card className="change-password-card">
                {/* Заголовок на отдельной строке */}
                <Title level={2} className="card-title">
                    {t('changePasswordPage.title')}
                </Title>
                
                {/* Описание на следующей строке */}
                <Paragraph className="card-description">
                    {t('changePasswordPage.description')}
                </Paragraph>
                
                {/* Остальная часть формы */}
                <Form
                    form={form}
                    name="change_password"
                    onFinish={onFinish}
                    layout="vertical"
                    className="change-password-form"
                >
                    <Form.Item
                        label={t('changePasswordPage.oldPassword')}
                        name="oldPassword"
                        rules={[{ required: true, message: t('changePasswordPage.oldPasswordRequired') }]}
                    >
                        <Input.Password autoComplete="new-password"/>
                    </Form.Item>

                    <Form.Item
                        label={t('changePasswordPage.newPassword')}
                        name="newPassword"
                        rules={[
                            { required: true, message: t('changePasswordPage.newPasswordRequired') },
                            { min: 6, message: t('changePasswordPage.passwordMinLength') },
                        ]}
                    >
                        <Input.Password autoComplete="new-password"/>
                    </Form.Item>

                    <Form.Item
                        label={t('changePasswordPage.confirmPassword')}
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: t('changePasswordPage.confirmPasswordRequired') },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(t('changePasswordPage.passwordsMismatch')));
                                },
                            }),
                        ]}
                    >
                        <Input.Password autoComplete="new-password"/>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {t('changePasswordPage.saveButton')}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ChangePasswordPage;
