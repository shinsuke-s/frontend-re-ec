import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAuthHeader } from "@/lib/externalAuth";

export const runtime = "nodejs";

const orderApiBase =
  process.env.EXTERNAL_CART_API_BASE ||
  process.env.EXTERNAL_PRODUCT_API_BASE ||
  "http://192.168.0.25:4649";
const productApiBase =
  process.env.EXTERNAL_PRODUCT_API_BASE || "http://192.168.0.25:4649";

const statusLabel: Record<string, string> = {
  processing: "処理中",
  paid: "支払い済み",
  shipped: "発送済み",
  delivered: "お届け済み",
  cancelled: "キャンセル",
  confirm: "確定",
};

const fmt = (v: number) => `¥${Number(v || 0).toLocaleString("ja-JP")}`;

const formatDateTimeJst = (value: Date) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);

const resolveAuthHeader = async () => {
  const header = await getAuthHeader();
  return header || null;
};

const normalizeImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const clean = url.replace(/^\/+/, "");
  return `${productApiBase.replace(/\/$/, "")}/resource/${clean}`;
};

const isPlaceholderDate = (value?: string) =>
  !value || value.startsWith("1900-01-01") || value.startsWith("0001-01-01");

const toAddress = (addr: any) => ({
  name: `${addr?.last_name || ""}${addr?.first_name || ""}`.trim(),
  postal_code: addr?.post_code || "",
  prefecture: addr?.prefecture || "",
  city: addr?.city_town_village || "",
  town: "",
  street: "",
  building: addr?.address_details || "",
  room: "",
  phone: addr?.phone || "",
  email: addr?.email || "",
});

