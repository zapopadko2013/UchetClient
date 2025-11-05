import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Select, Row, Col, message } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './SalesPlan.module.css';
import useApiRequest from '../../hooks/useApiRequest';

const { Option } = Select;

interface Props {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues: any;
  type: 'individual' | 'team';
}

const SalesPlanForm: React.FC<Props> = ({ visible, onCancel, onSuccess, initialValues, type }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const { sendRequest } = useApiRequest();

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          object: initialValues.object || initialValues.id,
        });
      } else {
        form.resetFields();
      }

      if (type === 'individual') {
        sendRequest(`${import.meta.env.VITE_API_URL}/api/cashboxuser`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        })
          
          .then(setCashiers)
          .catch(() => message.error(t('salesPlan.form.loadCashiersError')));
      } else {
        sendRequest(`${import.meta.env.VITE_API_URL}/api/point`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        })
          
          .then(setPoints)
          .catch(() => message.error(t('salesPlan.form.loadPointsError')));
      }
    }
  }, [visible, initialValues, type, t]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const body = {
        plan: {
          object: values.object,
          daily: String(values.daily || 0),
          monthly: String(values.monthly || 0),
          quarterly: String(values.quarterly || 0),
          drate: String(values.drate || 0),
          mrate: String(values.mrate || 0),
          qrate: String(values.qrate || 0),
          yearly: 0,
          yrate: 0,
          type: type === 'individual' ? 1 : 3,
          deleted: false,
        },
      };

      await sendRequest(`${import.meta.env.VITE_API_URL}/api/salesplan/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(body),
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      message.error(t('salesPlan.form.saveError'));
    }
  };

  return (
    <Modal
      open={visible}
      title={initialValues ? t('salesPlan.form.editTitle') : t('salesPlan.form.addTitle')}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          daily: 0,
          monthly: 0,
          quarterly: 0,
          drate: 0,
          mrate: 0,
          qrate: 0,
        }}
      >
        {type === 'individual' ? (
          <Form.Item
            name="object"
            label={t('salesPlan.form.cashier')}
            rules={[{ required: true, message: t('salesPlan.form.selectCashier') }]}
          >
            <Select placeholder={t('salesPlan.form.selectCashier')}>
              {cashiers.map((c: any) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item
            name="object"
            label={t('salesPlan.form.point')}
            rules={[{ required: true, message: t('salesPlan.form.selectPoint') }]}
          >
            <Select placeholder={t('salesPlan.form.selectPoint')}>
              {points.map((p: any) => (
                <Option key={p.id} value={p.id}>
                  {p.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="daily" label={t('salesPlan.form.dailyPlan')}>
              <InputNumber
                min={0}
                className={styles.fullWidthInput}
                addonAfter="₸"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  const paste = e.clipboardData.getData('Text');
                  if (!/^\d+$/.test(paste)) e.preventDefault();
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="drate" label={t('salesPlan.form.dailyRate')}>
              <InputNumber
                min={0}
                max={100}
                className={styles.fullWidthInput}
                addonAfter="%"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  const paste = e.clipboardData.getData('Text');
                  if (!/^\d+$/.test(paste)) e.preventDefault();
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="monthly" label={t('salesPlan.form.monthlyPlan')}>
              <InputNumber
                min={0}
                className={styles.fullWidthInput}
                addonAfter="₸"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  const paste = e.clipboardData.getData('Text');
                  if (!/^\d+$/.test(paste)) e.preventDefault();
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="mrate" label={t('salesPlan.form.monthlyRate')}>
              <InputNumber
                min={0}
                max={100}
                className={styles.fullWidthInput}
                addonAfter="%"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  const paste = e.clipboardData.getData('Text');
                  if (!/^\d+$/.test(paste)) e.preventDefault();
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="quarterly" label={t('salesPlan.form.quarterlyPlan')}>
              <InputNumber
                min={0}
                className={styles.fullWidthInput}
                addonAfter="₸"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  const paste = e.clipboardData.getData('Text');
                  if (!/^\d+$/.test(paste)) e.preventDefault();
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="qrate" label={t('salesPlan.form.quarterlyRate')}>
              <InputNumber
                min={0}
                max={100}
                className={styles.fullWidthInput}
                addonAfter="%"
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  const paste = e.clipboardData.getData('Text');
                  if (!/^\d+$/.test(paste)) e.preventDefault();
                }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default SalesPlanForm;
