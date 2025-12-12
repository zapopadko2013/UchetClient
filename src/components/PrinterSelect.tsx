import React, { useEffect, useState } from "react";
import { listPrinters } from "../utils/printer/qz";
import { Select } from "antd";

const PrinterSelect = ({ value, onChange }: any) => {
  const [printers, setPrinters] = useState<string[]>([]);

  useEffect(() => {
    listPrinters().then(setPrinters);
  }, []);

  return (
    <Select
      style={{ width: "100%" }}
      placeholder="Выберите принтер"
      value={value}
      onChange={onChange}
    >
      {printers.map(p => (
        <Select.Option key={p} value={p}>
          {p}
        </Select.Option>
      ))}
    </Select>
  );
};

export default PrinterSelect;
