import React, { useEffect, useState } from 'react';
import { Form, Switch, InputNumber, message, Spin } from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './MarkupTab.module.css'; 

interface Settings {
  top_limit: string;
  bottom_limit: string;
  check_average_purchaseprice: string;
}

const SettingsTab: React.FC = () => {
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();

  const [settings, setSettings] = useState<Settings>({
    top_limit: '0',
    bottom_limit: '0',
    check_average_purchaseprice: 'false',
  });
  const [loading, setLoading] = useState(false);

  // Отдельные состояния для переключателей
  const [topLimitEnabled, setTopLimitEnabled] = useState(false);
  const [bottomLimitEnabled, setBottomLimitEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [topRes, bottomRes, avgRes] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/settings?name=top_limit`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/settings?name=bottom_limit`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/settings?name=check_average_purchaseprice`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }),
      ]);

      const topLimitValue = topRes?.[0]?.value ?? '0';
      const bottomLimitValue = bottomRes?.[0]?.value ?? '0';

      setSettings({
        top_limit: topLimitValue,
        bottom_limit: bottomLimitValue,
        check_average_purchaseprice: avgRes?.[0]?.value ?? 'false',
      });

      setTopLimitEnabled(topLimitValue !== '0');
      setBottomLimitEnabled(bottomLimitValue !== '0');
    } catch (err) {
      message.error(t('pricingMaster.messages.settingsLoadError'));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (name: string, value: string) => {
    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/settings/add`, {
        method: 'POST',
        body: JSON.stringify({
          settings: [{ name, value }],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });
      setSettings((prev) => ({
        ...prev,
        [name]: value,
      }));
      message.success(t('pricingMaster.messages.settingsSaveSuccess'));
    } catch (err) {
      message.error(t('pricingMaster.messages.settingsSaveError'));
    }
  };

  // При переключении — отправляем запрос с нужным значением
  const onTopLimitSwitchChange = async (checked: boolean) => {
    setTopLimitEnabled(checked);
    const newValue = checked ? settings.top_limit : '0';
    await updateSetting('top_limit', newValue);
  };

  const onBottomLimitSwitchChange = async (checked: boolean) => {
    setBottomLimitEnabled(checked);
    const newValue = checked ? settings.bottom_limit : '0';
    await updateSetting('bottom_limit', newValue);
  };

  // При вводе в поле меняем только локальный стейт — запрос не отправляется
  const onTopLimitInputChange = (num: number | null) => {
    if (num === null) return;
    setSettings((prev) => ({
      ...prev,
      top_limit: String(num),
    }));
  };

  const onBottomLimitInputChange = (num: number | null) => {
    if (num === null) return;
    setSettings((prev) => ({
      ...prev,
      bottom_limit: String(num),
    }));
  };

  if (loading) {
    return <Spin />;
  }

  return (
    <Form layout="vertical">
      {/* Уведомление при увеличении */}
      <Form.Item>
        <Switch checked={topLimitEnabled} onChange={onTopLimitSwitchChange} />
        {' '}{t('pricingMaster.settingsForm.notifyIfIncrease')}
        <InputNumber
          min={0}
          value={Number(settings.top_limit)}
          onChange={onTopLimitInputChange}
          disabled={topLimitEnabled} // поле неактивно, когда переключатель включен
          addonAfter="%"
         className={styles.inputWithMargin}
        />
      </Form.Item>

      {/* Уведомление при уменьшении */}
      <Form.Item>
        <Switch checked={bottomLimitEnabled} onChange={onBottomLimitSwitchChange} />
        {' '}{t('pricingMaster.settingsForm.notifyIfDecrease')}
        <InputNumber
          min={0}
          value={Number(settings.bottom_limit)}
          onChange={onBottomLimitInputChange}
          disabled={bottomLimitEnabled} // поле неактивно, когда переключатель включен
          addonAfter="%"
         className={styles.inputWithMargin}
        />
      </Form.Item>

      {/* Проверка средней себестоимости */}
      <Form.Item>
        <Switch
          checked={settings.check_average_purchaseprice === 'true'}
          onChange={(checked) =>
            updateSetting('check_average_purchaseprice', checked ? 'true' : 'false')
          }
        />
        {'  '}{t('pricingMaster.settingsForm.checkAvgPurchase')}
      </Form.Item>
    </Form>
  );
};

export default SettingsTab;
