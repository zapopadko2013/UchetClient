import React, { useEffect, useRef } from 'react';
import { Modal, message } from 'antd';
import { Html5Qrcode } from 'html5-qrcode';
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

  const startScanner = async () => {
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
