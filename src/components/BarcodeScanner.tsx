import React, { useEffect, useRef } from 'react';
import { Modal, message } from 'antd'; // Добавим message для отладки
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useTranslation } from 'react-i18next';
import styles from './BarcodeScanner.module.css';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ visible, onClose, onScan }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Используем useRef для ридера, чтобы он не пересоздавался
  const codeReader = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    let isMounted = true;

    const startScanning = async () => {
      if (!visible || !videoRef.current) return;

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      codeReader.current.hints = hints;

      try {
        // На Android важно убедиться, что поток привязан к элементу, 
        // который уже отрендерен в DOM
        await codeReader.current.decodeFromVideoDevice(
          null, 
          videoRef.current,
          (result, __) => {
            if (result && isMounted) {
              onScan(result.getText());
            }
          }
        );
      } catch (error) {
        console.error("Scanner error:", error);
        // Если на Android белый экран, возможно, нет доступа к камере
        // message.error(t('error.cameraAccess')); 
      }
    };

    // Небольшая задержка перед стартом помогает Android успеть инициализировать видео-тег
    const timer = setTimeout(() => {
      startScanning();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      codeReader.current.reset();
    };
  }, [visible, onScan]);

  return (
    <Modal
      title={t('workorder.scanner.title')}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width="90%"
      centered
    >
      <div className={styles.scannerWrapper} style={{ position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          // КРИТИЧЕСКИЕ атрибуты для мобильных браузеров:
          muted
          playsInline
          autoPlay
          style={{ 
            width: '100%', 
            borderRadius: '8px',
            backgroundColor: '#000', // Чтобы не было белого экрана до загрузки
            minHeight: '200px' 
          }}
        />
        <div className={styles.scanLaser} />
      </div>
    </Modal>
  );
};

export default BarcodeScanner;