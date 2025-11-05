import React from 'react';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

type RangeValue = [Dayjs | null, Dayjs | null] | null;

interface DateRangePickerSafeProps {
  value?: RangeValue;
  onChange: (dates: RangeValue) => void;
}

const DateRangePickerSafe: React.FC<DateRangePickerSafeProps> = ({ value, onChange }) => {
  const handleChange = (dates: RangeValue) => {
    if (dates && dates[0] && dates[1]) {
      onChange(dates);
    } else {
      onChange([dayjs(), dayjs()]);
    }
  };

  return (
    <DatePicker.RangePicker
      value={value}
      onChange={handleChange}
      defaultPickerValue={[dayjs(), dayjs()]}
      format="DD.MM.YYYY"
    />
  );
};

export default DateRangePickerSafe;
