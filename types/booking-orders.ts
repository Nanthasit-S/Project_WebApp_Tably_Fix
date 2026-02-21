export type BookingOrderStatus = "pending" | "paid" | "expired" | "cancelled";

export interface BookingOrderSummary {
  id: string;
  booking_date: string;
  total_amount: number;
  status: BookingOrderStatus;
  expires_at: string | null;
  tables: Array<{
    id: number;
    table_number: string;
    zone_name: string | null;
    booking_fee: number;
  }>;
}
