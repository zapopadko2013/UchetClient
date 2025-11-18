import React, { useState, Fragment, useMemo, useCallback, useEffect } from "react";
import { 
  Button, 
  Table, 
  Typography, 
  Space, 
  Spin, 
  Modal, 
  notification,
  Tag,
  message // Для системных уведомлений об ошибках
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// ⚠️ Убедитесь, что путь к вашему хуку верный
import useApiRequest from '../../../hooks/useApiRequest'; 
import ShowInactive from "./InactiveList/ShowInactive"; 
import AddPointForm from "./AddPointForm";
import styles from './AddPointForm.module.css'; 

// --- ТИПЫ ДАННЫХ (для контекста) ---

interface CompanyOption {
  value: string;
  label: string;
}

export interface Point {
  id: string | number;
  name: string;
  address: string;
  is_minus: boolean; // boolean для логики
  point_type: number; // Для определения возможности редактирования/удаления
  [key: string]: any; 
}

interface PointData {
  id: string | number | undefined;
  address: string;
  name: string;
  is_minus: '0' | '1'; 
  point_type?: number;
  point_type_name?: string;
}

interface PointPageProps {
  points: Point[];
  companySelect: CompanyOption;
  setPoints: (points: Point[]) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  // ⭐️ ДОБАВЛЕННЫЕ ПРОПСЫ ⭐️
  isLoading: boolean;
  getPoints: (id: string) => Promise<void>; 
}

const { Title, Text } = Typography;
const { confirm } = Modal;

// --- КОМПОНЕНТ ---

const PointPage: React.FC<PointPageProps> = ({
  points,
  companySelect,
  setPoints, 
  isEditing,
  setIsEditing,
  // ⭐️ ИСПОЛЬЗУЕМ ПРОПСЫ ⭐️
  isLoading,
  getPoints, 
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  
  // loadingLocal используется для операций внутри этого компонента (удаление, откат)
  const [loadingLocal, setLoadingLocal] = useState(false); 
  const [pointData, setPointData] = useState<PointData | null>(null);

  const [isTicketDataLoading, setIsTicketDataLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';
  
  // --- ХЕЛПЕРЫ API ---
  
  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  // --- ЛОКАЛИЗАЦИЯ ---
  const i18nKeys = useMemo(() => ({
    list: t('companysettings.pointpage.listTitle', { defaultValue: "Список активных торговых точек" }),
    add: t('companysettings.pointpage.addPoint', { defaultValue: "Добавить новую торговую точку" }),
    empty: t('companysettings.pointpage.emptyList', { defaultValue: "Cписок торговых точек пуст" }),
    name: t('companysettings.pointpage.columnName', { defaultValue: "Наименование" }),
    address: t('companysettings.companysettings.pointpage.columnAddress', { defaultValue: "Адрес" }),
    is_minus: t('companysettings.pointpage.columnIsMinus', { defaultValue: "Отрицательный учет" }),
    confirmDelete: t('companysettings.pointpage.confirmDelete', { defaultValue: "Вы действительно хотите удалить торговую точку?" }),
    successDelete: t('companysettings.pointpage.successDelete', { defaultValue: "Торговая точка успешно удалена" }),
    errorTitle: t('companysettings.messages.errorTitle', { defaultValue: "Упс...Ошибка!" }),
  }), [t]);


  // ⭐️ API ОБРАБОТЧИК УДАЛЕНИЯ (обновлено для использования loadingLocal) ⭐️
  const Delete = useCallback(async (item: Point) => {
    setLoadingLocal(true);
    try {
      await sendRequest(
        `${API_URL}/api/companysettings/storepoint/delete?id=${item.id}`, 
        { method: 'DELETE', headers: getHeaders() }
      );

      const newPointsList = points.filter((p) => p.id !== item.id);
      setPoints(newPointsList);

      notification.success({
        message: t('companysettings.messages.successTitle', { defaultValue: "Отлично" }),
        description: i18nKeys.successDelete,
        duration: 3,
      });

    } catch (err: any) {
      notification.error({
        message: i18nKeys.errorTitle,
        description: err.response?.data?.text || t('companysettings.messages.raiseError'),
        duration: 5,
      });
      console.error(err);
    } finally {
        setLoadingLocal(false);
    }
  }, [API_URL, points, setPoints, t, i18nKeys.successDelete, i18nKeys.errorTitle, sendRequest, getHeaders]);

  // --- ОБРАБОТЧИКИ UI ---
  
  const handleDeleteConfirm = useCallback((item: Point) => {
    confirm({
      title: t('companysettings.messages.areyousure', { defaultValue: "Вы уверены?" }),
      icon: <QuestionCircleOutlined />,
      content: i18nKeys.confirmDelete,
      okText: t('companysettings.messages.sure', { defaultValue: "Да, я уверен" }),
      okType: 'danger',
      cancelText: t('companysettings.messages.cancel', { defaultValue: "Нет, отменить" }),
      onOk() {
        Delete(item);
      },
    });
  }, [i18nKeys.confirmDelete, t, Delete]);

  const convertPointToFormData = useCallback((point: Point): PointData => {
    return {
        id: point.id, 
        name: point.name,
        address: point.address,
        is_minus: point.is_minus ? "1" : "0", 
        point_type: point.point_type,
        // Здесь могут быть другие поля, которые нужны форме (PointData)
    } as PointData; 
}, []);

  const handleEdit = useCallback((point: Point) => {
    const formData = convertPointToFormData(point);
    setPointData(formData);
    setIsEditing(true);
  }, [setIsEditing, convertPointToFormData]);

  // ⭐️ ОБРАБОТЧИК ОТКАТА (ROLLBACK) - теперь просто перезагружает данные ⭐️
  const handleRollback = useCallback(() => {
    // Вызываем функцию getPoints, переданную из родителя
    getPoints(companySelect.value); 
  }, [getPoints, companySelect.value]);

  // --- КОЛОНКИ ТАБЛИЦЫ ---

  // ... (Columns definition remains the same) ...
  const columns = useMemo(() => [
    {
      title: '№',
      dataIndex: 'id',
      key: 'index',
      render: (_, __, index: number) => index + 1,
      width: '1%',
    },
    {
      title: i18nKeys.name,
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      sorter: (a: Point, b: Point) => a.name.localeCompare(b.name),
    },
    {
      title: i18nKeys.address,
      dataIndex: 'address',
      key: 'address',
      width: '30%',
    },
    {
      title: i18nKeys.is_minus,
      dataIndex: 'is_minus',
      key: 'is_minus',
      width: '18%',
      render: (isMinus: boolean) => (
        <Tag color={isMinus ? "red" : "green"}>
          {isMinus ? t('companysettings.common.yes', { defaultValue: "Да" }) : t('companysettings.common.no', { defaultValue: "Нет" })}
        </Tag>
      ),
    },
    {
      title: t('companysettings.common.actions', { defaultValue: "Действия" }),
      key: 'actions',
      width: '15%',
      render: (_: any, record: Point) => (
        <Space size="small">
          {/* Кнопка Редактировать */}
          {record.point_type !== 0 && (
            <Button
              type="text"
              icon={<EditOutlined />}
              title={t('companysettings.common.edit', { defaultValue: "Редактировать" })}
              onClick={() => handleEdit(record)}
            />
          )}
          
          {/* Кнопка Удалить */}
          {record.point_type !== 0 && (
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              title={t('companysettings.common.delete', { defaultValue: "Удалить" })}
              onClick={() => handleDeleteConfirm(record)}
            />
          )}
        </Space>
      ),
    },
  ], [i18nKeys, handleEdit, handleDeleteConfirm, t]);

  // ⭐️ ОБЪЕДИНЕННЫЙ ЛОАДЕР
  const isDataLoading = isLoading || loadingLocal;

  // --- РЕНДЕРИНГ ---

  return (
    <div className="point-list-page">
      {/* 1. Форма редактирования/добавления */}
      {isEditing ? (
        <AddPointForm
          pointData={pointData}
          company={companySelect}
          setEdit={setIsEditing} 
          setPointData={setPointData}
          getPoints={getPoints} // Передаем getPoints из родителя для обновления списка
        />
      ) : (
        <Fragment>
          <div className={styles.headerContainer}>
            <Title level={4} className={styles.title}>{i18nKeys.list}</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setPointData(null); 
                setIsEditing(true);
              }}
              disabled={isDataLoading}
            >
              {i18nKeys.add}
            </Button>
          </div>

          {/* ⭐️ ИСПОЛЬЗУЕМ ОБЪЕДИНЕННЫЙ ЛОАДЕР ⭐️ */}
          {isDataLoading && 
          <Spin 
          spinning={isDataLoading} size="large"
          /* tip={t('companysettings.common.loading',
           { defaultValue: "Загрузка..." })}  */
           className={styles.loadingSpinner}/>}

          {!isDataLoading && points.length === 0 ? (
            <Text type="secondary" className={styles.emptyListText}>{i18nKeys.empty}</Text>
          ) : (
            !isDataLoading && (
              <Table<Point>
                dataSource={points}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: i18nKeys.empty }}
                size="middle"
              />
            )
          )}

          {/* Компонент для отображения неактивных точек */}
          {!isDataLoading && (
            <ShowInactive
              callback={handleRollback}
              mode="point"
              companySelect={companySelect}
            />
          )}
        </Fragment>
      )}
    </div>
  );
}

export default PointPage;