import { escpos } from "./escpos";

export function formatReceipt({ items, total, debt, date, cashier }) {
  let t = "";

  t += escpos.reset;
  t += escpos.alignCenter;
  t += escpos.size2x + "ЧЕК ПРОДАЖИ\n" + escpos.sizeNormal;
  t += "------------------------------\n";

  t += escpos.alignLeft;
  items.forEach((p: any) => {
    t += `${p.name}\n`;
    t += `${p.qty} x ${p.price}`.padEnd(20) + `${p.qty * p.price}\n`;
  });

  t += "------------------------------\n";
  t += escpos.boldOn + `ИТОГО:               ${total}\n` + escpos.boldOff;

  if (debt > 0)
    t += `В ДОЛГ:              ${debt}\n`;

  t += `Дата: ${date}\n`;
  t += `Кассир: ${cashier}\n`;

  t += escpos.alignCenter;
  t += "\nСпасибо за покупку!\n";

  return t + "\n\n\n";
}

export function formatTestPage() {
  let t = "";
  t += escpos.reset;
  t += escpos.alignCenter;
  t += escpos.boldOn + escpos.size2x + "TEST PRINT\n" + escpos.sizeNormal + escpos.boldOff;
  t += "------------------------------\n";
  t += "Ширина печати OK\n";
  t += "Кириллица OK: Привет Мир!\n";
  t += "QR ниже:\n\n";
  t += escpos.qr("https://example.com");
  t += "\n\n\n";
  return t;
}
