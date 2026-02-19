import React, { useEffect, useRef } from 'react';
import { Modal, message } from 'antd';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import styles from './BarcodeScanner.module.css';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onClose, onScan }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "reader-element-unique";
const { t } = useTranslation();

 useEffect(() => {
  let isMounted = true;
  let html5QrCode: Html5Qrcode | null = null;

  /* const startScanner = async () => {
    try {
      // 1. Ждем, пока модалка полностью отрисуется
      await new Promise(resolve => setTimeout(resolve, 600));
      if (!isMounted) return;

      // 2. Создаем экземпляр
      html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (text) => {
          onScan(text);
          // Не закрывайте здесь сразу, пусть cleanup всё сделает
        },
        () => {}
      );
    } catch (err) {
      console.error("Scanner start error:", err);
    }
  }; */

  const startScanner = async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 600));
    if (!isMounted) return;

    // 1. Указываем все форматы, которые могут встретиться на товарах
    html5QrCode = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false
    });
    scannerRef.current = html5QrCode;

    // 2. Настраиваем конфигурацию сканирования
    /* const config = {
      fps: 20, // Немного увеличим для плавности
      // Делаем область сканирования шире (для штрих-кодов)
      qrbox: (viewfinderWidth: number, __: number) => {
          // На мобильных устройствах делаем окно на 80% ширины
          const width = viewfinderWidth * 0.8;
          // Но оставляем его не слишком высоким для штрих-кода
          const height = 150; 
          return { width, height };
      },
      aspectRatio: 1.0, 
      // disableFlip: false — важно для некоторых фронталок, но для основной обычно ок
    }; */

    const config = {
  fps: 30, // Максимум для плавности
  // iPhone требует высокого разрешения для мелких штрих-кодов
  videoConstraints: {
    facingMode: "environment",
    width: { min: 1280, ideal: 1920 },
    height: { min: 720, ideal: 1080 },
    aspectRatio: 1.777777778
  },
  qrbox: (viewfinderWidth: number, __: number) => {
      // Для EAN-13 на iPhone окно должно быть узким и широким
      return { width: viewfinderWidth * 0.9, height: 120 };
  },
};

    await html5QrCode.start(
      { facingMode: "environment" },
      config,
      (text) => {
        onScan(text);
      },
      () => {}
    );
  } catch (err) {
    console.error("Scanner start error:", err);
  }
};

  if (visible) {
    startScanner();
  }

  return () => {
    isMounted = false;
    // КРИТИЧНО: Принудительная остановка при каждом закрытии
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop()
        .then(() => {
          // После остановки очищаем внутренний HTML, чтобы убрать "белый след"
          const container = document.getElementById(scannerId);
          if (container) container.innerHTML = "";
        })
        .catch(err => console.error("Stop error", err));
    }
  };
}, [visible]);


  return (
    <Modal
  title={t('workorder.scanner.title')}
  open={visible}
  onCancel={onClose}
  footer={null}
  // centered={false} // Отключаем стандартное центрирование
  zIndex={5000}
  getContainer={() => document.body}
  destroyOnClose={true}
  width="90%"
  transitionName="" // Убираем анимацию появления
  className={styles.modalBody}      // Стиль для самой модалки
  wrapClassName={styles.modalWrapper} // Стиль для обертки (центрирование)
>
  <div 
    id={scannerId} 
    className={styles.scannerContainer} // Стиль для контейнера сканера
  />
</Modal>
  );
};

export default BarcodeScanner;
