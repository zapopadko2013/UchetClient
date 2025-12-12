import qz from "qz-tray";

export async function initQZ() {
  if (qz.websocket.isActive()) return;

  qz.security.setCertificatePromise(resolve => resolve("UNSIGNED"));
  qz.security.setSignaturePromise(resolve => resolve(null));

  await qz.websocket.connect();
}

export async function listPrinters() {
  await initQZ();
  return qz.printers.find();
}

export async function getDefaultPrinter() {
  await initQZ();
  return qz.printers.getDefault();
}
