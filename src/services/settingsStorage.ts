import { CATEGORIES } from '../data/categories';
import type {
  BusinessType,
  DailyOperatingHours,
  DayOfWeekKey,
  MerchantSettings,
  NotificationPreferences,
  PickupLocationInfo,
  PreparationTimeOption,
  StoreAvailabilityEvaluation,
} from '../types/settings';

const SETTINGS_STORAGE_KEY = 'errandify_merchant_settings_v1';
const AUTH_PASSWORD_STORAGE_KEY = 'errandify_merchant_password_v1';
export const MAX_BUSINESS_DESCRIPTION_LENGTH = 300;

export const PREPARATION_TIME_OPTIONS: PreparationTimeOption[] = [
  '15–30 minutes',
  '30–45 minutes',
  '45–60 minutes',
  '1–2 hours',
  '2–3 hours',
];

export const COUNTRY_CODES = [
  { code: '+234', label: '🇳🇬 +234 (NG)' },
  { code: '+233', label: '🇬🇭 +233 (GH)' },
  { code: '+254', label: '🇰🇪 +254 (KE)' },
  { code: '+27', label: '🇿🇦 +27 (ZA)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+1', label: '🇺🇸 +1 (US)' },
];

export interface VerifiedLocationSuggestion {
  id: string;
  label: string;
  addressLine: string;
  areaOrCity: string;
  state: string;
  landmarkNote: string;
  latitude: number;
  longitude: number;
}

/**
 * Verified Nigerian commercial pickup locations with synchronized GPS coordinates.
 */
export const VERIFIED_PICKUP_LOCATIONS: VerifiedLocationSuggestion[] = [
  {
    id: 'lekki-1',
    label: '14 Admiralty Way, Lekki Phase 1, Lagos',
    addressLine: '14 Admiralty Way',
    areaOrCity: 'Lekki Phase 1, Eti-Osa',
    state: 'Lagos',
    landmarkNote: 'Opposite Admiralty Mall, ground floor dispatch bay',
    latitude: 6.4474,
    longitude: 3.4723,
  },
  {
    id: 'vi-adeola',
    label: '28 Adeola Odeku Street, Victoria Island, Lagos',
    addressLine: '28 Adeola Odeku Street',
    areaOrCity: 'Victoria Island',
    state: 'Lagos',
    landmarkNote: 'Beside Mega Plaza car park entrance',
    latitude: 6.4281,
    longitude: 3.4219,
  },
  {
    id: 'ikeja-allen',
    label: '42 Allen Avenue, Ikeja, Lagos',
    addressLine: '42 Allen Avenue',
    areaOrCity: 'Ikeja',
    state: 'Lagos',
    landmarkNote: 'Near Allen Roundabout, Suite B2 pickup counter',
    latitude: 6.6018,
    longitude: 3.3515,
  },
  {
    id: 'yaba-montgomery',
    label: '19 Herbert Macaulay Way, Yaba, Lagos',
    addressLine: '19 Herbert Macaulay Way',
    areaOrCity: 'Sabo, Yaba',
    state: 'Lagos',
    landmarkNote: 'Adjacent to Sabo Bus Stop commercial complex',
    latitude: 6.5095,
    longitude: 3.3711,
  },
  {
    id: 'surulere-bode',
    label: '65 Bode Thomas Street, Surulere, Lagos',
    addressLine: '65 Bode Thomas Street',
    areaOrCity: 'Surulere',
    state: 'Lagos',
    landmarkNote: 'Near Shoprite Leisure Mall junction',
    latitude: 6.4926,
    longitude: 3.3554,
  },
  {
    id: 'ikoyi-awolowo',
    label: '102 Awolowo Road, Ikoyi, Lagos',
    addressLine: '102 Awolowo Road',
    areaOrCity: 'Ikoyi',
    state: 'Lagos',
    landmarkNote: 'By Falomo Bridge service lane',
    latitude: 6.4433,
    longitude: 3.4182,
  },
];

