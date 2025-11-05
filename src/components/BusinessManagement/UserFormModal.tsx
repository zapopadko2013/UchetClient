import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (userData: any) => void; // возвращаем данные пользователя, но не делаем запрос при добавлении
  user: any | null;
}

const UserFormModal: React.FC<Props> = ({ visible, onCancel, onSuccess, user }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();

  useEffect(() => {
    form.resetFields();
    if (user) {
      form.setFieldsValue({
        name: user.name,
        iin: user.iin,
        login: user.login,
        accesses: Array.isArray(user.accesses) ? user.accesses.map((a: any) => a.id) : [],
      });
    }
  }, [user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (user) {
        // Редактирование — сразу отправляем запрос обновления
        const payload = {
          erpusr: {
            id: user.id,
            name: values.name,
            iin: values.iin,
            login: values.login,
            status: 'ACTIVE',
            roles: user.roles || [],
            accesses: user.accesses || [],
          },
        };

        const response = await sendRequest(`${import.meta.env.VITE_API_URL}/api/erpuser/updateuser`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
          body: JSON.stringify(payload),
        });

        message.success(t('userProgram.editSuccess'));
        // Возвращаем обновлённого пользователя из ответа
        onSuccess(response?.erpusr || payload.erpusr);
      } else {
        // Добавление — просто возвращаем данные наверх, запрос будет из редактора доступа
        onSuccess({
          name: values.name,
          iin: values.iin,
          login: values.login,
          status: 'ACTIVE',
          roles: [],
          accesses: [],
        });
        message.success(t('userProgram.fillAccessesToComplete'));
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || t('userProgram.submitError'));
    }
  };

  return (
    <Modal
      open={visible}
      title={user ? t('userProgram.editUser') : t('userProgram.addUser')}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={t('userProgram.fullName')}
          name="name"
          rules={[{ required: true, message: t('userProgram.fullNameRequired') }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={t('userProgram.iin')}
          name="iin"
          rules={[{ required: true, message: t('userProgram.iinRequired') }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={t('userProgram.login')}
          name="login"
          rules={[{ required: true, message: t('userProgram.loginRequired') }]}
        >
          <Input disabled={!!user} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormModal;
