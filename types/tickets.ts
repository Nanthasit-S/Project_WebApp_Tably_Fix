export type TicketStatus = "valid" | "used" | "cancelled";

export interface Ticket {
  id: number;
  status: TicketStatus;
  qr_code_data: string | null;
  event: {
    title: string;
    date: string;
    image_url: string | null;
  };
}
