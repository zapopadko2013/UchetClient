import { notification } from 'antd';
import { useTranslation } from 'react-i18next';

// --- ТИПЫ ДАННЫХ ---

// Используем общий тип для ошибок Axios/Fetch
interface CustomError extends Error {
  // Поля, которые обычно присутствуют в ошибках Axios, но не в стандартном Error
  response?: {
    data: any; // Может быть Blob, JSON-объект, или другим типом данных
    status?: number;
    text?: string;
  };
}

// --- ФУНКЦИЯ ОБРАБОТКИ BLOB/JSON ОШИБОК ---

/**
 * Обрабатывает и отображает ошибки API, используя уведомления Ant Design.
 *
 * @param err Объект ошибки.
 * @param t Функция перевода i18next.
 * @param customTitle Кастомный заголовок уведомления (опционально).
 * @param customDescription Кастомное описание уведомления (опционально).
 */
export async function handleApiError(
  err: CustomError,
  t: (key: string) => string,
  customTitle?: string,
  customDescription?: string
): Promise<void> {
  // Используем кастомный заголовок или дефолтный перевод
  const errorTitle = customTitle || t('errorHandling.title'); 

  // --- СЦЕНАРИЙ 1: Ошибка с ответом (Axios/Fetch) ---
  if (err.response) {
    const responseData = err.response.data;
    
    // --- СЦЕНАРИЙ 1а: Ошибка в формате Blob (например, при загрузке файлов) ---
    if (responseData instanceof Blob) {
      try {
        const textRes = await responseData.text();
        console.error("API Error Response (Blob converted):", textRes);
        
        // Попытка парсинга, чтобы найти читаемое сообщение
        let message = textRes;
        try {
            const jsonRes = JSON.parse(textRes);
            // Пытаемся взять текст из json, иначе используем raw text
            message = jsonRes.text || jsonRes.code || textRes; 
        } catch {}

        notification.error({
          message: errorTitle,
          // Приоритет: Custom Description -> Blob Message -> Fallback
          description: customDescription || `${t('errorHandling.fileErrorPrefix')}: ${message}`, 
          duration: 5,
        });
        return;
        
      } catch (blobErr) {
        console.error("Failed to read Blob error:", blobErr);
        // Если не удалось прочитать Blob
        notification.error({
          message: errorTitle,
          description: customDescription || t('errorHandling.blobReadFailure'),
          duration: 5,
        });
        return;
      }
    } 
    
    // --- СЦЕНАРИЙ 1б: Ошибка в формате JSON/текст ---
    
    // Получение читаемого текста ошибки
    const serverMessage = responseData.text || responseData.code;

    if (serverMessage) {
        let description = customDescription || serverMessage;

        // Обработка "internal_error"
        if (responseData.code === 'internal_error') {
            description = t('errorHandling.internalServerError');
        }

        notification.error({
          message: errorTitle,
          description: description,
          duration: 3,
        });
        return;
    }
    
    // Если ответ пуст, но response существует
    if (Object.keys(responseData).length === 0) {
        notification.error({
          message: errorTitle,
          description: customDescription || t('errorHandling.dataTransferError'),
          duration: 3,
        });
        return;
    }
  }

  // --- СЦЕНАРИЙ 2: Общая/Сетевая ошибка (Нет response) ---
  console.error("General Error:", err);
  notification.error({
    message: errorTitle,
    // Приоритет: Custom Description -> Error Message -> Network Fallback
    description: customDescription || err.message || t('errorHandling.networkError'), 
    duration: 5,
  });
}

// Создаем хук-обертку для удобства использования
export function useApiErrorHandler() {
    const { t } = useTranslation();
    
    // Функция, возвращаемая хуком, принимает err, customTitle и customDescription
    return (err: CustomError, customTitle?: string, customDescription?: string) => 
        handleApiError(err, t, customTitle, customDescription);
}