// Business rules for Trims by K. Prices are in pence, times in minutes.

export const TIMEZONE = "Europe/London";

export type Service = {
  id: string;
  name: string;
  description: string;
  pricePence: number;
  durationMin: number;
};

export const SERVICES: Service[] = [
  {
    id: "skin-fade",
    name: "Skin fade",
    description: "Fade down to the skin, blended into your style on top.",
    pricePence: 2500,
    durationMin: 45,
  },
  {
    id: "skin-fade-beard",
    name: "Skin fade + beard",
    description: "Full skin fade with a beard shape-up and line-up.",
    pricePence: 3000,
    durationMin: 60,
  },
  {
    id: "scissor-cut",
    name: "Scissor cut",
    description: "Scissors throughout for length and texture.",
    pricePence: 2500,
    durationMin: 45,
  },
  {
    id: "beard",
    name: "Beard trim / line-up",
    description: "Beard trim, shape and crisp line-up.",
    pricePence: 1200,
    durationMin: 20,
  },
  {
    id: "kids",
    name: "Kids cut (under 12)",
    description: "Any style for under 12s.",
    pricePence: 1500,
    durationMin: 45,
  },
  {
    id: "oap",
    name: "OAP cut (65+)",
    description: "Any style for over 65s.",
    pricePence: 1500,
    durationMin: 45,
  },
];

export type TravelBand = {
  maxMiles: number;
  feePence: number;
  // Driving time blocked out before and after the appointment.
  travelMin: number;
};

export const TRAVEL_BANDS: TravelBand[] = [
  { maxMiles: 5, feePence: 1500, travelMin: 30 },
  { maxMiles: 10, feePence: 3000, travelMin: 45 },
  { maxMiles: 50, feePence: 6500, travelMin: 75 },
];

export const BOOKING_RULES = {
  maxDaysAhead: 28,
  minNoticeHours: 3,
  slotStepMin: 15,
};

export const BUSINESS = {
  name: "Trims by K",
  baseArea: "Colchester",
  since: 2020,
  instagram: "trims_by_k",
  tiktok: "trims_by_k",
  whatsapp: "447931172506",
  phoneDisplay: "07931 172506",
};

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function travelBandFor(miles: number): TravelBand | undefined {
  return TRAVEL_BANDS.find((b) => miles <= b.maxMiles);
}

export function formatPrice(pence: number): string {
  return pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`;
}

export function whatsappLink(text?: string, number = BUSINESS.whatsapp): string {
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${q}`;
}
