export type SettingsSectionId =
  | 'store_information'
  | 'contact_information'
  | 'store_location'
  | 'store_operations'
  | 'bank_payout_details'
  | 'account_preferences';

export type BusinessType = 'physical_store' | 'online_store';

export type PreparationTimeOption =
  | '15–30 minutes'
  | '30–45 minutes'
  | '45–60 minutes'
  | '1–2 hours'
  | '2–3 hours';

export type DayOfWeekKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DailyOperatingHours {
  day: DayOfWeekKey;
  label: string;
  isClosed: boolean;
  openTime: string; // 24-hour "HH:mm", e.g. "08:00"
  closeTime: string; // 24-hour "HH:mm", e.g. "20:00"
}

export type ManualClosureMode = 'none' | 'until_time' | 'until_manual';

export interface ManualClosureConfig {
  mode: ManualClosureMode;
  reopenAtIso?: string; // ISO timestamp when mode === 'until_time'
  closedAtIso?: string;
}

export type StoreAvailabilityStatus = 'open' | 'closed' | 'temporarily_closed';

export interface StoreAvailabilityEvaluation {
  status: StoreAvailabilityStatus;
  statusLabel: 'Open' | 'Closed' | 'Temporarily Closed';
  explanation: string;
  canAcceptOrders: boolean;
  isManualOverrideActive: boolean;
  nextScheduledOpenExplanation?: string;
}

export interface CacRegistrationInfo {
  registrationNumber: string;
  registeredBusinessName: string;
  registrationType: string;
}

export interface PickupLocationInfo {
  addressLine: string;
  areaOrCity: string;
  state: string;
  landmarkNote?: string;
  latitude: number;
  longitude: number;
}

export interface RegisteredBankInfo {
  bankName: string;
  accountName: string;
  maskedAccountNumber: string;
}

export interface NotificationPreferences {
  newOrderNotifications: boolean;
  orderUpdates: boolean;
  importantAccountNotifications: boolean;
}

export interface MerchantSettings {
  // 1. Store Information
  businessName: string;
  logoUrl?: string;
  logoFileName?: string;
  businessDescription: string;
  businessType: BusinessType;
  businessCategory: string;
  cacRegistration: CacRegistrationInfo;

  // 2. Contact Information
  countryCode: string;
  phoneNumber: string;
  email: string;

  // 3. Store Location (Required for both Physical and Online stores)
  pickupLocation: PickupLocationInfo;

  // 4. Store Operations
  averagePreparationTime: PreparationTimeOption;
  openingHours: DailyOperatingHours[];
  manualClosure: ManualClosureConfig;

  // 5. Bank & Payout Details (Read-only from onboarding)
  bankDetails: RegisteredBankInfo;

  // 6. Account Preferences
  notificationPreferences: NotificationPreferences;

  // Metadata
  updatedAt: string;
}