export const DAYS_OF_WEEK_ORDER: Array<{
  day: DayOfWeekKey;
  label: string;
  shortLabel: string;
}> = [
  { day: 'monday', label: 'Monday', shortLabel: 'Mon' },
  { day: 'tuesday', label: 'Tuesday', shortLabel: 'Tue' },
  { day: 'wednesday', label: 'Wednesday', shortLabel: 'Wed' },
  { day: 'thursday', label: 'Thursday', shortLabel: 'Thu' },
  { day: 'friday', label: 'Friday', shortLabel: 'Fri' },
  { day: 'saturday', label: 'Saturday', shortLabel: 'Sat' },
  { day: 'sunday', label: 'Sunday', shortLabel: 'Sun' },
];

/**
 * Immutable onboarding records for CAC Registration and Bank & Payout Details.
 * These cannot be modified or deleted through the merchant Settings interface.
 */
const ONBOARDED_CAC_REGISTRATION = Object.freeze({
  registrationNumber: 'RC-1849203',
  registeredBusinessName: 'XYZ Limited',
  registrationType: 'Private Limited Company (LTD)',
});

const ONBOARDED_BANK_DETAILS = Object.freeze({
  bankName: 'Guaranty Trust Bank (GTBank)',
  accountName: 'XYZ Limited',
  maskedAccountNumber: '****4821',
});

export const DEFAULT_OPENING_HOURS: DailyOperatingHours[] = [
  {
    day: 'monday',
    label: 'Monday',
    isClosed: false,
    openTime: '08:00',
    closeTime: '20:00',
  },
  {
    day: 'tuesday',
    label: 'Tuesday',
    isClosed: false,
    openTime: '08:00',
    closeTime: '20:00',
  },
  {
    day: 'wednesday',
    label: 'Wednesday',
    isClosed: false,
    openTime: '08:00',
    closeTime: '20:00',
  },
  {
    day: 'thursday',
    label: 'Thursday',
    isClosed: false,
    openTime: '08:00',
    closeTime: '20:00',
  },
  {
    day: 'friday',
    label: 'Friday',
    isClosed: false,
    openTime: '08:00',
    closeTime: '20:00',
  },
  {
    day: 'saturday',
    label: 'Saturday',
    isClosed: false,
    openTime: '09:00',
    closeTime: '20:00',
  },
  {
    day: 'sunday',
    label: 'Sunday',
    isClosed: false,
    openTime: '10:00',
    closeTime: '18:00',
  },
];

export const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  businessName: 'XYZ Limited',
  logoUrl: undefined,
  logoFileName: undefined,
  businessDescription:
    'Quality Nigerian foodstuffs, cooking oils, household essentials, and everyday apparel prepared fresh for fast Errandify runner pickup.',
  businessType: 'physical_store',
  businessCategory: CATEGORIES[0]?.name || 'Foodstuff & Groceries',
  cacRegistration: { ...ONBOARDED_CAC_REGISTRATION },

  countryCode: '+234',
  phoneNumber: '8034567890',
  email: 'store@xyzlimited.ng',

  pickupLocation: {
    addressLine: '14 Admiralty Way',
    areaOrCity: 'Lekki Phase 1, Eti-Osa',
    state: 'Lagos',
    landmarkNote: 'Opposite Admiralty Mall, ground floor dispatch bay',
    latitude: 6.4474,
    longitude: 3.4723,
  },

  averagePreparationTime: '30–45 minutes',
  openingHours: DEFAULT_OPENING_HOURS,
  manualClosure: {
    mode: 'none',
  },

  bankDetails: { ...ONBOARDED_BANK_DETAILS },

  notificationPreferences: {
    newOrderNotifications: true,
    orderUpdates: true,
    importantAccountNotifications: true,
  },

  updatedAt: '2026-11-10T09:00:00.000Z',
};

/**
 * Formats a 24-hour "HH:mm" string into consistent 12-hour format (e.g., "8:00 AM", "8:00 PM").
 */
