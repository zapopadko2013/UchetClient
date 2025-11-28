import React from "react";
import { Select, Input, DatePicker } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next"; // Импортируем useTranslation
import styles from './SoldProductsReport.module.css';

interface SprItem {
  id: string;
  value: string;
  deleted?: boolean;
}

interface Attribute {
  id: string;
  category: string | null;
  values: string;
  format: "TEXT" | "DATE" | "SPR";
  sprvalues: SprItem[];
}

interface AttributeFieldProps {
  attribute: Attribute | null;
  value: string | Dayjs | null;
  onChange: (value: string | Dayjs | null) => void;
}

const AttributeField: React.FC<AttributeFieldProps> = ({ attribute, value, onChange }) => {
  const { t } = useTranslation(); // Инициализируем хук перевода

  if (!attribute) return null;

  // --- Формат: TEXT (Текстовое поле) ---
  if (attribute.format === "TEXT") {
    return (
      <Input
        // Перевод плейсхолдера
        placeholder={t('soldProducts.placeholder.attributeValue')} 
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className={styles.attributeFieldWidth}
      />
    );
  }

  // --- Формат: DATE (Выбор даты) ---
  if (attribute.format === "DATE") {
    // Note: DatePicker автоматически использует локаль, установленную в Ant Design ConfigProvider
    return (
      <DatePicker
        value={dayjs.isDayjs(value) ? value : null}
        onChange={(d) => onChange(d)}
        format="DD.MM.YYYY"
        className={styles.attributeFieldWidth}
      />
    );
  }

  // --- Формат: SPR (Справочник/Select) ---
  if (attribute.format === "SPR") {
  return (
    <Select
      className={styles.attributeFieldWidth}
      value={typeof value === "string" ? value : "@"}
      onChange={(v) => onChange(v)}
    >
      {/* Перевод "Все" */}
      <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option> 
      {attribute.sprvalues.map((item) => (
        <Select.Option key={item.id} value={item.value.toString()}>
          {item.value.toString()} {/* Значения справочника обычно не переводятся */}
        </Select.Option>
      ))}
    </Select>
  );
}

  return null;
};

export default AttributeField;