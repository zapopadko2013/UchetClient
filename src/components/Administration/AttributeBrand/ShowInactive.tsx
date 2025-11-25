import React, { useEffect, useState } from 'react';
import { Collapse } from 'antd';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import ClosedList from './ClosedList';
import styles from './Atributte.module.css';

interface ShowInactiveProps {
  callback?: (item: any) => void;
  mode: string;
}

const ShowInactive: React.FC<ShowInactiveProps> = ({ callback, mode }) => {
  const { t } = useTranslation(); // Инициализация хука перевода
  const [caption, setCaption] = useState(t('adminattributes.showInactive.show'));

  /**
   * Динамически строит подпись для Collapse на основе режима и префикса (Показать/Скрыть).
   * @param prefixKey Ключ для префикса ('show' или 'hide').
   */
  const buildCaption = (prefixKey: 'show' | 'hide'): string => {
    // 1. Получаем имя сущности на основе mode
    let entityKey: string;
    switch (mode) {
      case 'attribute':
      case 'attributeupdate':
        entityKey = 'attribute';
        break;
      case 'erpuser':
        entityKey = 'erpUser';
        break;
      case 'brand':
        entityKey = 'brand';
        break;
      case 'discount':
        entityKey = 'discount';
        break;
      default:
        // Если mode неизвестен, используем общий ключ 'list'
        return t(`adminattributes.showInactive.${prefixKey}List`); 
    }

    // 2. Используем ключ для построения фразы, например: adminattribute.showInactive.showEntity
    return t(`adminattributes.showInactive.${prefixKey}Entity`, { 
        entity: t(`adminattributes.entities.${entityKey}`) // Вставляем переведенное имя сущности
    });
  };

  useEffect(() => {
    // Устанавливаем начальную подпись 'Показать список неактивных...'
    setCaption(buildCaption('show'));
  }, [mode, t]); // Добавляем t в зависимости, чтобы обновить при смене языка

  const renderBody = () => {
    switch (mode) {
      case 'discount':
        return null;
      default:
        return <ClosedList mode={mode} handleRollback={callback!} isHidden={false} />;
    }
  };

  const items = [
    {
      key: '1',
      label: caption,
      children: renderBody(),
    },
  ];

  return (
    <div className={styles.marginBottom20}>
      <Collapse
        accordion
        items={items}
        onChange={(keys) => {
          const isOpen = keys.length > 0;
          // Обновляем подпись в зависимости от состояния
          setCaption(buildCaption(isOpen ? 'hide' : 'show'));
        }}
      />
    </div>
  );
};

export default ShowInactive;