export function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [rawH, rawM] = time24.split(':').map(Number);
  if (isNaN(rawH) || isNaN(rawM)) return time24;
  const period = rawH >= 12 ? 'PM' : 'AM';
  const hour12 = rawH % 12 === 0 ? 12 : rawH % 12;
  const minStr = String(rawM).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
}

/**
 * Converts a "HH:mm" string into minutes since midnight (0 - 1439).
 */
export function timeToMinutes(time24: string): number {
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Maps JS Date.getDay() (0=Sunday..6=Saturday) to DayOfWeekKey.
 */
export function getDayKeyFromDate(date: Date): DayOfWeekKey {
  const map: DayOfWeekKey[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return map[date.getDay()];
}

/**
 * Finds the next scheduled opening time explanation relative to `now`.
 */
export function getNextScheduledOpeningExplanation(
  openingHours: DailyOperatingHours[],
  now: Date
): string {
  const todayKey = getDayKeyFromDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayEntry = openingHours.find((d) => d.day === todayKey);
  if (
    todayEntry &&
    !todayEntry.isClosed &&
    currentMinutes < timeToMinutes(todayEntry.openTime)
  ) {
    return `Opens today at ${formatTime12h(todayEntry.openTime)}.`;
  }

  for (let offset = 1; offset <= 7; offset++) {
    const candidateDate = new Date(
      now.getTime() + offset * 24 * 60 * 60 * 1000
    );
    const candidateKey = getDayKeyFromDate(candidateDate);
    const entry = openingHours.find((d) => d.day === candidateKey);
    if (entry && !entry.isClosed) {
      if (offset === 1) {
        return `Opens tomorrow at ${formatTime12h(entry.openTime)}.`;
      }
      return `Opens ${entry.label} at ${formatTime12h(entry.openTime)}.`;
    }
  }

  return 'Closed · All days are currently marked as Closed in your weekly schedule.';
}

/**
 * Evaluates actual store availability at a given timestamp (`now`), combining:
 * 1. Manual temporary closure ('until_manual' or 'until_time')
 * 2. Weekly opening hours schedule ('monday'..'sunday')
 *
 * Enforces all business rules:
 * - Manual temporary closure overrides the normal opening schedule.
 * - 'until_manual' stays Temporarily Closed until the merchant explicitly reopens it (never auto-reopens at the next scheduled opening time).
 * - 'until_time' stays Temporarily Closed until `reopenAtIso`; once `now >= reopenAtIso`, automatic reopening respects normal opening hours.
 */
export function evaluateStoreAvailability(
  settings: MerchantSettings,
  referenceDate?: Date
): StoreAvailabilityEvaluation {
  const now = referenceDate || new Date();
  const nextScheduledOpenExplanation = getNextScheduledOpeningExplanation(
    settings.openingHours,
    now
  );

  // 1. Check Manual Temporary Closure
  if (settings.manualClosure.mode === 'until_manual') {
    return {
      status: 'temporarily_closed',
      statusLabel: 'Temporarily Closed',
      explanation: 'Closed manually. Reopen when ready.',
      canAcceptOrders: false,
      isManualOverrideActive: true,
      nextScheduledOpenExplanation,
    };
  }

  if (
    settings.manualClosure.mode === 'until_time' &&
    settings.manualClosure.reopenAtIso
  ) {
    const reopenDate = new Date(settings.manualClosure.reopenAtIso);
    if (!isNaN(reopenDate.getTime()) && now.getTime() < reopenDate.getTime()) {
      const sameDay =
        now.getFullYear() === reopenDate.getFullYear() &&
        now.getMonth() === reopenDate.getMonth() &&
        now.getDate() === reopenDate.getDate();

      const timeFormatted = formatTime12h(
        `${String(reopenDate.getHours()).padStart(2, '0')}:${String(
          reopenDate.getMinutes()
        ).padStart(2, '0')}`
      );

      const datePrefix = sameDay
        ? ''
        : `${reopenDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })} at `;

      return {
        status: 'temporarily_closed',
        statusLabel: 'Temporarily Closed',
        explanation: `Temporarily closed until ${datePrefix}${timeFormatted}.`,
        canAcceptOrders: false,
        isManualOverrideActive: true,
        nextScheduledOpenExplanation,
      };
    }
    // If now >= reopenDate, the manual closure window has elapsed.
    // Fall through to evaluate normal scheduled opening hours so automatic reopening respects the schedule.
  }

  // 2. Evaluate Weekly Opening Hours Schedule
  const todayKey = getDayKeyFromDate(now);
  const todaySchedule = settings.openingHours.find((d) => d.day === todayKey);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (todaySchedule && !todaySchedule.isClosed) {
    const openMins = timeToMinutes(todaySchedule.openTime);
    const closeMins = timeToMinutes(todaySchedule.closeTime);

    if (currentMinutes >= openMins && currentMinutes < closeMins) {
      return {
        status: 'open',
        statusLabel: 'Open',
        explanation: `Open until ${formatTime12h(todaySchedule.closeTime)}.`,
        canAcceptOrders: true,
        isManualOverrideActive: false,
        nextScheduledOpenExplanation: undefined,
      };
    }
  }

  return {
    status: 'closed',
    statusLabel: 'Closed',
    explanation: nextScheduledOpenExplanation,
    canAcceptOrders: false,
    isManualOverrideActive: false,
    nextScheduledOpenExplanation,
  };
}

function normalizeSettings(raw: Partial<MerchantSettings>): MerchantSettings {
  const validHours =
    Array.isArray(raw.openingHours) && raw.openingHours.length === 7
      ? raw.openingHours
      : DEFAULT_OPENING_HOURS;

  const validBusinessType: BusinessType =
    raw.businessType === 'online_store' ? 'online_store' : 'physical_store';

  const validPrepTime: PreparationTimeOption =
    raw.averagePreparationTime &&
    PREPARATION_TIME_OPTIONS.includes(raw.averagePreparationTime)
      ? raw.averagePreparationTime
      : DEFAULT_MERCHANT_SETTINGS.averagePreparationTime;

  return {
    businessName:
      typeof raw.businessName === 'string' && raw.businessName.trim()
        ? raw.businessName.trim()
        : DEFAULT_MERCHANT_SETTINGS.businessName,
    logoUrl: raw.logoUrl || undefined,
    logoFileName: raw.logoFileName || undefined,
    businessDescription:
      typeof raw.businessDescription === 'string'
        ? raw.businessDescription
        : DEFAULT_MERCHANT_SETTINGS.businessDescription,
    businessType: validBusinessType,
    businessCategory:
      typeof raw.businessCategory === 'string' && raw.businessCategory.trim()
        ? raw.businessCategory.trim()
        : DEFAULT_MERCHANT_SETTINGS.businessCategory,
    // Always enforce read-only onboarding CAC & Bank details
    cacRegistration: { ...ONBOARDED_CAC_REGISTRATION },
    countryCode: raw.countryCode || DEFAULT_MERCHANT_SETTINGS.countryCode,
    phoneNumber: raw.phoneNumber || DEFAULT_MERCHANT_SETTINGS.phoneNumber,
    email: raw.email || DEFAULT_MERCHANT_SETTINGS.email,
    pickupLocation: {
      addressLine:
        raw.pickupLocation?.addressLine ||
        DEFAULT_MERCHANT_SETTINGS.pickupLocation.addressLine,
      areaOrCity:
        raw.pickupLocation?.areaOrCity ||
        DEFAULT_MERCHANT_SETTINGS.pickupLocation.areaOrCity,
      state:
        raw.pickupLocation?.state ||
        DEFAULT_MERCHANT_SETTINGS.pickupLocation.state,
      landmarkNote:
        raw.pickupLocation?.landmarkNote ??
        DEFAULT_MERCHANT_SETTINGS.pickupLocation.landmarkNote,
      latitude:
        typeof raw.pickupLocation?.latitude === 'number' &&
        !isNaN(raw.pickupLocation.latitude)
          ? raw.pickupLocation.latitude
          : DEFAULT_MERCHANT_SETTINGS.pickupLocation.latitude,
      longitude:
        typeof raw.pickupLocation?.longitude === 'number' &&
        !isNaN(raw.pickupLocation.longitude)
          ? raw.pickupLocation.longitude
          : DEFAULT_MERCHANT_SETTINGS.pickupLocation.longitude,
    },
    averagePreparationTime: validPrepTime,
    openingHours: validHours,
    manualClosure: raw.manualClosure || { mode: 'none' },
    bankDetails: { ...ONBOARDED_BANK_DETAILS },
    notificationPreferences: {
      newOrderNotifications:
        raw.notificationPreferences?.newOrderNotifications ?? true,
      orderUpdates: raw.notificationPreferences?.orderUpdates ?? true,
      importantAccountNotifications:
        raw.notificationPreferences?.importantAccountNotifications ?? true,
    },
    updatedAt: raw.updatedAt || DEFAULT_MERCHANT_SETTINGS.updatedAt,
  };
}

export const SettingsStorage = {
  evaluateStoreAvailability,

  resetSettings(): MerchantSettings {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(AUTH_PASSWORD_STORAGE_KEY);
    const defaults = normalizeSettings(DEFAULT_MERCHANT_SETTINGS);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    window.dispatchEvent(new CustomEvent('errandify:settings-updated'));
    return defaults;
  },

  getSettings(): MerchantSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) {
        return normalizeSettings(DEFAULT_MERCHANT_SETTINGS);
      }
      const parsed = JSON.parse(stored);
      return normalizeSettings(parsed);
    } catch {
      return normalizeSettings(DEFAULT_MERCHANT_SETTINGS);
    }
  },

  saveSettings(
    nextSettings: Partial<MerchantSettings>
  ): MerchantSettings {
    const current = this.getSettings();
    const merged = normalizeSettings({
      ...current,
      ...nextSettings,
      // Explicitly lock read-only onboarding records
      cacRegistration: { ...ONBOARDED_CAC_REGISTRATION },
      bankDetails: { ...ONBOARDED_BANK_DETAILS },
      updatedAt: new Date().toISOString(),
    });

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('errandify:settings-updated'));
    } catch (e) {
      console.error('Failed to persist merchant settings', e);
      throw new Error('Failed to save settings to storage.');
    }

    return merged;
  },

  /**
   * Updates Store Information section fields after validation.
   * Ignores any attempt to mutate CAC registration details.
   */
  updateStoreInformation(payload: {
    businessName: string;
    logoUrl?: string;
    logoFileName?: string;
    businessDescription: string;
    businessType: BusinessType;
    businessCategory: string;
  }): MerchantSettings {
    const trimmedName = payload.businessName.trim();
    if (!trimmedName) {
      throw new Error('Business name is required and cannot be empty.');
    }
    if (payload.businessDescription.length > 300) {
      throw new Error('Business description cannot exceed 300 characters.');
    }
    if (!payload.businessCategory.trim()) {
      throw new Error('Please select a valid business category.');
    }

    return this.saveSettings({
      businessName: trimmedName,
      logoUrl: payload.logoUrl,
      logoFileName: payload.logoFileName,
      businessDescription: payload.businessDescription.trim(),
      businessType: payload.businessType,
      businessCategory: payload.businessCategory.trim(),
    });
  },

  /**
   * Updates Contact Information section fields after phone and email validation.
   */
  updateContactInformation(payload: {
    countryCode: string;
    phoneNumber: string;
    email: string;
  }): MerchantSettings {
    const cleanDigits = payload.phoneNumber.replace(/[\s\-()]/g, '');
    if (!/^\d{7,11}$/.test(cleanDigits)) {
      throw new Error(
        'Please enter a valid business phone number (7 to 11 digits).'
      );
    }

    const trimmedEmail = payload.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Please enter a valid business email address.');
    }

    return this.saveSettings({
      countryCode: payload.countryCode || '+234',
      phoneNumber: cleanDigits,
      email: trimmedEmail,
    });
  },

  /**
   * Updates Store Pickup Location (retained for both Physical and Online stores).
   */
  updatePickupLocation(payload: PickupLocationInfo): MerchantSettings {
    if (!payload.addressLine.trim()) {
      throw new Error('Pickup street address is required for runner collection.');
    }
    if (!payload.areaOrCity.trim()) {
      throw new Error('City / area is required.');
    }
    if (!payload.state.trim()) {
      throw new Error('State is required.');
    }
    if (
      typeof payload.latitude !== 'number' ||
      isNaN(payload.latitude) ||
      payload.latitude < -90 ||
      payload.latitude > 90
    ) {
      throw new Error('Latitude must be a valid coordinate between -90 and 90.');
    }
    if (
      typeof payload.longitude !== 'number' ||
      isNaN(payload.longitude) ||
      payload.longitude < -180 ||
      payload.longitude > 180
    ) {
      throw new Error(
        'Longitude must be a valid coordinate between -180 and 180.'
      );
    }

    return this.saveSettings({
      pickupLocation: {
        addressLine: payload.addressLine.trim(),
        areaOrCity: payload.areaOrCity.trim(),
        state: payload.state.trim(),
        landmarkNote: payload.landmarkNote?.trim() || '',
        latitude: Number(payload.latitude.toFixed(6)),
        longitude: Number(payload.longitude.toFixed(6)),
      },
    });
  },

  /**
   * Updates Average Order Preparation Time and Weekly Opening Hours.
   */
  updateStoreOperations(payload: {
    averagePreparationTime: PreparationTimeOption;
    openingHours: DailyOperatingHours[];
  }): MerchantSettings {
    if (!PREPARATION_TIME_OPTIONS.includes(payload.averagePreparationTime)) {
      throw new Error('Please select a valid order preparation time.');
    }

    for (const dayEntry of payload.openingHours) {
      if (!dayEntry.isClosed) {
        if (!dayEntry.openTime || !dayEntry.closeTime) {
          throw new Error(
            `Please specify both opening and closing times for ${dayEntry.label}.`
          );
        }
        const openMins = timeToMinutes(dayEntry.openTime);
        const closeMins = timeToMinutes(dayEntry.closeTime);
        if (closeMins <= openMins) {
          throw new Error(
            `Closing time must be later than opening time on ${dayEntry.label}.`
          );
        }
      }
    }

    return this.saveSettings({
      averagePreparationTime: payload.averagePreparationTime,
      openingHours: payload.openingHours,
    });
  },

  /**
   * Manually closes the store either until a selected reopening time ('until_time')
   * or until manually reopened ('until_manual').
   */
  closeStoreManually(
    params: {
      mode: 'until_time' | 'until_manual';
      reopenAtIso?: string;
    },
    referenceDate?: Date
  ): {
    settings: MerchantSettings;
    evaluation: StoreAvailabilityEvaluation;
  } {
    const now = referenceDate || new Date();

    if (params.mode === 'until_time') {
      if (!params.reopenAtIso) {
        throw new Error('Please select when the store should become eligible to reopen.');
      }
      const target = new Date(params.reopenAtIso);
      if (isNaN(target.getTime()) || target.getTime() <= now.getTime()) {
        throw new Error('Selected reopening time must be in the future.');
      }
    }

    const updated = this.saveSettings({
      manualClosure: {
        mode: params.mode,
        reopenAtIso:
          params.mode === 'until_time' ? params.reopenAtIso : undefined,
        closedAtIso: now.toISOString(),
      },
    });

    return {
      settings: updated,
      evaluation: evaluateStoreAvailability(updated, now),
    };
  },

  /**
   * Manually reopens the store while strictly respecting configured opening hours.
   * If called outside configured opening hours, clears the manual closure override
   * and informs the merchant that the store remains Closed until its next scheduled opening time.
   */
  reopenStoreManually(referenceDate?: Date): {
    settings: MerchantSettings;
    evaluation: StoreAvailabilityEvaluation;
    reopenedWithinSchedule: boolean;
    message: string;
  } {
    const now = referenceDate || new Date();
    const updated = this.saveSettings({
      manualClosure: {
        mode: 'none',
      },
    });

    const evaluation = evaluateStoreAvailability(updated, now);
    if (evaluation.status === 'open') {
      return {
        settings: updated,
        evaluation,
        reopenedWithinSchedule: true,
        message: `Your store is now Open. ${evaluation.explanation}`,
      };
    }

    return {
      settings: updated,
      evaluation,
      reopenedWithinSchedule: false,
      message: `Manual closure removed. Because it is currently outside your configured opening hours, your store will remain unavailable until its next scheduled opening time (${evaluation.explanation.replace(
        /\.$/,
        ''
      )}).`,
    };
  },

  /**
   * Updates merchant in-app notification preferences.
   */
  updateNotificationPreferences(
    prefs: NotificationPreferences
  ): MerchantSettings {
    return this.saveSettings({
      notificationPreferences: { ...prefs },
    });
  },

  isNotificationEnabled(
    type:
      | 'newOrderNotifications'
      | 'orderUpdates'
      | 'importantAccountNotifications'
  ): boolean {
    const prefs = this.getSettings().notificationPreferences;
    return prefs[type] !== false;
  },

  /**
   * Changes the merchant account password with current-password verification.
   */
  changeMerchantPassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): { updatedAt: string } {
    if (!payload.currentPassword) {
      throw new Error('Please enter your current password.');
    }

    const storedPassword = localStorage.getItem(AUTH_PASSWORD_STORAGE_KEY);
    if (storedPassword !== null && payload.currentPassword !== storedPassword) {
      throw new Error('The current password you entered is incorrect.');
    }
    if (
      storedPassword === null &&
      payload.currentPassword.trim().length < 4
    ) {
      throw new Error('The current password you entered is invalid.');
    }

    if (payload.newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }
    if (
      !/[A-Za-z]/.test(payload.newPassword) ||
      !/\d/.test(payload.newPassword)
    ) {
      throw new Error(
        'New password must include at least one letter and one number.'
      );
    }
    if (payload.newPassword === payload.currentPassword) {
      throw new Error(
        'New password must be different from your current password.'
      );
    }
    if (payload.newPassword !== payload.confirmPassword) {
      throw new Error('New password and confirmation do not match.');
    }

    localStorage.setItem(AUTH_PASSWORD_STORAGE_KEY, payload.newPassword);
    const updatedAt = new Date().toISOString();
    window.dispatchEvent(new CustomEvent('errandify:settings-updated'));
    return { updatedAt };
  },

  /**
   * Returns the live customer-facing storefront status (used by customer checkout & order placement).
   */
  getCustomerStorefrontStatus(referenceDate?: Date): {
    businessName: string;
    logoUrl?: string;
    businessDescription: string;
    businessType: BusinessType;
    businessCategory: string;
    averagePreparationTime: PreparationTimeOption;
    pickupLocation: PickupLocationInfo;
    availability: StoreAvailabilityEvaluation;
    canPlaceOrders: boolean;
  } {
    const settings = this.getSettings();
    const availability = evaluateStoreAvailability(settings, referenceDate);
    return {
      businessName: settings.businessName,
      logoUrl: settings.logoUrl,
      businessDescription: settings.businessDescription,
      businessType: settings.businessType,
      businessCategory: settings.businessCategory,
      averagePreparationTime: settings.averagePreparationTime,
      pickupLocation: settings.pickupLocation,
      availability,
      canPlaceOrders: availability.canAcceptOrders,
    };
  },
};
