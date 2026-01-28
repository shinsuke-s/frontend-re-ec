"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/data";
import {
  clearGuestCart,
  getGuestCartItems,
  setGuestCartItems,
} from "@/lib/guestCart";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  slug: string;
  image?: string;
  orderItemId?: string;
  variantLabel?: string;
};

type Address = {
  id: string;
  first_name: string;
  last_name: string;
  first_name_kana: string;
  last_name_kana: string;
  gender?: string;
  date_of_birth?: string;
  postal_code: string;
  prefecture: string;
  city: string;
  town: string;
  street: string;
  building?: string | null;
  room?: string | null;
  phone?: string | null;
  email?: string | null;
  is_default?: boolean;
  type?: string;
  gender?: string;
  date_of_birth?: string;
};

type AddressForm = {
  first_name: string;
  last_name: string;
  first_name_kana: string;
  last_name_kana: string;
  postal_code: string;
  prefecture: string;
  city: string;
  town: string;
  street: string;
  building?: string;
  room?: string;
  phone?: string;
  email?: string;
  is_default?: boolean;
  type?: "delivery" | "bill";
};

type Payment = {
  id: number;
  nickname?: string | null;
  brand?: string | null;
  last4?: string | null;
  exp_month?: number | null;
  exp_year?: number | null;
  is_default?: boolean;
};

type PaymentForm = {
  nickname: string;
  brand: string;
  cardNumber: string;
  exp_month: string;
  exp_year: string;
  is_default: boolean;
};

type CartResponse = {
  status: string;
  items?: CartItem[];
  total?: number;
  message?: string;
};

type AddressResponse = {
  status: string;
  items?: Address[];
  id?: string;
  message?: string;
};

type ZipResponse = {
  status: string;
  prefecture?: string;
  city?: string;
  town?: string;
  message?: string;
};

type AccountResponse = {
  status: string;
  account?: {
    email?: string | null;
  };
};

const emptyAddressForm: AddressForm = {
  first_name: "",
  last_name: "",
  first_name_kana: "",
  last_name_kana: "",
  gender: "MALE",
  date_of_birth: "",
  postal_code: "",
  prefecture: "",
  city: "",
  town: "",
  street: "",
  building: "",
  room: "",
  phone: "",
  email: "",
  is_default: false,
};

const emptyPaymentForm: PaymentForm = {
  nickname: "",
  brand: "",
  cardNumber: "",
  exp_month: "",
  exp_year: "",
  is_default: false,
};

const dummyPayments: Payment[] = [
  {
    id: 1,
    nickname: "メインカード",
    brand: "VISA",
    last4: "9017",
    exp_month: 12,
    exp_year: 2028,
    is_default: true,
  },
];

const safeJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const formatAddressLine = (addr: Address) =>
  [
    addr.prefecture,
    addr.city,
    addr.town,
    addr.street,
    addr.building || "",
    addr.room || "",
  ]
    .filter(Boolean)
    .join("");

const parseDateParts = (value?: string) => {
  const base = value ? String(value).slice(0, 10) : "";
  const match = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return {
    year: match ? match[1] : "",
    month: match ? match[2] : "",
    day: match ? match[3] : "",
  };
};

const buildDate = (parts: { year: string; month: string; day: string }) => {
  if (!parts.year || !parts.month || !parts.day) return "";
  const mm = parts.month.padStart(2, "0");
  const dd = parts.day.padStart(2, "0");
  return `${parts.year}-${mm}-${dd}`;
};

const normalizePhone = (value: string) => {
  const halfWidth = value.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  return halfWidth.replace(/[^0-9]/g, "");
};

const normalizePostal = (value: string) => {
  const halfWidth = value.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  return halfWidth.replace(/[^0-9]/g, "");
};

const monthOptions = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const dayOptions = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);

