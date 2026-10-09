
import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const secret = process.env.PUSH_SEND_SECRET;
    const suppliedSecret = request.headers.get("x-push-secret");

    if (!secret || suppliedSecret !== secret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: "VAPID keys are not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const title =
      typeof body.title === "string" ? body.title.slice(0, 100) : "KONA LADY";
    const message =
      typeof body.body === "string" ? body.body.slice(0, 500) : "";
    const url =
      typeof body.url === "string" &&
      body.url.startsWith("/") &&
      !body.url.startsWith("//")
        ? body.url
        : "/";

    if (!message) {
      return NextResponse.json(
        { error: "Notification text is required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server is not configured" },
        { status: 500 },
      );
    }

    webpush.setVapidDetails(
      "mailto:admin@konaledi.com.ua",
      publicKey,
      privateKey,
    );

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, subscription");

    if (error) {
      console.error("Push subscription lookup failed:", error.message);
      return NextResponse.json(
        { error: "Could not load subscriptions" },
        { status: 500 },
      );
    }

    let sent = 0;
    let failed = 0;
    const expiredIds: number[] = [];

    for (const item of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify({ title, body: message, url }),
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
    console.error("Push send error:", error);
    return NextResponse.json(
      { error: "Could not send notifications" },
      { status: 500 },
    );
  }
}