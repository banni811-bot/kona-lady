import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

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
    const productId = Number(body.productId);

    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price_uah, is_available")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    if (!product.is_available) {
      return NextResponse.json({
        success: true,
        sent: 0,
        reason: "Product is not available",
      });
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("id, subscription");

    if (subscriptionsError) {
      console.error(
        "Could not load push subscriptions:",
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
            title: "KONA LADY — новинка",
            body: `Добавлен новый товар: ${product.name} — ${product.price_uah} грн.`,
            url: "/catalog",
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
          console.error("New product push failed:", statusCode);
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
    console.error("New product notification error:", error);

    return NextResponse.json(
      { error: "Could not send new product notification" },
      { status: 500 },
    );
  }
}
