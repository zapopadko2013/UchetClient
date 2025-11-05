export interface ProductItem {
  id: string;
  name: string;
  detailscaption?: string;
  attributescaption?: string;
  code: string;
  purchaseprice: number;
  newprice: number;
  wholesale_price: number;
  amount: number;
  updateallprodprice?: boolean;
  stock?: string;
  invoicelist_id?: string;
}

export interface ProductDetails {
  brand: string;
  brandid: string;
  categoryid: string;
  category: string;
  newprice: number;
  wholesale_price: number;
  purchaseprice: number;
  code: string;
  name: string;
  cnofeacode: string;
  id: string;
  taxid: string;
  bonusrate: number;
  updateallprodprice: boolean;
  unitsprid: string;
  attributescaption: string | null;
  attributesarray: any[];
  attributes: string;
  attrs_json: any[];
  unitspr_name: string;
  detailscaption: any[];
  amount: number;
  invoicelist_id?: string;
}

export interface AttributeItem {
  id: string;
  category: string | null;
  values: string;
  deleted: boolean;
  format: string;
  sprvalues: any[];
}