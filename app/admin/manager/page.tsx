"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type RowData = Record<string, any>;

type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string | null;
  size: string | null;
  color: string | null;
  quantity: number | null;
  price_uah: number | null;
  created_at: string | null;
};

type ReportPeriod = {
  start: Date;
  end: Date;
  label: string;
};

function getStock(product: RowData) {
  const possibleFields = [
    "stock",
    "stock_quantity",
    "quantity",
    "qty",
    "inventory",
    "inventory_quantity",
    "available_quantity",
    "count",
  ];

  for (const field of possibleFields) {
    if (
      product[field] !== undefined &&
      product[field] !== null
    ) {
      const value = Number(product[field]);

      if (!Number.isNaN(value)) {
        return value;
      }
    }
  }

  return null;
}

function getAvailability(product: RowData) {
  const possibleFields = [
    "is_available",
    "available",
    "in_stock",
  ];

  for (const field of possibleFields) {
    if (
      product[field] !== undefined &&
      product[field] !== null
    ) {
      return Boolean(product[field]);
    }
  }

  const stock = getStock(product);

  if (stock !== null) {
    return stock > 0;
  }

  return null;
}

function getOrderStatus(order: RowData) {
  return order.status || "Без статуса";
}

function formatValue(value: any) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function formatDate(value: any) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("uk-UA")} грн`;
}

function getMonthName(month: number) {
  const months = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ];

  return months[month] || "";
}

function getCurrentMonthPeriod(): ReportPeriod {
  const now = new Date();

  return {
    start: new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0
    ),
    end: new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ),
    label: `${getMonthName(
      now.getMonth()
    )} ${now.getFullYear()}`,
  };
}

function getPreviousMonthPeriod(): ReportPeriod {
  const now = new Date();

  return {
    start: new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
      0,
      0,
      0,
      0
    ),
    end: new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999
    ),
    label: `${getMonthName(
      now.getMonth() - 1 < 0
        ? 11
        : now.getMonth() - 1
    )} ${
      now.getMonth() === 0
        ? now.getFullYear() - 1
        : now.getFullYear()
    }`,
  };
}

function getQuarterPeriod(
  quarter: number,
  year: number
): ReportPeriod {
  const startMonth = (quarter - 1) * 3;

  return {
    start: new Date(
      year,
      startMonth,
      1,
      0,
      0,
      0,
      0
    ),
    end: new Date(
      year,
      startMonth + 3,
      0,
      23,
      59,
      59,
      999
    ),
    label: `${quarter}-й квартал ${year}`,
  };
}

function parseDateInput(value: string) {
  if (!value) return null;

  const parts = value.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getProductName(product: RowData) {
  return (
    product.name ||
    product.title ||
    `Товар #${product.id}`
  );
}

