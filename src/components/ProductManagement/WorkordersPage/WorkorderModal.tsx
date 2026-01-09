import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, message } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './WorkordersPage.module.css';

interface Point {
  id: string;
  name: string;
  point_type: number;
  stockid: string;
}

interface WorkorderModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: { id?: string; workorder_number: number; point: string; counterparty?: string; };
}

interface Counterparty {
  id: string;
  name: string;
}

const WorkorderModal: React.FC<WorkorderModalProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  initialValues 
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Загрузка списка торговых точек
  /* useEffect(() => {
    if (visible) {
      const fetchPoints = async () => {
        try {
          const data = await sendRequest(`${API_URL}/api/revision/points`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          });
          setPoints(data || []);
        } catch (err) {
          console.error(err);
        }
      };
      fetchPoints();
         }
  }, [visible]); */

  useEffect(() => {
  if (!visible) return; // Сразу выходим, если не видно

  const loadData = async () => {
    setLoading(true); // Включаем спиннер
    try {
      // Запускаем оба запроса одновременно для скорости
      const [pointsData, counterpartiesData] = await Promise.all([
        sendRequest(`${API_URL}/api/revision/points`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }),
        sendRequest(`${API_URL}/api/counterparties`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        })
      ]);

      setPoints(pointsData || []);
      setCounterparties(counterpartiesData || []);
    } catch (err) {
      console.error('Error loading modal data:', err);
      message.error(t('workorder.common.loadError'));
    } finally {
      setLoading(false); // Выключаем спиннер
    }
  };

  loadData();
}, [visible]);

  // Установка значений при редактировании
  /* useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [visible, initialValues, form]); */

 useEffect(() => {
  if (visible) {
    if (initialValues?.id) {
      // При редактировании убеждаемся, что нет undefined
      form.setFieldsValue({
        point: initialValues.point || '',
        workorder_number: initialValues.workorder_number || 0,
        counterparty: (initialValues as any)?.counterparty || undefined
      });
    } else {
      // При создании нового заказа устанавливаем пустые, но определенные значения
      form.resetFields();
      form.setFieldsValue({
        point: undefined, // Для Select лучше оставить undefined, чтобы сработал placeholder
        workorder_number: null, // Для InputNumber используйте null
        counterparty: (initialValues as any)?.counterparty || undefined
      });
    }
  }
}, [visible, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const body = {
        workorder_number: values.workorder_number,
        point: values.point,
        counterparty: values.counterparty,
        // Если это редактирование, обычно передается ID
        ...(initialValues?.id && { id: initialValues.id }) 
      };

      const response = await sendRequest(`${API_URL}/api/workorder/manage`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify(body),
    });

    // ПРОВЕРКА НА БИЗНЕС-ОШИБКУ ОТ СЕРВЕРА
    // Так как ответ может быть массивом [ { workorder_management: ... } ]
    const errorData = Array.isArray(response) ? response[0] : response;

    if (errorData?.workorder_management?.code === 'exception') {
      // Выводим текст ошибки напрямую из ответа сервера
      message.error(errorData.workorder_management.text);
      setLoading(false);
      return; // Прекращаем выполнение, не закрываем модалку
    }

      message.success(t('workorder.submitSuccess'));
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error(t('workorder.submitError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? t('workorder.modalTitleEdit') : t('workorder.modalTitleAdd')}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={t('workorder.common.save')}
      cancelText={t('workorder.common.cancel')}
      forceRender
      destroyOnHidden
    >
      <Form form={form} layout="vertical" name="workorder_form"
      /* initialValues={initialValues} */
      initialValues={{
      workorder_number: 0,
      point: undefined
    }}
      >
        <Form.Item
          name="point"
          label={t('workorder.pointLabel')}
          rules={[{ required: true, message: t('workorder.common.required') }]}
        >
          <Select placeholder={t('workorder.pointPlaceholder')}>
            {points.map(p => (
              <Select.Option key={p.id} value={p.stockid}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="counterparty" label={t('workorder.counterparty')} rules={[{ required: true }]}>
                  <Select showSearch optionFilterProp="children">
                    {counterparties.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
                  </Select>
        </Form.Item>

        <Form.Item
          name="workorder_number"
          label={t('workorder.numberLabel')}
          rules={[{ required: true, message: t('workorder.common.required') }]}
        >
          <InputNumber 
            className={styles.fullWidthInput}
            placeholder={t('workorder.numberPlaceholder')}
            precision={0} // Только целые числа
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default WorkorderModal;