export default function CheckoutPage() {
  const router = useRouter();
  const dobYears = useMemo(() => {
    const current = new Date().getFullYear();
    const years: string[] = [];
    for (let year = current; year >= 1900; year -= 1) {
      years.push(String(year));
    }
    return years;
  }, []);
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [billingAddresses, setBillingAddresses] = useState<Address[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedBillingAddress, setSelectedBillingAddress] =
    useState<Address | null>(null);
  const [billingMode, setBillingMode] = useState<"existing" | "new">(
    "existing",
  );
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "convenience">(
    "card",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupMode, setSignupMode] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [syncingGuest, setSyncingGuest] = useState(false);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressFormMode, setAddressFormMode] = useState<"new" | "edit">("new");
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddressForm);
  const [addressDob, setAddressDob] = useState(() =>
    parseDateParts(emptyAddressForm.date_of_birth),
  );
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [addressFormMessage, setAddressFormMessage] = useState<string | null>(
    null,
  );
  const [zipLoading, setZipLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [paymentPickerOpen, setPaymentPickerOpen] = useState(false);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [paymentFormMessage, setPaymentFormMessage] = useState<string | null>(
    null,
  );
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [billingEmail, setBillingEmail] = useState("");
  const [billingForm, setBillingForm] = useState<AddressForm>(emptyAddressForm);
  const [billingDob, setBillingDob] = useState(() =>
    parseDateParts(emptyAddressForm.date_of_birth),
  );
  const [billingFormError, setBillingFormError] = useState<string | null>(null);
  const [billingZipLoading, setBillingZipLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const subtotal = useMemo(() => {
    if (total !== null) return total;
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items, total]);
  const rewardPoints = useMemo(() => Math.floor(subtotal * 0.01), [subtotal]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setAddressError(null);
      setPaymentError(null);
      setIsGuest(false);
      let guest = false;
      try {
        const [cartRes, addrRes, billRes, accountRes] = await Promise.all([
          fetch("/api/external-cart", { cache: "no-store" }),
          fetch("/api/addresses", { cache: "no-store" }).catch(() => null),
          fetch("/api/addresses?type=bill", { cache: "no-store" }).catch(
            () => null,
          ),
          fetch("/api/account", { cache: "no-store" }).catch(() => null),
        ]);

        const cartData: CartResponse = await safeJson(cartRes);
        if (!cartRes.ok) {
          if (
            cartRes.status === 401 ||
            cartData?.status === "guest" ||
            (typeof cartData?.message === "string" &&
              cartData.message.includes("Auth token is not set"))
          ) {
            const guestItems = getGuestCartItems();
            setItems(guestItems);
            setTotal(null);
            guest = true;
            setAddresses([]);
            setSelectedAddress(null);
            setBillingAddresses([]);
            setSelectedBillingAddress(null);
            setPayments([]);
            setSelectedPayment(null);
            if (guestItems.length > 0) {
              setNotice("ログインして注文を確定してください。");
              setShowLoginModal(true);
            }
            void hydrateGuestVariants(guestItems);
          } else {
            throw new Error(cartData?.message || "カートの取得に失敗しました");
          }
        } else {
          setItems(cartData.items || []);
          setTotal(typeof cartData.total === "number" ? cartData.total : null);
          guest = false;
        }

        if (!guest && addrRes) {
          const addrData = await safeJson(addrRes);
          if (
            addrRes.status === 401 ||
            (typeof addrData?.message === "string" &&
              addrData.message.includes("Auth token is not set"))
          ) {
            setAddresses([]);
            setSelectedAddress(null);
          } else if (!addrRes.ok) {
            setAddressError(addrData?.message || "配送先の取得に失敗しました");
          } else {
            const list: Address[] = addrData.items || addrData.addresses || [];
            setAddresses(list);
            const def = list.find((a) => a.is_default) || list[0] || null;
            setSelectedAddress(def);
          }
        } else if (!guest) {
          setAddressError("配送先の取得に失敗しました");
        }

        if (!guest && billRes) {
          const billData = await safeJson(billRes);
          if (
            billRes.status === 401 ||
            (typeof billData?.message === "string" &&
              billData.message.includes("Auth token is not set"))
          ) {
            setBillingAddresses([]);
            setSelectedBillingAddress(null);
          } else if (!billRes.ok) {
            setBillingFormError(
              billData?.message || "請求先の取得に失敗しました",
            );
          } else {
            const list: Address[] = billData.items || billData.addresses || [];
            setBillingAddresses(list);
            const first = list[0] || null;
            setSelectedBillingAddress(first);
          }
        }

        if (!guest) {
          setPayments(dummyPayments);
          setSelectedPayment(dummyPayments[0] || null);
        }

        if (!guest && accountRes) {
          const accountData: AccountResponse = await safeJson(accountRes);
          const email = accountData?.account?.email || "";
          if (email) {
            setAccountEmail(email);
            setBillingEmail((prev) => prev || email);
          }
        }
        setIsGuest(guest);
      } catch (e: any) {
        setError(e.message || "カートの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hydrateGuestVariants = async (guestItems: CartItem[]) => {
    const missing = guestItems.filter((item) => !item.variantLabel);
    if (missing.length === 0) return;
    try {
      const entries = await Promise.all(
        missing.map(async (item) => {
          const res = await fetch(
            `/api/external-product?id=${encodeURIComponent(item.productId)}`,
            { cache: "no-store" }
          );
          const data = await res.json().catch(() => ({}));
          return {
            productId: item.productId,
            variantLabel: data?.variantLabel || "",
          };
        })
      );
      const labelMap = new Map(
        entries
          .filter((e) => e.variantLabel)
          .map((e) => [e.productId, e.variantLabel])
      );
      if (labelMap.size === 0) return;
      const next = guestItems.map((item) => ({
        ...item,
        variantLabel: labelMap.get(item.productId) || item.variantLabel,
      }));
      setGuestCartItems(next);
      setItems(next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (billingEmail) return;
    if (selectedAddress?.email) {
      setBillingEmail(selectedAddress.email);
    } else if (accountEmail) {
      setBillingEmail(accountEmail);
    }
  }, [billingEmail, selectedAddress, accountEmail]);

  useEffect(() => {
    if (billingSame) return;
    if (billingAddresses.length === 0) {
      setBillingMode("new");
      setSelectedBillingAddress(null);
      return;
    }
    if (!selectedBillingAddress) {
      setSelectedBillingAddress(billingAddresses[0]);
    }
    if (billingMode !== "new") {
      setBillingMode("existing");
    }
  }, [billingSame, billingAddresses, selectedBillingAddress, billingMode]);

  const updateCartAddress = async (
    addressId: string,
    type: "delivery" | "bill",
  ) => {
    const res = await fetch("/api/external-cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address_id: addressId, type }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.message || "住所の反映に失敗しました");
  };

  const syncGuestCartToExternal = async () => {
    const guestItems = getGuestCartItems();
    if (guestItems.length === 0) return;
    setSyncingGuest(true);
    try {
      const cartRes = await fetch("/api/external-cart", { cache: "no-store" });
      const cartData: CartResponse = await safeJson(cartRes);
      const existingItems = cartData.items || [];
      const existingProductIds = new Set(
        existingItems.map((item) => String(item.productId))
      );
      const uniqueGuest = guestItems.filter(
        (item) => !existingProductIds.has(String(item.productId))
      );

      const addedIds = new Set<string>();
      for (const item of uniqueGuest) {
        await fetch("/api/external-cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: item.productId }),
        });
        addedIds.add(String(item.productId));
      }

      const refreshedCartRes = await fetch("/api/external-cart", { cache: "no-store" });
      const refreshedCartData: CartResponse = await safeJson(refreshedCartRes);
      const list = refreshedCartData.items || [];

      for (const item of uniqueGuest) {
        if (!addedIds.has(String(item.productId))) continue;
        if (item.quantity <= 1) continue;
        const match = list.find((i) => i.productId === item.productId);
        if (!match?.orderItemId) continue;
        await fetch("/api/external-cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_item_id: match.orderItemId,
            quantity: item.quantity,
          }),
        });
      }

      clearGuestCart();
    } finally {
      setSyncingGuest(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginId || !loginPassword) return;
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password: loginPassword }),
      });
      const data = await safeJson(res);
      if (!res.ok)
        throw new Error(data?.message || "ログインに失敗しました。");

      await syncGuestCartToExternal();
      setShowLoginModal(false);
      setSignupMode(false);
      setLoginId("");
      setLoginPassword("");

      const cartRes = await fetch("/api/external-cart", { cache: "no-store" });
      const cartData: CartResponse = await safeJson(cartRes);
      if (cartRes.ok) {
        setItems(cartData.items || []);
        setTotal(typeof cartData.total === "number" ? cartData.total : null);
        setIsGuest(false);
      }
    } catch (e: any) {
      setLoginError(e.message || "ログインに失敗しました。");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) return;
    setSignupLoading(true);
    setSignupError(null);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok)
        throw new Error(data?.message || "登録に失敗しました。");

      await syncGuestCartToExternal();
      setShowLoginModal(false);
      setSignupMode(false);
      setSignupEmail("");
      setSignupPassword("");

      const cartRes = await fetch("/api/external-cart", { cache: "no-store" });
      const cartData: CartResponse = await safeJson(cartRes);
      if (cartRes.ok) {
        setItems(cartData.items || []);
        setTotal(typeof cartData.total === "number" ? cartData.total : null);
        setIsGuest(false);
      }
    } catch (e: any) {
      setSignupError(e.message || "登録に失敗しました。");
    } finally {
      setSignupLoading(false);
    }
  };

  const isValidBillingForm = (form: AddressForm, email: string) =>
    Boolean(
      form.last_name &&
      form.first_name &&
      form.last_name_kana &&
      form.first_name_kana &&
      form.gender &&
      form.date_of_birth &&
      form.postal_code &&
      form.prefecture &&
      form.city &&
      form.town &&
      form.street &&
      form.phone &&
      email,
    );

  const findMatchingAddress = (
    list: Address[],
    form: AddressForm,
    email: string,
    type: "delivery" | "bill",
  ) =>
    list.find(
      (addr) =>
        (addr.type || "delivery") === type &&
        addr.last_name === form.last_name &&
        addr.first_name === form.first_name &&
        addr.postal_code === form.postal_code &&
        addr.prefecture === form.prefecture &&
        addr.city === form.city &&
        addr.town === form.town &&
        addr.street === form.street &&
        (addr.email || "") === (email || ""),
    );

  const handleConfirm = async () => {
    setNotice(null);
    setError(null);
    setAddressError(null);
    setBillingFormError(null);
    if (!selectedAddress) {
      setAddressError("お届け先を選択してください。");
      return;
    }
    if (!billingSame) {
      if (billingMode === "existing") {
        if (!selectedBillingAddress?.id) {
          setBillingFormError("登録済みの請求先を選択してください。");
          return;
        }
      } else if (!isValidBillingForm(billingForm, billingEmail)) {
        setBillingFormError("請求先情報を入力してください。");
        return;
      }
    }

    setConfirming(true);
    try {
      const deliveryId = selectedAddress.id;
      let billId = deliveryId;

      if (!billingSame) {
        if (billingMode === "existing" && selectedBillingAddress?.id) {
          billId = selectedBillingAddress.id;
        } else {
          const payload = {
            ...billingForm,
            type: "bill" as const,
            email: billingEmail || billingForm.email || "",
          };
          const res = await fetch("/api/addresses?type=bill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data: AddressResponse = await safeJson(res);
          if (!res.ok)
            throw new Error(data?.message || "請求先の登録に失敗しました。");
          const list = data.items || [];
          const matched =
            findMatchingAddress(list, billingForm, billingEmail, "bill") ||
            list[0];
          if (matched?.id) {
            billId = matched.id;
          }
        }
      }

      await updateCartAddress(deliveryId, "delivery");
      await updateCartAddress(billId, "bill");

      const confirmRes = await fetch("/api/external-cart/confirm", {
        method: "POST",
      });
      const confirmData = await safeJson(confirmRes);
      if (!confirmRes.ok) {
        throw new Error(confirmData?.message || "注文確定に失敗しました。");
      }
      const orderNo =
        confirmData?.data?.order_id ||
        confirmData?.data?.orderId ||
        confirmData?.order_id ||
        confirmData?.orderId ||
        `EC-${Date.now()}`;
      router.push(`/checkout/thanks?order=${encodeURIComponent(orderNo)}`);
      return;
    } catch (e: any) {
      setNotice(e.message || "注文確定に失敗しました。");
    } finally {
      setConfirming(false);
    }
  };

  const handleToggleAddressPicker = () => {
    setAddressPickerOpen((prev) => !prev);
    setAddressFormOpen(false);
    setAddressFormError(null);
    setAddressFormMessage(null);
  };

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddress(addr);
    setAddressPickerOpen(false);
    setAddressFormOpen(false);
    setAddressFormError(null);
    setAddressFormMessage(null);
  };

  const handleStartNewAddress = () => {
    setAddressPickerOpen(true);
    setAddressFormOpen(true);
    setAddressFormMode("new");
    setAddressFormError(null);
    setAddressFormMessage(null);
    setAddressForm({ ...emptyAddressForm, type: "delivery" });
    setAddressDob(parseDateParts(""));
  };

  const handleEditAddress = () => {
    if (!selectedAddress) return;
    setAddressPickerOpen(true);
    setAddressFormOpen(true);
    setAddressFormMode("edit");
    setAddressFormError(null);
    setAddressFormMessage(null);
    const nextDob = parseDateParts(selectedAddress.date_of_birth);
    setAddressDob(nextDob);
    setAddressForm({
      first_name: selectedAddress.first_name || "",
      last_name: selectedAddress.last_name || "",
      first_name_kana: selectedAddress.first_name_kana || "",
      last_name_kana: selectedAddress.last_name_kana || "",
      gender: selectedAddress.gender || "MALE",
      date_of_birth: selectedAddress.date_of_birth || "",
      postal_code: selectedAddress.postal_code || "",
      prefecture: selectedAddress.prefecture || "",
      city: selectedAddress.city || "",
      town: selectedAddress.town || "",
      street: selectedAddress.street || "",
      building: selectedAddress.building || "",
      room: selectedAddress.room || "",
      phone: selectedAddress.phone || "",
      email: selectedAddress.email || "",
      is_default: true,
      type: "delivery",
    });
  };

  const updateAddressForm = (patch: Partial<AddressForm>) => {
    setAddressForm({ ...addressForm, ...patch });
  };

  const updateAddressDob = (patch: Partial<typeof addressDob>) => {
    setAddressDob((prev) => {
      const next = { ...prev, ...patch };
      setAddressForm((prevForm) => ({
        ...prevForm,
        date_of_birth: buildDate(next),
      }));
      return next;
    });
  };

  const handleLookupZip = async () => {
    const zip = (addressForm.postal_code || "").replace(/\D/g, "");
    if (zip.length !== 7) {
      setAddressFormError("郵便番号はハイフンなし7桁で入力してください。");
      return;
    }
    setZipLoading(true);
    setAddressFormError(null);
    try {
      const res = await fetch(`/api/postcode?zip=${zip}`, {
        cache: "no-store",
      });
      const data: ZipResponse = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "住所検索に失敗しました");
      updateAddressForm({
        prefecture: data.prefecture || addressForm.prefecture,
        city: data.city || addressForm.city,
        town: data.town || addressForm.town,
      });
      setAddressFormMessage("郵便番号から住所を反映しました。");
    } catch (e: any) {
      setAddressFormError(e.message || "住所検索に失敗しました");
    } finally {
      setZipLoading(false);
    }
  };

  const handleCreateAddress = async () => {
    setAddressSaving(true);
    setAddressFormError(null);
    setAddressFormMessage(null);
    const isValidAddress =
      addressForm.last_name &&
      addressForm.first_name &&
      addressForm.last_name_kana &&
      addressForm.first_name_kana &&
      addressForm.gender &&
      addressForm.date_of_birth &&
      addressForm.postal_code &&
      addressForm.prefecture &&
      addressForm.city &&
      addressForm.town &&
      addressForm.street &&
      addressForm.phone &&
      addressForm.email;
    if (!isValidAddress) {
      setAddressSaving(false);
      setAddressFormError("必須項目を入力してください。");
      return;
    }
    try {
      const res = await fetch("/api/addresses", {
        method: addressFormMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addressForm,
          type: addressForm.type || "delivery",
          is_default:
            addressFormMode === "edit" ? true : addressForm.is_default,
        }),
      });
      const data: AddressResponse = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "登録に失敗しました");
      const list = data.items || [];
      setAddresses(list);
      const created =
        list.find((addr) => addr.id === data.id) || list[0] || null;
      setSelectedAddress(created);
      setAddressFormMessage(
        addressFormMode === "edit"
          ? "配送先を更新しました。"
          : "配送先を登録しました。",
      );
      setAddressForm(emptyAddressForm);
      setAddressFormOpen(false);
      setAddressPickerOpen(false);
    } catch (e: any) {
      setAddressFormError(e.message || "登録に失敗しました");
    } finally {
      setAddressSaving(false);
    }
  };

  const applyAddressToBilling = (addr: Address): AddressForm => ({
    first_name: addr.first_name || "",
    last_name: addr.last_name || "",
    first_name_kana: addr.first_name_kana || "",
    last_name_kana: addr.last_name_kana || "",
    gender: addr.gender || "MALE",
    date_of_birth: addr.date_of_birth || "",
    postal_code: addr.postal_code || "",
    prefecture: addr.prefecture || "",
    city: addr.city || "",
    town: addr.town || "",
    street: addr.street || "",
    building: addr.building || "",
    room: addr.room || "",
    phone: addr.phone || "",
    email: addr.email || "",
    is_default: false,
  });

  const hasBillingInput = (form: AddressForm) =>
    [
      form.first_name,
      form.last_name,
      form.postal_code,
      form.prefecture,
      form.city,
      form.town,
      form.street,
    ].some((value) => (value || "").trim() !== "");

  const handleBillingSameChange = (nextSame: boolean) => {
    setBillingSame(nextSame);
    setBillingFormError(null);
    if (!nextSame && selectedAddress) {
      const fromAddress = applyAddressToBilling(selectedAddress);
      setBillingForm((prev) =>
        hasBillingInput(prev) ? prev : { ...prev, ...fromAddress },
      );
      setBillingDob(parseDateParts(fromAddress.date_of_birth));
    }
  };

  const updateBillingForm = (patch: Partial<AddressForm>) => {
    setBillingForm({ ...billingForm, ...patch });
  };

  const updateBillingDob = (patch: Partial<typeof billingDob>) => {
    setBillingDob((prev) => {
      const next = { ...prev, ...patch };
      setBillingForm((prevForm) => ({
        ...prevForm,
        date_of_birth: buildDate(next),
      }));
      return next;
    });
  };

  const handleLookupBillingZip = async () => {
    const zip = (billingForm.postal_code || "").replace(/\D/g, "");
    if (zip.length !== 7) {
      setBillingFormError("郵便番号はハイフンなし7桁で入力してください。");
      return;
    }
    setBillingZipLoading(true);
    setBillingFormError(null);
    try {
      const res = await fetch(`/api/postcode?zip=${zip}`, {
        cache: "no-store",
      });
      const data: ZipResponse = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "住所検索に失敗しました");
      updateBillingForm({
        prefecture: data.prefecture || billingForm.prefecture,
        city: data.city || billingForm.city,
        town: data.town || billingForm.town,
      });
    } catch (e: any) {
      setBillingFormError(e.message || "住所検索に失敗しました");
    } finally {
      setBillingZipLoading(false);
    }
  };

  const handleTogglePaymentPicker = () => {
    setPaymentPickerOpen((prev) => !prev);
    setPaymentFormOpen(false);
    setPaymentFormError(null);
    setPaymentFormMessage(null);
  };

  const handleSelectPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentPickerOpen(false);
    setPaymentFormOpen(false);
    setPaymentFormError(null);
    setPaymentFormMessage(null);
  };

  const handleStartNewPayment = () => {
    setPaymentPickerOpen(true);
    setPaymentFormOpen(true);
    setPaymentFormError(null);
    setPaymentFormMessage(null);
    setPaymentForm(emptyPaymentForm);
  };

  const updatePaymentForm = (patch: Partial<PaymentForm>) => {
    setPaymentForm({ ...paymentForm, ...patch });
  };

  const handleCreatePayment = async () => {
    setPaymentSaving(true);
    setPaymentFormError(null);
    setPaymentFormMessage(null);
    const last4 = (paymentForm.cardNumber || "").replace(/\D/g, "").slice(-4);
    const expMonth = Number(paymentForm.exp_month);
    const expYear = Number(paymentForm.exp_year);
    try {
      if (!last4 || last4.length !== 4) {
        throw new Error("カード番号の下4桁を入力してください。");
      }
      if (!expMonth || expMonth < 1 || expMonth > 12) {
        throw new Error("有効期限（月）が不正です。");
      }
      if (!expYear || expYear < 2024) {
        throw new Error("有効期限（年）が不正です。");
      }
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: paymentForm.nickname || null,
          brand: paymentForm.brand || null,
          card_number: paymentForm.cardNumber || null,
          last4,
          exp_month: expMonth,
          exp_year: expYear,
          is_default: paymentForm.is_default,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message || "登録に失敗しました");
      }
      const list: Payment[] = data.items || [];
      setPayments(list);
      const created =
        list.find(
          (p) =>
            String(p.last4 || "") === last4 &&
            Number(p.exp_month) === expMonth &&
            Number(p.exp_year) === expYear &&
            (!paymentForm.brand || p.brand === paymentForm.brand),
        ) ||
        list.find((p) => p.is_default) ||
        list[0] ||
        null;
      setSelectedPayment(created);
      setPaymentFormMessage("支払い方法を登録しました。");
      setPaymentForm(emptyPaymentForm);
      setPaymentFormOpen(false);
      setPaymentPickerOpen(false);
    } catch (e: any) {
      setPaymentFormError(e.message || "登録に失敗しました");
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <div className="page checkout-layout">
      <div className="checkout-main">
        <div className="section">
          <div className="section-header">
            <h2>お届け先</h2>
            <div className="inline" style={{ gap: 12 }}>
              {selectedAddress ? (
                <button
                  className="link"
                  type="button"
                  onClick={handleEditAddress}
                >
                  住所を修正
                </button>
              ) : (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={handleStartNewAddress}
                >
                  お届け先を登録
                </button>
              )}
            </div>
          </div>
          {addressError && (
            <p className="muted" style={{ color: "#c43c47" }}>
              {addressError}
            </p>
          )}
          {selectedAddress ? (
            <div className="stack" style={{ gap: 4 }}>
              <strong>
                {selectedAddress.last_name}
                {selectedAddress.first_name}
              </strong>
              <div className="muted">〒{selectedAddress.postal_code}</div>
              <div>{formatAddressLine(selectedAddress)}</div>
              <div className="muted">
                TEL: {selectedAddress.phone || "未設定"}
              </div>
            </div>
          ) : (
            <p className="muted">
              {addressFormOpen
                ? "新しいお届け先を入力してください。"
                : "配送先が登録されていません。"}
            </p>
          )}

          {addressPickerOpen && (
            <div className="stack" style={{ gap: 12, marginTop: 12 }}>
              <div className="list">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className="card"
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      className="inline"
                      style={{ alignItems: "flex-start", gap: 12 }}
                    >
                      <input
                        type="radio"
                        name="selected-address"
                        checked={selectedAddress?.id === addr.id}
                        onChange={() => handleSelectAddress(addr)}
                      />
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>
                          {addr.last_name}
                          {addr.first_name}
                        </strong>
                        <div className="muted">〒{addr.postal_code}</div>
                        <div>{formatAddressLine(addr)}</div>
                        <div className="muted">TEL: {addr.phone || "-"}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {addressFormOpen && (
                <div className="panel">
                  <div className="panel-header">
                    <h3>
                      {addressFormMode === "edit"
                        ? "お届け先を修正"
                        : "新しいお届け先を登録"}
                    </h3>
                  </div>
                  {addressFormError && (
                    <p className="muted" style={{ color: "#c43c47" }}>
                      {addressFormError}
                    </p>
                  )}
                  {addressFormMessage && (
                    <p className="muted" style={{ color: "#0c8c5d" }}>
                      {addressFormMessage}
                    </p>
                  )}
                  <div className="stack billing-section" style={{ gap: 10 }}>
                    <div
                      className="billing-grid"
                      style={{ alignItems: "start" }}
                    >
                      <div className="stack">
                        <label className="stack">
                          <span className="muted">
                            姓<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.last_name}
                            onChange={(e) =>
                              updateAddressForm({ last_name: e.target.value })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">
                            名<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.first_name}
                            onChange={(e) =>
                              updateAddressForm({ first_name: e.target.value })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">
                            セイ<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.last_name_kana}
                            onChange={(e) =>
                              updateAddressForm({
                                last_name_kana: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">
                            メイ<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.first_name_kana}
                            onChange={(e) =>
                              updateAddressForm({
                                first_name_kana: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">
                            性別<span className="required">*</span>
                          </span>
                          <select
                            value={addressForm.gender}
                            onChange={(e) =>
                              updateAddressForm({ gender: e.target.value })
                            }
                          >
                            <option value="MALE">男性</option>
                            <option value="FEMALE">女性</option>
                          </select>
                        </label>
                        <label className="stack">
                          <span className="muted">
                            生年月日<span className="required">*</span>
                          </span>
                          <div className="dob-inputs">
                            <select
                              value={addressDob.year}
                              onChange={(e) =>
                                updateAddressDob({ year: e.target.value })
                              }
                              aria-label="生年月日（年）"
                            >
                              <option value="">----</option>
                              {dobYears.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                            <span className="muted">年</span>
                            <select
                              value={addressDob.month}
                              onChange={(e) =>
                                updateAddressDob({ month: e.target.value })
                              }
                              aria-label="生年月日（月）"
                            >
                              <option value="">--</option>
                              {monthOptions.map((month) => (
                                <option key={month} value={month}>
                                  {month}
                                </option>
                              ))}
                            </select>
                            <span className="muted">月</span>
                            <select
                              value={addressDob.day}
                              onChange={(e) =>
                                updateAddressDob({ day: e.target.value })
                              }
                              aria-label="生年月日（日）"
                            >
                              <option value="">--</option>
                              {dayOptions.map((day) => (
                                <option key={day} value={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                            <span className="muted">日</span>
                          </div>
                        </label>
                  <label className="stack">
                    <span className="muted">
                      電話番号<span className="required">*</span>
                    </span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={addressForm.phone}
                      onChange={(e) =>
                        updateAddressForm({
                          phone: normalizePhone(e.target.value),
                        })
                      }
                    />
                  </label>
                      </div>

                      <div className="stack">
                        <label className="stack">
                          <span className="muted">
                            郵便番号<span className="required">*</span>
                            （7桁・ハイフンなし）
                          </span>
                          <div
                            className="inline billing-zip-row"
                            style={{ gap: "8px" }}
                          >
                              <input
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={addressForm.postal_code}
                                onChange={(e) =>
                                  updateAddressForm({
                                    postal_code: normalizePostal(e.target.value),
                                  })
                                }
                                placeholder="1600022"
                              />
                            <button
                              className="btn secondary"
                              type="button"
                              onClick={handleLookupZip}
                              disabled={zipLoading}
                            >
                              {zipLoading ? "検索中..." : "住所検索"}
                            </button>
                          </div>
                        </label>
                        <label className="stack">
                          <span className="muted">
                            都道府県<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.prefecture}
                            onChange={(e) =>
                              updateAddressForm({ prefecture: e.target.value })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">
                            市区町村<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.city}
                            onChange={(e) =>
                              updateAddressForm({ city: e.target.value })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">
                            町名<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.town}
                            onChange={(e) =>
                              updateAddressForm({ town: e.target.value })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">
                            番地<span className="required">*</span>
                          </span>
                          <input
                            value={addressForm.street}
                            onChange={(e) =>
                              updateAddressForm({ street: e.target.value })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">ビル・マンション名</span>
                          <input
                            value={addressForm.building}
                            onChange={(e) =>
                              updateAddressForm({ building: e.target.value })
                            }
                          />
                        </label>
                        <label className="stack">
                          <span className="muted">部屋番号</span>
                          <input
                            value={addressForm.room}
                            onChange={(e) =>
                              updateAddressForm({ room: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <label className="stack billing-email">
                      <span className="muted">
                        メールアドレス<span className="required">*</span>
                      </span>
                      <input
                        value={addressForm.email}
                        onChange={(e) =>
                          updateAddressForm({ email: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="btn-row" style={{ marginTop: 12 }}>
                    <button
                      className="btn primary"
                      type="button"
                      onClick={handleCreateAddress}
                      disabled={addressSaving}
                    >
                      {addressSaving ? "保存中..." : "保存"}
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => setAddressFormOpen(false)}
                      disabled={addressSaving}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-header">
            <h2>請求先</h2>
          </div>
          {billingFormError && (
            <p className="muted" style={{ color: "#c43c47" }}>
              {billingFormError}
            </p>
          )}
          <div className="stack billing-section" style={{ gap: 10 }}>
            <div
              className="inline billing-options"
              style={{ gap: 16, flexWrap: "wrap" }}
            >
              <label className="inline">
                <input
                  type="radio"
                  name="billing-same"
                  checked={billingSame}
                  onChange={() => handleBillingSameChange(true)}
                />
                <span className="muted">お届け先と同じ</span>
              </label>
              <label className="inline">
                <input
                  type="radio"
                  name="billing-same"
                  checked={!billingSame}
                  onChange={() => handleBillingSameChange(false)}
                />
                <span className="muted">追加する</span>
              </label>
            </div>
            {billingSame ? (
              selectedAddress ? (
                <div className="stack" style={{ gap: 4 }}>
                  <strong>
                    {selectedAddress.last_name}
                    {selectedAddress.first_name}
                  </strong>
                  <div className="muted">〒{selectedAddress.postal_code}</div>
                  <div>{formatAddressLine(selectedAddress)}</div>
                  <div className="muted">
                    TEL: {selectedAddress.phone || "未設定"}
                  </div>
                </div>
              ) : (
                <p className="muted">お届け先が未選択です。</p>
              )
            ) : (
              <div className="billing-grid" style={{ alignItems: "start" }}>
                <div className="stack">
                  <label className="stack">
                    <span className="muted">
                      姓<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.last_name}
                      onChange={(e) =>
                        updateBillingForm({ last_name: e.target.value })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">
                      名<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.first_name}
                      onChange={(e) =>
                        updateBillingForm({ first_name: e.target.value })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">
                      セイ<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.last_name_kana}
                      onChange={(e) =>
                        updateBillingForm({
                          last_name_kana: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">
                      メイ<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.first_name_kana}
                      onChange={(e) =>
                        updateBillingForm({
                          first_name_kana: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">
                      性別<span className="required">*</span>
                    </span>
                    <select
                      value={billingForm.gender}
                      onChange={(e) =>
                        updateBillingForm({ gender: e.target.value })
                      }
                    >
                      <option value="MALE">男性</option>
                      <option value="FEMALE">女性</option>
                    </select>
                  </label>
                  <label className="stack">
                    <span className="muted">
                      生年月日<span className="required">*</span>
                    </span>
                    <div className="dob-inputs">
                      <select
                        value={billingDob.year}
                        onChange={(e) =>
                          updateBillingDob({ year: e.target.value })
                        }
                        aria-label="生年月日（年）"
                      >
                        <option value="">----</option>
                        {dobYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <span className="muted">年</span>
                      <select
                        value={billingDob.month}
                        onChange={(e) =>
                          updateBillingDob({ month: e.target.value })
                        }
                        aria-label="生年月日（月）"
                      >
                        <option value="">--</option>
                        {monthOptions.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                      <span className="muted">月</span>
                      <select
                        value={billingDob.day}
                        onChange={(e) =>
                          updateBillingDob({ day: e.target.value })
                        }
                        aria-label="生年月日（日）"
                      >
                        <option value="">--</option>
                        {dayOptions.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <span className="muted">日</span>
                    </div>
                  </label>
                  <label className="stack">
                    <span className="muted">
                      電話番号<span className="required">*</span>
                    </span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={billingForm.phone}
                      onChange={(e) =>
                        updateBillingForm({
                          phone: normalizePhone(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="stack">
                  <label className="stack">
                    <span className="muted">
                      郵便番号（7桁・ハイフンなし）<span className="required">*</span>
                    </span>
                    <div
                      className="inline billing-zip-row"
                      style={{ gap: "8px" }}
                    >
                        <input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={billingForm.postal_code}
                          onChange={(e) =>
                            updateBillingForm({
                              postal_code: normalizePostal(e.target.value),
                            })
                          }
                          placeholder="1600022"
                        />
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={handleLookupBillingZip}
                        disabled={billingZipLoading}
                      >
                        {billingZipLoading ? "検索中..." : "住所検索"}
                      </button>
                    </div>
                  </label>
                  <label className="stack">
                    <span className="muted">
                      都道府県<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.prefecture}
                      onChange={(e) =>
                        updateBillingForm({ prefecture: e.target.value })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">
                      市区町村<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.city}
                      onChange={(e) =>
                        updateBillingForm({ city: e.target.value })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">
                      町名<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.town}
                      onChange={(e) =>
                        updateBillingForm({ town: e.target.value })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">
                      番地<span className="required">*</span>
                    </span>
                    <input
                      value={billingForm.street}
                      onChange={(e) =>
                        updateBillingForm({ street: e.target.value })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">ビル・マンション名</span>
                    <input
                      value={billingForm.building}
                      onChange={(e) =>
                        updateBillingForm({ building: e.target.value })
                      }
                    />
                  </label>
                  <label className="stack">
                    <span className="muted">部屋番号</span>
                    <input
                      value={billingForm.room}
                      onChange={(e) =>
                        updateBillingForm({ room: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
            <label className="stack billing-email">
              <span className="muted">
                メールアドレス<span className="required">*</span>
              </span>
              <input
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder={accountEmail || "example@example.com"}
              />
            </label>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h2>お支払い方法</h2>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <div
              className="inline payment-options"
              style={{ gap: 16, flexWrap: "wrap" }}
            >
              <label className="inline">
                <input
                  type="radio"
                  name="payment-method"
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                />
                <span className="muted">クレジットカード</span>
              </label>
              <label className="inline">
                <input
                  type="radio"
                  name="payment-method"
                  checked={paymentMethod === "convenience"}
                  onChange={() => setPaymentMethod("convenience")}
                />
                <span className="muted">コンビニ払い</span>
              </label>
            </div>
            {paymentMethod === "card" ? (
              selectedPayment ? (
                <div className="stack" style={{ gap: 4 }}>
                  <strong>
                    {selectedPayment.nickname ||
                      selectedPayment.brand ||
                      "カード"}
                  </strong>
                  <div className="muted">
                    {selectedPayment.brand || "ブランド未設定"} ****{" "}
                    {selectedPayment.last4 || "----"}
                  </div>
                  <div className="muted">
                    有効期限:{" "}
                    {selectedPayment.exp_month && selectedPayment.exp_year
                      ? `${String(selectedPayment.exp_month).padStart(2, "0")}/${selectedPayment.exp_year}`
                      : "未設定"}
                  </div>
                </div>
              ) : (
                <p className="muted">支払い方法が登録されていません。</p>
              )
            ) : (
              <div className="stack" style={{ gap: 4 }}>
                <strong>コンビニ払い</strong>
                <p className="muted">
                  注文確定後にお支払い番号をご案内します。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h2>カート内商品</h2>
            <span className="tag">{items.length} 件</span>
          </div>
          {loading && <p className="muted">読み込み中...</p>}
          {error && (
            <p className="muted" style={{ color: "#c43c47" }}>
              {error}
            </p>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="panel">
              <p className="muted">カートが空です。商品を追加してください。</p>
              <div className="btn-row">
                <Link className="btn primary" href="/products">
                  商品を探す
                </Link>
              </div>
            </div>
          )}
          {!loading && !error && items.length > 0 && (
            <>
              <div className="list">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="inline"
                    style={{ gap: 12, alignItems: "center" }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        background: "#f4f7fb",
                      }}
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                        />
                      ) : null}
                    </div>
                    <div className="stack">
                      <Link href={`/products/${item.slug}`}>{item.name}</Link>
                      {item.variantLabel && (
                        <span className="cart-item-variant">
                          {item.variantLabel}
                        </span>
                      )}
                      <div className="meta">
                        <span>{formatCurrency(item.price)}</span>
                        <span>数量: {item.quantity}</span>
                        <span>
                          小計: {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <Link className="link" href="/cart" style={{ fontSize: 12 }}>
                  ショッピングカートに戻る
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <aside className="checkout-sidebar">
        <div className="panel stack" style={{ gap: 12 }}>
          <div className="stack" style={{ gap: 4 }}>
            <strong>ご注文金額</strong>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span>合計</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span>送料</span>
              <strong>{formatCurrency(0)}</strong>
            </div>
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <span>付与予定REポイント</span>
              <strong>{rewardPoints}pt</strong>
            </div>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={handleConfirm}
            disabled={items.length === 0 || confirming || isGuest}
          >
            {confirming ? "注文を確定中..." : "注文を確定する"}
          </button>
          <div className="stack" style={{ gap: 6 }}>
            <strong>注意事項</strong>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
              事前予約商品の発送は商品ページの発送時期をご確認ください。
              <br />
              ご注文後の返品・交換・キャンセルはお受けできませんのでご注意ください。商品に欠陥がある場合のみ交換が可能ですのでご連絡ください。
              <br />
              REポイントの付与は後日となります。
            </p>
          </div>
          {notice && <p className="muted">{notice}</p>}
        </div>
      </aside>

      {showLoginModal && (
        <div className="modal-backdrop modal-backdrop--checkout">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{signupMode ? "新規登録" : "ログイン"}</h3>
            {signupMode ? (
              <form className="stack" onSubmit={handleSignup}>
                <label className="stack">
                  <span className="muted">メールアドレス</span>
                  <input
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="example@example.com"
                  />
                </label>
                <label className="stack">
                  <span className="muted">パスワード</span>
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="********"
                  />
                </label>
                {signupError && (
                  <div
                    className="pill"
                    style={{
                      color: "#c43c47",
                      borderColor: "#f6c5cb",
                      background: "#fff0f2",
                    }}
                  >
                    {signupError}
                  </div>
                )}
                {syncingGuest && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    カートを同期しています...
                  </p>
                )}
                <div className="btn-row">
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={
                      !signupEmail ||
                      !signupPassword ||
                      signupLoading
                    }
                  >
                    {signupLoading ? "登録中..." : "登録する"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setSignupMode(false)}
                  >
                    ログインはこちら
                  </button>
                  <Link className="btn secondary" href="/cart">
                    カートに戻る
                  </Link>
                </div>
              </form>
            ) : (
              <form className="stack" onSubmit={handleLogin}>
                <label className="stack">
                  <span className="muted">メールアドレス</span>
                  <input
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="example@example.com"
                  />
                </label>
                <label className="stack">
                  <span className="muted">パスワード</span>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="********"
                  />
                </label>
                {loginError && (
                  <div
                    className="pill"
                    style={{
                      color: "#c43c47",
                      borderColor: "#f6c5cb",
                      background: "#fff0f2",
                    }}
                  >
                    {loginError}
                  </div>
                )}
                {syncingGuest && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    カートを同期しています...
                  </p>
                )}
                <div className="btn-row">
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={!loginId || !loginPassword || loginLoading}
                  >
                    {loginLoading ? "認証中..." : "ログイン"}
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setSignupMode(true)}
                  >
                    新規登録
                  </button>
                  <Link className="btn secondary" href="/cart">
                    カートに戻る
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
