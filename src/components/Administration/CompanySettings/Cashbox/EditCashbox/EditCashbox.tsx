import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Select,
  Input,
  message,
  notification,
  Upload,
  Progress,
  Typography,
  Space,
} from "antd";
import { UploadOutlined, SaveOutlined } from "@ant-design/icons";
import useApiRequest from "../../../../../hooks/useApiRequest";
import { useApiErrorHandler } from "../../../../handleApiError";
import SwitchStyle from "./SwitchStyle";
import styles from '../../AddPointForm.module.css'; 
import barcode from "./barcode.png"; 
import { useTranslation } from "react-i18next";

// --- ТИПЫ ДАННЫХ ---
interface PointOption {
  label: string;
  value: string | number;
  address: string;
  name: string;
}

interface TicketFormatData {
  address: string;
  advertisementMessage: string;
  BIN: boolean;
  company: string;
  displayFile: string;
  NDS: boolean;
  point: string;
  RNM: boolean;
  thanksMessage: string;
  ZNM: boolean;
  ticketInformation?: any;
  currency?: string;
}

interface EditCashboxProps {
  history: any; 
  location: any;
  points: { id: string | number; name: string; address: string }[];
}

// --- КОНСТАНТЫ И УТИЛИТЫ ---
const { TextArea } = Input;
const { Title, Text } = Typography;
const API_URL = import.meta.env.VITE_API_URL || "";
const MAX_FILE_SIZE = 100 * 1024; // 100 КБ

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
  "Content-Type": "application/json",
});

// Базовое состояние (без локализации, так как t() недоступен здесь)
const getInitialState = (): TicketFormatData => {
  const userData = JSON.parse(sessionStorage.getItem("isme-user-data") || "{}");
  const locales = JSON.parse(sessionStorage.getItem("user-locales") || "{}");
  
  return {
    address: "",
    advertisementMessage: "",
    BIN: true,
    company: userData.companyname || "",
    displayFile: "",
    NDS: true,
    point: "",
    RNM: true,
    // Теперь thanksMessage пуст или имеет технический дефолт
    thanksMessage: "", 
    ZNM: true,
    currency: locales.LC_MONETARY || "KZT",
  };
};

// --- КОМПОНЕНТ ---

const EditCashbox: React.FC<EditCashboxProps> = ({ points }) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const handleError = useApiErrorHandler();

  // ⭐️ АДАПТАЦИЯ К ЯЗЫКАМ: Ф-ция для получения начального состояния с локализацией ⭐️
  const getInitialLocalizedState = useCallback(() => {
    const initialState = getInitialState();
    return {
        ...initialState,
        // Применяем локализованный дефолт при инициализации
        thanksMessage: t("companysettings.ticket.defaultThanks1", { defaultValue: "Спасибо за покупку." }),
    };
  }, [t]);

  // Инициализация стейта с использованием локализованной функции
  const [ticketState, setTicketState] = useState<TicketFormatData>(getInitialLocalizedState);
  const [selectedPoint, setSelectedPoint] = useState<PointOption | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [loadedPercentage, setLoadedPercentage] = useState<number>(0);
  const [isUploading, setUploading] = useState<boolean>(false);

  // Преобразование пропсов точек в формат Select
  const selectPoints: PointOption[] = useMemo(
    () =>
      points.map((point) => ({
        label: point.name,
        value: point.id,
        address: point.address,
        name: point.name,
      })),
    [points]
  );

  // --- 1. ЗАГРУЗКА ФОРМАТА ЧЕКА (GET) ---

  const getTicketFormat = useCallback(
    async (point: PointOption) => {
      try {
        const pointId = point.value;

        if (!pointId) return;

        const res = await sendRequest(`${API_URL}/api/ticketformat?point=${pointId}`, {
          method: "GET",
          headers: getHeaders(),
        });

        const ticketInformation = res;
        
        if (!ticketInformation || Object.keys(ticketInformation).length === 0) {
          
          // Если формат не найден, используем данные из выбранной точки и локализованные дефолты
          setTicketState((_) => ({
            ...getInitialState(),
            address: point.address,
            point: point.name,
            // ⭐️ АДАПТАЦИЯ ПРИ СБРОСЕ ⭐️
            thanksMessage: t("companysettings.ticket.defaultThanks", { defaultValue: "Спасибо за покупку." }),

            advertisementMessage: t("companysettings.ticket.advertisementMessage", { defaultValue: "Дополнительный текст 2" }),

          }));
        } else {
          // Если формат найден, используем данные из API
          const apiJson = ticketInformation.json;
          
          setTicketState((prev) => ({
            ...prev,
            ...apiJson,
            
            address: apiJson.address || "",
            advertisementMessage: apiJson.advertisementMessage || "",
            company: apiJson.company || getInitialState().company, 
            
            BIN: apiJson.BIN ?? true, 
            NDS: apiJson.NDS ?? true,
            RNM: apiJson.RNM ?? true,
            ZNM: apiJson.ZNM ?? true,
            
            // ⭐️ АДАПТАЦИЯ ПРИ ЗАГРУЗКЕ: Если API вернуло пустое значение, используем локализованный дефолт ⭐️
            thanksMessage: apiJson.thanksMessage || t("companysettings.ticket.defaultThanks", { defaultValue: "Спасибо за покупку." }),
            displayFile: apiJson.displayFile || "",
            
            point: apiJson.point || point.name, 
            
            ticketInformation: ticketInformation,
          }));
        }
        setFileToUpload(null);
        setLoadedPercentage(0);
      } catch (err) {
        console.error(err);
        notification.error({
          message: t("companysettings.messages.errorTitle", { defaultValue: "Ошибка" }),
          description: t("companysettings.ticket.loadTicketError", { defaultValue: "Не удалось загрузить формат чека." }), 
        });
      }
    },
    [sendRequest, t]
  );

  useEffect(() => {
    if (selectedPoint && selectedPoint.value) { 
        getTicketFormat(selectedPoint);
    }
  }, [selectedPoint, getTicketFormat]);

  
  // Убедитесь, что эта функция принимает только объект PointOption
