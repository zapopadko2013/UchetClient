import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Upload,
  Table,
  Space,
  Typography,
  message,
  Modal,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { read, utils } from 'xlsx';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest'; // Предполагаем, что этот хук доступен
import styles from './ImpNomenclature.module.css';

const { Title, Text } = Typography;
const { Option } = Select;

// --- ТИПЫ ДАННЫХ ---

interface SelectOption {
  value: string | number;
  label: string;
}

interface FileEntry {
  name: string;
  idx: number; // Используется для ключа в таблице
}

interface FormValues {
  companySelect: string;
  stockSelect: string;
  companyNDS: string;
  contrSelect: string;
}

// --- КОНСТАНТЫ И URL ---

const API_URL = import.meta.env.VITE_API_URL || '';
const FOLDER = './public/imp_log';

// --- КОМПОНЕНТ ---

const ImpNomenclature: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormValues>();
  const { sendRequest } = useApiRequest();

  // Состояния для данных
  const [companies, setCompanies] = useState<SelectOption[]>([]);
  const [stocks, setStocks] = useState<SelectOption[]>([]);
  const [counterparties, setCounterparties] = useState<SelectOption[]>([]);
  const [filesList, setFilesList] = useState<string[]>([]);

  // Состояния для импорта
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Состояния для модального окна ошибок (кириллица)
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- API HEADERS ---
  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  // --- ЗАГРУЗКА ДАННЫХ ---

  const getFiles = useCallback(async () => {
    try {


      const url = new URL(`${API_URL}/api/files`);
      url.searchParams.append('folder', FOLDER.toString());

      const res: string[] = await sendRequest(url.toString(), { 
        method: 'GET',
        headers: getHeaders()
      }); 
     

      /* const res: string[] = await sendRequest(`${API_URL}/api/files`, {
        method: 'GET',
        params: { folder: FOLDER },
        headers: getHeaders(),
      }); */

      setFilesList(res);
    } catch (err) {
      message.error(t('nomenclature.filesLoadError', { defaultValue: 'Ошибка загрузки списка файлов.' }));
      console.error(err);
    }
  }, [sendRequest, getHeaders, t, API_URL]);

  const getCompaniesInfo = useCallback(async () => {
    try {
      // Использование нового URL для получения компаний
      const list: any[] = await sendRequest(`${API_URL}/api/adminpage/companies`, {
        method: 'GET',
        headers: getHeaders(),
      });
      const companiesChanged: SelectOption[] = list.map((result) => ({
        label: result.name,
        value: result.id,
      }));
      setCompanies(companiesChanged);
    } catch (err) {
      message.error(t('nomenclature.companiesLoadError', { defaultValue: 'Ошибка загрузки списка компаний.' }));
      console.error(err);
    }
  }, [sendRequest, getHeaders, t, API_URL]);

  useEffect(() => {
    getCompaniesInfo();
    getFiles();
  }, [getCompaniesInfo, getFiles]);

  // --- ЛОГИКА ВЫБОРА ---

  const getStocksByCompany = useCallback(async (companyId: string) => {
    try {

      
      const url = new URL(`${API_URL}/api/stock`);
      url.searchParams.append('companyId', companyId.toString());

       const res: any[] = await sendRequest(url.toString(), { 
        method: 'GET',
        headers: getHeaders()
      }); 

      /* const res: any[] = await sendRequest(`${API_URL}/api/stock`, {
        method: 'GET',
        params: { companyId },
        headers: getHeaders(),
      }); */
      const stocksChanged: SelectOption[] = res.map((r) => ({
        value: r.id,
        label: r.name,
      }));
      stocksChanged.push({ value: "0", label: t('nomenclature.allStocks', { defaultValue: "Все склады" }) });
      setStocks(stocksChanged);
      form.setFieldsValue({ stockSelect: stocksChanged[0]?.value.toString() || '0' });
    } catch (err) {
      message.error(t('nomenclature.stocksLoadError', { defaultValue: 'Ошибка загрузки списка складов.' }));
      console.error(err);
    }
  }, [sendRequest, getHeaders, t, API_URL, form]);

  const getCounterparties = useCallback(async (companyId: string) => {
    try {


      const url = new URL(`${API_URL}/api/counterparties`);
      url.searchParams.append('companyId', companyId.toString());

      const res: any[] = await sendRequest(url.toString(), { 
        method: 'GET',
        headers: getHeaders()
      }); 

      /* const res: any[] = await sendRequest(`${API_URL}/api/counterparties`, {
        method: 'GET',
        params: { companyId },
        headers: getHeaders(),
      }); */


      const counterpartiesChanged: SelectOption[] = res.map((r) => ({
        value: r.id,
        label: r.name,
      }));
      counterpartiesChanged.push({ value: "0", label: t('nomenclature.noCounterparty', { defaultValue: "Не указан" }) });
      setCounterparties(counterpartiesChanged);
      form.setFieldsValue({ contrSelect: '0' });
    } catch (err) {
      message.error(t('nomenclature.counterpartiesLoadError', { defaultValue: 'Ошибка загрузки списка поставщиков.' }));
      console.error(err);
    }
  }, [sendRequest, getHeaders, t, API_URL, form]);

  const onCompanyChange = (value: string) => {
    form.setFieldsValue({ companySelect: value, stockSelect: undefined, contrSelect: undefined });
    getStocksByCompany(value);
    getCounterparties(value);
  };

  // --- ЛОГИКА ФАЙЛОВ ---

  const handleDownload = useCallback(async (file: string) => {
    try {
      // Axios должен быть настроен на responseType: 'blob' для скачивания
      const response = await fetch(`${API_URL}/api/files/download?file=${file}&folder=${FOLDER}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        }
      });
      
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (err) {
      message.error(t('nomenclature.downloadError', { defaultValue: 'Ошибка при скачивании файла.' }));
      console.error(err);
    }
  }, [API_URL, t]);

  const handleDelete = useCallback(async (file: string) => {
    try {

      const url = new URL(`${API_URL}/api/files/delete`);
      url.searchParams.append('file', file.toString());
      url.searchParams.append('folder', FOLDER.toString());

      await sendRequest(url.toString(), { 
        method: 'GET',
        headers: getHeaders()
      }); 

      /* await sendRequest(`${API_URL}/api/files/delete`, {
        method: 'GET',
        params: { file, folder: FOLDER },
        headers: getHeaders(),
      }); */

      message.success(t('nomenclature.fileDeleted', { defaultValue: 'Файл успешно удален.' }));
      setFilesList(prev => prev.filter(f => f !== file));
    } catch (err) {
      message.error(t('nomenclature.deleteError', { defaultValue: 'Ошибка при удалении файла.' }));
      console.error(err);
    }
  }, [sendRequest, getHeaders, t, API_URL]);

  // --- ЛОГИКА ИМПОРТА (Upload) ---

  const handleUploadClick = async () => {
    setIsLoading(true);
    try {
      const values = await form.validateFields();
      
      if (!selectedFile) {
        message.info(t('nomenclature.selectFile', { defaultValue: "Выберите файл для загрузки." }));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result as string;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Получаем данные как массив объектов
        const products: any[] = utils.sheet_to_json(
          ws,
          { raw: true, defval: null } // defval: null вместо defaultValue: null
        );

        // Проверка на кириллицу в поле Code
        const cyrillicRows: number[] = [];
        products.forEach((product, i) => {
          // Проверка: Code должен быть строкой и содержать кириллицу
          if (product.Code && typeof product.Code === 'string' && /[а-яё]/i.test(product.Code)) {
             cyrillicRows.push(i + 2); // Строка в Excel начинается с 1, данные с 2
          }
        });

        if (cyrillicRows.length > 0) {
          const rowsList = cyrillicRows.join(', ');
          setErrorMessage(t('nomenclature.cyrillicErrorDetail', { rows: rowsList, defaultValue: `В строках ${rowsList} имеются символы кириллицы в коде.` }));
          setErrorModalVisible(true);
          setIsLoading(false);
          return;
        }

        // Если валидация пройдена, отправляем на сервер
        const data = JSON.stringify(products);
        const params = new URLSearchParams();
        params.append("data", data);
        params.append("companyId", values.companySelect);
        params.append("stockId", values.stockSelect);
        params.append("taxId", values.companyNDS);
        params.append("counterparty", values.contrSelect);
        
        // Отправка POST запроса
        sendRequest(`${API_URL}/api/utils/import_nomenclature_xls`, {
            method: 'POST',
            body: params.toString(),
            headers: {
                Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })
          .then(() => {
            message.success(t('nomenclature.importSuccess', { defaultValue: "Данные успешно импортированы." }));
            // Сброс полей не нужен, т.к. они важны для следующей операции
            getFiles(); // Обновляем список лог-файлов
          })
          .catch((err) => {
            message.error(t('nomenclature.importError', { defaultValue: "Ошибка при импорте данных." }));
            console.error(err);
          })
          .finally(() => {
            setIsLoading(false);
          });
      };
      reader.readAsBinaryString(selectedFile);

    } catch (errorInfo: any) {
      if (errorInfo.errorFields) {
        message.warning(t('nomenclature.fillAllFields', { defaultValue: "Пожалуйста, заполните все обязательные поля." }));
      } else {
        message.error(t('nomenclature.generalError', { defaultValue: "Произошла непредвиденная ошибка." }));
        console.error(errorInfo);
      }
      setIsLoading(false);
    }
  };

  // --- РЕНДЕР ТАБЛИЦЫ ФАЙЛОВ ---

  const filesDataSource: FileEntry[] = useMemo(() => filesList.map((file, idx) => ({
    name: file,
    idx: idx,
  })), [filesList]);

  const fileColumns = useMemo(() => {
    const columns: any = [
      {
        title: t('nomenclature.fileNumber', { defaultValue: '№' }),
        key: 'idx',
        render: (_: any, __: FileEntry, index: number) => index + 1,
        width: 50,
      },
      {
        title: t('nomenclature.fileName', { defaultValue: 'Наименование файла' }),
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => <Space><FileTextOutlined />{text}</Space>
      },
      {
        title: t('nomenclature.actions', { defaultValue: 'Действия' }),
        key: 'actions',
        width: 200,
        render: (_: any, record: FileEntry) => (
          <Space size="middle">
            <Button 
              type="link" 
              onClick={() => handleDownload(record.name)} 
              icon={<DownloadOutlined />}
            >
              {t('nomenclature.download')}
            </Button>
            <Button 
              type="link" 
              danger 
              onClick={() => handleDelete(record.name)} 
              icon={<DeleteOutlined />}
            >
              {t('nomenclature.delete')}
            </Button>
          </Space>
        ),
      },
    ];
    return columns;
  }, [t, handleDownload, handleDelete]);

  return (
    <Card 
      title={<Title level={4} className={styles.title}>{t('nomenclature.title', { defaultValue: "Импорт номенклатуры" })}</Title>}
      className={styles.card}
    >
      <Form
        form={form}
        name="import_nomenclature"
        layout="vertical"
        initialValues={{ companyNDS: '0', stockSelect: '0', contrSelect: '0' }}
      >
        {/* ВЫБОР КОМПАНИИ */}
        <Form.Item
          name="companySelect"
          label={t('nomenclature.company', { defaultValue: 'Компания' })}
          rules={[{ required: true, message: t('nomenclature.selectCompanyMsg', { defaultValue: 'Выберите компанию' }) }]}
          className={styles.formItem}
        >
          <Select
            placeholder={t('nomenclature.selectCompanyPlaceholder', { defaultValue: "Выберите компанию" })}
            options={companies}
            onChange={onCompanyChange}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        {/* ВЫБОР СКЛАДА */}
        <Form.Item
          name="stockSelect"
          label={t('nomenclature.stock', { defaultValue: 'Склад' })}
          rules={[{ required: true, message: t('nomenclature.selectStockMsg', { defaultValue: 'Выберите склад' }) }]}
          className={styles.formItem}
        >
          <Select
            placeholder={t('nomenclature.selectStockPlaceholder', { defaultValue: "Выберите склад" })}
            options={stocks}
            disabled={!form.getFieldValue('companySelect')}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        {/* ПЛАТЕЛЬЩИК НДС */}
        <Form.Item
          name="companyNDS"
          label={t('nomenclature.isNDSPayer', { defaultValue: 'Компания является плательщиком НДС?' })}
          rules={[{ required: true, message: t('nomenclature.selectNDSMsg', { defaultValue: 'Выберите да/нет' }) }]}
          className={styles.formItem}
        >
          <Select
            placeholder={t('nomenclature.selectNDSPlaceholder', { defaultValue: "Выберите да/нет" })}
            options={[
              { value: '0', label: t('nomenclature.ndsNo', { defaultValue: 'Нет' }) },
              { value: '1', label: t('nomenclature.ndsYes', { defaultValue: 'Да' }) },
            ]}
          />
        </Form.Item>

        {/* ВЫБОР ПОСТАВЩИКА */}
        <Form.Item
          name="contrSelect"
          label={t('nomenclature.supplier', { defaultValue: 'Выберите поставщика' })}
          rules={[{ required: true, message: t('nomenclature.selectSupplierMsg', { defaultValue: 'Выберите поставщика' }) }]}
          className={styles.formItem}
        >
          <Select
            placeholder={t('nomenclature.selectSupplierPlaceholder', { defaultValue: "Выберите поставщика" })}
            options={counterparties}
            disabled={!form.getFieldValue('companySelect')}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        {/* ЗАГРУЗКА ФАЙЛА */}
        <div className={styles.fileUploadSection}>
          <Title level={5}>{t('nomenclature.fileUploadTitle', { defaultValue: "Файл для импорта" })}</Title>
          <Input 
            type="file" 
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
            accept=".xlsx, .xls"
            className={styles.fileInput}
          />
        </div>

        {/* КНОПКА ВЫГРУЗИТЬ */}
        <Form.Item>
          <Button 
            type="primary" 
            onClick={handleUploadClick} 
            loading={isLoading}
            icon={<UploadOutlined />}
            className={styles.uploadButton}
          >
            {t('nomenclature.uploadButton', { defaultValue: "Выгрузить" })}
          </Button>
        </Form.Item>
      </Form>

      {/* СПИСОК ЛОГ-ФАЙЛОВ */}
      {filesList.length > 0 && (
        <div className={styles.filesSection}>
          <Title level={5} className={styles.filesTitle}>{t('nomenclature.logFiles', { defaultValue: "Лог-файлы импорта" })}</Title>
          <Table 
            dataSource={filesDataSource} 
            columns={fileColumns} 
            rowKey="name"
            pagination={false}
            size="small"
          />
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ОШИБКИ КИРИЛЛИЦЫ */}
      <Modal
        title={t('nomenclature.cyrillicErrorTitle', { defaultValue: "Ошибка импорта" })}
        open={errorModalVisible}
        onCancel={() => setErrorModalVisible(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setErrorModalVisible(false)}>
            {t('nomenclature.ok', { defaultValue: "Ок" })}
          </Button>
        ]}
      >
        <p className={styles.redText}>
          {t('nomenclature.cyrillicErrorMessage', { defaultValue: "Символы кириллицы в штрих-коде недопустимы." })}
        </p>
        <p>{errorMessage}</p>
      </Modal>
    </Card>
  );
};

export default ImpNomenclature;