export async function GET(req: Request, context: { params: { id: string } }) {
  const orderId = String(context.params.id || "").trim();
  if (!orderId) {
    return NextResponse.json(
      { status: "error", message: "invalid order id" },
      { status: 400 },
    );
  }

  const authHeader = await resolveAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { status: "error", message: "Auth token is not set" },
      { status: 500 },
    );
  }

  try {
    const url = new URL(req.url);
    const wantsJson =
      url.searchParams.get("format") === "json" ||
      url.searchParams.get("preview") === "1" ||
      req.headers.get("accept")?.includes("application/json");

    const res = await fetch(
      `${orderApiBase.replace(/\/$/, "")}/u/order/history`,
      {
        headers: { Authorization: authHeader },
        cache: "no-store",
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: data?.message || "failed to fetch order",
          data,
        },
        { status: res.status },
      );
    }

    const list = Array.isArray(data?.data) ? data.data : [];
    const order = list.find((o: any) => String(o?.order_id || "") === orderId);
    if (!order) {
      return NextResponse.json(
        { status: "error", message: "order not found" },
        { status: 404 },
      );
    }

    const orderItems = Array.isArray(order?.order_items)
      ? order.order_items
      : [];
    const items = orderItems.map((item: any) => {
      const variant = [item?.dimension1, item?.dimension2]
        .filter(Boolean)
        .join(" / ");
      const name = `${item?.name || "Item"}${variant ? ` ${variant}` : ""}`;
      return {
        name,
        quantity: Number(item?.quantity ?? 0),
        price: Number(item?.price ?? 0),
        subtotal: Number(item?.price ?? 0) * Number(item?.quantity ?? 0),
        image: normalizeImageUrl(
          Array.isArray(item?.images) ? String(item.images[0]?.url || "") : "",
        ),
      };
    });

    const subtotal = items.reduce(
      (sum: number, it: any) => sum + it.subtotal,
      0,
    );
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    const issuedAt = new Date();
    const orderAt = !isPlaceholderDate(order?.confirm_at)
      ? new Date(order.confirm_at)
      : !isPlaceholderDate(order?.paid_at)
        ? new Date(order.paid_at)
        : !isPlaceholderDate(order?.delivery_at)
          ? new Date(order.delivery_at)
          : issuedAt;
    const dueAt = orderAt;

    const invoiceData = {
      id: orderId,
      status: order?.status || "",
      status_label: statusLabel[order?.status] || order?.status || "",
      subtotal,
      tax,
      total,
      created_at: orderAt.toISOString(),
      issued_at: issuedAt.toISOString(),
      due_at: dueAt.toISOString(),
      shipping: toAddress(order?.delivery_address_id || {}),
      billing: toAddress(order?.bill_address_id || {}),
      items,
    };

    if (wantsJson) {
      return NextResponse.json({ status: "ok", invoice: invoiceData });
    }

    const PDFKitCtor = require("pdfkit");
    const doc: InstanceType<typeof PDFKitCtor> = new PDFKitCtor({
      size: "A4",
      margin: 50,
    });

    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "NotoSansJP-Regular.ttf",
    );
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    } else {
      doc.font("Helvetica");
    }

    const logoPath = path.join(process.cwd(), "public", "favicon.png");

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      const startX = 60;
      const contentWidth = doc.page.width - 2 * startX;

      doc.fontSize(20).text("領収書", startX, 40, { align: "left" });

      if (fs.existsSync(logoPath)) {
        const top = 30;
        const rightX = doc.page.width - startX - 70;
        doc.image(logoPath, rightX, top, { fit: [70, 70], align: "right" });
      }

      doc.moveDown(1.4);
      doc.fontSize(12);
      const labelText = "注文番号:";
      const labelWidth = doc.widthOfString(labelText) + 2;
      const numberY = doc.y;
      doc.text(labelText, startX, numberY, { width: labelWidth });
      doc.text(invoiceData.id, startX + labelWidth, numberY, {
        width: contentWidth - labelWidth,
      });
      doc.y = numberY + doc.currentLineHeight();
      doc.text(`発行日: ${formatDateTimeJst(issuedAt)}`, startX, doc.y);
      doc.text(`注文日: ${formatDateTimeJst(orderAt)}`, startX, doc.y);
      doc.moveDown(1);

      const addressGap = 16;
      const columnWidth = (contentWidth - addressGap * 2) / 3;
      const leftX = startX;
      const middleX = startX + columnWidth + addressGap;
      const rightX = middleX + columnWidth + addressGap;
      const addressStartY = doc.y;

      doc.fontSize(11.5).text("発行者", leftX, addressStartY, {
        width: columnWidth,
        underline: true,
      });
      doc.fontSize(10.5);
      doc.text(
        "PropTech Japan株式会社（PropTech Japan Co., Ltd.）",
        leftX,
        doc.y,
        {
          width: columnWidth,
        },
      );
      doc.text("〒106-0044", leftX, doc.y, { width: columnWidth });
      doc.text("東京都", leftX, doc.y, { width: columnWidth });
      doc.text("東京都港区", leftX, doc.y, { width: columnWidth });
      doc.text("東京都港区東麻布1丁目12", leftX, doc.y, {
        width: columnWidth,
      });
      doc.text("東麻布ビル5 ACN6階", leftX, doc.y, {
        width: columnWidth,
      });
      doc.text("Tel: 03-5704-9555", leftX, doc.y, {
        width: columnWidth,
      });
      const issuerEndY = doc.y;

      doc.y = addressStartY;
      doc.fontSize(11.5).text("請求先", middleX, addressStartY, {
        width: columnWidth,
        underline: true,
      });
      doc.fontSize(10.5);
      doc.text(invoiceData.billing.name || "未登録", middleX, doc.y, {
        width: columnWidth,
      });
      doc.text(`〒${invoiceData.billing.postal_code || ""}`, middleX, doc.y, {
        width: columnWidth,
      });
      doc.text(
        [
          invoiceData.billing.prefecture,
          invoiceData.billing.city,
          invoiceData.billing.town,
          invoiceData.billing.street,
          invoiceData.billing.building,
          invoiceData.billing.room,
        ]
          .filter(Boolean)
          .join(""),
        middleX,
        doc.y,
        { width: columnWidth },
      );
      if (invoiceData.billing.phone)
        doc.text(`Tel: ${invoiceData.billing.phone}`, middleX, doc.y, {
          width: columnWidth,
        });
      if (invoiceData.billing.email)
        doc.text(`Mail: ${invoiceData.billing.email}`, middleX, doc.y, {
          width: columnWidth,
        });
      const billingEndY = doc.y;

      doc.y = addressStartY;
      doc.fontSize(11.5).text("お届け先", rightX, addressStartY, {
        width: columnWidth,
        underline: true,
      });
      doc.fontSize(10.5);
      doc.text(invoiceData.shipping.name || "未登録", rightX, doc.y, {
        width: columnWidth,
      });
      doc.text(`〒${invoiceData.shipping.postal_code || ""}`, rightX, doc.y, {
        width: columnWidth,
      });
      doc.text(
        [
          invoiceData.shipping.prefecture,
          invoiceData.shipping.city,
          invoiceData.shipping.town,
          invoiceData.shipping.street,
          invoiceData.shipping.building,
          invoiceData.shipping.room,
        ]
          .filter(Boolean)
          .join(""),
        rightX,
        doc.y,
        { width: columnWidth },
      );
      if (invoiceData.shipping.phone)
        doc.text(`Tel: ${invoiceData.shipping.phone}`, rightX, doc.y, {
          width: columnWidth,
        });
      if (invoiceData.shipping.email)
        doc.text(`Mail: ${invoiceData.shipping.email}`, rightX, doc.y, {
          width: columnWidth,
        });
      const shippingEndY = doc.y;

      doc.y = Math.max(issuerEndY, billingEndY, shippingEndY) + 32;

      const tableStartY = doc.y;
      const colItem = startX;
      const colQty = startX + 210;
      const colPrice = startX + 300;
      const colAmount = startX + 390;

      doc.fontSize(11).text("商品", colItem, tableStartY, {
        width: colQty - colItem - 8,
      });
      doc.text("数量", colQty, tableStartY, {
        width: 60,
        align: "center",
      });
      doc.text("単価", colPrice, tableStartY, {
        width: 70,
        align: "right",
      });
      doc.text("金額", colAmount, tableStartY, {
        width: 80,
        align: "right",
      });
      doc.moveDown(0.5);
      doc
        .moveTo(startX, doc.y)
        .lineTo(doc.page.width - startX, doc.y)
        .stroke();
      doc.moveDown(0.5);

      invoiceData.items.forEach((item: any) => {
        const lineY = doc.y;
        const nameWidth = colQty - colItem - 8;
        const nameHeight = doc.heightOfString(item.name, { width: nameWidth });
        const baseHeight = doc.currentLineHeight();
        const rowHeight = Math.max(nameHeight, baseHeight);

        doc.text(item.name, colItem, lineY, { width: nameWidth });
        doc.text(`${item.quantity}`, colQty, lineY, {
          width: 60,
          align: "center",
        });
        doc.text(fmt(item.price), colPrice, lineY, {
          width: 70,
          align: "right",
        });
        doc.text(fmt(item.subtotal), colAmount, lineY, {
          width: 80,
          align: "right",
        });

        doc.y = lineY + rowHeight + 6;
      });

      doc.moveDown();
      doc
        .moveTo(startX, doc.y)
        .lineTo(doc.page.width - startX, doc.y)
        .stroke();
      doc.moveDown(0.8);

      const totalX = doc.page.width - startX - 220;
      const totalLabelWidth = 90;
      const totalValueWidth = 110;

      const drawTotalRow = (
        label: string,
        value: string,
        fontSize = 12,
        valueFontSize = fontSize,
        gap = 0.5,
      ) => {
        const y = doc.y;
        doc
          .fontSize(fontSize)
          .text(label, totalX, y, { width: totalLabelWidth });
        doc.fontSize(valueFontSize).text(value, totalX + totalLabelWidth, y, {
          width: totalValueWidth,
          align: "right",
        });
        doc.y = y + doc.currentLineHeight() + gap;
      };

      drawTotalRow("小計:", fmt(subtotal), 11, 11, 2);
      drawTotalRow("消費税(10%):", fmt(tax), 11, 11, 4);
      drawTotalRow("合計:", fmt(total), 12, 14, 2);

      doc.end();
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="order-${orderId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("invoice error", error);
    return NextResponse.json(
      { status: "error", message: "failed to create invoice" },
      { status: 500 },
    );
  }
}
