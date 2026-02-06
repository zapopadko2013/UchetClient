/* import React, { useState, useEffect } from 'react';
import { Radio, Card, Row, Col, Spin, message } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';

// --- Типы данных ---
interface TransItem {
  [key: string]: string | number;
}

interface ApiResponse {
  name: string;
  mlist: string[];
  trans: TransItem[];
  plan?: number;
}

type Period = 'days' | 'weeks' | 'months';

const COLORS = ['#1890ff', '#2f54eb', '#722ed1', '#eb2f96', '#f5222d', '#fa8c16', '#fadb14', '#52c41a'];

const AnalyticsCharts: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const [period, setPeriod] = useState<Period>('days');
  const [loading, setLoading] = useState<boolean>(false);
  const [chartsData, setChartsData] = useState<{ [key: number]: any[] }>({ 1: [], 2: [], 3: [] , 4: []});

  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // Вспомогательная функция для трансформации данных под Recharts
  const transformData = (data: ApiResponse[]) => {
    if (!data || data.length === 0) return [];
    const labels = data[0].mlist;
    return labels.map((label) => {
      const point: any = { name: label };
      data.forEach((store) => {
        // Ищем значение в массиве trans по ключу даты/недели
        const transEntry = store.trans.find(t => t[label] !== undefined);
        point[store.name] = transEntry ? parseFloat(transEntry[label] as string) : 0;
      });
      return point;
    });
  };

  const fetchAnalytics = async (currentPeriod: Period) => {
    setLoading(true);
    
    // Эндпоинты согласно вашему ТЗ
    const endpoints = {
      days: [
        '/api/graph/dailysales',
        '/api/graph/avgsumweek/days',
        '/api/graph/countticketmonth/days',
        '/api/graph/avgticketmonth/days'
      ],
      weeks: [
        '/api/graph/weeks',
        '/api/graph/avgsumweek/weeks',
        '/api/graph/countticketmonth/weeks',
        '/api/graph/avgticketmonth/weeks'
      ],
      months: [
        '/api/graph',
        '/api/graph/avgsumweek',
        '/api/graph/countticketmonth',
        '/api/graph/avgticketmonth'
      ]
    }[currentPeriod];

    try {
      // Делаем 4 запроса одновременно через ваш хук sendRequest
      const [res1, res2, res3, res4] = await Promise.all(
        endpoints.map(url => sendRequest(`${API_URL}${url}`, { headers: getHeaders() }))
      );

      setChartsData({
        1: transformData(res1),
        2: transformData(res2),
        3: transformData(res3),
        4: transformData(res4),
      });
    } catch (err) {
      console.error(err);
      message.error(t('analytics.loadError') || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const getTitle = (chartNum: number) => {
    const titles: Record<number, string> = {
      1: 'Сумма продаж по точкам',
      2: 'Среднедневная сумма продаж',
      3: 'Среднее количество чеков',
      4: 'Средний чек'
    };
    let title = titles[chartNum];
    if (period === 'weeks') title += ' за 14 недель';
    return title;
  };

  const renderLineChart = (data: any[], title: string) => (
    <Card title={title} style={{ marginBottom: 16 }}>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            {data.length > 0 && Object.keys(data[0])
              .filter(key => key !== 'name')
              .map((storeName, index) => (
                <Line
                  key={storeName}
                  type="monotone"
                  dataKey={storeName}
                  stroke={COLORS[index % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <Radio.Group 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)} 
          buttonStyle="solid"
        >
          <Radio.Button value="days">Дни</Radio.Button>
          <Radio.Button value="weeks">Недели</Radio.Button>
          <Radio.Button value="months">Месяцы</Radio.Button>
        </Radio.Group>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map(id => (
            <Col xs={24} lg={12} key={id}>
              {renderLineChart(chartsData[id], getTitle(id))}
            </Col>
          ))}
        </Row>
      </Spin>
    </div>
  );
};

export default AnalyticsCharts; */

import React, { useState, useEffect } from 'react';
import { Radio, Card, Row, Col, Spin, message } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { LineChartOutlined } from '@ant-design/icons';
import useApiRequest from '../../hooks/useApiRequest';
import styles from './AnalyticsCharts.module.css';

// --- Типы данных ---
interface TransItem {
  [key: string]: string | number;
}

interface ApiResponse {
  name: string;
  mlist: string[];
  trans: TransItem[];
  plan?: number;
}

type Period = 'days' | 'weeks' | 'months';

