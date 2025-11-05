import React, { useState } from 'react';
import { Button, Upload, message, Table, Select, Space } from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  SaveOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import * as XLSX from 'xlsx';
import './GiftCertificates.css';

const { Option } = Select;
const { Dragger } = Upload;

const GiftCertificates: React.FC = () => {
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [stockPoints, setStockPoints] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<any[]>([]);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/files/download?file=template_cert.xlsx`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_cert.xlsx';
      link.click();
      message.success(t('gift.templateDownloaded'));
    } catch {
      message.error(t('gift.templateDownloadError'));
    }
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            reject(new Error(t('gift.emptyFile')));
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const sheetData: Array<Array<string | number | undefined>> =
            XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const dataRows = sheetData.slice(1);
          const filteredRows = dataRows.filter(row => row[0]);

          const result = filteredRows.map((row) => ({
            code: String(row[0]),
            balance: Number(row[1]),
            period: Number(row[2]),
            selldate: String(row[3]),
          }));

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  };

  const handleFileChange = (info: any) => {
    if (info.fileList.length > 0) {
      const uploadedFile = info.fileList[0].originFileObj;
      if (uploadedFile) {
        setFile(uploadedFile);
        parseExcelFile(uploadedFile)
          .then((data) => {
            setParsedData(data);
            setCertificates([]);
            message.success(t('gift.loadSuccess'));
          })
          .catch(() => {
            message.error(t('gift.parseError'));
          });
      } else {
        message.warning(t('gift.noFile'));
      }
    } else {
      setFile(null);
      setParsedData([]);
      setCertificates([]);
    }
  };

  const handleProcessUpload = async () => {
    if (!parsedData.length) {
      message.warning(t('gift.uploadFirst'));
      return;
    }

    try {
      const payload = parsedData.map((cert) => ({
        Code: String(cert.code),
        Balance: Number(cert.balance),
        Period: cert.period,
        Selldate: String(cert.selldate),
      }));

      const formBody = new URLSearchParams();
      formBody.append('giftcards', JSON.stringify(payload));

      const uploadResponse = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/giftcertificates/acceptance_xls`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
          body: formBody.toString(),
        }
      );

      setCertificates(uploadResponse.text || []);

      const allocations = (uploadResponse.count || []).map((item: any) => ({
        point: selectedPoint || '',
        balance: item.balance,
        units: item.count,
      }));
      setAllocation(allocations);

      const stocks = await sendRequest(`${import.meta.env.VITE_API_URL}/api/stock`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });
      setStockPoints(stocks);

      message.success(t('gift.processSuccess'));
    } catch (err) {
      console.error(err);
      message.error(t('gift.uploadError'));
    }
  };

  const handleSave = async () => {
    if (!selectedPoint) {
      message.warning(t('gift.selectStock'));
      return;
    }

    const preparedAllocations = allocation.map((a) => ({
      ...a,
      point: selectedPoint,
    }));

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/giftcertificates/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({
          giftcards: certificates,
          allocation: preparedAllocations,
        }),
      });

      message.success(t('gift.saveSuccess'));
    } catch {
      message.error(t('gift.saveError'));
    }
  };

  return (
    <Space direction="vertical" className="gift-wrapper">
      <Button
        icon={<DownloadOutlined />}
        onClick={handleDownloadTemplate}
        className="gift-download-button"
      >
        {t('gift.downloadTemplate')}
      </Button>

      <Dragger
        accept=".xls,.xlsx"
        beforeUpload={() => false}
        maxCount={1}
        onChange={handleFileChange}
        className="gift-dragger"
      >
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">{t('gift.dragFileHere')}</p>
        <p className="ant-upload-hint">{t('gift.fileHint')}</p>
      </Dragger>

      <Button
        type="primary"
        icon={<CloudUploadOutlined />}
        onClick={handleProcessUpload}
        className="gift-upload-button"
      >
        {t('gift.processUpload')}
      </Button>

      {certificates.length > 0 && (
        <>
          <Select
            placeholder={t('gift.selectStock')}
            value={selectedPoint || undefined}
            onChange={setSelectedPoint}
            className="gift-stock-select"
          >
            {stockPoints.map((s: any) => (
              <Option key={s.id} value={s.id}>
                {s.name}
              </Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!selectedPoint}
            className="gift-save-button"
          >
            {t('gift.save')}
          </Button>

          <Table
            dataSource={certificates}
            rowKey="code"
            columns={[
              {
                title: '№',
                render: (_: any, __: any, index: number) => index + 1,
              },
              {
                title: t('gift.code'),
                dataIndex: 'code',
              },
              {
                title: t('gift.balance'),
                dataIndex: 'balance',
              },
              {
                title: t('gift.period'),
                dataIndex: 'period',
              },
              {
                title: t('gift.selldate'),
                dataIndex: 'selldate',
              },
            ]}
            rowClassName={(record) =>
              record.status === 'ok' ? 'row-ok' : 'row-error'
            }
            pagination={false}
            className="gift-table"
          />
        </>
      )}
    </Space>
  );
};

export default GiftCertificates;
