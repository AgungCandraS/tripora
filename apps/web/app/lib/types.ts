export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ApiDestination {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string | null;
  province: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  region?: { id: string; name: string; slug: string };
  activities?: ApiActivity[];
}

export interface ApiPackage {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration_minutes: number | null;
  min_participants: number;
  max_participants: number;
  status: string;
}

export interface ApiActivity {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  status: string;
  meeting_point: string | null;
  min_age: number | null;
  default_duration_minutes: number | null;
  rating_average: number | string;
  rating_count: number;
  destination?: ApiDestination;
  vendor?: { id: string; name: string; slug: string };
  images?: Array<{ object_key: string }>;
  categories?: Array<{ category: ApiCategory }>;
  packages?: ApiPackage[];
}

export interface ApiSlot {
  scheduleId: string;
  slot: string;
  capacity: number;
  confirmedBooked: number;
  activeReservations: number;
  available: number;
  soldOut: boolean;
  blackout?: boolean;
  past?: boolean;
  cutoffReached?: boolean;
}

export interface ApiBooking {
  id: string;
  booking_code: string;
  status: string;
  booking_date: string;
  slot_start: string;
  participant_count: number;
  subtotal: number;
  discount_amount: number;
  platform_fee: number;
  total_amount: number;
  commission_amount: number;
  vendor_net_amount: number;
  booker_name: string;
  booker_email: string;
  activity?: ApiActivity;
  package?: ApiPackage;
  ticket?: { status: string } | null;
  review?: { id: string } | null;
  ticketToken?: string | null;
}

export interface ApiUser {
  id: string;
  email: string | null;
  phone?: string | null;
  full_name: string;
  roles?: Array<{ role: { code: string } }>;
}

export function imageFor(activity: ApiActivity): string {
  const key = activity.images?.[0]?.object_key;
  if (key && (key.startsWith("/") || key.startsWith("http"))) return key;
  return "/images/activity-rafting.png";
}

export function ratingText(activity: ApiActivity): string {
  const n = typeof activity.rating_average === "string" ? Number(activity.rating_average) : activity.rating_average;
  return (Math.round((n || 0) * 10) / 10).toString().replace(".", ",");
}

export function minutesText(minutes: number | null | undefined): string {
  if (!minutes) return "Fleksibel";
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} hari`;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h},${Math.round((m / 60) * 10)} jam` : `${h} jam`;
  }
  return `${minutes} menit`;
}

export function durationText(activity: ApiActivity): string {
  return minutesText(activity.default_duration_minutes);
}

export function minPrice(activity: ApiActivity): number {
  const prices = (activity.packages ?? []).map((p) => p.base_price);
  return prices.length ? Math.min(...prices) : 0;
}
