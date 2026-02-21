export type EventOrderStatus = "pending" | "paid" | "expired" | "cancelled";

export interface EventOrderSummary {
  id: string;
  status: EventOrderStatus;
  quantity: number;
  total_amount: number;
  expires_at: string | null;
  requires_payment: boolean;
  event: {
    id: number;
    title: string;
    date: string;
    image_url: string | null;
    price: number;
  };
}
