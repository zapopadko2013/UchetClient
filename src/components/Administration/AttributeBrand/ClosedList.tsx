import React, { useEffect, useState } from 'react';
import { Modal, Spin, Empty, message } from 'antd';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import useApiRequest from '../../../hooks/useApiRequest';

import ClosedBrandTable from './ClosedBrandTable';
import ClosedERPuserTable from './ClosedERPuserTable';
import ClosedAttributeUpdateTable from './ClosedAttributeUpdateTable';
import styles from './Atributte.module.css';


interface ClosedListProps {
  mode: string;
  isHidden: boolean;
  handleRollback: (item: any) => void;
}

const ClosedList: React.FC<ClosedListProps> = ({ mode, isHidden, handleRollback }) => {
  const { t } = useTranslation(); // Инициализация хука перевода
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json'
  });

  // ---------------------------------------------
  // Fetch inactive items
  // ---------------------------------------------
  useEffect(() => {
    if (!isHidden) fetchItems();
  }, [isHidden]);

  const fetchItems = async (info?: string) => {
    setLoading(true);

    const api =
      mode === 'brand'
        ? '/api/brand?deleted=true'
        : mode === 'point'
        ? '/api/point/inactive'
        : mode === 'stock'
        ? '/api/stock/inactive'
        : mode === 'erpuser'
        ? '/api/erpuser/inactive'
        : mode === 'cashbox'
        ? '/api/cashbox/inactive'
        : mode === 'counterparties'
        ? '/api/counterparties/inactive'
        : mode === 'buyers'
        ? '/api/buyers/inactive'
        : mode === 'attributeupdate'
        ? '/api/attributes/inactive'
        : '/api/cashboxuser/inactive';

    const params =
      mode === 'brand' || mode === 'attributeupdate'
        ? { deleted: true }
        : mode === 'stock'
        ? { inputValue: info }
        : undefined;

    try {
      const data = await sendRequest(`${API_URL}${api}`, {
        headers: getHeaders(),
        params
      });
      setResult(data);
    } catch (e) {
      console.error(e);
      // Перевод: Ошибка загрузки данных
      message.error(t('adminattributes.error.loadData')); 
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // Rollback with confirmation
  // ---------------------------------------------
  const confirmRollback = (item: any) => {
    Modal.confirm({
      // Перевод: Вы уверены?
      title: t('adminattributes.common.confirm.areYouSure'), 
      // Перевод: Вы действительно хотите восстановить элемент?
      content: t('adminattributes.confirm.restore'), 
      // Перевод: Да, восстановить
      okText: t('adminattributes.common.confirm.restoreYes'), 
      // Перевод: Отмена
      cancelText: t('adminattributes.common.confirm.cancel'), 
      onOk: () => rollback(item),
    });
  };

  // ---------------------------------------------
  // Rollback API logic
  // ---------------------------------------------
  const rollback = async (item: any) => {
    const newList = result.filter(i => i.id !== item.id);

    if (mode === 'brand' || mode === 'counterparties' || mode === 'buyers' || mode === 'attributeupdate') {
      item.deleted = false;
    } else if (mode === 'cashboxuser' || mode === 'cashbox') {
      item.deleted = 0;
    } else if (mode === 'erpuser') {
      item.deleted = 0;
      item.status = 'ACTIVE';
    } else {
      item.status = 'ACTIVE';
    }

    const req =
      mode === 'brand'
        ? { brand: [item] }
        : mode === 'cashboxuser'
        ? { cashboxusr: item }
        : mode === 'erpuser'
        ? { zapros: 'udalm_dan', type: 'erpuser', erpuser: [{ id: item.id, status: 'ACTIVE' }] }
        : mode === 'cashbox'
        ? { cashbox: item }
        : mode === 'counterparties'
        ? { counterparties: item }
        : mode === 'buyers'
        ? { customers: item }
        : mode === 'attributeupdate'
        ? { attributes: { id: item.id, name: item.values, deleted: item.deleted, format: item.format } }
        : { point: item };

    const api =
      mode === 'brand'
        ? '/api/brand/manage'
        : mode === 'cashboxuser'
        ? '/api/cashboxuser/manage'
        : mode === 'erpuser'
        ? '/api/erpuser/toggle_erpusers'
        : mode === 'cashbox'
        ? '/api/cashbox/manage'
        : mode === 'counterparties'
        ? '/api/counterparties/manage'
        : mode === 'buyers'
        ? '/api/buyers/manage'
        : mode === 'attributeupdate'
        ? '/api/adminpage/updateattributeslist'
        : '/api/point/change';

    try {
      await sendRequest(`${API_URL}${api}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(req),
      });

      handleRollback(item);
      setResult(newList);

      // Перевод: Элемент успешно восстановлен
      message.success(t('adminattributes.success.itemRestored')); 
    } catch (e) {
      console.error(e);
      // Перевод: Ошибка при восстановлении
      message.error(t('adminattributes.error.restore')); 
    }
  };

  // ---------------------------------------------
  // Selecting which table to show
  // ---------------------------------------------
  const renderTable = () => {
    if (mode === 'brand') return <ClosedBrandTable result={result} handleRollbackFunction={confirmRollback} />;
    if (mode === 'erpuser') return <ClosedERPuserTable result={result} handleRollbackFunction={confirmRollback} />;
    if (mode === 'attributeupdate') return <ClosedAttributeUpdateTable result={result} handleRollbackFunction={confirmRollback} />;
    return null;
  };

  // ---------------------------------------------
  // Render
  // ---------------------------------------------
  if (loading) return <Spin size="large" className={styles.spinCenter} />;

  if (!loading && result.length === 0)
    // Перевод: Список пуст
    return <Empty description={t('adminattributes.emptyList')} className={styles.emptyMargin} />;

  return <div>{renderTable()}</div>;
};

export default ClosedList;