export default function ManagerPage() {
  const [products, setProducts] = useState<RowData[]>([]);
  const [orders, setOrders] = useState<RowData[]>([]);
   const [financialTransactions, setFinancialTransactions] =
    useState<RowData[]>([]);
  const [loadingFinance, setLoadingFinance] =
    useState(false);
  const [financeError, setFinanceError] =
    useState("");
  const [orderItems, setOrderItems] = useState<
    OrderItem[]
  >([]);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [loadingOrders, setLoadingOrders] =
    useState(true);

  const [loadingItems, setLoadingItems] =
    useState(true);

  const [productsError, setProductsError] =
    useState("");

  const [ordersError, setOrdersError] =
    useState("");

  const [itemsError, setItemsError] =
    useState("");

  const [activeTab, setActiveTab] = useState<
  "products" | "orders" | "clients" | "reports" | "finance"
>("products");

  const [expandedOrders, setExpandedOrders] =
    useState<number[]>([]);

  const [clientSearch, setClientSearch] =
    useState("");

  const [selectedClientPhone, setSelectedClientPhone] =
    useState("");

  const [reportStartDate, setReportStartDate] =
    useState("");

  const [reportEndDate, setReportEndDate] =
    useState("");

  const [reportCommand, setReportCommand] =
    useState("");

  const [reportPeriod, setReportPeriod] =
    useState<ReportPeriod | null>(null);

  async function loadProducts() {
    setLoadingProducts(true);
    setProductsError("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setProductsError(
        "Не удалось загрузить товары."
      );

      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoadingProducts(false);
  }

  async function loadFinancialTransactions() {
    setLoadingFinance(true);
    setFinanceError("");

    const { data, error } = await supabase
      .from("financial_transactions")
      .select("*")
      .order("transaction_date", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setFinanceError(
        "Не удалось загрузить финансовые операции."
      );
      setFinancialTransactions([]);
    } else {
      setFinancialTransactions(data || []);
    }

    setLoadingFinance(false);
  }
  async function loadOrders() {
    setLoadingOrders(true);
    setOrdersError("");

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      setOrdersError(
        "Не удалось загрузить заказы."
      );

      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoadingOrders(false);
  }

  async function loadOrderItems() {
    setLoadingItems(true);
    setItemsError("");

    const { data, error } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, size, color, quantity, price_uah, created_at"
      )
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error(error);

      setItemsError(
        "Не удалось загрузить состав заказов."
      );

      setOrderItems([]);
    } else {
      setOrderItems(
        (data || []) as OrderItem[]
      );
    }

    setLoadingItems(false);
  }

   async function loadManagerData() {
    await Promise.all([
      loadProducts(),
      loadOrders(),
      loadOrderItems(),
      loadFinancialTransactions(),
    ]);
  }

  useEffect(() => {
    loadManagerData();
  }, []);

  const stockInfo = useMemo(() => {
    let available = 0;
    let unavailable = 0;
    let withQuantity = 0;
    let withoutQuantity = 0;
    let totalQuantity = 0;

    products.forEach((product) => {
      const stock = getStock(product);
      const availability =
        getAvailability(product);

      if (stock !== null) {
        withQuantity++;
        totalQuantity += stock;

        if (stock > 0) {
          available++;
        } else {
          unavailable++;
        }
      } else {
        withoutQuantity++;

        if (availability === true) {
          available++;
        } else if (availability === false) {
          unavailable++;
        }
      }
    });

    return {
      available,
      unavailable,
      withQuantity,
      withoutQuantity,
      totalQuantity,
    };
  }, [products]);

  const orderStats = useMemo(() => {
    const stats: Record<string, number> = {};

    orders.forEach((order) => {
      const status = getOrderStatus(order);

      stats[status] =
        (stats[status] || 0) + 1;
    });

    return stats;
  }, [orders]);

  const totalSales = useMemo(() => {
    return orders.reduce(
      (sum, order) => {
        const value = Number(
          order.total_uah || 0
        );

        return (
          sum +
          (Number.isNaN(value)
            ? 0
            : value)
        );
      },
      0
    );
  }, [orders]);

  const totalOrderedItems = useMemo(() => {
    return orderItems.reduce(
      (sum, item) => {
        const quantity = Number(
          item.quantity || 0
        );

        return (
          sum +
          (Number.isNaN(quantity)
            ? 0
            : quantity)
        );
      },
      0
    );
  }, [orderItems]);

  const filteredClientOrders = useMemo(() => {
    const search =
      normalizeSearch(clientSearch);

    if (!search) {
      return [];
    }

    const digitsOnlySearch =
      search.replace(/\D/g, "");

    return orders.filter((order) => {
      const phone =
        normalizeSearch(
          String(
            order.customer_phone || ""
          )
        );

      const phoneDigits =
        phone.replace(/\D/g, "");

      const name =
        normalizeSearch(
          String(
            order.customer_name || ""
          )
        );

      const orderNumber =
        normalizeSearch(
          String(
            order.order_number || ""
          )
        );

      const city =
        normalizeSearch(
          String(
            order.delivery_city || ""
          )
        );

      const address =
        normalizeSearch(
          String(
            order.delivery_address || ""
          )
        );

      const phoneMatch =
        digitsOnlySearch.length > 0 &&
        phoneDigits.includes(
          digitsOnlySearch
        );

      const textMatch =
        name.includes(search) ||
        orderNumber.includes(search) ||
        city.includes(search) ||
        address.includes(search);

      return (
        phoneMatch ||
        textMatch
      );
    });
  }, [orders, clientSearch]);

  const clientSummary = useMemo(() => {
    if (
      filteredClientOrders.length === 0
    ) {
      return null;
    }

    const sorted = [
      ...filteredClientOrders,
    ].sort((a, b) => {
      const dateA = new Date(
        a.created_at || 0
      ).getTime();

      const dateB = new Date(
        b.created_at || 0
      ).getTime();

      return dateB - dateA;
    });

    const latest = sorted[0];

    return {
      name:
        latest.customer_name || "—",

      phone:
        latest.customer_phone || "—",

      city:
        latest.delivery_city || "—",

      address:
        latest.delivery_address || "—",

      delivery:
        latest.delivery_method || "—",

      payment:
        latest.payment_method || "—",

      ordersCount:
        filteredClientOrders.length,

      totalSpent:
        filteredClientOrders.reduce(
          (sum, order) => {
            const value = Number(
              order.total_uah || 0
            );

            return (
              sum +
              (Number.isNaN(value)
                ? 0
                : value)
            );
          },
          0
        ),

      latestOrder: latest,
    };
  }, [filteredClientOrders]);

  const reportOrders = useMemo(() => {
    if (!reportPeriod) {
      return [];
    }

    return orders.filter((order) => {
      if (!order.created_at) {
        return false;
      }

      const date = new Date(
        order.created_at
      );

      return (
        date >= reportPeriod.start &&
        date <= reportPeriod.end
      );
    });
  }, [orders, reportPeriod]);

  const reportOrderIds = useMemo(() => {
    return new Set(
      reportOrders.map((order) =>
        Number(order.id)
      )
    );
  }, [reportOrders]);

  const reportItems = useMemo(() => {
    return orderItems.filter((item) =>
      reportOrderIds.has(
        Number(item.order_id)
      )
    );
  }, [orderItems, reportOrderIds]);

  const reportStats = useMemo(() => {
    const revenue = reportOrders.reduce(
      (sum, order) => {
        const value = Number(
          order.total_uah || 0
        );

        return (
          sum +
          (Number.isNaN(value)
            ? 0
            : value)
        );
      },
      0
    );

    const units = reportItems.reduce(
      (sum, item) => {
        const value = Number(
          item.quantity || 0
        );

        return (
          sum +
          (Number.isNaN(value)
            ? 0
            : value)
        );
      },
      0
    );

    const averageOrder =
      reportOrders.length > 0
        ? revenue / reportOrders.length
        : 0;

    const uniquePhones =
      new Set(
        reportOrders
          .map(
            (order) =>
              String(
                order.customer_phone || ""
              ).trim()
          )
          .filter(Boolean)
      );

    return {
      orders: reportOrders.length,
      revenue,
      units,
      averageOrder,
      uniqueClients:
        uniquePhones.size,
    };
  }, [reportOrders, reportItems]);

  const reportStatusRows = useMemo(() => {
    const map: Record<
      string,
      {
        status: string;
        orders: number;
        amount: number;
      }
    > = {};

    reportOrders.forEach((order) => {
      const status =
        getOrderStatus(order);

      if (!map[status]) {
        map[status] = {
          status,
          orders: 0,
          amount: 0,
        };
      }

      map[status].orders++;

      const total = Number(
        order.total_uah || 0
      );

      if (!Number.isNaN(total)) {
        map[status].amount += total;
      }
    });

    return Object.values(map).sort(
      (a, b) =>
        b.orders - a.orders
    );
  }, [reportOrders]);

  const reportProductRows = useMemo(() => {
    const map: Record<
      string,
      {
        productId: number | null;
        productName: string;
        quantity: number;
        amount: number;
      }
    > = {};

    reportItems.forEach((item) => {
      const productId =
        item.product_id !== null
          ? Number(item.product_id)
          : null;

      const key =
        productId !== null
          ? String(productId)
          : item.product_name ||
            `item-${item.id}`;

      if (!map[key]) {
        map[key] = {
          productId,
          productName:
            item.product_name ||
            `Товар #${productId ?? "?"}`,
          quantity: 0,
          amount: 0,
        };
      }

      const quantity = Number(
        item.quantity || 0
      );

      const price = Number(
        item.price_uah || 0
      );

      map[key].quantity +=
        Number.isNaN(quantity)
          ? 0
          : quantity;

      map[key].amount +=
        Number.isNaN(quantity) ||
        Number.isNaN(price)
          ? 0
          : quantity * price;
    });

    return Object.values(map).sort(
      (a, b) =>
        b.amount - a.amount
    );
  }, [reportItems]);

  const reportCategoryRows = useMemo(() => {
    const categoryByProductId =
      new Map<number, string>();

    products.forEach((product) => {
      categoryByProductId.set(
        Number(product.id),
        product.category ||
          "Без категории"
      );
    });

    const map: Record<
      string,
      {
        category: string;
        quantity: number;
        amount: number;
        orders: Set<number>;
      }
    > = {};

    reportItems.forEach((item) => {
      const category =
        item.product_id !== null
          ? categoryByProductId.get(
              Number(item.product_id)
            ) ||
            "Без категории"
          : "Без категории";

      if (!map[category]) {
        map[category] = {
          category,
          quantity: 0,
          amount: 0,
          orders: new Set<number>(),
        };
      }

      const quantity = Number(
        item.quantity || 0
      );

      const price = Number(
        item.price_uah || 0
      );

      map[category].quantity +=
        Number.isNaN(quantity)
          ? 0
          : quantity;

      map[category].amount +=
        Number.isNaN(quantity) ||
        Number.isNaN(price)
          ? 0
          : quantity * price;

      map[category].orders.add(
        Number(item.order_id)
      );
    });

    return Object.values(map)
      .map((row) => ({
        category: row.category,
        quantity: row.quantity,
        amount: row.amount,
        orders: row.orders.size,
      }))
      .sort(
        (a, b) =>
          b.amount - a.amount
      );
  }, [reportItems, products]);

  const reportDeliveryRows = useMemo(() => {
    const map: Record<
      string,
      {
        method: string;
        orders: number;
        amount: number;
      }
    > = {};

    reportOrders.forEach((order) => {
      const method =
        order.delivery_method ||
        "Не указано";

      if (!map[method]) {
        map[method] = {
          method,
          orders: 0,
          amount: 0,
        };
      }

      map[method].orders++;

      const total = Number(
        order.total_uah || 0
      );

      if (!Number.isNaN(total)) {
        map[method].amount += total;
      }
    });

    return Object.values(map).sort(
      (a, b) =>
        b.orders - a.orders
    );
  }, [reportOrders]);

  const reportPaymentRows = useMemo(() => {
    const map: Record<
      string,
      {
        method: string;
        orders: number;
        amount: number;
      }
    > = {};

    reportOrders.forEach((order) => {
      const method =
        order.payment_method ||
        "Не указано";

      if (!map[method]) {
        map[method] = {
          method,
          orders: 0,
          amount: 0,
        };
      }

      map[method].orders++;

      const total = Number(
        order.total_uah || 0
      );

      if (!Number.isNaN(total)) {
        map[method].amount += total;
      }
    });

    return Object.values(map).sort(
      (a, b) =>
        b.orders - a.orders
    );
  }, [reportOrders]);

  const reportClientRows = useMemo(() => {
    const map: Record<
      string,
      {
        client: string;
        phone: string;
        orders: number;
        amount: number;
      }
    > = {};

    reportOrders.forEach((order) => {
      const phone =
        String(
          order.customer_phone || ""
        ).trim();

      const name =
        String(
          order.customer_name ||
            "Без имени"
        ).trim();

      const key =
        phone || name;

      if (!map[key]) {
        map[key] = {
          client: name,
          phone: phone || "—",
          orders: 0,
          amount: 0,
        };
      }

      map[key].orders++;

      const total = Number(
        order.total_uah || 0
      );

      if (!Number.isNaN(total)) {
        map[key].amount += total;
      }
    });

    return Object.values(map).sort(
      (a, b) =>
        b.amount - a.amount
    );
  }, [reportOrders]);

  const reportStockRows = useMemo(() => {
    return products
      .map((product) => ({
        id: Number(product.id),
        name: getProductName(product),
        category:
          product.category ||
          "—",
        stock: getStock(product),
        available:
          getAvailability(product),
      }))
      .sort((a, b) => {
        const stockA =
          a.stock === null
            ? -1
            : a.stock;

        const stockB =
          b.stock === null
            ? -1
            : b.stock;

        return stockA - stockB;
      });
  }, [products]);

  function getItemsForOrder(
    orderId: number
  ) {
    return orderItems.filter(
      (item) =>
        Number(item.order_id) ===
        Number(orderId)
    );
  }

  function toggleOrder(orderId: number) {
    setExpandedOrders((current) =>
      current.includes(orderId)
        ? current.filter(
            (id) => id !== orderId
          )
        : [...current, orderId]
    );
  }

  function openClientSearch(
    phone: string
  ) {
    setClientSearch(phone);
    setSelectedClientPhone(phone);
    setActiveTab("clients");
  }

  function clearClientSearch() {
    setClientSearch("");
    setSelectedClientPhone("");
  }

  function applyReportPeriod(
    period: ReportPeriod
  ) {
    setReportPeriod(period);

    setReportStartDate(
      dateToInputValue(period.start)
    );

    setReportEndDate(
      dateToInputValue(period.end)
    );

    setActiveTab("reports");
  }

  function makeCurrentMonthReport() {
    applyReportPeriod(
      getCurrentMonthPeriod()
    );
  }

  function makePreviousMonthReport() {
    applyReportPeriod(
      getPreviousMonthPeriod()
    );
  }

  function makeQuarterReport(
    quarter: number
  ) {
    const year =
      new Date().getFullYear();

    applyReportPeriod(
      getQuarterPeriod(
        quarter,
        year
      )
    );
  }

  function makeCustomReport() {
    const start =
      parseDateInput(
        reportStartDate
      );

    const end =
      parseDateInput(
        reportEndDate
      );

    if (!start || !end) {
      alert(
        "Укажите дату начала и дату окончания."
      );
      return;
    }

    start.setHours(
      0,
      0,
      0,
      0
    );

    end.setHours(
      23,
      59,
      59,
      999
    );

    if (start > end) {
      alert(
        "Дата начала не может быть позже даты окончания."
      );
      return;
    }

    applyReportPeriod({
      start,
      end,
      label: `${start.toLocaleDateString(
        "uk-UA"
      )} — ${end.toLocaleDateString(
        "uk-UA"
      )}`,
    });
  }

  function runReportCommand() {
    const command =
      normalizeSearch(
        reportCommand
      );

    if (!command) {
      alert(
        "Напишите команду, например: Сделай отчёт за сентябрь 2026."
      );
      return;
    }

    const yearMatch =
      command.match(
        /(20\d{2})/
      );

    const year =
      yearMatch
        ? Number(yearMatch[1])
        : new Date().getFullYear();

    if (
      command.includes(
        "текущий месяц"
      )
    ) {
      makeCurrentMonthReport();
      return;
    }

    if (
      command.includes(
        "прошлый месяц"
      ) ||
      command.includes(
        "предыдущий месяц"
      )
    ) {
      makePreviousMonthReport();
      return;
    }

    const quarterMatch =
      command.match(
        /([1-4])\s*(?:й|ый|ой)?\s*квартал/
      );

    if (quarterMatch) {
      makeQuarterReport(
        Number(
          quarterMatch[1]
        )
      );
      return;
    }

    const monthNames: Record<
      string,
      number
    > = {
      январь: 0,
      января: 0,
      февраль: 1,
      февраля: 1,
      март: 2,
      марта: 2,
      апрель: 3,
      апреля: 3,
      май: 4,
      мая: 4,
      июнь: 5,
      июня: 5,
      июль: 6,
      июля: 6,
      август: 7,
      августа: 7,
      сентябрь: 8,
      сентября: 8,
      октябрь: 9,
      октября: 9,
      ноябрь: 10,
      ноября: 10,
      декабрь: 11,
      декабря: 11,
    };

    for (const [
      monthName,
      monthIndex,
    ] of Object.entries(
      monthNames
    )) {
      if (
        command.includes(
          monthName
        )
      ) {
        const start = new Date(
          year,
          monthIndex,
          1,
          0,
          0,
          0,
          0
        );

        const end = new Date(
          year,
          monthIndex + 1,
          0,
          23,
          59,
          59,
          999
        );

        applyReportPeriod({
          start,
          end,
          label: `${getMonthName(
            monthIndex
          )} ${year}`,
        });

        return;
      }
    }

    alert(
      "Я пока не понял период. Попробуйте: «сделай отчёт за сентябрь 2026» или «сделай отчёт за 3 квартал 2026»."
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f3ff",
        padding: "24px",
        color: "#241b35",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border:
              "2px solid #cbbddd",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "20px",
            boxShadow:
              "0 6px 20px rgba(80, 50, 120, 0.10)",
          }}
        >
          <Link
            href="/admin"
            style={{
              display:
                "inline-block",
              textDecoration:
                "none",
              color: "#75677f",
              marginBottom:
                "18px",
              fontWeight: 600,
            }}
          >
            ← Назад в админку
          </Link>

          <div
            style={{
              fontSize: "14px",
              color: "#7b6b91",
              marginBottom: "8px",
            }}
          >
            ✦ KONA LADY
          </div>

          <h1
            style={{
              fontSize: "32px",
              margin:
                "0 0 8px",
              fontWeight: 800,
            }}
          >
            KONA MANAGER
          </h1>

          <p
            style={{
              margin: 0,
              color: "#75677f",
              lineHeight: 1.6,
            }}
          >
            Ревизия магазина, товары,
            остатки, клиенты, заказы и
            отчётность в одном месте.
          </p>
        </div>

        <section
          style={{
            background: "#ffffff",
            border:
              "2px solid #cbbddd",
            borderRadius: "22px",
            padding: "22px",
            marginBottom: "20px",
            boxShadow:
              "0 6px 20px rgba(80, 50, 120, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "15px",
              flexWrap:
                "wrap",
              marginBottom:
                "14px",
            }}
          >
            <div>
              <h2
                style={{
                  margin:
                    "0 0 5px",
                  fontSize:
                    "23px",
                }}
              >
                🔎 Быстрый поиск клиента
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "#75677f",
                  fontSize:
                    "14px",
                }}
              >
                Введите телефон,
                имя или номер
                заказа — менеджер
                найдёт историю
                клиента.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap:
                "wrap",
            }}
          >
            <input
              value={
                clientSearch
              }
              onChange={(
                event
              ) => {
                setClientSearch(
                  event.target
                    .value
                );
                setSelectedClientPhone(
                  ""
                );
              }}
              placeholder="Например: +380969378846 или Алина"
              style={{
                flex:
                  "1 1 400px",
                minWidth:
                  "250px",
                border:
                  "2px solid #cbbddd",
                borderRadius:
                  "14px",
                padding:
                  "14px 16px",
                fontSize:
                  "16px",
                outline:
                  "none",
                background:
                  "#ffffff",
              }}
            />

            {clientSearch && (
              <button
                onClick={
                  clearClientSearch
                }
                style={{
                  border:
                    "2px solid #cbbddd",
                  background:
                    "#ffffff",
                  color:
                    "#4e356c",
                  borderRadius:
                    "14px",
                  padding:
                    "13px 18px",
                  fontWeight:
                    700,
                  cursor:
                    "pointer",
                }}
              >
                ✕ Очистить
              </button>
            )}
          </div>

          {clientSearch && (
            <div
              style={{
                marginTop:
                  "12px",
                color:
                  "#75677f",
                fontSize:
                  "14px",
              }}
            >
              {loadingOrders ? (
                "Ищем клиента…"
              ) : filteredClientOrders.length >
                0 ? (
                <>
                  Найдено заказов:{" "}
                  <strong>
                    {
                      filteredClientOrders.length
                    }
                  </strong>
                </>
              ) : (
                "По вашему запросу клиент или заказ не найден."
              )}
            </div>
          )}

          {clientSummary && (
            <div
              style={{
                marginTop:
                  "18px",
                borderTop:
                  "1px solid #e5ddec",
                paddingTop:
                  "18px",
              }}
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom:
                    "18px",
                }}
              >
                <ClientInfo
                  title="👤 Клиент"
                  value={
                    clientSummary.name
                  }
                />

                <ClientInfo
                  title="📞 Телефон"
                  value={
                    clientSummary.phone
                  }
                  action={() =>
                    openClientSearch(
                      String(
                        clientSummary.phone
                      )
                    )
                  }
                />

                <ClientInfo
                  title="📍 Город"
                  value={
                    clientSummary.city
                  }
                />

                <ClientInfo
                  title="🏠 Адрес"
                  value={
                    clientSummary.address
                  }
                />

                <ClientInfo
                  title="🚚 Доставка"
                  value={
                    clientSummary.delivery
                  }
                />

                <ClientInfo
                  title="💳 Оплата"
                  value={
                    clientSummary.payment
                  }
                />

                <ClientInfo
                  title="🧾 Заказов"
                  value={
                    clientSummary.ordersCount
                  }
                />

                <ClientInfo
                  title="💰 Сумма всех заказов"
                  value={`${clientSummary.totalSpent} грн`}
                />
              </div>

              <div
                style={{
                  background:
                    "#f7f3ff",
                  border:
                    "1px solid #ddd1e8",
                  borderRadius:
                    "16px",
                  padding:
                    "16px",
                  marginBottom:
                    "16px",
                }}
              >
                <div
                  style={{
                    fontWeight:
                      800,
                    marginBottom:
                      "6px",
                  }}
                >
                  🕘 Последний заказ
                </div>

                <div
                  style={{
                    color:
                      "#5f526d",
                    lineHeight:
                      1.7,
                  }}
                >
                  <strong>
                    {clientSummary.latestOrder
                      .order_number ||
                      `#${clientSummary.latestOrder.id}`}
                  </strong>
                  {" · "}
                  {formatDate(
                    clientSummary
                      .latestOrder
                      .created_at
                  )}
                  {" · "}
                  <strong>
                    {formatValue(
                      clientSummary
                        .latestOrder
                        .total_uah
                    )}{" "}
                    грн
                  </strong>
                  {" · "}
                  {getOrderStatus(
                    clientSummary.latestOrder
                  )}
                </div>
              </div>

              <div>
                <h3
                  style={{
                    margin:
                      "0 0 12px",
                    fontSize:
                      "18px",
                  }}
                >
                  📋 История заказов клиента
                </h3>

                <div
                  style={{
                    overflowX:
                      "auto",
                    border:
                      "1px solid #e1d9e8",
                    borderRadius:
                      "14px",
                  }}
                >
                  <table
                    style={{
                      width:
                        "100%",
                      borderCollapse:
                        "collapse",
                      minWidth:
                        "950px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background:
                            "#f7f3ff",
                        }}
                      >
                        <th
                          style={
                            thStyle
                          }
                        >
                          Заказ
                        </th>

                        <th
                          style={
                            thStyle
                          }
                        >
                          Дата
                        </th>

                        <th
                          style={
                            thStyle
                          }
                        >
                          Сумма
                        </th>

                        <th
                          style={
                            thStyle
                          }
                        >
                          Статус
                        </th>

                        <th
                          style={
                            thStyle
                          }
                        >
                          Доставка
                        </th>

                        <th
                          style={
                            thStyle
                          }
                        >
                          Адрес
                        </th>

                        <th
                          style={
                            thStyle
                          }
                        >
                          Товары
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredClientOrders
                        .slice()
                        .sort(
                          (
                            a,
                            b
                          ) =>
                            new Date(
                              b.created_at ||
                                0
                            ).getTime() -
                            new Date(
                              a.created_at ||
                                0
                            ).getTime()
                        )
                        .map(
                          (order) => {
                            const items =
                              getItemsForOrder(
                                Number(
                                  order.id
                                )
                              );

                            return (
                              <tr
                                key={
                                  order.id
                                }
                              >
                                <td
                                  style={{
                                    ...tdStyle,
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {order.order_number ||
                                    `#${order.id}`}
                                </td>

                                <td
                                  style={
                                    tdStyle
                                  }
                                >
                                  {formatDate(
                                    order.created_at
                                  )}
                                </td>

                                <td
                                  style={{
                                    ...tdStyle,
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {formatValue(
                                    order.total_uah
                                  )}{" "}
                                  грн
                                </td>

                                <td
                                  style={
                                    tdStyle
                                  }
                                >
                                  <span
                                    style={{
                                      display:
                                        "inline-block",
                                      background:
                                        "#f0e9fa",
                                      color:
                                        "#4e356c",
                                      borderRadius:
                                        "10px",
                                      padding:
                                        "6px 10px",
                                      fontWeight:
                                        700,
                                    }}
                                  >
                                    {getOrderStatus(
                                      order
                                    )}
                                  </span>
                                </td>

                                <td
                                  style={
                                    tdStyle
                                  }
                                >
                                  {formatValue(
                                    order.delivery_method
                                  )}
                                </td>

                                <td
                                  style={
                                    tdStyle
                                  }
                                >
                                  {formatValue(
                                    order.delivery_address
                                  )}
                                </td>

                                <td
                                  style={
                                    tdStyle
                                  }
                                >
                                  <button
                                    onClick={() =>
                                      toggleOrder(
                                        Number(
                                          order.id
                                        )
                                      )
                                    }
                                    style={{
                                      border:
                                        "1px solid #cbbddd",
                                      background:
                                        "#ffffff",
                                      color:
                                        "#4e356c",
                                      borderRadius:
                                        "10px",
                                      padding:
                                        "7px 11px",
                                      fontWeight:
                                        700,
                                      cursor:
                                        "pointer",
                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {expandedOrders.includes(
                                      Number(
                                        order.id
                                      )
                                    )
                                      ? "▲ Скрыть"
                                      : `▼ Показать (${items.length})`}
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )}
                    </tbody>
                  </table>
                </div>

                {filteredClientOrders
                  .filter((order) =>
                    expandedOrders.includes(
                      Number(
                        order.id
                      )
                    )
                  )
                  .map((order) => {
                    const items =
                      getItemsForOrder(
                        Number(
                          order.id
                        )
                      );

                    return (
                      <div
                        key={`client-details-${order.id}`}
                        style={{
                          marginTop:
                            "12px",
                          background:
                            "#faf8ff",
                          border:
                            "1px solid #ddd1e8",
                          borderRadius:
                            "14px",
                          padding:
                            "16px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              800,
                            marginBottom:
                              "10px",
                          }}
                        >
                          📦{" "}
                          {order.order_number ||
                            `Заказ #${order.id}`}
                        </div>

                        {items.length ===
                        0 ? (
                          <div
                            style={{
                              color:
                                "#75677f",
                            }}
                          >
                            Товары не
                            найдены.
                          </div>
                        ) : (
                          <div
                            style={{
                              overflowX:
                                "auto",
                            }}
                          >
                            <table
                              style={{
                                width:
                                  "100%",
                                borderCollapse:
                                  "collapse",
                                minWidth:
                                  "700px",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    background:
                                      "#f7f3ff",
                                  }}
                                >
                                  <th
                                    style={
                                      thStyle
                                    }
                                  >
                                    Товар
                                  </th>

                                  <th
                                    style={
                                      thStyle
                                    }
                                  >
                                    Размер
                                  </th>

                                  <th
                                    style={
                                      thStyle
                                    }
                                  >
                                    Цвет
                                  </th>

                                  <th
                                    style={
                                      thStyle
                                    }
                                  >
                                    Количество
                                  </th>

                                  <th
                                    style={
                                      thStyle
                                    }
                                  >
                                    Цена
                                  </th>

                                  <th
                                    style={
                                      thStyle
                                    }
                                  >
                                    Сумма
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {items.map(
                                  (
                                    item
                                  ) => {
                                    const quantity =
                                      Number(
                                        item.quantity ||
                                          0
                                      );

                                    const price =
                                      Number(
                                        item.price_uah ||
                                          0
                                      );

                                    return (
                                      <tr
                                        key={
                                          item.id
                                        }
                                      >
                                        <td
                                          style={{
                                            ...tdStyle,
                                            fontWeight:
                                              700,
                                          }}
                                        >
                                          {formatValue(
                                            item.product_name
                                          )}
                                        </td>

                                        <td
                                          style={
                                            tdStyle
                                          }
                                        >
                                          {formatValue(
                                            item.size
                                          )}
                                        </td>

                                        <td
                                          style={
                                            tdStyle
                                          }
                                        >
                                          {formatValue(
                                            item.color
                                          )}
                                        </td>

                                        <td
                                          style={{
                                            ...tdStyle,
                                            fontWeight:
                                              800,
                                          }}
                                        >
                                          {
                                            quantity
                                          }
                                        </td>

                                        <td
                                          style={
                                            tdStyle
                                          }
                                        >
                                          {
                                            price
                                          }{" "}
                                          грн
                                        </td>

                                        <td
                                          style={{
                                            ...tdStyle,
                                            fontWeight:
                                              800,
                                          }}
                                        >
                                          {quantity *
                                            price}{" "}
                                          грн
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginBottom: "20px",
          }}
        >
          <StatCard
            title="🛍️ Всего товаров"
            value={
              loadingProducts
                ? "…"
                : products.length
            }
          />

          <StatCard
            title="🟢 В наличии"
            value={
              loadingProducts
                ? "…"
                : stockInfo.available
            }
          />

          <StatCard
            title="🔴 Нет в наличии"
            value={
              loadingProducts
                ? "…"
                : stockInfo.unavailable
            }
          />

          <StatCard
            title="📦 Остаток"
            value={
              loadingProducts
                ? "…"
                : stockInfo.withQuantity >
                  0
                ? stockInfo.totalQuantity
                : "—"
            }
          />

          <StatCard
            title="🧾 Всего заказов"
            value={
              loadingOrders
                ? "…"
                : orders.length
            }
          />

          <StatCard
            title="💰 Сумма заказов"
            value={
              loadingOrders
                ? "…"
                : `${totalSales} грн`
            }
          />

          <StatCard
            title="📦 Заказано единиц"
            value={
              loadingItems
                ? "…"
                : totalOrderedItems
            }
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() =>
              setActiveTab(
                "products"
              )
            }
            style={tabStyle(
              activeTab ===
                "products"
            )}
          >
            📦 Ревизия товаров
          </button>

          <button
            onClick={() =>
              setActiveTab(
                "orders"
              )
            }
            style={tabStyle(
              activeTab ===
                "orders"
            )}
          >
            🧾 Заказы
          </button>

          <button
            onClick={() =>
              setActiveTab(
                "clients"
              )
            }
            style={tabStyle(
              activeTab ===
                "clients"
            )}
          >
            🔎 Клиенты
          </button>

          <button
            onClick={() =>
              setActiveTab(
                "reports"
              )
            }
            style={tabStyle(
              activeTab ===
                "reports"
            )}
        
          >
            📊 Отчётность
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            style={tabStyle(activeTab === "finance")}
          >
            💰 Финансы
          </button>

          <button
            onClick={
              loadManagerData
            }
            style={{
              border:
                "2px solid #cbbddd",
              background:
                "#ffffff",
              color:
                "#241b35",
              borderRadius:
                "14px",
              padding:
                "13px 20px",
              fontWeight:
                700,
              cursor:
                "pointer",
            }}
          >
            🔄 Обновить данные
          </button>
        </div>

        {activeTab ===
          "products" && (
          <section
            style={{
              background:
                "#ffffff",
              border:
                "2px solid #cbbddd",
              borderRadius:
                "22px",
              padding:
                "22px",
              boxShadow:
                "0 6px 20px rgba(80, 50, 120, 0.08)",
              marginBottom:
                "20px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                gap: "12px",
                flexWrap:
                  "wrap",
                marginBottom:
                  "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin:
                      "0 0 6px",
                    fontSize:
                      "24px",
                  }}
                >
                  📦 Ревизия товаров
                </h2>

                <p
                  style={{
                    margin: 0,
                    color:
                      "#75677f",
                  }}
                >
                  Проверяем наличие и
                  количество товара.
                </p>
              </div>

              <div
                style={{
                  background:
                    "#f7f3ff",
                  borderRadius:
                    "12px",
                  padding:
                    "10px 14px",
                  fontSize:
                    "14px",
                  color:
                    "#5f526d",
                }}
              >
                Количественный
                учёт:{" "}
                <strong>
                  {stockInfo.withQuantity >
                  0
                    ? "найден"
                    : "пока не найден"}
                </strong>
              </div>
            </div>

            {productsError && (
              <ErrorBox
                message={
                  productsError
                }
              />
            )}

            {loadingProducts ? (
              <LoadingBox
                text="Загружаем товары…"
              />
            ) : products.length ===
              0 ? (
              <EmptyBox
                text="Товаров пока нет."
              />
            ) : (
              <div
                style={{
                  overflowX:
                    "auto",
                  border:
                    "1px solid #e1d9e8",
                  borderRadius:
                    "16px",
                }}
              >
                <table
                  style={{
                    width:
                      "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "850px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "#f7f3ff",
                      }}
                    >
                      <th
                        style={
                          thStyle
                        }
                      >
                        ID
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Товар
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Категория
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Цена
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Остаток
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Наличие
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map(
                      (product) => {
                        const stock =
                          getStock(
                            product
                          );

                        const availability =
                          getAvailability(
                            product
                          );

                        const productName =
                          getProductName(
                            product
                          );

                        return (
                          <tr
                            key={
                              product.id
                            }
                          >
                            <td
                              style={
                                tdStyle
                              }
                            >
                              {formatValue(
                                product.id
                              )}
                            </td>

                            <td
                              style={{
                                ...tdStyle,
                                fontWeight:
                                  700,
                              }}
                            >
                              {
                                productName
                              }
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {formatValue(
                                product.category
                              )}

                              {product.subcategory
                                ? ` / ${product.subcategory}`
                                : ""}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {product.price_uah !==
                                undefined &&
                              product.price_uah !==
                                null
                                ? `${product.price_uah} грн`
                                : "—"}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {stock !==
                              null ? (
                                <strong>
                                  {stock}
                                </strong>
                              ) : (
                                <span
                                  style={{
                                    color:
                                      "#9a6700",
                                  }}
                                >
                                  Не задан
                                </span>
                              )}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {availability ===
                              true ? (
                                <span
                                  style={{
                                    display:
                                      "inline-block",
                                    background:
                                      "#e7f6ec",
                                    color:
                                      "#19703c",
                                    borderRadius:
                                      "10px",
                                    padding:
                                      "6px 10px",
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  🟢 В наличии
                                </span>
                              ) : availability ===
                                false ? (
                                <span
                                  style={{
                                    display:
                                      "inline-block",
                                    background:
                                      "#fff0f0",
                                    color:
                                      "#b42318",
                                    borderRadius:
                                      "10px",
                                    padding:
                                      "6px 10px",
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  🔴 Нет
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display:
                                      "inline-block",
                                    background:
                                      "#fff8e6",
                                    color:
                                      "#9a6700",
                                    borderRadius:
                                      "10px",
                                    padding:
                                      "6px 10px",
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  ⚠️ Не определено
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div
              style={{
                marginTop:
                  "16px",
                padding:
                  "14px 16px",
                background:
                  "#f7f3ff",
                borderRadius:
                  "14px",
                color:
                  "#75677f",
                fontSize:
                  "14px",
                lineHeight:
                  1.6,
              }}
            >
              <strong>
                Важно:
              </strong>{" "}
              остаток берётся
              непосредственно из{" "}
              <strong>
                stock_quantity
              </strong>
              .
            </div>
          </section>
        )}

        {activeTab ===
          "orders" && (
          <section
            style={{
              background:
                "#ffffff",
              border:
                "2px solid #cbbddd",
              borderRadius:
                "22px",
              padding:
                "22px",
              boxShadow:
                "0 6px 20px rgba(80, 50, 120, 0.08)",
              marginBottom:
                "20px",
            }}
          >
            <div
              style={{
                marginBottom:
                  "18px",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 6px",
                  fontSize:
                    "24px",
                }}
              >
                🧾 Заказы
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "#75677f",
                }}
              >
                Заказы, клиенты,
                суммы и состав
                каждого заказа.
              </p>
            </div>

            {ordersError && (
              <ErrorBox
                message={
                  ordersError
                }
              />
            )}

            {itemsError && (
              <ErrorBox
                message={
                  itemsError
                }
              />
            )}

            {!loadingOrders &&
              !loadingItems &&
              orders.length > 0 && (
                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "10px",
                    flexWrap:
                      "wrap",
                    marginBottom:
                      "18px",
                  }}
                >
                  {Object.entries(
                    orderStats
                  ).map(
                    ([
                      status,
                      count,
                    ]) => (
                      <div
                        key={
                          status
                        }
                        style={{
                          background:
                            "#f7f3ff",
                          border:
                            "1px solid #ddd1e8",
                          borderRadius:
                            "12px",
                          padding:
                            "10px 14px",
                        }}
                      >
                        <strong>
                          {
                            status
                          }
                        </strong>
                        :{" "}
                        {count}
                      </div>
                    )
                  )}
                </div>
              )}

            {loadingOrders ||
            loadingItems ? (
              <LoadingBox
                text="Загружаем заказы и состав заказов…"
              />
            ) : orders.length ===
              0 ? (
              <EmptyBox
                text="Заказов пока нет."
              />
            ) : (
              <div
                style={{
                  overflowX:
                    "auto",
                  border:
                    "1px solid #e1d9e8",
                  borderRadius:
                    "16px",
                }}
              >
                <table
                  style={{
                    width:
                      "100%",
                    borderCollapse:
                      "collapse",
                    minWidth:
                      "1250px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "#f7f3ff",
                      }}
                    >
                      <th
                        style={
                          thStyle
                        }
                      >
                        Заказ
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Дата
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Клиент
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Телефон
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Сумма
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Статус
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Доставка
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Оплата
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Город
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Адрес
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Товары
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map(
                      (order) => {
                        const items =
                          getItemsForOrder(
                            Number(
                              order.id
                            )
                          );

                        const expanded =
                          expandedOrders.includes(
                            Number(
                              order.id
                            )
                          );

                        return (
                          <Fragment
                            key={
                              order.id
                            }
                          >
                            <tr>
                              <td
                                style={{
                                  ...tdStyle,
                                  fontWeight:
                                    800,
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {order.order_number ||
                                  `#${order.id}`}
                              </td>

                              <td
                                style={
                                  tdStyle
                                }
                              >
                                {formatDate(
                                  order.created_at
                                )}
                              </td>

                              <td
                                style={{
                                  ...tdStyle,
                                  fontWeight:
                                    700,
                                }}
                              >
                                {formatValue(
                                  order.customer_name
                                )}
                              </td>

                              <td
                                style={
                                  tdStyle
                                }
                              >
                                <button
                                  onClick={() =>
                                    openClientSearch(
                                      String(
                                        order.customer_phone ||
                                          ""
                                      )
                                    )
                                  }
                                  style={{
                                    border:
                                      "none",
                                    background:
                                      "transparent",
                                    padding:
                                      0,
                                    color:
                                      "#4e356c",
                                    textDecoration:
                                      "underline",
                                    cursor:
                                      "pointer",
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {formatValue(
                                    order.customer_phone
                                  )}
                                </button>
                              </td>

                              <td
                                style={{
                                  ...tdStyle,
                                  fontWeight:
                                    800,
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {formatValue(
                                  order.total_uah
                                )}{" "}
                                грн
                              </td>

                              <td
                                style={
                                  tdStyle
                                }
                              >
                                <span
                                  style={{
                                    display:
                                      "inline-block",
                                    background:
                                      "#f0e9fa",
                                    color:
                                      "#4e356c",
                                    borderRadius:
                                      "10px",
                                    padding:
                                      "6px 10px",
                                    fontWeight:
                                      700,
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {getOrderStatus(
                                    order
                                  )}
                                </span>
                              </td>

                              <td
                                style={
                                  tdStyle
                                }
                              >
                                {formatValue(
                                  order.delivery_method
                                )}
                              </td>

                              <td
                                style={
                                  tdStyle
                                }
                              >
                                {formatValue(
                                  order.payment_method
                                )}
                              </td>

                              <td
                                style={
                                  tdStyle
                                }
                              >
                                {formatValue(
                                  order.delivery_city
                                )}
                              </td>

                              <td
                                style={{
                                  ...tdStyle,
                                  maxWidth:
                                    "220px",
                                }}
                              >
                                {formatValue(
                                  order.delivery_address
                                )}
                              </td>

                              <td
                                style={
                                  tdStyle
                                }
                              >
                                <button
                                  onClick={() =>
                                    toggleOrder(
                                      Number(
                                        order.id
                                      )
                                    )
                                  }
                                  style={{
                                    border:
                                      "1px solid #cbbddd",
                                    background:
                                      "#ffffff",
                                    color:
                                      "#4e356c",
                                    borderRadius:
                                      "10px",
                                    padding:
                                      "7px 11px",
                                    fontWeight:
                                      700,
                                    cursor:
                                      "pointer",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {expanded
                                    ? "▲ Скрыть"
                                    : `▼ Показать (${items.length})`}
                                </button>
                              </td>
                            </tr>

                            {expanded && (
                              <tr
                                key={`${order.id}-items`}
                              >
                                <td
                                  colSpan={
                                    11
                                  }
                                  style={{
                                    padding:
                                      "18px",
                                    background:
                                      "#faf8ff",
                                    borderBottom:
                                      "1px solid #eee8f3",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight:
                                        800,
                                      marginBottom:
                                        "12px",
                                    }}
                                  >
                                    📦 Состав
                                    заказа{" "}
                                    {order.order_number ||
                                      `#${order.id}`}
                                  </div>

                                  {items.length ===
                                  0 ? (
                                    <div
                                      style={{
                                        color:
                                          "#75677f",
                                      }}
                                    >
                                      Товары в этом
                                      заказе не
                                      найдены.
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        overflowX:
                                          "auto",
                                        border:
                                          "1px solid #ddd1e8",
                                        borderRadius:
                                          "14px",
                                        background:
                                          "#ffffff",
                                      }}
                                    >
                                      <table
                                        style={{
                                          width:
                                            "100%",
                                          borderCollapse:
                                            "collapse",
                                          minWidth:
                                            "800px",
                                        }}
                                      >
                                        <thead>
                                          <tr
                                            style={{
                                              background:
                                                "#f7f3ff",
                                            }}
                                          >
                                            <th
                                              style={
                                                thStyle
                                              }
                                            >
                                              Товар
                                            </th>

                                            <th
                                              style={
                                                thStyle
                                              }
                                            >
                                              ID товара
                                            </th>

                                            <th
                                              style={
                                                thStyle
                                              }
                                            >
                                              Размер
                                            </th>

                                            <th
                                              style={
                                                thStyle
                                              }
                                            >
                                              Цвет
                                            </th>

                                            <th
                                              style={
                                                thStyle
                                              }
                                            >
                                              Количество
                                            </th>

                                            <th
                                              style={
                                                thStyle
                                              }
                                            >
                                              Цена
                                            </th>

                                            <th
                                              style={
                                                thStyle
                                              }
                                            >
                                              Сумма
                                            </th>
                                          </tr>
                                        </thead>

                                        <tbody>
                                          {items.map(
                                            (
                                              item
                                            ) => {
                                              const quantity =
                                                Number(
                                                  item.quantity ||
                                                    0
                                                );

                                              const price =
                                                Number(
                                                  item.price_uah ||
                                                    0
                                                );

                                              return (
                                                <tr
                                                  key={
                                                    item.id
                                                  }
                                                >
                                                  <td
                                                    style={{
                                                      ...tdStyle,
                                                      fontWeight:
                                                        700,
                                                    }}
                                                  >
                                                    {formatValue(
                                                      item.product_name
                                                    )}
                                                  </td>

                                                  <td
                                                    style={
                                                      tdStyle
                                                    }
                                                  >
                                                    {formatValue(
                                                      item.product_id
                                                    )}
                                                  </td>

                                                  <td
                                                    style={
                                                      tdStyle
                                                    }
                                                  >
                                                    {formatValue(
                                                      item.size
                                                    )}
                                                  </td>

                                                  <td
                                                    style={
                                                      tdStyle
                                                    }
                                                  >
                                                    {formatValue(
                                                      item.color
                                                    )}
                                                  </td>

                                                  <td
                                                    style={{
                                                      ...tdStyle,
                                                      fontWeight:
                                                        800,
                                                    }}
                                                  >
                                                    {
                                                      quantity
                                                    }
                                                  </td>

                                                  <td
                                                    style={
                                                      tdStyle
                                                    }
                                                  >
                                                    {
                                                      price
                                                    }{" "}
                                                    грн
                                                  </td>

                                                  <td
                                                    style={{
                                                      ...tdStyle,
                                                      fontWeight:
                                                        800,
                                                    }}
                                                  >
                                                    {quantity *
                                                      price}{" "}
                                                    грн
                                                  </td>
                                                </tr>
                                              );
                                            }
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab ===
          "clients" && (
          <section
            style={{
              background:
                "#ffffff",
              border:
                "2px solid #cbbddd",
              borderRadius:
                "22px",
              padding:
                "22px",
              boxShadow:
                "0 6px 20px rgba(80, 50, 120, 0.08)",
              marginBottom:
                "20px",
            }}
          >
            <h2
              style={{
                margin:
                  "0 0 6px",
                fontSize:
                  "24px",
              }}
            >
              🔎 Клиенты
            </h2>

            <p
              style={{
                margin:
                  "0 0 18px",
                color:
                  "#75677f",
              }}
            >
              Быстрый поиск и история
              заказов.
            </p>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
              }}
            >
              <input
                value={
                  clientSearch
                }
                onChange={(
                  event
                ) =>
                  setClientSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Телефон, имя или номер заказа"
                style={{
                  flex:
                    "1 1 400px",
                  border:
                    "2px solid #cbbddd",
                  borderRadius:
                    "14px",
                  padding:
                    "14px 16px",
                  fontSize:
                    "16px",
                }}
              />

              <button
                onClick={
                  clearClientSearch
                }
                style={{
                  border:
                    "2px solid #cbbddd",
                  background:
                    "#ffffff",
                  borderRadius:
                    "14px",
                  padding:
                    "13px 18px",
                  fontWeight:
                    700,
                  cursor:
                    "pointer",
                }}
              >
                ✕ Очистить
              </button>
            </div>

            {!clientSearch && (
              <div
                style={{
                  marginTop:
                    "18px",
                  padding:
                    "18px",
                  background:
                    "#f7f3ff",
                  borderRadius:
                    "14px",
                  color:
                    "#75677f",
                }}
              >
                💡 Введите номер телефона
                клиента, чтобы найти все
                его прошлые заказы.
              </div>
            )}
          </section>
        )}

        {activeTab ===
          "reports" && (
          <section
            style={{
              background:
                "#ffffff",
              border:
                "2px solid #cbbddd",
              borderRadius:
                "22px",
              padding:
                "22px",
              boxShadow:
                "0 6px 20px rgba(80, 50, 120, 0.08)",
              marginBottom:
                "20px",
            }}
          >
            <div
              style={{
                marginBottom:
                  "20px",
              }}
            >
              <h2
                style={{
                  margin:
                    "0 0 6px",
                  fontSize:
                    "24px",
                }}
              >
                📊 Отчётность магазина
              </h2>

              <p
                style={{
                  margin: 0,
                  color:
                    "#75677f",
                }}
              >
                Сформируйте полный отчёт за
                месяц, квартал или любой
                выбранный период.
              </p>
            </div>

            <div
              style={{
                background:
                  "#f7f3ff",
                border:
                  "1px solid #ddd1e8",
                borderRadius:
                  "18px",
                padding:
                  "18px",
                marginBottom:
                  "20px",
              }}
            >
              <div
                style={{
                  fontWeight:
                    800,
                  marginBottom:
                    "10px",
                  fontSize:
                    "17px",
                }}
              >
                🤖 Команда менеджеру
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "10px",
                  flexWrap:
                    "wrap",
                }}
              >
                <input
                  value={
                    reportCommand
                  }
                  onChange={(
                    event
                  ) =>
                    setReportCommand(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      runReportCommand();
                    }
                  }}
                  placeholder="Например: Сделай полный отчёт за сентябрь 2026"
                  style={{
                    flex:
                      "1 1 500px",
                    border:
                      "2px solid #cbbddd",
                    borderRadius:
                      "14px",
                    padding:
                      "14px 16px",
                    fontSize:
                      "16px",
                    outline:
                      "none",
                  }}
                />

                <button
                  onClick={
                    runReportCommand
                  }
                  style={{
                    border:
                      "2px solid #241b35",
                    background:
                      "#241b35",
                    color:
                      "#ffffff",
                    borderRadius:
                      "14px",
                    padding:
                      "13px 20px",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                  }}
                >
                  📊 Сделать отчёт
                </button>
              </div>

              <div
                style={{
                  marginTop:
                    "10px",
                  color:
                    "#75677f",
                  fontSize:
                    "13px",
                  lineHeight:
                    1.6,
                }}
              >
                Примеры: «сделай отчёт за
                сентябрь 2026», «отчёт за 3
                квартал 2026», «отчёт за
                прошлый месяц».
              </div>
            </div>

            <div
              style={{
                marginBottom:
                  "20px",
              }}
            >
              <div
                style={{
                  fontWeight:
                    800,
                  marginBottom:
                    "10px",
                }}
              >
                ⚡ Быстрый период
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "10px",
                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  onClick={
                    makeCurrentMonthReport
                  }
                  style={
                    reportButtonStyle
                  }
                >
                  📅 Текущий месяц
                </button>

                <button
                  onClick={
                    makePreviousMonthReport
                  }
                  style={
                    reportButtonStyle
                  }
                >
                  📅 Прошлый месяц
                </button>

                <button
                  onClick={() =>
                    makeQuarterReport(
                      1
                    )
                  }
                  style={
                    reportButtonStyle
                  }
                >
                  1 квартал
                </button>

                <button
                  onClick={() =>
                    makeQuarterReport(
                      2
                    )
                  }
                  style={
                    reportButtonStyle
                  }
                >
                  2 квартал
                </button>

                <button
                  onClick={() =>
                    makeQuarterReport(
                      3
                    )
                  }
                  style={
                    reportButtonStyle
                  }
                >
                  3 квартал
                </button>

                <button
                  onClick={() =>
                    makeQuarterReport(
                      4
                    )
                  }
                  style={
                    reportButtonStyle
                  }
                >
                  4 квартал
                </button>
              </div>
            </div>

            <div
              style={{
                background:
                  "#ffffff",
                border:
                  "1px solid #ddd1e8",
                borderRadius:
                  "18px",
                padding:
                  "18px",
                marginBottom:
                  "20px",
              }}
            >
              <div
                style={{
                  fontWeight:
                    800,
                  marginBottom:
                    "12px",
                }}
              >
                🗓 Произвольный период
              </div>

              <div
                style={{
                  display:
                    "flex",
                  gap:
                    "12px",
                  flexWrap:
                    "wrap",
                  alignItems:
                    "end",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        "13px",
                      color:
                        "#75677f",
                      marginBottom:
                        "6px",
                    }}
                  >
                    От
                  </div>

                  <input
                    type="date"
                    value={
                      reportStartDate
                    }
                    onChange={(
                      event
                    ) =>
                      setReportStartDate(
                        event.target
                          .value
                      )
                    }
                    style={
                      dateInputStyle
                    }
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize:
                        "13px",
                      color:
                        "#75677f",
                      marginBottom:
                        "6px",
                    }}
                  >
                    До
                  </div>

                  <input
                    type="date"
                    value={
                      reportEndDate
                    }
                    onChange={(
                      event
                    ) =>
                      setReportEndDate(
                        event.target
                          .value
                      )
                    }
                    style={
                      dateInputStyle
                    }
                  />
                </div>

                <button
                  onClick={
                    makeCustomReport
                  }
                  style={{
                    border:
                      "2px solid #241b35",
                    background:
                      "#241b35",
                    color:
                      "#ffffff",
                    borderRadius:
                      "14px",
                    padding:
                      "13px 20px",
                    fontWeight:
                      800,
                    cursor:
                      "pointer",
                  }}
                >
                  📊 Сформировать
                </button>
              </div>
            </div>

            {!reportPeriod ? (
              <div
                style={{
                  padding:
                    "40px 20px",
                  textAlign:
                    "center",
                  background:
                    "#f7f3ff",
                  borderRadius:
                    "18px",
                  color:
                    "#75677f",
                }}
              >
                <div
                  style={{
                    fontSize:
                      "42px",
                    marginBottom:
                      "10px",
                  }}
                >
                  📊
                </div>

                <strong
                  style={{
                    display:
                      "block",
                    color:
                      "#241b35",
                    fontSize:
                      "18px",
                    marginBottom:
                      "6px",
                  }}
                >
                  Отчёт ещё не сформирован
                </strong>

                Выберите период или
                напишите команду выше.
              </div>
            ) : (
              <>
                <div
                  style={{
                    background:
                      "#241b35",
                    color:
                      "#ffffff",
                    borderRadius:
                      "18px",
                    padding:
                      "18px",
                    marginBottom:
                      "20px",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "13px",
                      opacity:
                        0.75,
                      marginBottom:
                        "5px",
                    }}
                  >
                    Сформирован отчёт
                  </div>

                  <div
                    style={{
                      fontSize:
                        "24px",
                      fontWeight:
                        800,
                    }}
                  >
                    📊{" "}
                    {
                      reportPeriod.label
                    }
                  </div>
                </div>
<button
  type="button"
  onClick={() => window.print()}
  style={{
    marginTop: "14px",
    padding: "11px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "#ffffff",
    color: "#241b35",
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  🖨️ Сохранить PDF
</button>
                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  1. Общие показатели
                </h3>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom:
                      "26px",
                  }}
                >
                  <ReportStat
                    title="🧾 Заказов"
                    value={
                      reportStats.orders
                    }
                  />

                  <ReportStat
                    title="💰 Выручка"
                    value={formatMoney(
                      reportStats.revenue
                    )}
                  />

                  <ReportStat
                    title="📦 Продано единиц"
                    value={
                      reportStats.units
                    }
                  />

                  <ReportStat
                    title="👥 Клиентов"
                    value={
                      reportStats.uniqueClients
                    }
                  />

                  <ReportStat
                    title="🧮 Средний чек"
                    value={formatMoney(
                      reportStats.averageOrder
                    )}
                  />
                </div>

                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  2. Заказы по статусам
                </h3>

                <ReportTable
                  columns={[
                    "Статус",
                    "Заказов",
                    "Сумма",
                  ]}
                >
                  {reportStatusRows.length ===
                  0 ? (
                    <EmptyTableRow
                      colSpan={3}
                      text="Заказов за этот период нет."
                    />
                  ) : (
                    reportStatusRows.map(
                      (row) => (
                        <tr
                          key={
                            row.status
                          }
                        >
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {row.status}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {row.orders}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {formatMoney(
                              row.amount
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </ReportTable>

                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  3. Продажи по товарам
                </h3>

                <ReportTable
                  columns={[
                    "Товар",
                    "ID",
                    "Продано",
                    "Сумма",
                  ]}
                >
                  {reportProductRows.length ===
                  0 ? (
                    <EmptyTableRow
                      colSpan={4}
                      text="Продаж товаров за этот период нет."
                    />
                  ) : (
                    reportProductRows.map(
                      (row) => (
                        <tr
                          key={`${row.productId}-${row.productName}`}
                        >
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              row.productName
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {row.productId ??
                              "—"}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {
                              row.quantity
                            }
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {formatMoney(
                              row.amount
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </ReportTable>

                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  4. Продажи по категориям
                </h3>

                <ReportTable
                  columns={[
                    "Категория",
                    "Заказов",
                    "Продано единиц",
                    "Сумма",
                  ]}
                >
                  {reportCategoryRows.length ===
                  0 ? (
                    <EmptyTableRow
                      colSpan={4}
                      text="Категорий с продажами за этот период нет."
                    />
                  ) : (
                    reportCategoryRows.map(
                      (row) => (
                        <tr
                          key={
                            row.category
                          }
                        >
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              row.category
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {row.orders}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {
                              row.quantity
                            }
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {formatMoney(
                              row.amount
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </ReportTable>

                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  5. Клиенты
                </h3>

                <ReportTable
                  columns={[
                    "Клиент",
                    "Телефон",
                    "Заказов",
                    "Сумма",
                  ]}
                >
                  {reportClientRows.length ===
                  0 ? (
                    <EmptyTableRow
                      colSpan={4}
                      text="Клиентов за этот период нет."
                    />
                  ) : (
                    reportClientRows.map(
                      (row) => (
                        <tr
                          key={`${row.phone}-${row.client}`}
                        >
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              row.client
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              row.phone
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {row.orders}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {formatMoney(
                              row.amount
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </ReportTable>

                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  6. Доставка
                </h3>

                <ReportTable
                  columns={[
                    "Способ доставки",
                    "Заказов",
                    "Сумма",
                  ]}
                >
                  {reportDeliveryRows.length ===
                  0 ? (
                    <EmptyTableRow
                      colSpan={3}
                      text="Данных по доставке нет."
                    />
                  ) : (
                    reportDeliveryRows.map(
                      (row) => (
                        <tr
                          key={
                            row.method
                          }
                        >
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              row.method
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {row.orders}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {formatMoney(
                              row.amount
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </ReportTable>

                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  7. Оплата
                </h3>

                <ReportTable
                  columns={[
                    "Способ оплаты",
                    "Заказов",
                    "Сумма",
                  ]}
                >
                  {reportPaymentRows.length ===
                  0 ? (
                    <EmptyTableRow
                      colSpan={3}
                      text="Данных по оплате нет."
                    />
                  ) : (
                    reportPaymentRows.map(
                      (row) => (
                        <tr
                          key={
                            row.method
                          }
                        >
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              row.method
                            }
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {row.orders}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {formatMoney(
                              row.amount
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </ReportTable>

                <h3
                  style={
                    reportTitleStyle
                  }
                >
                  8. Остатки товаров
                </h3>

                <ReportTable
                  columns={[
                    "Товар",
                    "Категория",
                    "Остаток",
                    "Наличие",
                  ]}
                >
                  {reportStockRows.length ===
                  0 ? (
                    <EmptyTableRow
                      colSpan={4}
                      text="Товаров нет."
                    />
                  ) : (
                    reportStockRows.map(
                      (row) => (
                        <tr
                          key={
                            row.id
                          }
                        >
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {row.name}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {
                              row.category
                            }
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                800,
                            }}
                          >
                            {row.stock ??
                              "—"}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {row.available ===
                            true ? (
                              <span
                                style={{
                                  color:
                                    "#19703c",
                                  fontWeight:
                                    800,
                                }}
                              >
                                🟢 В наличии
                              </span>
                            ) : row.available ===
                              false ? (
                              <span
                                style={{
                                  color:
                                    "#b42318",
                                  fontWeight:
                                    800,
                                }}
                              >
                                🔴 Нет
                              </span>
                            ) : (
                              "⚠️ Не определено"
                            )}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </ReportTable>

                <div
                  style={{
                    marginTop:
                      "24px",
                    padding:
                      "16px",
                    background:
                      "#f7f3ff",
                    border:
                      "1px solid #ddd1e8",
                    borderRadius:
                      "14px",
                    color:
                      "#75677f",
                    lineHeight:
                      1.6,
                  }}
                >
                  <strong
                    style={{
                      color:
                        "#241b35",
                    }}
                  >
                    📌 Отчёт сформирован
                  </strong>
                  <br />
                  Период:{" "}
                  {
                    reportPeriod.label
                  }
                  <br />
                  В отчёт вошли заказы,
                  товары и позиции
                  заказов, относящиеся к
                  выбранному периоду.
                </div>
              </>
            )}
          </section>
        )}
        {activeTab === "finance" && (
          <section
            style={{
              background: "#ffffff",
              border: "2px solid #cbbddd",
              borderRadius: "22px",
              padding: "22px",
              marginBottom: "20px",
              boxShadow: "0 6px 20px rgba(80, 50, 120, 0.08)",
            }}
          >
            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
              💰 Финансы магазина
            </h2>

            <p style={{ color: "#75677f", marginBottom: "20px" }}>
              Учёт подтверждённых поступлений, расходов и возвратов.
              Суммы заказов сами по себе не считаются полученными деньгами.
            </p>

            {loadingFinance && <p>Загружаем финансовые операции...</p>}

            {financeError && (
              <p style={{ color: "#b42318", marginBottom: "16px" }}>
                {financeError}
              </p>
            )}

            {!loadingFinance && !financeError && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    marginBottom: "24px",
                  }}
                >
                  <StatCard
                    title="Подтверждённые поступления"
                    value={`${financialTransactions
                      .filter((item) => item.type === "income" && item.status === "confirmed")
                      .reduce((sum, item) => sum + Number(item.amount_uah || 0), 0)
                      .toLocaleString("uk-UA")} грн`}
                  />

                  <StatCard
                    title="Подтверждённые расходы"
                    value={`${financialTransactions
                      .filter((item) => item.type === "expense" && item.status === "confirmed")
                      .reduce((sum, item) => sum + Number(item.amount_uah || 0), 0)
                      .toLocaleString("uk-UA")} грн`}
                  />

                  <StatCard
                    title="Подтверждённые возвраты"
                    value={`${financialTransactions
                      .filter((item) => item.type === "refund" && item.status === "confirmed")
                      .reduce((sum, item) => sum + Number(item.amount_uah || 0), 0)
                      .toLocaleString("uk-UA")} грн`}
                  />

                  <StatCard
                    title="Чистый денежный результат"
                    value={`${(
                      financialTransactions
                        .filter((item) => item.status === "confirmed")
                        .reduce((sum, item) => {
                          const amount = Number(item.amount_uah || 0);
                          if (item.type === "income") return sum + amount;
                          if (item.type === "expense" || item.type === "refund") return sum - amount;
                          return sum;
                        }, 0)
                    ).toLocaleString("uk-UA")} грн`}
                  />
                </div>

                <h3 style={{ fontSize: "19px", fontWeight: 800, marginBottom: "12px" }}>
                  Финансовые операции
                </h3>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
                    <thead>
                      <tr style={{ background: "#f7f3ff" }}>
                        {["Дата", "Тип", "Категория", "Сумма", "Оплата", "Статус", "Описание"].map((title) => (
                          <th key={title} style={thStyle}>{title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {financialTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ ...tdStyle, textAlign: "center", padding: "24px" }}>
                            Финансовых операций пока нет.
                          </td>
                        </tr>
                      ) : (
                        financialTransactions.map((item) => (
                          <tr key={item.id}>
                            <td style={tdStyle}>
                              {item.transaction_date
                                ? new Date(item.transaction_date).toLocaleDateString("uk-UA")
                                : "—"}
                            </td>
                            <td style={tdStyle}>
                              {item.type === "income"
                                ? "Поступление"
                                : item.type === "expense"
                                  ? "Расход"
                                  : "Возврат"}
                            </td>
                            <td style={tdStyle}>{item.category || "—"}</td>
                            <td style={tdStyle}>
                              {Number(item.amount_uah || 0).toLocaleString("uk-UA")} грн
                            </td>
                            <td style={tdStyle}>{item.payment_method || "—"}</td>
                            <td style={tdStyle}>
                              {item.status === "confirmed"
                                ? "Подтверждено"
                                : item.status === "pending"
                                  ? "Ожидает"
                                  : "Отменено"}
                            </td>
                            <td style={tdStyle}>{item.description || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
        <div
          style={{
            background:
              "#ffffff",
            border:
              "2px solid #cbbddd",
            borderRadius:
              "20px",
            padding:
              "18px 22px",
            boxShadow:
              "0 6px 20px rgba(80, 50, 120, 0.08)",
          }}
        >
          <div
            style={{
              fontWeight:
                700,
              marginBottom:
                "6px",
            }}
          >
            ✦ KONA MANAGER
          </div>

          <div
            style={{
              color:
                "#75677f",
              fontSize:
                "14px",
              lineHeight:
                1.6,
            }}
          >
            Менеджер: ревизия товаров,
            контроль заказов, быстрый
            поиск клиентов и аналитическая
            отчётность по выбранному периоду.
          </div>
        </div>
      </div>
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 14px",
  borderBottom:
    "1px solid #ddd1e8",
  fontSize: "13px",
  color: "#5f526d",
  whiteSpace:
    "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "13px 14px",
  borderBottom:
    "1px solid #eee8f3",
  fontSize: "14px",
  verticalAlign:
    "top",
};

const reportTitleStyle: React.CSSProperties = {
  margin:
    "28px 0 12px",
  fontSize:
    "19px",
};

const reportButtonStyle: React.CSSProperties = {
  border:
    "1px solid #cbbddd",
  background:
    "#ffffff",
  color:
    "#4e356c",
  borderRadius:
    "12px",
  padding:
    "10px 14px",
  fontWeight:
    700,
  cursor:
    "pointer",
};

const dateInputStyle: React.CSSProperties = {
  border:
    "2px solid #cbbddd",
  borderRadius:
    "12px",
  padding:
    "11px 13px",
  fontSize:
    "15px",
  background:
    "#ffffff",
};

function tabStyle(active: boolean) {
  return {
    border:
      "2px solid #cbbddd",
    background:
      active
        ? "#241b35"
        : "#ffffff",
    color:
      active
        ? "#ffffff"
        : "#241b35",
    borderRadius:
      "14px",
    padding:
      "13px 20px",
    fontWeight:
      700,
    cursor:
      "pointer",
  } as React.CSSProperties;
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "2px solid #cbbddd",
        borderRadius:
          "18px",
        padding:
          "18px",
        boxShadow:
          "0 4px 14px rgba(80, 50, 120, 0.08)",
      }}
    >
      <div
        style={{
          fontSize:
            "13px",
          color:
            "#5f526d",
          fontWeight:
            700,
          marginBottom:
            "8px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "30px",
          fontWeight:
            800,
          color:
            "#241b35",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ReportStat({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background:
          "#f7f3ff",
        border:
          "1px solid #ddd1e8",
        borderRadius:
          "16px",
        padding:
          "16px",
      }}
    >
      <div
        style={{
          fontSize:
            "13px",
          color:
            "#75677f",
          fontWeight:
            700,
          marginBottom:
            "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize:
            "23px",
          fontWeight:
            800,
          color:
            "#241b35",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ReportTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        overflowX:
          "auto",
        border:
          "1px solid #e1d9e8",
        borderRadius:
          "14px",
        marginBottom:
          "20px",
      }}
    >
      <table
        style={{
          width:
            "100%",
          borderCollapse:
            "collapse",
          minWidth:
            "650px",
        }}
      >
        <thead>
          <tr
            style={{
              background:
                "#f7f3ff",
            }}
          >
            {columns.map(
              (column) => (
                <th
                  key={
                    column
                  }
                  style={
                    thStyle
                  }
                >
                  {column}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}

function EmptyTableRow({
  colSpan,
  text,
}: {
  colSpan: number;
  text: string;
}) {
  return (
    <tr>
      <td
        colSpan={
          colSpan
        }
        style={{
          ...tdStyle,
          textAlign:
            "center",
          color:
            "#75677f",
          padding:
            "24px",
        }}
      >
        {text}
      </td>
    </tr>
  );
}

function ClientInfo({
  title,
  value,
  action,
}: {
  title: string;
  value: string | number;
  action?: () => void;
}) {
  return (
    <div
      style={{
        background:
          "#f7f3ff",
        border:
          "1px solid #ddd1e8",
        borderRadius:
          "14px",
        padding:
          "13px",
      }}
    >
      <div
        style={{
          fontSize:
            "12px",
          color:
            "#75677f",
          marginBottom:
            "5px",
          fontWeight:
            700,
        }}
      >
        {title}
      </div>

      {action ? (
        <button
          onClick={action}
          style={{
            border:
              "none",
            background:
              "transparent",
            padding:
              0,
            color:
              "#4e356c",
            textDecoration:
              "underline",
            cursor:
              "pointer",
            fontWeight:
              800,
            fontSize:
              "15px",
          }}
        >
          {value}
        </button>
      ) : (
        <div
          style={{
            fontWeight:
              800,
            fontSize:
              "15px",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
    <div
      style={{
        background:
          "#fff1f1",
        border:
          "2px solid #e6b8b8",
        borderRadius:
          "14px",
        padding:
          "14px",
        color:
          "#b42318",
        marginBottom:
          "16px",
      }}
    >
      {message}
    </div>
  );
}

function LoadingBox({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        padding:
          "30px",
        textAlign:
          "center",
        color:
          "#75677f",
      }}
    >
      {text}
    </div>
  );
}

function EmptyBox({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        padding:
          "30px",
        textAlign:
          "center",
        color:
          "#75677f",
      }}
    >
      {text}
    </div>
  );
}