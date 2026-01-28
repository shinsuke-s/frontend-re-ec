import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthHeader } from "@/lib/externalAuth";

const addressApiBase =
  process.env.EXTERNAL_CART_API_BASE ||
  process.env.EXTERNAL_PRODUCT_API_BASE ||
  "http://192.168.0.25:4649";

const defaultDeliveryCookie = "default_delivery_address_id";

const resolveAuthHeader = async () => {
  const header = await getAuthHeader();
  return header || null;
};

const pickType = (value?: string | null) => {
  const type = (value || "").toLowerCase();
  if (type === "bill" || type === "delivery") return type;
  return "delivery";
};

const buildCityTown = (city?: string, town?: string, street?: string) =>
  [city, town, street].filter(Boolean).join("");

const buildAddressDetails = (building?: string, room?: string) =>
  [building, room].filter(Boolean).join(" ");

const normalizeDate = (value?: string | null) => {
  if (!value) return undefined;
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
};

const normalizeAddress = (addr: any) => ({
  id: String(addr?.address_id || ""),
  type: addr?.type || "",
  first_name: addr?.first_name || "",
  last_name: addr?.last_name || "",
  first_name_kana: addr?.kana_first_name || "",
  last_name_kana: addr?.kana_last_name || "",
  gender: addr?.gender || "",
  date_of_birth: addr?.date_of_birth || "",
  postal_code: addr?.post_code || "",
  prefecture: addr?.prefecture || "",
  city: addr?.city_town_village || "",
  town: "",
  street: "",
  building: addr?.address_details || "",
  room: "",
  phone: addr?.phone || "",
  email: addr?.email || "",
  is_default: false,
});

const applyDefault = (items: any[], defaultId?: string) => {
  if (!items.length) return { items, defaultId: "" };
  const fallback = defaultId && items.some((item) => item.id === defaultId);
  const resolved = fallback ? defaultId : items[0].id;
  const updated = items.map((item) => ({
    ...item,
    is_default: item.id === resolved,
  }));
  return { items: updated, defaultId: resolved };
};

const fetchAddressList = async (authHeader: string) => {
  const res = await fetch(`${addressApiBase.replace(/\/$/, "")}/u/address`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, data: json, status: res.status };
  }
  return { ok: true, data: json, status: res.status };
};

export async function GET(request: Request) {
  const authHeader = await resolveAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { status: "guest", message: "Auth token is not set" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = pickType(searchParams.get("type"));

  const result = await fetchAddressList(authHeader);
  if (!result.ok) {
    return NextResponse.json(
      {
        status: "error",
        message: result.data?.message || "配送先の取得に失敗しました",
        data: result.data,
      },
      { status: result.status }
    );
  }

  const list = Array.isArray(result.data?.data) ? result.data.data : [];
  const filtered = list.filter((addr: any) => pickType(addr?.type) === type);
  const normalized = filtered.map(normalizeAddress).filter((addr) => addr.id);
  const cookieValue = cookies().get(defaultDeliveryCookie)?.value || "";
  const { items, defaultId } = applyDefault(normalized, cookieValue);
  const response = NextResponse.json({ status: "ok", items });
  if (defaultId && defaultId !== cookieValue) {
    response.cookies.set(defaultDeliveryCookie, defaultId, {
      path: "/",
      sameSite: "lax",
    });
  }
  return response;
}

export async function POST(request: Request) {
  const authHeader = await resolveAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { status: "guest", message: "Auth token is not set" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const type = pickType(body?.type);
    const payload = {
      last_name: body?.last_name || "",
      first_name: body?.first_name || "",
      kana_last_name: body?.last_name_kana || "",
      kana_first_name: body?.first_name_kana || "",
      gender: body?.gender || undefined,
      date_of_birth: normalizeDate(body?.date_of_birth),
      phone: body?.phone || "",
      email: body?.email || "",
      type,
      post_code: body?.postal_code || "",
      prefecture: body?.prefecture || "",
      city_town_village: buildCityTown(body?.city, body?.town, body?.street),
      address_details: buildAddressDetails(body?.building, body?.room),
    };

    const res = await fetch(`${addressApiBase.replace(/\/$/, "")}/u/address/update`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "登録に失敗しました", data },
        { status: res.status }
      );
    }

    const listResult = await fetchAddressList(authHeader);
    const list = Array.isArray(listResult.data?.data)
      ? listResult.data.data
      : [];
    const filtered = list.filter((addr: any) => pickType(addr?.type) === type);
    const normalized = filtered.map(normalizeAddress).filter((addr) => addr.id);
    const cookieValue = cookies().get(defaultDeliveryCookie)?.value || "";
    const nextDefault =
      body?.is_default === true && normalized.length > 0
        ? normalized[0].id
        : cookieValue;
    const { items, defaultId } = applyDefault(normalized, nextDefault);
    const response = NextResponse.json({ status: "ok", id: defaultId, items });
    if (defaultId && defaultId !== cookieValue) {
      response.cookies.set(defaultDeliveryCookie, defaultId, {
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  } catch (error) {
    console.error("address create error", error);
    return NextResponse.json(
      { status: "error", message: "登録に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const authHeader = await resolveAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { status: "guest", message: "Auth token is not set" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const type = pickType(body?.type);
    if (body?.is_default === true && Object.keys(body || {}).length <= 2) {
      const cookieValue = String(body?.id || "");
      const listResult = await fetchAddressList(authHeader);
      const list = Array.isArray(listResult.data?.data)
        ? listResult.data.data
        : [];
      const filtered = list.filter((addr: any) => pickType(addr?.type) === type);
      const normalized = filtered.map(normalizeAddress).filter((addr) => addr.id);
      const { items, defaultId } = applyDefault(normalized, cookieValue);
      const response = NextResponse.json({ status: "ok", items });
      if (defaultId) {
        response.cookies.set(defaultDeliveryCookie, defaultId, {
          path: "/",
          sameSite: "lax",
        });
      }
      return response;
    }

    const payload = {
      last_name: body?.last_name || "",
      first_name: body?.first_name || "",
      kana_last_name: body?.last_name_kana || "",
      kana_first_name: body?.first_name_kana || "",
      gender: body?.gender || undefined,
      date_of_birth: normalizeDate(body?.date_of_birth),
      phone: body?.phone || "",
      email: body?.email || "",
      type,
      post_code: body?.postal_code || "",
      prefecture: body?.prefecture || "",
      city_town_village: buildCityTown(body?.city, body?.town, body?.street),
      address_details: buildAddressDetails(body?.building, body?.room),
    };

    const res = await fetch(`${addressApiBase.replace(/\/$/, "")}/u/address/update`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: data?.message || "更新に失敗しました", data },
        { status: res.status }
      );
    }

    const listResult = await fetchAddressList(authHeader);
    const list = Array.isArray(listResult.data?.data)
      ? listResult.data.data
      : [];
    const filtered = list.filter((addr: any) => pickType(addr?.type) === type);
    const normalized = filtered.map(normalizeAddress).filter((addr) => addr.id);
    const cookieValue = cookies().get(defaultDeliveryCookie)?.value || "";
    const { items, defaultId } = applyDefault(normalized, cookieValue);
    const response = NextResponse.json({ status: "ok", items });
    if (defaultId && defaultId !== cookieValue) {
      response.cookies.set(defaultDeliveryCookie, defaultId, {
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  } catch (error) {
    console.error("address update error", error);
    return NextResponse.json(
      { status: "error", message: "更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { status: "error", message: "削除は現在未対応です" },
    { status: 400 }
  );
}
