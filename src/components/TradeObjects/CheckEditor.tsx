import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Checkbox, message, Row, Col, Select, Upload, Button
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import useApiRequest from '../../hooks/useApiRequest';
import Barcode from 'react-barcode';
import styles from './CheckEditor.module.css'

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

interface Props {
  visible: boolean;
  onClose: () => void;
  t: (key: string) => string;  // функция для локализации
}

const defaultJson = {
  BIN: true,
  NDS: true,
  ZNM: true,
  RNM: true,
  point: '',
  address: '',
  company: 'TOO',
  displayFile: '',
  thanksMessage: 'Спасибо за покупку.',
  advertisementMessage: '',
};

const CheckEditor: React.FC<Props> = ({ visible, onClose, t }) => {
  const { sendRequest } = useApiRequest();
  const [form] = Form.useForm();
  const [tradePoints, setTradePoints] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState(defaultJson);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>(undefined);

  // Массив товаров (ключ локализации, количество, цена)
  const [products, setProducts] = useState([
    { key: 'checkEditor.products.apricotPuree', quantity: 'x1,000', price: '311KZT' },
    { key: 'checkEditor.products.cabbagePuree', quantity: 'x1,000', price: '1199KZT' },
    { key: 'checkEditor.products.certificate5000', quantity: 'x1,000', price: '5000KZT' },
  ]);

  // Массив платежей (ключ локализации, сумма)
  const [payments, setPayments] = useState([
    { key: 'checkEditor.labels.cashPayment', value: '5000.0' },
    { key: 'checkEditor.labels.receivedFromClient', value: '5000KZT' },
    { key: 'checkEditor.labels.change', value: '0KZT' },
    { key: 'checkEditor.labels.cardPayment', value: '1530.0' },
  ]);

  const loadPoints = async () => {
    try {
      const result = await sendRequest(`${import.meta.env.VITE_API_URL}/api/point`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
      });
      setTradePoints(result);
    } catch {
      message.error(t('checkEditor.messages.loadPointsError'));
    }
  };

  const loadTemplate = async (point: string) => {
    try {
      const result = await sendRequest(`${import.meta.env.VITE_API_URL}/api/ticketformat?point=${point}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
      });

      const json = result?.json || defaultJson;
      form.setFieldsValue(json);
      setPreviewData(json);
    } catch {
      message.error(t('checkEditor.messages.loadTemplateError'));
    }
  };

  useEffect(() => {
    if (visible) {
      loadPoints();
      setSelectedPointId(undefined);
      form.resetFields();
      setPreviewData(defaultJson);
    }
  }, [visible]);

  const onValuesChange = (_: any, allValues: any) => {
    setPreviewData(allValues);
  };

  const handlePointChange = (value: string) => {
    setSelectedPointId(value);
    loadTemplate(value);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      let uploadedFileUrl = previewData.displayFile;

      const isBase64Image = uploadedFileUrl?.startsWith('data:image');

      if (isBase64Image) {
        const formData = new FormData();
        const blob = await fetch(uploadedFileUrl).then(res => res.blob());
        formData.append('file', blob);
        formData.append('type', 'logo');

        const uploadResponse = await sendRequest(`${import.meta.env.VITE_API_URL}/api/files/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
          body: formData,
        });

        message.success(t('checkEditor.messages.logoSaved'));

        uploadedFileUrl = `${import.meta.env.VITE_API_URL}${uploadResponse.file.slice(1)}`;
      }

      const payload = {
        point: selectedPointId,
        ticketFormat: {
          ...values,
          displayFile: uploadedFileUrl || '',
        },
      };

      const saveResponse = await sendRequest(`${import.meta.env.VITE_API_URL}/api/ticketformat/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (saveResponse.code !== 'success') {
        throw new Error(saveResponse.text || t('checkEditor.messages.saveError'));
      }

      message.success(t('checkEditor.messages.templateSaved'));
      onClose();
    } catch (error: any) {
      console.error(error);
      message.error(error.message || t('checkEditor.messages.unknownError'));
    }
  };

  return (
    <Modal
      title={t('checkEditor.modalTitle')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      {/* <Form layout="vertical" form={form} onValuesChange={onValuesChange}>
        <Form.Item label={t('checkEditor.labels.selectTradePoint')}>
          <Select
            placeholder={t('checkEditor.labels.selectTradePoint')}
            value={selectedPointId}
            onChange={handlePointChange}
            style={{ width: '100%' }}
          >
            {tradePoints.map((point) => (
              <Option key={point.id} value={point.id}>
                {point.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedPointId && (
          <div style={{ marginBottom: 60 }}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ border: '1px solid #ccc', padding: 12, height: '100%' }}>
                  <Form.Item name="displayFile" hidden>
                    <Input />
                  </Form.Item>

                  <Form.Item label={t('checkEditor.labels.uploadLogo')} style={{ marginBottom: 8 }}>
                    <Dragger
                      accept="image/*"
                      showUploadList={false}
                      customRequest={({ file, onSuccess }) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          form.setFieldValue('displayFile', result);
                          setPreviewData(prev => ({ ...prev, displayFile: result }));
                          onSuccess && onSuccess({}, file);
                        };
                        reader.readAsDataURL(file as Blob);
                      }}
                      style={{ padding: 8 }}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">{t('checkEditor.labels.dropOrSelectFile')}</p>
                    </Dragger>
                  </Form.Item>

                  <Form.Item
                    name="point"
                    rules={[{ required: true, message: t('checkEditor.messages.loadPointsError') }]}
                    style={{ marginBottom: 6 }}
                    label={t('checkEditor.labels.tradePoint')}
                  >
                    <Input placeholder={t('checkEditor.placeholders.tradePoint')} size="small" />
                  </Form.Item>

                  <Form.Item
                    name="address"
                    rules={[{ required: true, message: t('checkEditor.messages.loadTemplateError') }]}
                    style={{ marginBottom: 6 }}
                    label={t('checkEditor.labels.address')}
                  >
                    <Input placeholder={t('checkEditor.placeholders.address')} size="small" />
                  </Form.Item>

                  <Form.Item
                    name="company"
                    rules={[{ required: true, message: t('checkEditor.messages.saveError') }]}
                    style={{ marginBottom: 6 }}
                    label={t('checkEditor.labels.company')}
                  >
                    <Input placeholder={t('checkEditor.placeholders.company')} size="small" />
                  </Form.Item>

                  <Row gutter={[8, 0]} style={{ marginBottom: 4 }}>
                    <Col span={12}>
                      <Form.Item name="BIN" valuePropName="checked" style={{ marginBottom: 2 }}>
                        <Checkbox>{t('checkEditor.checkboxes.BIN')}</Checkbox>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="NDS" valuePropName="checked" style={{ marginBottom: 2 }}>
                        <Checkbox>{t('checkEditor.checkboxes.NDS')}</Checkbox>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="ZNM" valuePropName="checked" style={{ marginBottom: 2 }}>
                        <Checkbox>{t('checkEditor.checkboxes.ZNM')}</Checkbox>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="RNM" valuePropName="checked" style={{ marginBottom: 2 }}>
                        <Checkbox>{t('checkEditor.checkboxes.RNM')}</Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name="thanksMessage" style={{ marginBottom: 6 }}>
                    <Input placeholder={t('checkEditor.placeholders.thanks')} size="small" />
                  </Form.Item>

                  <Form.Item name="advertisementMessage" style={{ marginBottom: 0 }}>
                    <TextArea
                      rows={3}
                      placeholder={t('checkEditor.placeholders.advertisement')}
                      maxLength={300}
                      style={{
                        resize: 'none',
                        fontSize: 14,
                        lineHeight: '1.5',
                        padding: '6px 10px',
                        minHeight: 72,
                      }}
                    />
                  </Form.Item>
                </div>
              </Col>

              <Col span={12}>
                <div style={{ border: '1px solid #ccc', padding: 12, height: '100%', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {previewData.displayFile && (
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <img
                        src={previewData.displayFile}
                        alt={t('checkEditor.labels.logo')}
                        style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  <div style={{ textAlign: 'center', fontSize: 14 }}>
                    <div>{previewData.point?.trim() || t('checkEditor.placeholders.tradePoint')}</div>
                    <div>{previewData.address?.trim() || t('checkEditor.placeholders.address')}</div>
                    <div>{previewData.company?.trim() || t('checkEditor.placeholders.company')}</div>

                    <div style={{ textAlign: 'left', whiteSpace: 'nowrap', paddingLeft: 12 }}>
                      {previewData.BIN && <div>{t('checkEditor.checkboxes.BIN')}: 123456789012</div>}
                      {previewData.NDS && <div>{t('checkEditor.checkboxes.NDS')}: 1234567 44 от 06.01.2020</div>}
                      {previewData.ZNM && <div>{t('checkEditor.checkboxes.ZNM')}: 0000000050</div>}
                      {previewData.RNM && <div>{t('checkEditor.checkboxes.RNM')}: 010100101234</div>}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px dashed #999', paddingTop: 8, marginBottom: 8, fontSize: 14, lineHeight: '1.4', fontFamily: 'monospace' }}>
                    <div style={{ marginBottom: 12 }}>
  <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>
    {t('checkEditor.labels.goodsReceipt')}
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#555' }}>
    <div>02.03.2020 16:02:20</div>
    <div>145</div>
  </div>
</div>
                    <div >
                      {t('checkEditor.labels.sale')}
                    </div>
                    
                    {products.map(({ key, quantity, price }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t(key)}</span>
                        <div style={{ textAlign: 'center', flexShrink: 0, width: 80 }}>{quantity}</div>
                        <span style={{ textAlign: 'right', flexShrink: 0, width: 80 }}>{price}</span>
                      </div>
                    ))}

                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('checkEditor.labels.totalProducts')}:</span>
                        <span>3,000</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('checkEditor.labels.totalAmount')}:</span>
                        <span>6530KZT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('checkEditor.labels.discountOnCheck')}:</span>
                        <span>0KZT</span>
                      </div>
                      <div style={{ display: 'flex', fontWeight: 'bold', justifyContent: 'space-between' }}>
                        <span>{t('checkEditor.labels.finalTotal')}:</span>
                        <span>6530KZT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('checkEditor.labels.totalDiscounts')}:</span>
                        <span>0KZT</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('checkEditor.labels.vatIncluded')}:</span>
                        <span>0KZT</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 6, fontWeight: 'bold' }}>
                      {t('checkEditor.labels.mixedPayment')}
                    </div>

                   
                    {payments.map(({ key, value }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t(key)}</span>
                        <span>{value}</span>
                      </div>
                    ))}

                    <div style={{ marginTop: 6 }}>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>{t('checkEditor.labels.cashier')}</span>
    <span>TEST</span>
  </div>
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span>{t('checkEditor.labels.terminal')}</span>
    <span>20</span>
  </div>
</div>

<div style={{ marginTop: 8, textAlign: 'center' }}>
  {previewData.thanksMessage || t('checkEditor.labels.thanks')}
  </div>
   <div style={{ marginTop: 20, textAlign: 'center' }}> 
    <Barcode value="1234567890123" height={40} /> 
    </div> 
    <div
  style={{
    marginTop: 8,
    textAlign: 'center',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }}
>
  {previewData.advertisementMessage}
</div>
                    </div>
                </div>
              </Col>
            </Row>

            <div style={{ textAlign: 'right', marginTop: 40, paddingBottom: 5 }}>
  <Button style={{ marginRight: 8 }} onClick={onClose}>
    {t('checkEditor.buttons.cancel')}
  </Button>
  <Button
    type="primary"
    disabled={!selectedPointId}
    onClick={handleSave}
  >
    {t('checkEditor.buttons.save')}
  </Button>
</div>
          </div>
        )}
      </Form> */}

<Form layout="vertical" form={form} onValuesChange={onValuesChange}>
  <Form.Item label={t('checkEditor.labels.selectTradePoint')}>
    <Select
      placeholder={t('checkEditor.labels.selectTradePoint')}
      value={selectedPointId}
      onChange={handlePointChange}
      className={styles.fullWidth}
    >
      {tradePoints.map((point) => (
        <Option key={point.id} value={point.id}>
          {point.name}
        </Option>
      ))}
    </Select>
  </Form.Item>

  {selectedPointId && (
    <div className={styles.marginBottom60}>
      <Row gutter={16}>
        <Col span={12}>
          <div className={styles.formBlock}>
            <Form.Item name="displayFile" hidden>
              <Input />
            </Form.Item>

            <Form.Item
              label={t('checkEditor.labels.uploadLogo')}
              className={styles.marginBottom2}
            >
              <Dragger
                accept="image/*"
                showUploadList={false}
                customRequest={({ file, onSuccess }) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    form.setFieldValue('displayFile', result);
                    setPreviewData((prev) => ({ ...prev, displayFile: result }));
                    onSuccess && onSuccess({}, file);
                  };
                  reader.readAsDataURL(file as Blob);
                }}
                className={styles.dragger}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">{t('checkEditor.labels.dropOrSelectFile')}</p>
              </Dragger>
            </Form.Item>

            <Form.Item
              name="point"
              rules={[{ required: true, message: t('checkEditor.messages.loadPointsError') }]}
              label={t('checkEditor.labels.tradePoint')}
              className={styles.marginBottom2}
            >
              <Input placeholder={t('checkEditor.placeholders.tradePoint')} size="small" />
            </Form.Item>

            <Form.Item
              name="address"
              rules={[{ required: true, message: t('checkEditor.messages.loadTemplateError') }]}
              label={t('checkEditor.labels.address')}
              className={styles.marginBottom2}
            >
              <Input placeholder={t('checkEditor.placeholders.address')} size="small" />
            </Form.Item>

            <Form.Item
              name="company"
              rules={[{ required: true, message: t('checkEditor.messages.saveError') }]}
              label={t('checkEditor.labels.company')}
              className={styles.marginBottom2}
            >
              <Input placeholder={t('checkEditor.placeholders.company')} size="small" />
            </Form.Item>

            <Row gutter={[8, 0]} className={styles.checkboxesRow}>
              <Col span={12}>
                <Form.Item name="BIN" valuePropName="checked" className={styles.checkboxItem}>
                  <Checkbox>{t('checkEditor.checkboxes.BIN')}</Checkbox>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="NDS" valuePropName="checked" className={styles.checkboxItem}>
                  <Checkbox>{t('checkEditor.checkboxes.NDS')}</Checkbox>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ZNM" valuePropName="checked" className={styles.checkboxItem}>
                  <Checkbox>{t('checkEditor.checkboxes.ZNM')}</Checkbox>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="RNM" valuePropName="checked" className={styles.checkboxItem}>
                  <Checkbox>{t('checkEditor.checkboxes.RNM')}</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="thanksMessage" className={styles.marginBottom6}>
              <Input placeholder={t('checkEditor.placeholders.thanks')} size="small" />
            </Form.Item>

            <Form.Item name="advertisementMessage" className={styles.marginBottom0}>
  <TextArea
    rows={3}
    placeholder={t('checkEditor.placeholders.advertisement')}
    maxLength={300}
    className={styles.textarea}
  />
</Form.Item>
          </div>
        </Col>

        <Col span={12}>
          <div className={styles.previewContainer}>
            {previewData.displayFile && (
              <div className={styles.logoPreview}>
                <img
                  src={previewData.displayFile}
                  alt={t('checkEditor.labels.logo')}
                  className={styles.logoImg}
                />
              </div>
            )}

            <div className={styles.previewText}>
              <div>{previewData.point?.trim() || t('checkEditor.placeholders.tradePoint')}</div>
              <div>{previewData.address?.trim() || t('checkEditor.placeholders.address')}</div>
              <div>{previewData.company?.trim() || t('checkEditor.placeholders.company')}</div>

              <div className={styles.detailsBlock}>
                {previewData.BIN && <div>{t('checkEditor.checkboxes.BIN')}: 123456789012</div>}
                {previewData.NDS && <div>{t('checkEditor.checkboxes.NDS')}: 1234567 44 от 06.01.2020</div>}
                {previewData.ZNM && <div>{t('checkEditor.checkboxes.ZNM')}: 0000000050</div>}
                {previewData.RNM && <div>{t('checkEditor.checkboxes.RNM')}: 010100101234</div>}
              </div>
            </div>

            <div className={styles.receiptBlock}>
              <div className={styles.marginBottom12}>
                <div className={styles.receiptHeader}>
                  {t('checkEditor.labels.goodsReceipt')}
                </div>
                <div className={styles.receiptMeta}>
                  <div>02.03.2020 16:02:20</div>
                  <div>145</div>
                </div>
              </div>

              <div>{t('checkEditor.labels.sale')}</div>

              {products.map(({ key, quantity, price }) => (
                <div key={key} className={styles.flexBetween}>
                  <span>{t(key)}</span>
                  <div className={styles.productQuantity}>{quantity}</div>
                  <span className={styles.productPrice}>{price}</span>
                </div>
              ))}

              <div className={styles.marginTop8}>
                <div className={styles.flexBetween}>
                  <span>{t('checkEditor.labels.totalProducts')}:</span>
                  <span>3,000</span>
                </div>
                <div className={styles.flexBetween}>
                  <span>{t('checkEditor.labels.totalAmount')}:</span>
                  <span>6530KZT</span>
                </div>
                <div className={styles.flexBetween}>
                  <span>{t('checkEditor.labels.discountOnCheck')}:</span>
                  <span>0KZT</span>
                </div>
                <div className={`${styles.flexBetween} ${styles.bold}`}>
                  <span>{t('checkEditor.labels.finalTotal')}:</span>
                  <span>6530KZT</span>
                </div>
                <div className={styles.flexBetween}>
                  <span>{t('checkEditor.labels.totalDiscounts')}:</span>
                  <span>0KZT</span>
                </div>
                <div className={styles.flexBetween}>
                  <span>{t('checkEditor.labels.vatIncluded')}:</span>
                  <span>0KZT</span>
                </div>
              </div>

              <div className={`${styles.marginTop6} ${styles.bold}`}>
                {t('checkEditor.labels.mixedPayment')}
              </div>

              {payments.map(({ key, value }) => (
                <div key={key} className={styles.flexBetween}>
                  <span>{t(key)}</span>
                  <span>{value}</span>
                </div>
              ))}

              <div className={styles.marginTop6}>
                <div className={styles.flexBetween}>
                  <span>{t('checkEditor.labels.cashier')}</span>
                  <span>TEST</span>
                </div>
                <div className={styles.flexBetween}>
                  <span>{t('checkEditor.labels.terminal')}</span>
                  <span>20</span>
                </div>
              </div>

              <div className={`${styles.marginTop8} ${styles.textCenter}`}>
                {previewData.thanksMessage || t('checkEditor.labels.thanks')}
              </div>

              <div className={styles.barcodeWrapper}>
                <Barcode value="1234567890123" height={40} />
              </div>

              <div className={styles.advertisement}>
                {previewData.advertisementMessage}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <div className={styles.actions}>
        <Button className={styles.marginRight8} onClick={onClose}>
          {t('checkEditor.buttons.cancel')}
        </Button>
        <Button type="primary" disabled={!selectedPointId} onClick={handleSave}>
          {t('checkEditor.buttons.save')}
        </Button>
      </div>
    </div>
  )}
</Form>

    </Modal>
  );
};

export default CheckEditor;
