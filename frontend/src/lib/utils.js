import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function formatDate(date, options = {}) {
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };
  return new Date(date).toLocaleDateString("tr-TR", defaultOptions);
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusColor(status) {
  const colors = {
    available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    rented: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    service: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    reserved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    created: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    delivered: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    returned: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    closed: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[status] || colors.available;
}

export function getStatusLabel(status) {
  const labels = {
    available: "Müsait",
    rented: "Kirada",
    service: "Serviste",
    reserved: "Rezerve",
    created: "Oluşturuldu",
    confirmed: "Onaylandı",
    delivered: "Teslim Edildi",
    returned: "İade Edildi",
    closed: "Kapatıldı",
    cancelled: "İptal",
  };
  return labels[status] || status;
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
