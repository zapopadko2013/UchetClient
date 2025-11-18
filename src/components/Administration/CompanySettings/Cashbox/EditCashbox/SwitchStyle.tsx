import React, { useCallback, useMemo } from "react";
import { Switch, Space, Tooltip, Typography } from "antd";
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
// ⭐️ Импорт useTranslation ⭐️
import { useTranslation } from 'react-i18next'; 
import styles from '../../AddPointForm.module.css'; 

// --- 1. ТИПЫ ДАННЫХ ---

type SwitchKey = 'BIN' | 'NDS' | 'ZNM' | 'RNM';

interface SwitchStyleProps {
  BIN: boolean;
  NDS: boolean;
  ZNM: boolean;
  RNM: boolean;
  handleSwitch: (name: SwitchKey, checked: boolean) => void;
}

// --- 2. КОНФИГУРАЦИЯ (Остаётся только тип) ---

interface SwitchConfig {
    key: SwitchKey;
    label: string;
    tooltip: string;
}

// ⭐️ УДАЛИТЬ глобальную константу switchConfigs, она будет создана внутри компонента ⭐️

// --- 3. КОМПОНЕНТ ---

const SwitchStyle: React.FC<SwitchStyleProps> = (props) => {
  // ⭐️ Используем хук перевода ⭐️
  const { t } = useTranslation(); 
  
  // ⭐️ ЛОКАЛИЗАЦИЯ: Создаем конфигурацию внутри useMemo ⭐️
  const switchConfigs: SwitchConfig[] = useMemo(() => [
    { 
        key: 'BIN', 
        label: t('companysettings.switch.binLabel', { defaultValue: 'БИН/ИИН' }), 
        tooltip: t('companysettings.switch.binTooltip', { defaultValue: 'Включить проверку БИН/ИИН' }) 
    },
    { 
        key: 'NDS', 
        label: t('companysettings.switch.ndsLabel', { defaultValue: 'НДС' }), 
        tooltip: t('companysettings.switch.ndsTooltip', { defaultValue: 'Включить поле НДС' }) 
    },
    { 
        key: 'ZNM', 
        label: t('companysettings.switch.znmLabel', { defaultValue: 'Зав. номер' }), 
        tooltip: t('companysettings.switch.znmTooltip', { defaultValue: 'Включить проверку заводского номера' }) 
    },
    { 
        key: 'RNM', 
        label: t('companysettings.switch.rnmLabel', { defaultValue: 'Рег. номер' }), 
        tooltip: t('companysettings.switch.rnmTooltip', { defaultValue: 'Включить поле регистрационного номера' }) 
    },
  ], [t]); // Зависимость от t для обновления при смене языка

  // Обработчик изменения
  const handleSwitchChange = useCallback((name: SwitchKey) => (checked: boolean) => {
    props.handleSwitch(name, checked);
  }, [props.handleSwitch]);

  return (
    <Space wrap size={20}>
      {switchConfigs.map((config) => {
        const checkedValue = props[config.key];
        
        return (
          // Используем локализованное значение config.tooltip
          <Tooltip title={config.tooltip} placement="top" key={config.key}> 
            <div className={styles.switchWrapper}>
                <Switch
                    className={styles.iosSwitch} 
                    checked={checkedValue}
                    onChange={handleSwitchChange(config.key)}
                    checkedChildren={<CheckOutlined />} 
                    unCheckedChildren={<CloseOutlined />}
                    
                />
                <Typography.Text className={styles.switchLabel}>
                    {config.label} {/* Используем локализованное значение config.label */}
                </Typography.Text>
            </div>
          </Tooltip>
        );
      })}
    </Space>
  );
};

export default SwitchStyle;