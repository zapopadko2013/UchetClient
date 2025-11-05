export interface Barcode {
  code: string;
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  attributescaption?: string;
}

export interface WeightProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  brand?: string;
  tax?: string;
}

export interface Category {
  id: string;
  name: string;
  deleted: boolean;
  parentid: string;
}

export interface Attribute {
  id: string;
  values: string;
}

export interface AttributeValue {
  id: string;
  value: string;
  deleted: boolean;
}