const onPointIDChange = useCallback(
    (pointOption: PointOption) => {
      setSelectedPoint(pointOption);
    },
    []
);

  // --- 2. ОБРАБОТЧИКИ UI ---

  const handleInputChange = useCallback(
    (key: keyof TicketFormatData) => (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const value = e.target.value;
      setTicketState((prev) => ({ ...prev, [key]: value }));

      if (key === "advertisementMessage" && value.length >= 2000) {
        message.info(t("companysettings.ticket.adLimitWarning", { defaultValue: "Достигнут лимит в 2000 символов." }));
      }
    },
    [t]
  );

  const handleSwitch = useCallback((name: string, checked: boolean) => {
    setTicketState((prev) => ({ ...prev, [name]: checked }));
  }, []);

  // --- 3. ЗАГРУЗКА ФАЙЛА (POST) ---

  const handleBeforeUpload = (file: File) => {
    if (file.size >= MAX_FILE_SIZE) {
      message.warning(t("companysettings.ticket.fileSizeWarning", { defaultValue: "Размер файла превышает 100 КБ." }));
      return Upload.LIST_IGNORE;
    } else if (file.type !== "image/png") {
      message.warning(t("companysettings.ticket.fileTypeWarning", { defaultValue: "Поддерживается только формат PNG." }));
      return Upload.LIST_IGNORE;
    }
    setFileToUpload(file);
    setLoadedPercentage(0);
    return false;
  };

  const uploadFileToServer = useCallback(async () => {
    if (!fileToUpload) return "";

    setUploading(true);
    const data = new FormData();
    data.append("file", fileToUpload, fileToUpload.name);
    data.append("type", "logo");

    try {
      const res = await sendRequest(`${API_URL}/api/files/upload`, {
        method: "POST",
        body: data,
      }, {
          onProgress: (loaded, total) => {
             setLoadedPercentage((loaded / total) * 100);
          }
      });

      message.success(t("companysettings.ticket.fileSuccess", { defaultValue: "Файл успешно загружен." }));
      
      const hostname = window.location.host;
      const cutFile = res.file.slice(1);
      const fileName = (window.location.protocol || 'https:') + '//' + hostname + cutFile;

      return fileName;
    } catch (err: any) {
      console.error(err);
      handleError(
        err, 
        t("companysettings.messages.errorTitle", { defaultValue: "Ошибка" }), 
        t("companysettings.ticket.fileError", { defaultValue: "Не удалось загрузить файл." })
      );
      return ticketState.displayFile;
    } finally {
      setUploading(false);
      setLoadedPercentage(0);
    }
  }, [fileToUpload, sendRequest, handleError, ticketState.displayFile, t]);

  // --- 4. СОЗДАНИЕ/ОБНОВЛЕНИЕ ЧЕКА (POST) ---

  const createNewTicket = useCallback(async (newDisplayFile: string) => {
    if (!selectedPoint) return;
    
    const {
      address,
      company,
      point,
      BIN,
      NDS,
      ZNM,
      RNM,
      thanksMessage,
      advertisementMessage,
    } = ticketState;

    // Валидация
    if (!address || !company || !point) {
      return message.warning(t("companysettings.ticket.requiredFieldsWarning", { defaultValue: "Заполните все обязательные поля." }));
    }

    const finalTicket = {
      address,
      company,
      displayFile: newDisplayFile,
      point,
      BIN,
      NDS,
      ZNM,
      RNM,
      thanksMessage,
      advertisementMessage,
    };

    try {
      await sendRequest(`${API_URL}/api/ticketformat/manage`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          point: selectedPoint.value,
          ticketFormat: finalTicket,
        }),
      });

      message.success(t("companysettings.ticket.successSave", { defaultValue: "Формат чека успешно сохранен." }));
      getTicketFormat(selectedPoint);

    } catch (err: any) {
      console.error(err);
      handleError(err);
    }
  }, [selectedPoint, ticketState, sendRequest, getTicketFormat, handleError, t]);

  // --- 5. ОБЩИЙ ОБРАБОТЧИК СОХРАНЕНИЯ ---

  const handleSave = async () => {
    let newDisplayFile = ticketState.displayFile;

    // Сначала загружаем файл, если он выбран
    if (fileToUpload) {
      newDisplayFile = await uploadFileToServer();
      if (isUploading) return;
    }
    
    // Затем сохраняем формат чека
    if (selectedPoint) {
       createNewTicket(newDisplayFile);
    } else {
        message.warning(t("companysettings.ticket.selectPointWarning", { defaultValue: "Выберите торговую точку для сохранения." }));
    }
  };


  // --- 6. РЕНДЕРИНГ ---

  return (
    <div className={styles.editCashboxContainer}>
      <Title level={3} className={styles.mainTitle}>
        {t("companysettings.ticket.title", { defaultValue: "Настройка формата чека" })}
      </Title>

      {/* Выбор торговой точки */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label htmlFor="pointSelect">{t("companysettings.pointName", { defaultValue: "Торговая точка" })}</label>
          <Select
            value={selectedPoint?.value}
            onChange={(_, option) => {
                if (option && !Array.isArray(option)) {
                    onPointIDChange(option as PointOption);
                }
            }}
            options={selectPoints}
            placeholder={t("companysettings.pointPlaceholder", { defaultValue: "Выберите точку" })}
            className={styles.fullWidth}
          />
        </div>
      </div>

      {selectedPoint && (
        <div className={styles.contentWrapper}>
          {/* БЛОК 1: ПРЕДПРОСМОТР ЧЕКА */}
          <div className={styles.previewReceipt}>
            <div className={styles.receiptContent}>
              <Space direction="vertical" align="center" className={styles.fullWidth}>
                {/* Логотип */}
                {ticketState.displayFile && (
                  <img
                    className={styles.logo}
                    src={ticketState.displayFile}
                    alt="Logo Preview"
                  />
                )}
                {/* Информация о точке/компании */}
                <Text strong>{ticketState.point || t("companysettings.ticket.defaultPoint", { defaultValue: "Название точки" })}</Text>
                <Text>{ticketState.address || t("companysettings.ticket.defaultAddress", { defaultValue: "Адрес" })}</Text>
                <Text>{ticketState.company || t("companysettings.ticket.defaultCompany", { defaultValue: "Название компании" })}</Text>
                
                {/* Свитчи (отображение) */}
                <Space direction="vertical" size={2} className={styles.switchDisplay}>
                    {ticketState.BIN && <Text>{t("companysettings.switch.binLabel", { defaultValue: "БИН" })}: 123456789012</Text>}
                    {ticketState.NDS && <Text>{t("companysettings.switch.ndsLabel", { defaultValue: "НДС" })}: 1234567 44 от 06.01.2020</Text>}
                    {ticketState.ZNM && <Text>{t("companysettings.switch.znmLabel", { defaultValue: "ЗНМ" })}: TEZ0000000050</Text>}
                    {ticketState.RNM && <Text>{t("companysettings.switch.rnmLabel", { defaultValue: "РНМ" })}: 010100101234</Text>}
                </Space>
                
                <Text strong>{t("companysettings.ticket.receiptTitle", { defaultValue: "Кассовый чек" })}</Text>
                
                {/* Итоги (упрощенный статический вид) */}
                <div className={styles.summaryRow}>
                    <Text>{t("companysettings.ticket.totalText", { defaultValue: "Итог" })}:</Text> 
                    <Text strong>6530 {ticketState.currency === "KZT" ? t("currency.KZT", { defaultValue: "₸" }) : t("currency.KGS", { defaultValue: "c" })}</Text>
                </div>

                {/* Сообщение благодарности */}
                <Text>{ticketState.thanksMessage || t("companysettings.ticket.defaultThanks", { defaultValue: "Спасибо за покупку." })}</Text>
                
                {/* Штрих-код */}
                <img
                    className={styles.barcode}
                    alt="Barcode"
                    src={barcode}
                />
                
                {/* Рекламное сообщение */}
                {ticketState.advertisementMessage ? (
                  <Text className={styles.advertisementMessage}>
                    {ticketState.advertisementMessage}
                  </Text>
                ) : (
                  <Text>{t("companysettings.ticket.defaultAd", { defaultValue: "Рекламное сообщение" })}</Text>
                )}
              </Space>
            </div>
          </div>

          {/* БЛОК 2: ФОРМА РЕДАКТИРОВАНИЯ */}
          <div className={styles.editForm}>
            {/* Загрузка логотипа */}
            <div className={styles.inputGroup}>
                <Text>{t("companysettings.ticket.uploadLogo", { defaultValue: "Логотип для чека (PNG, до 100 КБ)" })}</Text>
                <Upload
                    accept=".png"
                    beforeUpload={handleBeforeUpload}
                    listType="picture"
                    maxCount={1}
                    showUploadList={{ showRemoveIcon: false, showPreviewIcon: false }}
                    className={styles.logoUpload}
                >
                    <Button icon={<UploadOutlined />} disabled={isUploading}>
                       {t("companysettings.ticket.selectFile", { defaultValue: "Выбрать файл" })}
                    </Button>
                </Upload>
                {/* Имитация прогресса */}
                {isUploading && (
                    <Progress percent={Math.round(loadedPercentage)} status="active" />
                )}
            </div>

            {/* Поля ввода */}
            <div className={styles.inputGroup}>
              <Text>{t("companysettings.ticket.pointNameText", { defaultValue: "Наименование точки" })}:</Text>
              <Input
                value={ticketState.point}
                onChange={handleInputChange("point")}
                placeholder={t("companysettings.ticket.defaultPoint", { defaultValue: "Название точки" })}
              />
            </div>
            
            <div className={styles.inputGroup}>
              <Text>{t("companysettings.ticket.address", { defaultValue: "Адрес" })}:</Text>
              <Input
                value={ticketState.address}
                onChange={handleInputChange("address")}
                placeholder={t("companysettings.ticket.defaultAddress", { defaultValue: "Адрес" })}
              />
            </div>
            
            <div className={styles.inputGroup}>
              <Text>{t("companysettings.ticket.companyText", { defaultValue: "Название компании" })}:</Text>
              <Input
                value={ticketState.company}
                onChange={handleInputChange("company")}
                placeholder={t("companysettings.ticket.defaultCompany", { defaultValue: "Название компании" })}
              />
            </div>

            {/* Свитчи (Переключатели) */}
            <div className={styles.switchControls}>
                <Space direction="vertical" size={10}>
                    <Text>{t("companysettings.ticket.switchOptions", { defaultValue: "Отображаемые поля" })}:</Text>
                    <SwitchStyle
                        BIN={ticketState.BIN}
                        NDS={ticketState.NDS}
                        ZNM={ticketState.ZNM}
                        RNM={ticketState.RNM}
                        handleSwitch={handleSwitch}
                    />
                </Space>
            </div>

            {/* Дополнительный текст 1 (Благодарность) */}
            <div className={styles.inputGroup}>
              <Text>{t("companysettings.ticket.thanksMessageText", { defaultValue: "Сообщение благодарности" })}:</Text>
              <Input
                value={ticketState.thanksMessage}
                onChange={handleInputChange("thanksMessage")}
                placeholder={t("companysettings.ticket.defaultThanks", { defaultValue: "Спасибо за покупку." })}
              />
            </div>

            {/* Дополнительный текст 2 (Реклама) */}
            <div className={styles.inputGroup}>
              <Text>{t("companysettings.ticket.advertisementMessageText", { defaultValue: "Рекламное сообщение" })}:</Text>
              <TextArea
                value={ticketState.advertisementMessage}
                onChange={handleInputChange("advertisementMessage")}
                placeholder={t("companysettings.ticket.adPlaceholder", { defaultValue: "Введите рекламное сообщение" })}
                rows={5}
                maxLength={2000}
                showCount
              />
            </div>

            {/* Кнопка сохранения */}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={isUploading}
              className={styles.saveButton}
            >
              {t("companysettings.ticket.saveButton", { defaultValue: "Сохранить формат" })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCashbox;