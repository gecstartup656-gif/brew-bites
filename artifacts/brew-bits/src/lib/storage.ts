export type PaymentMethod = 'cash' | 'upi' | 'card';
export type Category = { id: string; name: string };
export type MenuItem = { id: string; name: string; categoryId: string; price: number; tax: number; available: boolean };
export type BillItem = { itemId: string; name: string; price: number; qty: number; total: number };
export type Bill = { id: string; billNumber: number; items: BillItem[]; subtotal: number; discount: number; tax: number; total: number; paymentMethod: PaymentMethod; createdAt: string };
export type CurrentDay = { date: string; billNumber: number; bills: Bill[] };
export type DailyLog = { date: string; bills: Bill[]; summary: { sales: number; billCount: number; avgBill: number; cash: number; upi: number; card: number; topItems: { name: string; qty: number; sales: number }[] } };
export type Settings = { cafeName: string; address: string; phone: string; gst: string; currency: string; businessDayStart: string };
export type AppData = { categories: Category[]; items: MenuItem[]; currentDay: CurrentDay; logs: DailyLog[]; settings: Settings };

const API_URL = 'http://127.0.0.1:47051/api/state';
export const businessDate = (now = new Date(), businessDayStart = '06:00') => {
  const [hours, minutes] = businessDayStart.split(':').map(Number);
  const startMinutes = (Number.isFinite(hours) ? hours : 6) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const date = new Date(now);
  if (currentMinutes < startMinutes) date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const seed: AppData = {
  categories: [{ id: 'cat-coffee', name: 'Coffee' }, { id: 'cat-cold', name: 'Cold brews' }, { id: 'cat-bites', name: 'Small bites' }],
  items: [
    { id: 'item-flat-white', name: 'Flat white', categoryId: 'cat-coffee', price: 145, tax: 5, available: true },
    { id: 'item-filter', name: 'South Indian filter', categoryId: 'cat-coffee', price: 95, tax: 5, available: true },
    { id: 'item-cold-brew', name: 'Citrus cold brew', categoryId: 'cat-cold', price: 175, tax: 5, available: true },
    { id: 'item-chai', name: 'Cardamom chai', categoryId: 'cat-coffee', price: 80, tax: 5, available: true },
    { id: 'item-croissant', name: 'Butter croissant', categoryId: 'cat-bites', price: 125, tax: 5, available: true },
    { id: 'item-banana', name: 'Banana bread', categoryId: 'cat-bites', price: 110, tax: 5, available: true },
  ],
  currentDay: { date: businessDate(), billNumber: 0, bills: [] },
  logs: [],
  settings: { cafeName: 'The Brew Bits', address: '14, Paper Street, Bengaluru', phone: '+91 80 4567 2211', gst: '', currency: '₹', businessDayStart: '06:00' },
};

export async function loadData(): Promise<AppData> {
  const response = await fetch(API_URL);
  if (response.status === 404) {
    await saveData(seed);
    return structuredClone(seed);
  }
  if (!response.ok) throw new Error('Local database is unavailable');
  const { data } = await response.json() as { data: AppData };
  const { categories, items, currentDay, logs, settings } = data;
  const activeDate = businessDate(new Date(), settings.businessDayStart);
  if (currentDay.date !== activeDate && currentDay.bills.length) {
    const archived = makeDailyLog(currentDay);
    const fresh = { date: activeDate, billNumber: 0, bills: [] };
    const next = { categories, items, currentDay: fresh, logs: [archived, ...logs], settings };
    await saveData(next);
    return next;
  }
  if (currentDay.date !== activeDate && !currentDay.bills.length) {
    const next = { categories, items, currentDay: { ...currentDay, date: activeDate, billNumber: 0 }, logs, settings };
    await saveData(next);
    return next;
  }
  return { categories, items, currentDay, logs, settings };
}
export async function saveData(data: AppData) {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Local database could not save the data');
}
export function makeDailyLog(day: CurrentDay): DailyLog {
  const sales = day.bills.reduce((sum, bill) => sum + bill.total, 0);
  const payment = (method: PaymentMethod) => day.bills.filter((b) => b.paymentMethod === method).reduce((sum, b) => sum + b.total, 0);
  const map = new Map<string, { qty: number; sales: number }>();
  day.bills.forEach((bill) => bill.items.forEach((item) => {
    const old = map.get(item.name) ?? { qty: 0, sales: 0 };
    map.set(item.name, { qty: old.qty + item.qty, sales: old.sales + item.total });
  }));
  return { date: day.date, bills: day.bills, summary: { sales, billCount: day.bills.length, avgBill: day.bills.length ? sales / day.bills.length : 0, cash: payment('cash'), upi: payment('upi'), card: payment('card'), topItems: [...map.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.qty - a.qty).slice(0, 5) } };
}
export const money = (value: number, currency = '₹') => `${currency}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
