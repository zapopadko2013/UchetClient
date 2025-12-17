// ReturnWorkspace/types.ts

// --- Детали чека из API ---
export interface TicketDetailFromApi {
  // --- идентификация товара ---
  product: number;
  productname?: string;
  code: string;              // код продукта
  name?: string;             // можно добавлять name после сопоставления с каталогом

  // --- количество и цена ---
  units: number;
  price: number;
  discount: number;

  // --- налоги / бонусы ---
  taxrate: number;
  nds: number;
  bonusadd: number;
  bonuspay: number;
  bonusrate: number;
  ticketdiscount: number;
  pieceunits: number;

  // --- дополнительные данные ---
  attributes: any;
  invoicenumber: string;

  coupon: any[];
  cert: any[];
  promotions: any[];

  // --- дополнительные поля из API ---
  markup?: number;
  wholesale?: number;
  issalebypiece?: boolean;
  excisestamp?: any[];
  line?: number;
  total?: number;
}

// --- Чек из API ---
export interface TicketFromApi {
  id: number;
  tickettype: number;
  ticketid: number;
  date: string;

  // --- платежи ---
  cashpay: number;
  cardpay: number;
  debitpay: number;
  certpay: number;
  bonuspay: number;
  debtpay: number;
  discount: number;
  bonusadd: number;
  price: number;

  paymenttype: string;

  // --- идентификация ---
  cashbox: number;
  cashboxuser: number;
  sellerid: number;
  customerid: number;
  fizid: number;
  debtorid: number;
  bonusid: number;

  shiftnumber: number;
  hash: string;
  ofdnumber: string;
  ofdurl: string;
  consignment: boolean;

  details: TicketDetailFromApi[];
  cert: any[];  // Добавили поле cert
  coupon: any[]; // Можно добавить поле coupon, если оно есть
}

// --- Сформированные товары для продажи/возврата ---
export interface SaleProduct {
  key: string;
  productId: number;
  name: string;
  qty: number;
  price: number;
  originalPrice: number;
  discount: number;

  listcode: any;
  certificates: any[];
  coupons: any[];
  promotions: any[];
  invoiceNumber: string;

  bonusadd: number;
  bonuspay: number;
  bonusrate: number;
  nds: number;
  ticketdiscount: number;
  pieceunits: number;
  taxrate: number;
  markup?: number;
  wholesale?: number;
  issalebypiece?: boolean;
  excisestamp?: any[];
  line?: number;
  total?: number;
}

// --- Маппинг деталей чека в SaleProduct ---
export const mapTicketDetailsToSaleProducts = (
  details: TicketDetailFromApi[]
): SaleProduct[] => {
  return details.map((d, index) => ({
    key: `${d.product}_${index}`,
    productId: d.product,
    name: d.productname || `Товар ${d.product}`,
    qty: d.units,
    price: d.price,
    originalPrice: d.price + (d.discount || 0),
    discount: d.discount,
    listcode: d.attributes,
    certificates: d.cert || [],
    coupons: d.coupon || [],
    promotions: d.promotions || [],
    invoiceNumber: d.invoicenumber || "",
    bonusadd: d.bonusadd,
    bonuspay: d.bonuspay,
    bonusrate: d.bonusrate,
    nds: d.nds,
    ticketdiscount: d.ticketdiscount,
    pieceunits: d.pieceunits,
    taxrate: d.taxrate,
    markup: d.markup || 0,
    wholesale: d.wholesale || 0,
    issalebypiece: d.issalebypiece || false,
    excisestamp: d.excisestamp || [],
    line: d.line || index + 1,
    total: d.total || d.price,
  }));
};

// --- Формирование объекта transaction для возврата ---
export const mapReturnTransaction = (
  ticket: TicketFromApi,
  saleProducts: SaleProduct[],
  totalAmount: number
) => {
  const transactionDetails = saleProducts.map((p, index) => ({
    product: p.productId,
    line: p.line || index + 1,
    units: -Math.abs(p.qty),
    price: -Math.abs(p.price),
    discount: -Math.abs(p.discount),
    attributes: p.listcode,
    invoicenumber: p.invoiceNumber,
    coupon: p.coupons,
    cert: p.certificates,
    promotions: p.promotions,
    nds: p.nds,
    bonusadd: p.bonusadd,
    bonuspay: p.bonuspay,
    bonusrate: p.bonusrate,
    ticketdiscount: p.ticketdiscount,
    pieceunits: p.pieceunits,
    taxrate: p.taxrate,
    markup: p.markup,
    wholesale: p.wholesale,
    issalebypiece: p.issalebypiece,
    excisestamp: p.excisestamp,
    total: -Math.abs(p.total || p.price),
  }));

  return {
    date: new Date().toLocaleString("ru-RU"),
    parentid: ticket.ticketid,
    tickettype: 1, // возврат
    price: -Math.abs(totalAmount),
    total: -Math.abs(totalAmount),
    discount: ticket.discount,
    bonusadd: -Math.abs(ticket.bonusadd),
    bonuspay: -Math.abs(ticket.bonuspay),
    cashpay: -Math.abs(ticket.cashpay),
    cardpay: -Math.abs(ticket.cardpay),
    debitpay: -Math.abs(ticket.debitpay),
    certpay: -Math.abs(ticket.certpay),
    debtpay: -Math.abs(ticket.debtpay),
    paymenttype: ticket.paymenttype,
    cashbox: ticket.cashbox,
    cashboxuser: ticket.cashboxuser,
    sellerid: ticket.sellerid,
    customerid: ticket.customerid,
    fizid: ticket.fizid,
    debtorid: ticket.debtorid,
    bonusid: ticket.bonusid,
    shiftnumber: ticket.shiftnumber,
    hash: ticket.hash,
    ofdnumber: ticket.ofdnumber,
    ofdurl: ticket.ofdurl,
    consignment: ticket.consignment,
    details: transactionDetails,
    promotions: [],
  };
};
