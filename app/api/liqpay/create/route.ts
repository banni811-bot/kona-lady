import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const amount = Number(body.amount);
    const orderId = String(body.orderId || "").trim();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          error: "Некорректная сумма заказа.",
        },
        {
          status: 400,
        },
      );
    }

    if (!orderId) {
      return NextResponse.json(
        {
          error: "Не указан номер заказа.",
        },
        {
          status: 400,
        },
      );
    }

    const publicKey = process.env.LIQPAY_PUBLIC_KEY;
    const privateKey = process.env.LIQPAY_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.error("LIQPAY KEYS ARE MISSING");

      return NextResponse.json(
        {
          error: "Ключи LiqPay не найдены в .env.local.",
        },
        {
          status: 500,
        },
      );
    }

    const liqpayData = {
      public_key: publicKey,
      version: 7,
      action: "pay",
      amount: amount.toFixed(2),
      currency: "UAH",
      description: `Оплата заказа KONA LADY ${orderId}`,
      order_id: orderId,
      sandbox: "1",
    };

    const jsonString = JSON.stringify(liqpayData);

    const data = Buffer.from(jsonString).toString("base64");

    console.log("LIQPAY PUBLIC KEY:", publicKey);
    console.log("LIQPAY ORDER ID:", orderId);
    console.log("LIQPAY DATA:", data);

    const signature = crypto
      .createHash("sha3-256")
      .update(`${privateKey}${data}${privateKey}`)
      .digest("base64");

    return NextResponse.json({
      success: true,
      data,
      signature,
      checkoutUrl:
        "https://www.liqpay.ua/api/3/checkout",
    });
  } catch (error) {
    console.error("LIQPAY CREATE ERROR:", error);

    return NextResponse.json(
      {
        error: "Не удалось создать платёж LiqPay.",
      },
      {
        status: 500,
      },
    );
  }
}