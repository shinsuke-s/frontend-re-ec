export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string;
  image: string;
  images: string[];
  dimension1?: string;
  dimension2?: string;
  groupId?: string;
  type?: string;
  has_stock?: boolean;
  point?: number;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type OrderItem = CartItem;
export type OrderStatus = "processing" | "paid" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  date: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddressId: string;
  paymentMethodId: string;
};

export type Address = {
  id: string;
  label: string;
  recipient: string;
  line1: string;
  line2?: string;
  city: string;
  zip: string;
  phone: string;
};

export type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  holder: string;
  exp: string;
  type: "card" | "bank";
  default?: boolean;
  note?: string;
};

export const products: Product[] = [
  {
    id: "poncho-urban",
    slug: "poncho-urban",
    name: "Urban Storm Poncho",
    price: 13800,
    stock: 28,
    category: "ポンチョ",
    description: "ビジネスバッグも覆うロング丈。耐水圧20,000mmの3層素材でタウンユースに最適。",
    image: "/hero/slide-1.webp",
    images: ["/hero/slide-1.webp", "/hero/33980500.jpg", "/hero/slide-1.webp"],
  },
  {
    id: "poncho-trail",
    slug: "poncho-trail",
    name: "Trail Packable Poncho",
    price: 15800,
    stock: 16,
    category: "ポンチョ",
    description: "山行でも使える軽量パッカブル。ヒップカットで自転車やハイクにも◎。",
    image: "/hero/33980500.jpg",
    images: ["/hero/33980500.jpg", "/hero/slide-1.webp", "/hero/33980500.jpg"],
  },
  {
    id: "poncho-city",
    slug: "poncho-city",
    name: "City Commuter Poncho",
    price: 11800,
    stock: 36,
    category: "ポンチョ",
    description: "通勤に馴染むマット質感。フロントジップとマグネット開閉で着脱がスムーズ。",
    image: "/hero/33980500.jpg",
    images: ["/hero/33980500.jpg", "/hero/slide-1.webp"],
  },
  {
    id: "poncho-lite",
    slug: "poncho-lite",
    name: "Lite Travel Poncho",
    price: 9800,
    stock: 44,
    category: "ポンチョ",
    description: "旅行やフェスにぴったりの軽量モデル。ポーチ付きでコンパクトに収納。",
    image: "/hero/slide-1.webp",
    images: ["/hero/slide-1.webp", "/hero/33980500.jpg"],
  },
];

export const cart: CartItem[] = [
  { productId: "poncho-urban", quantity: 1 },
  { productId: "poncho-trail", quantity: 1 },
  { productId: "poncho-lite", quantity: 1 },
];

export const addresses: Address[] = [
  {
    id: "addr-1",
    label: "自宅",
    recipient: "佐藤 伸",
    line1: "東京都渋谷区桜丘町1-2-3",
    line2: "レジデンス501",
    city: "東京",
    zip: "150-0002",
    phone: "090-1234-5678",
  },
  {
    id: "addr-2",
    label: "オフィス",
    recipient: "佐藤 伸",
    line1: "東京都港区南青山4-5-6",
    line2: "WeWork 7F",
    city: "東京",
    zip: "107-0062",
    phone: "03-1234-5678",
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: "pm-visa",
    brand: "Visa",
    last4: "4242",
    holder: "Shin Sato",
    exp: "12/27",
    type: "card",
    default: true,
    note: "メインのカード",
  },
  {
    id: "pm-master",
    brand: "Mastercard",
    last4: "8888",
    holder: "Shin Sato",
    exp: "04/26",
    type: "card",
    note: "サブ",
  },
  {
    id: "pm-bank",
    brand: "三井住友",
    last4: "-7130",
    holder: "Shin Sato",
    exp: "",
    type: "bank",
    note: "口座振替",
  },
];

export const orders: Order[] = [
  {
    id: "ORD-241201",
    date: "2024-12-22",
    status: "processing",
    items: [
      { productId: "poncho-trail", quantity: 1 },
      { productId: "poncho-urban", quantity: 1 },
    ],
    shippingAddressId: "addr-1",
    paymentMethodId: "pm-visa",
    total: 29600,
  },
  {
    id: "ORD-241115",
    date: "2024-11-15",
    status: "shipped",
    items: [
      { productId: "poncho-trail", quantity: 1 },
      { productId: "poncho-city", quantity: 2 },
    ],
    shippingAddressId: "addr-2",
    paymentMethodId: "pm-master",
    total: 39400,
  },
  {
    id: "ORD-241004",
    date: "2024-10-04",
    status: "delivered",
    items: [{ productId: "poncho-city", quantity: 1 }],
    shippingAddressId: "addr-1",
    paymentMethodId: "pm-bank",
    total: 11800,
  },
];

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(value);

export const resolveProduct = (productId: string) => products.find((product) => product.id === productId);

export const calculateOrderTotal = (order: Order) =>
  order.items.reduce((sum, item) => {
    const product = resolveProduct(item.productId);
    return product ? sum + product.price * item.quantity : sum;
  }, 0);

export const getCartLines = () =>
  cart
    .map((item) => {
      const product = resolveProduct(item.productId);
      return product
        ? {
            quantity: item.quantity,
            product,
            lineTotal: product.price * item.quantity,
          }
        : null;
    })
    .filter(Boolean) as { quantity: number; product: Product; lineTotal: number }[];

