import React, { useState, useRef } from 'react'; // Добавили useRef
import { Button, Modal, Spin, Typography, message, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from "./Sale.module.css";

const { Text } = Typography;

interface KaspiProps {
    payTotal: number;
    terminalIp: string;
    onSuccess: (transactionId: string) => void;
}

const KaspiPayment: React.FC<KaspiProps> = ({ payTotal, terminalIp, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);

    const { t } = useTranslation();
    
    // Используем ref, чтобы мгновенно остановить цикл при нажатии "Отмена"
    const stopPollingRef = useRef(false);

    const fetchKaspiDirect = async (url: string) => {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors' 
        });
        if (!response.ok)
            throw new Error(`${t('kaspi.errors.noConnection')} (${response.status})`);
            //throw new Error(`Терминал ответил ошибкой: ${response.status}`);
        return await response.json();
    };

    const handleButtonClick = () => {

       // console.log(terminalIp);
       // console.log(payTotal);


        if (!terminalIp || terminalIp.trim() === "") 
            return  message.error(t('kaspi.errors.ipNotConfigured'));
        //message.error("Не указан IP терминала!");
        
        if (payTotal <= 0) 
            return message.warning(t('sale.workspace.errors.amountZero'));
        //message.warning("Сумма должна быть больше 0");
        
        Modal.confirm({
            /*title: 'Оплата Kaspi QR / Card',
            content: `Отправить запрос на терминал на сумму ${payTotal.toLocaleString()} ₸?`,
            okText: 'Да, оплата',
            cancelText: 'Отмена',
            */
            title: t('kaspi.modal.confirmTitle'),
            content: `${t('kaspi.modal.confirmContent')} ${payTotal.toLocaleString()} ?`,
            okText: t('workorder.common.yes') ,
            cancelText: t('sale.workspace.buttons.cancel') ,
            onOk: startKaspiProcess
        });
    };

    /* const startKaspiProcess = async () => {
        setIsLoading(true);
        setIsModalVisible(true);
        stopPollingRef.current = false; // Сбрасываем флаг отмены
        setStatusMessage("Подключение к терминалу...");

        const baseUrl = terminalIp.startsWith('http') ? terminalIp : `http://${terminalIp}`;
        const roundedAmount = Math.round(payTotal);

        try {
            const initUrl = `${baseUrl}/payment?amount=${roundedAmount}&owncheque=true`;
            const initData = await fetchKaspiDirect(initUrl);

            if (initData && initData.processId) {
                const processId = initData.processId;

                // ЦИКЛ ОПРОСА
                while (!stopPollingRef.current) {
                    setStatusMessage("Ожидание действий покупателя...");
                    
                    const statusUrl = `${baseUrl}/status?processId=${processId}`;
                    const statusData = await fetchKaspiDirect(statusUrl);

                    if (statusData.status === 'success') {
                        const transId = `KASPI${statusData.transactionId}`;
                        message.success("Оплата прошла успешно");
                        onSuccess(transId);
                        closeAll();
                        return;
                    } else if (statusData.status === 'fail' || statusData.status === 'error') {
                        message.error(statusData.message || "Оплата отменена");
                        closeAll();
                        return;
                    }

                    // Ждем 3 сек перед следующим шагом цикла
                    await new Promise(res => setTimeout(res, 3000));
                }
            }
        } catch (error: any) {
            console.error(error);
            message.error("Ошибка связи с терминалом.");
            closeAll();
        }
    };
 */
    
    const startKaspiProcess = async () => {
        setIsLoading(true);
        setIsModalVisible(true);
        stopPollingRef.current = false; 
        //setStatusMessage("Подключение к терминалу...");
        setStatusMessage(t('kaspi.status.connecting'));

        const baseUrl = terminalIp.startsWith('http') ? terminalIp : `http://${terminalIp}`;
        const roundedAmount = Math.round(payTotal);

        let finalTransId: string | null = null; // Переменная для хранения ID за пределами цикла

        try {
            const initUrl = `${baseUrl}/payment?amount=${roundedAmount}&owncheque=true`;
            const initData = await fetchKaspiDirect(initUrl);

            if (initData && initData.processId) {
                const processId = initData.processId;

                // 1. ЦИКЛ ОПРОСА
                while (!stopPollingRef.current) {
                    //setStatusMessage("Ожидание действий покупателя...");
                    setStatusMessage(t('kaspi.status.waiting'));
                    
                    const statusUrl = `${baseUrl}/status?processId=${processId}`;
                    const statusData = await fetchKaspiDirect(statusUrl);

                    if (statusData.status === 'success') {
                        // Извлекаем метод из chequeInfo (QR или CARD)
                        const jstr = statusData.chequeInfo?.method || "";
                        // Формируем ID как: метод + "KASPI" + transactionId
                        finalTransId = `${jstr}KASPI${statusData.transactionId}`;
                        // ------------------------------------
                        //finalTransId = `KASPI${statusData.transactionId}`;
                        stopPollingRef.current = true; // Выходим из цикла
                    } else if (statusData.status === 'fail' || statusData.status === 'error') {
                        //message.error(statusData.message || "Оплата отменена");
                        message.error(statusData.message || t('kaspi.errors.denied'));
                        closeAll();
                        return; // Прекращаем выполнение совсем
                    } else {
                        // Ждем 3 сек только если статус "в процессе"
                        await new Promise(res => setTimeout(res, 3000));
                    }
                }
            }
        } catch (error: any) {
            console.error(error);
            //message.error("Ошибка связи с терминалом.");
            message.error(t('kaspi.errors.terminalError'));
            closeAll();
            return;
        }

        // 2. ПОСЛЕ ЦИКЛА
        // Если мы здесь и у нас есть ID — значит оплата прошла успешно
        if (finalTransId && !isLoading === false) { 
            closeAll(); // Сначала закрываем UI Kaspi
            //message.success("Оплата принята, сохраняем чек...");
            message.success(t('kaspi.status.successSave'));
            // Вызываем сохранение в базу (onSuccess в PaymentModal)
            onSuccess(finalTransId); 
        }
    };
    
    // Функция для кнопки "Отмена" в модалке
    const handleCancelManual = () => {
        stopPollingRef.current = true; // Останавливаем while
        closeAll();
        //message.info("Запрос к терминалу прерван на стороне программы.");
        message.info(t('kaspi.status.interrupted'));
    };

    const closeAll = () => {
        setIsLoading(false);
        setIsModalVisible(false);
        setStatusMessage('');
    };

    return (
        <>
            <Button 
                type="primary" danger block size="large"
                onClick={handleButtonClick}
                loading={isLoading}
                className={styles.payButton}
            >
                
                {t('kaspi.buttons.payBtn') }
            </Button>

            <Modal
                //title="Оплата Kaspi"
                title={t('kaspi.modal.title')}
                open={isModalVisible}
                onCancel={handleCancelManual} // Теперь можно закрыть по крестику
                closable={true}               // Включаем крестик
                centered
                maskClosable={false}
                footer={[
                    // Добавляем кнопку отмены в футер
                    <Button key="cancel" onClick={handleCancelManual}>
                       {t('kaspi.buttons.cancelPolling')}
                    </Button>
                ]}
            >
                <div className={styles.modalContent}>
                    <Alert
                        //message="Внимание"
                        //description="Если терминал не реагирует, проверьте расширение CORS."
                        message={t('kaspi.modal.alertTitle')}
                        description={t('kaspi.modal.alertDesc')}
                        type="info" showIcon className={styles.alert}
                    />
                    <Spin size="large" />
                    <div className={styles.statusContainer}>
                        <Text strong className={styles.statusText}>{statusMessage}</Text>
                    </div>
                    <div className={styles.amountContainer}>
                        <Text type="secondary">{t('kaspi.modal.toPay')}: {payTotal.toLocaleString()} </Text>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default KaspiPayment;