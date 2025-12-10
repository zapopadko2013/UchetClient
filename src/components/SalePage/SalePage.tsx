import React, { useState, useEffect } from "react";
import { message, Spin } from "antd";

import SelectPointAndUser from "./SelectPointAndUser";
import SaleWorkspace from "./SaleWorkspace";
import useApiRequest from "../../hooks/useApiRequest";

const SalePage: React.FC = () => {
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || "";

  const [points, setPoints] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  const [cashboxUsers, setCashboxUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [role4Users, setRole4Users] = useState<any[]>([]);
  const [cashboxes, setCashboxes] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  // ---------------------------------------------
  // Загрузка касс
  // ---------------------------------------------
  const loadCashboxes = async (pointId: string) => {
    try {
      const data = await sendRequest(
        `${API_URL}/external/api/cashboxes?pointid=${pointId}`,
        { headers: getHeaders() }
      );

      setCashboxes(data.cashboxes || []);
    } catch (e) {
      message.error("Ошибка загрузки касс");
    }
  };

  // ---------------------------------------------
  // Загрузка торговых точек
  // ---------------------------------------------
  const loadPoints = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/point`, {
        headers: getHeaders(),
      });

      const filtered = data.filter((p: any) => p.point_type !== 0);
      setPoints(filtered);
    } catch {
      message.error("Ошибка загрузки торговых точек");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------
  // Загрузка пользователей кассы
  // ---------------------------------------------
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

      // Нормализуем ID и роли
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
      message.error("Ошибка загрузки пользователей кассы");
    }
  };

  useEffect(() => {
    loadPoints();
  }, []);

  if (loading) return <Spin />;

  // ---------------------------------------------
  // Если точка или пользователь не выбраны
  // ---------------------------------------------
  if (!selectedPoint || !selectedUser) {
    return (
      <SelectPointAndUser
        points={points}
        cashboxes={cashboxes}
        users={cashboxUsers}
        loadUsers={loadCashboxUsers}
        loadCashboxes={loadCashboxes}
        onComplete={(pointId, cashboxId, user) => {
          setSelectedPoint(pointId);
          setSelectedUser({ ...user, cashboxId });
        }}
      />
    );
  }

  return (
    <SaleWorkspace
      pointId={selectedPoint}
      cashboxUser={selectedUser}
      role4Users={role4Users}
    />
  );
};

export default SalePage;
