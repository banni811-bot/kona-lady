self.addEventListener("push", (event) => {
  let data = {
    title: "KONA LADY",
    body: "Для вас есть новости нашего магазина.",
    url: "/",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/kona-lady-logo.png",
      badge: "/kona-lady-logo.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }

        return clients.openWindow(url);
      },
    ),
  );
});