// Цвета для разных торговых точек
//const COLORS = ['#1890ff', '#2f54eb', '#722ed1', '#eb2f96', '#f5222d', '#fa8c16', '#fadb14', '#52c41a'];
const COLORS = [
  '#E6194B', // Ярко-красный
  '#3CB44B', // Зеленый
  '#FFE119', // Желтый
  '#4363D8', // Синий
  '#F58231', // Оранжевый
  '#911EB4', // Пурпурный
  '#42D4F4', // Голубой
  '#F032E6', // Розовый
  '#BFEF45', // Лайм
  '#FABEBE', // Светло-розовый
  '#469990', // Бирюзовый
  '#9A6324', // Коричневый
  '#800000', // Бордовый
  '#000075', // Темно-синий
];

const AnalyticsCharts: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  
  const [period, setPeriod] = useState<Period>('days');
  const [loading, setLoading] = useState<boolean>(false);
  // Состояние для хранения данных 4-х графиков
  const [chartsData, setChartsData] = useState<{ [key: number]: any[] }>({ 1: [], 2: [], 3: [], 4: [] });

  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // Функция трансформации данных из формата API в формат Recharts
  const transformData = (data: ApiResponse[]) => {
    if (!data || data.length === 0) return [];
    const labels = data[0].mlist;
    return labels.map((label) => {
      const point: any = { name: label };
      data.forEach((store) => {
        // Извлекаем значение из массива trans, где ключ совпадает с датой (label)
        const transEntry = store.trans.find(t => t[label] !== undefined);
        point[store.name] = transEntry ? parseFloat(transEntry[label] as string) : 0;
      });
      return point;
    });
  };

  const fetchAnalytics = async (currentPeriod: Period) => {
    setLoading(true);
    
    // Эндпоинты согласно периоду
    const endpoints = {
      days: [
        '/api/graph/dailysales',
        '/api/graph/avgsumweek/days',
        '/api/graph/countticketmonth/days',
        '/api/graph/avgticketmonth/days'
      ],
      weeks: [
        '/api/graph/weeks',
        '/api/graph/avgsumweek/weeks',
        '/api/graph/countticketmonth/weeks',
        '/api/graph/avgticketmonth/weeks'
      ],
      months: [
        '/api/graph',
        '/api/graph/avgsumweek',
        '/api/graph/countticketmonth',
        '/api/graph/avgticketmonth'
      ]
    }[currentPeriod];

    try {
      // Выполняем 4 запроса одновременно через ваш хук
      const [res1, res2, res3, res4] = await Promise.all(
        endpoints.map(url => sendRequest(`${API_URL}${url}`, { headers: getHeaders() }))
      );

      setChartsData({
        1: transformData(res1),
        2: transformData(res2),
        3: transformData(res3),
        4: transformData(res4),
      });
    } catch (err) {
      console.error(err);
      message.error(t('analytics.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  // Функция для формирования заголовка с учетом локализации и суффикса недель
  const getChartTitle = (chartNum: number) => {
    const titleKeys: Record<number, string> = {
      1: 'analytics.charts.totalSales',
      2: 'analytics.charts.avgDailySales',
      3: 'analytics.charts.avgTicketsCount',
      4: 'analytics.charts.avgTicketSum'
    };
    
    const baseTitle = t(titleKeys[chartNum]);
    
    if (period === 'weeks') {
      return t('analytics.charts.withWeeksSuffix', { title: baseTitle, count: 14 });
    }
    return baseTitle;
  };

  const renderLineChart = (data: any[], title: string) => (
    <Card 
      title={<span><LineChartOutlined  /> {title}</span>} 
      className={styles.chartCard}
      hoverable
    >
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend iconType="circle" />
            {data.length > 0 && Object.keys(data[0])
              .filter(key => key !== 'name')
              .map((storeName, index) => (
                <Line
                  key={storeName}
                  type="monotone"
                  dataKey={storeName}
                  stroke={COLORS[index % COLORS.length]}
                  dot={period === 'months'} // Точки только на месячном графике, чтоб не спамить
                  strokeWidth={2}
                  connectNulls
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  return (
    <div className={styles.container}>
      {/* Селектор периодов */}
      <div className={styles.radioGroupContainer}>
        <Radio.Group 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)} 
          buttonStyle="solid"
          size="large"
        >
          <Radio.Button value="days">{t('analytics.periods.days')}</Radio.Button>
          <Radio.Button value="weeks">{t('analytics.periods.weeks')}</Radio.Button>
          <Radio.Button value="months">{t('analytics.periods.months')}</Radio.Button>
        </Radio.Group>
      </div>

      {/* Сетка графиков */}
      <Spin spinning={loading} tip={t('analytics.loading')}>
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4].map(id => (
            <Col xs={24} xl={12} key={id}>
              {renderLineChart(chartsData[id], getChartTitle(id))}
            </Col>
          ))}
        </Row>
      </Spin>
    </div>
  );
};

export default AnalyticsCharts;