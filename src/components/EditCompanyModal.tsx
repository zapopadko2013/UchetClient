import React, { useEffect } from 'react';
import { Form, Input, DatePicker, Switch, Row, Col, Modal, Button, message, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';
import useApiRequest from '../hooks/useApiRequest';
import './EditCompanyModal.css';

const { Text } = Typography;

// Определение типа для данных формы
interface FormValues {
    name: string;
    bin: string;
    address: string;
    head: string;
    headIin: string;
    accountant: string;
    accountantIin: string;
    certificatenum: number;
    certificateseries: number;
    certificatedate: Dayjs | null;
    wholesale: boolean;
}

// Определение типа для props компонента модального окна
interface EditCompanyModalProps {
    visible: boolean;
    onClose: () => void;
    onUpdateSuccess: () => void;
    initialData: any;
}

/**
 * Модальное окно для редактирования данных компании.
 *
 * @param {boolean} visible - Флаг видимости модального окна.
 * @param {Function} onClose - Функция для закрытия модального окна.
 * @param {Function} onUpdateSuccess - Функция обратного вызова при успешном обновлении.
 * @param {object} initialData - Начальные данные для заполнения формы.
 */
const EditCompanyModal: React.FC<EditCompanyModalProps> = ({ visible, onClose, onUpdateSuccess, initialData }) => {
    const { t } = useTranslation();
    const { loading, sendRequest } = useApiRequest();
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible && initialData) {
            // Преобразуем строку даты в объект Dayjs перед тем как передать в форму
            const formattedData = {
                ...initialData,
                certificatedate: initialData.certificatedate && dayjs(initialData.certificatedate).isValid()
                    ? dayjs(initialData.certificatedate)
                    : null,
            };
            form.setFieldsValue(formattedData);
        }
    }, [visible, initialData, form]);

    const handleFormSubmit = async (values: FormValues) => {
        try {
            const apiUrl = `${import.meta.env.VITE_API_URL}/api/company/manage`;
            // Объединяем данные формы с неизменяемыми данными из initialData
            const combinedData = {
                ...initialData,
                ...values,
            };

            // Преобразуем дату в строку ISO, если она валидна
            const formattedDate = combinedData.certificatedate && dayjs(combinedData.certificatedate).isValid()
                ? dayjs(combinedData.certificatedate).toISOString()
                : null;
            
            // Оборачиваем данные в объект `company` и добавляем ID
            const requestBody = {
                company: {
                    ...combinedData,
                    certificatedate: formattedDate,
                    id: initialData.id,
                },
            };

            await sendRequest(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'
                    ,Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,


                 },
                body: JSON.stringify(requestBody),
            });

            message.success(t('companyPage.successUpdate'));
            onUpdateSuccess();
        } catch (error) {
            message.error(t('companyPage.errorUpdate'));
        }
    };

    return (
        <Modal
            title={t('companyPage.modalTitle')}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>
                    {t('companyPage.cancelButton')}
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={form.submit}>
                    {t('companyPage.saveButton')}
                </Button>,
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFormSubmit}
            >
                <Row gutter={24}>
                    <Col span={24}><Form.Item label={t('companyPage.name')} name="name"><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label={t('companyPage.bin')}><Text strong>{initialData?.bin}</Text></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label={t('companyPage.address')} name="address"><Input /></Form.Item></Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} sm={12}><Form.Item label={t('companyPage.head')} name="head"><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label={t('companyPage.headIin')} name="headIin"><Input /></Form.Item></Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} sm={12}><Form.Item label={t('companyPage.accountant')} name="accountant"><Input /></Form.Item></Col>
                    <Col xs={24} sm={12}><Form.Item label={t('companyPage.accountantIin')} name="accountantIin"><Input /></Form.Item></Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} sm={8}>
                        <Form.Item label={t('companyPage.certificatenum')}>
                           <Text strong>{initialData?.certificatenum}</Text>
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item label={t('companyPage.certificateseries')}>
                            <Text strong>{initialData?.certificateseries}</Text>
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item label={t('companyPage.certificatedate')}>
                             <Text strong>
                                 {initialData?.certificatedate && dayjs(initialData.certificatedate).isValid()
                                    ? dayjs(initialData.certificatedate).format('YYYY-MM-DD')
                                    : ''}
                             </Text>
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={24}>
                    <Col xs={24} sm={12}><Form.Item label={t('companyPage.wholesale')} name="wholesale" valuePropName="checked"><Switch /></Form.Item></Col>
                </Row>
            </Form>
        </Modal>
    );
};

export default EditCompanyModal;
