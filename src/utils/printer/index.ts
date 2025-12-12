import qz from "qz-tray";
import { initQZ } from "./qz";
import { formatReceipt, formatTestPage } from "./formatter";

export async function printData(data: string, printerName: string | null = null) {
  await initQZ();

  const config = qz.configs.create(printerName, {
    encoding: "CP866",
    rasterize: false,
  });

  return qz.print(config, [{ type: "raw", format: "plain", data }]);
}

export async function printReceipt(receipt: any, printerName: string | null = null) {
  const text = formatReceipt(receipt);
  return printData(text, printerName);
}

export async function printTestPage(printerName: string | null = null) {
  const text = formatTestPage();
  return printData(text, printerName);
}
