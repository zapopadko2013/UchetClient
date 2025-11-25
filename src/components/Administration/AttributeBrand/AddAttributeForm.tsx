import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, message, Space } from 'antd';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import useApiRequest from '../../../hooks/useApiRequest';

interface AttributeFormat {
  label: string;
  value: string;
}

interface AttributeData {
  id?: number;
  values: string;
  format: string | AttributeFormat;
  deleted?: boolean;
}

interface AddAttributeFormProps {
  attributeData?: AttributeData; // атрибут для редактирования, если есть
  onSave?: () => void; // вызывается после успешного сохранения
  onCancel?: () => void; // вызывается при закрытии формы
}

const AddAttributeForm: React.FC<AddAttributeFormProps> = ({
  attributeData,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation(); // Инициализация хука перевода
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [formats, setFormats] = useState<AttributeFormat[]>([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    fetchFormats();

    if (attributeData) {
      form.setFieldsValue({
        values: attributeData.values,
        format: attributeData.format,
      });
    }
  }, [attributeData]);

  const fetchFormats = async () => {
    try {
      const res = await sendRequest(`${API_URL}/api/attributes/getformat`, {
        headers: getHeaders(),
      });

      // ПРИМЕЧАНИЕ: Здесь предполагается, что item.description уже переведено
      // Если нет, то нужно переводить здесь, например: label: t(`formats.${item.name}`)
      setFormats(res.map((item: any) => ({
        label: item.description,
        value: item.name,
      })));
    } catch (err) {
      // Перевод: Ошибка загрузки форматов
      message.error(t('adminattributes.error.loadFormats')); 
    }
  };

  const onSubmit = async (values: any) => {
    setLoading(true);

    const payload = {
      attributes: {
        id: attributeData?.id,
        name: values.values,
        deleted: false,
        format: values.format,
      },
    };

    try {
      await sendRequest(`${API_URL}/api/adminpage/updateattributeslist`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      // Перевод: Изменения сохранены / Атрибут создан
      message.success(
        attributeData 
          ? t('adminattributes.success.changesSaved') 
          : t('adminattributes.success.attributeCreated')
      );

      onSave?.(); // вызываем колбек родителю
      form.resetFields();
    } catch (err: any) {
      // Перевод: Ошибка при сохранении атрибута
      message.error(err?.response?.data?.text || t('adminattributes.error.save'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        name="values"
        // Перевод: Наименование атрибута
        label={t('adminattributes.form.nameLabel')} 
        // Перевод: Введите название атрибута
        rules={[{ required: true, message: t('adminattributes.form.nameRequired') }]}
      >
        {/* Перевод: Введите наименование */}
        <Input placeholder={t('adminattributes.form.namePlaceholder')} /> 
      </Form.Item>

      <Form.Item
        name="format"
        // Перевод: Тип
        label={t('adminattributes.form.typeLabel')} 
        // Перевод: Выберите тип
        rules={[{ required: true, message: t('adminattributes.form.typeRequired') }]}
      >
        {/* Перевод: Выберите тип атрибута */}
        <Select placeholder={t('adminattributes.form.typePlaceholder')} options={formats} allowClear />
      </Form.Item>

      <Space>
        <Button type="primary" htmlType="submit" loading={loading}>
          {/* Перевод: Сохранить изменения / Добавить */}
          {attributeData ? t('adminattributes.form.saveChanges') : t('adminattributes.form.add')}
        </Button>

        <Button htmlType="button" onClick={onCancel} disabled={loading}>
          {/* Перевод: Отмена */}
          {t('adminattributes.common.cancel')} 
        </Button>
      </Space>
    </Form>
  );
};

export default AddAttributeForm;