export type Category =
  | "water_supply"
  | "sewer_drainage"
  | "garbage_sanitation"
  | "road_pothole"
  | "streetlight"
  | "health_facility"
  | "ration_pds"
  | "pension_welfare"
  | "electricity"
  | "central_service"
  | "other";

export interface Authority {
  id: string;
  name: string;
  shortName: string;
  level: "municipal" | "state" | "union" | "private_utility";
  rtiApplies: boolean;
  grievanceChannel: { name: string; url: string; helpline?: string };
  pioDesignation: string;
  faaDesignation: string;
  commission: "CIC" | "DIC" | "SIC" | "none";
  sourceUrl: string;
  verified: boolean;
}

export interface OwnerRule {
  id: string;
  when?: {
    localityIn?: string[];
    roadWidthFtGte?: number;
    roadWidthFtLt?: number;
    facilityOperator?: "delhi_govt" | "mcd";
  };
  authorityId: string;
  explanation: string;
  sourceUrl: string;
  verified: boolean;
}

export interface CategoryRule {
  category: Category;
  label: string;
  labelHi: string;
  owners: OwnerRule[];
  slaDays: number;
  slaBasis: string;
  slaSourceUrl: string;
  slaVerified: boolean;
  needs?: Array<{ field: "road_width" | "facility_operator"; question: string; questionHi: string }>;
}

export interface Pack {
  id: string;
  name: string;
  authorities: Authority[];
  categories: CategoryRule[];
  localities: Record<string, string[]>;
  rti: { responseDays: number; lifeLibertyHours: number; firstAppealWithinDays: number; firstAppealDisposalDays: number; secondAppealWithinDays: number; sourceUrl: string };
  reminderGraceDays: number;
  systemicThreshold: { cases: number; overdue: number; windowDays: number };
}
