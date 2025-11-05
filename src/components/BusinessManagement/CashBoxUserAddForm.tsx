import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Modal, InputNumber, message } from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './CashBoxUser.module.css';

const { Option } = Select;

interface RoleOption {
  id: number;
  name: string;
}

interface PointOption {
  id: number;
  name: string;
}

interface CashBoxUserData {
  id?: number;
  name: string;
  iin: string;
  role: number;
  point: number;
  discount?: boolean;
  discountperc?: number;
  allowDiscountManual?: boolean;
  deleted?: boolean;
}

interface CashBoxUserAddFormProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: CashBoxUserData | null;
}

const CashBoxUserAddForm: React.FC<CashBoxUserAddFormProps> = ({
  visible,
  onCancel,
  onSuccess,
  initialValues = null,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<CashBoxUserData>();
  const { sendRequest, loading } = useApiRequest();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [points, setPoints] = useState<PointOption[]>([]);

  const [discountValue, setDiscountValue] = useState<number | null>(null);
  
  const isEdit = Boolean(initialValues);

  useEffect(() => {
    if (!visible) return;

     if (initialValues?.discountperc !== undefined) {
    setDiscountValue(initialValues.discountperc);
  } else {
    setDiscountValue(null);
  }

    const fetchData = async () => {
      try {
        const [rolesData, pointsData] = await Promise.all([
          sendRequest(`${import.meta.env.VITE_API_URL}/api/cashboxuser/roles`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          }).catch((err) => {
            console.error(t('cashBoxUserAddForm.errors.rolesLoad'), err);
            return [];
          }),
          sendRequest(`${import.meta.env.VITE_API_URL}/api/point?pointtype=2`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          }).catch((err) => {
            console.error(t('cashBoxUserAddForm.errors.pointsLoad'), err);
            return [];
          }),
        ]);

        setRoles((rolesData?.data || rolesData) as RoleOption[]);
        setPoints((pointsData?.data || pointsData) as PointOption[]);
      } catch (err) {
        console.error(t('cashBoxUserAddForm.errors.dataLoad'), err);
      }
    };

    fetchData();
  }, [visible, t, sendRequest, initialValues]);

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue({
        ...initialValues,
        allowDiscountManual: initialValues.discount === true,
        discountperc: initialValues.discountperc ?? 0,
      });
    } else {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const allowDiscount = Form.useWatch('allowDiscountManual', form);

  const handleFinish = async (values: CashBoxUserData) => {
    const discountAllowed = values.allowDiscountManual === true;

    const body = {
    ...values,
    discount: discountAllowed,
    discountInfo: discountAllowed ? values.discountperc : 0, 
    deleted: false,
    };

    if (isEdit && initialValues?.id) {
      body.id = initialValues.id;
    }

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/cashboxuser/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ cashboxusr: body }),
      });

      message.success(t(isEdit ? 'cashBoxUserAddForm.messages.updated' : 'cashBoxUserAddForm.messages.created'));
      form.resetFields();
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error(t('cashBoxUserAddForm.messages.error'));
    }
  };

  return (
    <Modal
      title={t(isEdit ? 'cashBoxUserAddForm.title.edit' : 'cashBoxUserAddForm.title.add')}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={t(isEdit ? 'cashBoxUserAddForm.buttons.save' : 'cashBoxUserAddForm.buttons.add')}
      cancelText={t('cashBoxUserAddForm.buttons.cancel')}
      
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label={t('cashBoxUserAddForm.fields.name')}
          name="name"
          rules={[{ required: true, message: t('cashBoxUserAddForm.validations.name') }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={t('cashBoxUserAddForm.fields.iin')}
          name="iin"
          rules={[{ required: true, message: t('cashBoxUserAddForm.validations.iin') }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={t('cashBoxUserAddForm.fields.point')}
          name="point"
          rules={[{ required: true, message: t('cashBoxUserAddForm.validations.point') }]}
        >
          <Select placeholder={t('cashBoxUserAddForm.placeholders.selectPoint')}>
            {points.map((p) => (
              <Option key={p.id} value={p.id}>
                {p.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={t('cashBoxUserAddForm.fields.role')}
          name="role"
          rules={[{ required: true, message: t('cashBoxUserAddForm.validations.role') }]}
        >
          <Select placeholder={t('cashBoxUserAddForm.placeholders.selectRole')}>
            {roles.map((r) => (
              <Option key={r.id} value={r.id}>
                {r.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={t('cashBoxUserAddForm.fields.allowDiscount')}
          name="allowDiscountManual"
          rules={[{ required: true, message: t('cashBoxUserAddForm.validations.allowDiscount') }]}
        >
          <Select placeholder={t('cashBoxUserAddForm.placeholders.selectDiscountOption')}>
            <Option value={true}>{t('cashBoxUserAddForm.options.yes')}</Option>
            <Option value={false}>{t('cashBoxUserAddForm.options.no')}</Option>
          </Select>
        </Form.Item>

        {allowDiscount && (

      <Form.Item
  label={t('cashBoxUserAddForm.fields.discount')}
  name="discountperc"
  normalize={(value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.slice(0, 2);
  }}
  rules={[
    {
      required: true,
      message: t('cashBoxUserAddForm.validations.discountRequired'),
    },
    {
      validator: (_, value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0 || num > 99) {
          return Promise.reject(
            new Error(t('cashBoxUserAddForm.validations.discountRange'))
          );
        }
        return Promise.resolve();
      },
    },
  ]}
>
  <Input inputMode="numeric" maxLength={2} />
</Form.Item>



        )}
      </Form>
    </Modal>
  );
};

export default CashBoxUserAddForm;
