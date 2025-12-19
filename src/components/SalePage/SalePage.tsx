import React, { useState, useEffect } from "react";
import { message, Spin } from "antd";
import { useTranslation } from "react-i18next"; // 1. Импортируем хук

import SelectPointAndUser from "./SelectPointAndUser";
import SaleWorkspace from "./SaleWorkspace";
import useApiRequest from "../../hooks/useApiRequest";
import styles from "./Sale.module.css";

const SalePage: React.FC = () => {
  const { t } = useTranslation(); // 2. Инициализируем перевод
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || "";

  const [points, setPoints] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ id: string; name: string; address: string } | null>(null);
  const [cashboxUsers, setCashboxUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [role4Users, setRole4Users] = useState<any[]>([]);
  const [cashboxes, setCashboxes] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketFormat, setTicketFormat] = useState<any | null>(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  // Загрузка формата чека
  const loadTicketFormat = async (pointId: string) => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/ticketformat?point=${pointId}`,
        { headers: getHeaders() }
      );
      setTicketFormat(data);
    } catch {
      message.error(t('sale.errors.loadTicketFormat') || "Ошибка загрузки формата чека");
    }
  };

  // Загружаем данные компании
  const loadCompanyInfo = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/company`, {
        headers: getHeaders(),
      });
      setCompanyInfo(data);
    } catch {
      message.error(t('sale.errors.loadCompanyInfo') || "Ошибка загрузки данных компании");
    }
  };

  // Загрузка касс
  const loadCashboxes = async (pointId: string) => {
    try {
      const data = await sendRequest(
        `${API_URL}/external/api/cashboxes?pointid=${pointId}`,
        { headers: getHeaders() }
      );
      setCashboxes(data.cashboxes || []);
    } catch (e) {
      message.error(t('sale.errors.loadCashboxes') || "Ошибка загрузки касс");
    }
  };

  // Загрузка торговых точек
  const loadPoints = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/point`, {
        headers: getHeaders(),
      });
      const filtered = data.filter((p: any) => p.point_type !== 0);
      setPoints(filtered);
    } catch {
      message.error(t('sale.errors.loadPoints') || "Ошибка загрузки торговых точек");
    } finally {
      // setLoading(false); // Убираем отсюда, так как используем Promise.all ниже
    }
  };

  // Загрузка пользователей кассы
  const loadCashboxUsers = async (pointId: string) => {
    try {
      const data = await sendRequest(
        `${API_URL}/external/api/primary/information`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ point: pointId, type: "cashboxusers" }),
        }
      );

      const normalized = data.catalog.map((u: any) => ({
        ...u,
        id: String(u.id),
        role: String(u.role),
      }));

      const list = normalized.filter((u: any) => u.role !== "4");
      const role4List = normalized.filter((u: any) => u.role === "4");

      setCashboxUsers(list);
      setRole4Users(role4List);
    } catch {
      message.error(t('sale.errors.loadUsers') || "Ошибка загрузки пользователей кассы");
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPoints(), loadCompanyInfo()])
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" className={styles.pageLoader} />;

  if (!selectedPoint || !selectedUser) {
    return (
      <SelectPointAndUser
        points={points}
        cashboxes={cashboxes}
        users={cashboxUsers}
        loadUsers={loadCashboxUsers}
        loadCashboxes={loadCashboxes}
        onComplete={(pointId, cashboxId, user, pointName, address) => {
          setSelectedPoint({ id: pointId, name: pointName, address: address });
          setSelectedUser({ ...user, cashboxId });
          loadTicketFormat(pointId); 
        }}
      />
    );
  }

  return (
    <SaleWorkspace
      point={selectedPoint}
      cashboxUser={selectedUser}
      role4Users={role4Users}
      companyInfo={companyInfo}
      ticketFormat={ticketFormat}
    />
  );
};

export default SalePage;