export type GuestCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  slug: string;
  image?: string;
  groupId?: string;
  variantLabel?: string;
};

const STORAGE_KEY = "guest_cart_items";

const readStorage = (): GuestCartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStorage = (items: GuestCartItem[]) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
};

export const getGuestCartItems = () => readStorage();

export const setGuestCartItems = (items: GuestCartItem[]) => {
  writeStorage(items);
  return items;
};

export const updateGuestCartItemMeta = (
  productId: string,
  patch: Partial<GuestCartItem>
) => {
  const items = readStorage().map((item) =>
    item.productId === productId ? { ...item, ...patch } : item
  );
  writeStorage(items);
  return items;
};

export const addGuestCartItem = (item: GuestCartItem) => {
  const items = readStorage();
  const existing = items.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += item.quantity;
    if (item.variantLabel) {
      existing.variantLabel = item.variantLabel;
    }
  } else {
    items.push({ ...item });
  }
  writeStorage(items);
  return items;
};

export const updateGuestCartItem = (productId: string, quantity: number) => {
  const items = readStorage()
    .map((item) =>
      item.productId === productId
        ? { ...item, quantity: Math.max(0, quantity) }
        : item
    )
    .filter((item) => item.quantity > 0);
  writeStorage(items);
  return items;
};

export const removeGuestCartItem = (productId: string) => {
  const items = readStorage().filter((item) => item.productId !== productId);
  writeStorage(items);
  return items;
};

export const clearGuestCart = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};
