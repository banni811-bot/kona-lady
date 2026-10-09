import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const allowedStatuses = [
  "Новый",
  "Подтверждён",
  "Собирается",
  "Отправлен",
  "Доставлен",
  "Отменён",
];

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!supabaseUrl || !supabaseKey || !publicKey || !privateKey) {
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const orderId = Number(body.orderId);
    const status = body.status;

    if (
      !Number.isSafeInteger(orderId) ||
      orderId <= 0 ||
      typeof status !== "string" ||
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid order or status" },
        { status: 400 },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, order_number, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    if (!order.user_id) {
      return NextResponse.json({
        success: true,
        sent: 0,
        reason: "Order has no registered customer",
      });
    }

    const { data: subscriptions, error: subscriptionsError } =
      await supabase
        .from("push_subscriptions")
        .select("id, subscription")
        .eq("user_id", order.user_id);

    if (subscriptionsError) {
      console.error(
        "Could not load customer subscriptions:",
        subscriptionsError.message,
      );

      return NextResponse.json(
        { error: "Could not load subscriptions" },
        { status: 500 },
      );
    }

    webpush.setVapidDetails(
      "mailto:admin@konaledi.com.ua",
      publicKey,
      privateKey,
    );

    let sent = 0;
    let failed = 0;
    const expiredIds: number[] = [];

    for (const item of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify({
            title: "KONA LADY — обновление заказа",
            body: `Заказ ${order.order_number}: статус изменён на «${status}».`,
            url: "/profile/orders",
          }),
        );

        sent++;
      } catch (pushError) {
        const statusCode =
          typeof pushError === "object" &&
          pushError !== null &&
          "statusCode" in pushError
            ? Number(pushError.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(item.id);
        } else {
          failed++;
          console.error("Push delivery failed:", statusCode);
        }
      }
    }

    if (expiredIds.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", expiredIds);
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      removedExpired: expiredIds.length,
    });
  } catch (error) {
    console.error("Order status notification error:", error);

    return NextResponse.json(
      { error: "Could not send order notification" },
      { status: 500 },
    );
  }
}
