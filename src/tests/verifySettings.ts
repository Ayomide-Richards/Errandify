import {
  SettingsStorage,
  evaluateStoreAvailability,
  formatTime12h,
  MAX_BUSINESS_DESCRIPTION_LENGTH,
} from '../services/settingsStorage';
import { OrderStorage } from '../services/orderStorage';
import { ProductStorage } from '../services/productStorage';
import { CATEGORIES } from '../data/categories';
import type { DailyOperatingHours } from '../types/settings';

// Mock localStorage in memory for verification
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
  key: () => null,
  length: 0,
};
(globalThis as any).window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

console.log('--- RUNNING STORE PROFILE & SETTINGS VERIFICATION SUITE ---');

// Reset settings to clean onboarding defaults
const initial = SettingsStorage.resetSettings();
assert(
  initial.businessName === 'XYZ Limited' &&
    initial.cacRegistration.registrationNumber === 'RC-1849203' &&
    initial.bankDetails.maskedAccountNumber === '****4821',
  '1a. Initial merchant settings load with onboarded business profile, CAC registration, and settlement bank details'
);

// 1. Store name can be edited and saved (and empty name is rejected)
let emptyNameBlocked = false;
try {
  SettingsStorage.updateStoreInformation({
    businessName: '   ',
    logoUrl: initial.logoUrl,
    businessDescription: initial.businessDescription,
    businessType: initial.businessType,
    businessCategory: initial.businessCategory,
  });
} catch {
  emptyNameBlocked = true;
}
assert(emptyNameBlocked, '1b. Empty Business Name is rejected by validation');

const updatedNameSettings = SettingsStorage.updateStoreInformation({
  businessName: 'Errandify Prime Groceries',
  logoUrl: initial.logoUrl,
  businessDescription: initial.businessDescription,
  businessType: initial.businessType,
  businessCategory: initial.businessCategory,
});
assert(
  updatedNameSettings.businessName === 'Errandify Prime Groceries' &&
    SettingsStorage.getSettings().businessName === 'Errandify Prime Groceries',
  '1c. Business Name can be edited and persisted'
);

// 2. Store logo can be uploaded, replaced, or removed
const logoDataUrl1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const logoDataUrl2 =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

SettingsStorage.updateStoreInformation({
  businessName: 'Errandify Prime Groceries',
  logoUrl: logoDataUrl1,
  logoFileName: 'logo-v1.png',
  businessDescription: initial.businessDescription,
  businessType: initial.businessType,
  businessCategory: initial.businessCategory,
});
assert(
  SettingsStorage.getSettings().logoUrl === logoDataUrl1,
  '2a. Store logo can be uploaded and saved'
);

SettingsStorage.updateStoreInformation({
  businessName: 'Errandify Prime Groceries',
  logoUrl: logoDataUrl2,
  logoFileName: 'logo-v2.jpg',
  businessDescription: initial.businessDescription,
  businessType: initial.businessType,
  businessCategory: initial.businessCategory,
});
assert(
  SettingsStorage.getSettings().logoUrl === logoDataUrl2,
  '2b. Store logo can be replaced'
);

SettingsStorage.updateStoreInformation({
  businessName: 'Errandify Prime Groceries',
  logoUrl: undefined,
  logoFileName: undefined,
  businessDescription: initial.businessDescription,
  businessType: initial.businessType,
  businessCategory: initial.businessCategory,
});
assert(
  SettingsStorage.getSettings().logoUrl === undefined,
  '2c. Store logo can be removed'
);

// 3. Business description can be edited within the 300-character limit
const validDescription =
  'Fresh groceries, organic farm produce, and household essentials prepared daily for fast runner pickup in Lagos.';
SettingsStorage.updateStoreInformation({
  businessName: 'Errandify Prime Groceries',
  logoUrl: undefined,
  businessDescription: validDescription,
  businessType: initial.businessType,
  businessCategory: initial.businessCategory,
});
assert(
  SettingsStorage.getSettings().businessDescription === validDescription,
  '3a. Business description within 300 characters is saved'
);

let overLimitBlocked = false;
try {
  SettingsStorage.updateStoreInformation({
    businessName: 'Errandify Prime Groceries',
    logoUrl: undefined,
    businessDescription: 'A'.repeat(MAX_BUSINESS_DESCRIPTION_LENGTH + 1),
    businessType: initial.businessType,
    businessCategory: initial.businessCategory,
  });
} catch {
  overLimitBlocked = true;
}
assert(
  overLimitBlocked,
  '3b. Business description exceeding 300 characters is rejected'
);

// 4 & 5. Business type can be updated between Physical Store and Online Store, and Business category can be updated using existing store categories
const targetCategory = CATEGORIES[2].name; // 'Fashion & Clothing'
SettingsStorage.updateStoreInformation({
  businessName: 'Errandify Prime Groceries',
  logoUrl: undefined,
  businessDescription: validDescription,
  businessType: 'online_store',
  businessCategory: targetCategory,
});
const afterTypeAndCat = SettingsStorage.getSettings();
assert(
  afterTypeAndCat.businessType === 'online_store' &&
    afterTypeAndCat.businessCategory === targetCategory,
  `4 & 5. Business Type ('online_store') and Business Category ('${targetCategory}') can be updated using existing CATEGORIES`
);
assert(
  Boolean(afterTypeAndCat.pickupLocation.addressLine) &&
    Number.isFinite(afterTypeAndCat.pickupLocation.latitude) &&
    Number.isFinite(afterTypeAndCat.pickupLocation.longitude),
  '4b. Switching to Online Store retains the physical pickup address and map coordinates for runner pickup'
);

// 6 & 18. CAC registration details and Bank details are read-only and cannot be modified
const tamperedSettings = {
  ...SettingsStorage.getSettings(),
  cacRegistration: {
    registrationNumber: 'RC-9999999',
    registeredBusinessName: 'Tampered Corp',
    registrationType: 'Unverified',
  },
  bankDetails: {
    bankName: 'Fake Bank',
    accountName: 'Hacker',
    maskedAccountNumber: '****0000',
  },
};
SettingsStorage.saveSettings(tamperedSettings);
const afterTamperAttempt = SettingsStorage.getSettings();
assert(
  afterTamperAttempt.cacRegistration.registrationNumber === 'RC-1849203' &&
    afterTamperAttempt.cacRegistration.registeredBusinessName === 'XYZ Limited',
  '6. CAC registration details are strictly read-only and cannot be overwritten'
);
assert(
  afterTamperAttempt.bankDetails.bankName === 'Guaranty Trust Bank (GTBank)' &&
    afterTamperAttempt.bankDetails.accountName === 'XYZ Limited' &&
    afterTamperAttempt.bankDetails.maskedAccountNumber === '****4821',
  '18. Bank & Payout details are strictly read-only and cannot be overwritten'
);

// 7. Business phone number and email can be updated with validation
let invalidPhoneBlocked = false;
try {
  SettingsStorage.updateContactInformation({
    countryCode: '+234',
    phoneNumber: '123',
    email: 'orders@xyzlimited.ng',
  });
} catch {
  invalidPhoneBlocked = true;
}
assert(invalidPhoneBlocked, '7a. Invalid business phone number is rejected');

let invalidEmailBlocked = false;
try {
  SettingsStorage.updateContactInformation({
    countryCode: '+234',
    phoneNumber: '8039998877',
    email: 'invalid-email-address',
  });
} catch {
  invalidEmailBlocked = true;
}
assert(invalidEmailBlocked, '7b. Invalid business email address is rejected');

SettingsStorage.updateContactInformation({
  countryCode: '+234',
  phoneNumber: '8039998877',
  email: 'dispatch@errandifyprime.ng',
});
const afterContact = SettingsStorage.getSettings();
assert(
  afterContact.phoneNumber === '8039998877' &&
    afterContact.email === 'dispatch@errandifyprime.ng',
  '7c. Valid business phone number and email are updated and persisted'
);

// 8. Pickup address and map pin can be updated and remain synchronized
SettingsStorage.updatePickupLocation({
  addressLine: '42 Allen Avenue',
  areaOrCity: 'Ikeja',
  state: 'Lagos',
  landmarkNote: 'Near Allen Roundabout, Suite B2 pickup counter',
  latitude: 6.6018,
  longitude: 3.3515,
});
const afterLocation = SettingsStorage.getSettings();
assert(
  afterLocation.pickupLocation.addressLine === '42 Allen Avenue' &&
    afterLocation.pickupLocation.areaOrCity === 'Ikeja' &&
    afterLocation.pickupLocation.latitude === 6.6018 &&
    afterLocation.pickupLocation.longitude === 3.3515,
  '8. Pickup address and map coordinates can be updated and remain synchronized'
);

// 9, 10 & 11. Average order preparation time can be updated and saved, Opening and closing hours can be configured for all 7 days of the week, and individual days can be marked as Closed
const customSchedule: DailyOperatingHours[] = [
  { day: 'monday', label: 'Monday', isClosed: false, openTime: '08:00', closeTime: '20:00' },
  { day: 'tuesday', label: 'Tuesday', isClosed: false, openTime: '08:00', closeTime: '20:00' },
  { day: 'wednesday', label: 'Wednesday', isClosed: true, openTime: '08:00', closeTime: '20:00' }, // Marked Closed!
  { day: 'thursday', label: 'Thursday', isClosed: false, openTime: '09:00', closeTime: '21:00' },
  { day: 'friday', label: 'Friday', isClosed: false, openTime: '09:00', closeTime: '21:00' },
  { day: 'saturday', label: 'Saturday', isClosed: false, openTime: '10:00', closeTime: '18:00' },
  { day: 'sunday', label: 'Sunday', isClosed: true, openTime: '10:00', closeTime: '16:00' }, // Marked Closed!
];
SettingsStorage.updateStoreOperations({
  averagePreparationTime: '45–60 minutes',
  openingHours: customSchedule,
});
assert(
  SettingsStorage.getSettings().averagePreparationTime === '45–60 minutes' &&
    SettingsStorage.getCustomerStorefrontStatus().averagePreparationTime ===
      '45–60 minutes',
  '9. Average order preparation time can be updated and is reflected in customer storefront status'
);

const savedSchedule = SettingsStorage.getSettings().openingHours;
assert(
  savedSchedule.length === 7 &&
    savedSchedule.find((d) => d.day === 'wednesday')?.isClosed === true &&
    savedSchedule.find((d) => d.day === 'sunday')?.isClosed === true &&
    formatTime12h('08:00') === '8:00 AM' &&
    formatTime12h('20:00') === '8:00 PM',
  '10 & 11. Opening and closing hours can be configured for all 7 days, individual days can be marked Closed, and 12-hour AM/PM formatting is consistent'
);

// 12. Store automatically opens and closes based on configured opening hours
// Monday Nov 9, 2026 at 11:30 AM -> Open until 8:00 PM
const monday1130am = new Date(2026, 10, 9, 11, 30, 0);
const evalOpenMonday = evaluateStoreAvailability(
  SettingsStorage.getSettings(),
  monday1130am
);
assert(
  evalOpenMonday.status === 'open' &&
    evalOpenMonday.canAcceptOrders === true &&
    evalOpenMonday.explanation === 'Open until 8:00 PM.',
  `12a. Store automatically opens during scheduled Monday hours ("${evalOpenMonday.explanation}")`
);

// Monday Nov 9, 2026 at 9:15 PM (21:15) -> Closed, Opens tomorrow at 8:00 AM
const monday915pm = new Date(2026, 10, 9, 21, 15, 0);
const evalClosedMondayNight = evaluateStoreAvailability(
  SettingsStorage.getSettings(),
  monday915pm
);
assert(
  evalClosedMondayNight.status === 'closed' &&
    evalClosedMondayNight.canAcceptOrders === false &&
    evalClosedMondayNight.explanation === 'Opens tomorrow at 8:00 AM.',
  `12b. Store automatically closes after scheduled hours ("${evalClosedMondayNight.explanation}")`
);

// Wednesday Nov 11, 2026 at 12:00 PM (marked Closed all day) -> Closed, Opens tomorrow at 9:00 AM
const wednesdayNoon = new Date(2026, 10, 11, 12, 0, 0);
const evalClosedWednesday = evaluateStoreAvailability(
  SettingsStorage.getSettings(),
  wednesdayNoon
);
assert(
  evalClosedWednesday.status === 'closed' &&
    evalClosedWednesday.canAcceptOrders === false &&
    evalClosedWednesday.explanation === 'Opens tomorrow at 9:00 AM.',
  `12c. Store remains Closed on days marked as Closed ("${evalClosedWednesday.explanation}")`
);

// 13. Store can be manually closed until a selected time
// Suppose it is Monday Nov 9, 2026 at 11:30 AM, and merchant closes until 3:00 PM (15:00) on the same day
const monday3pmIso = new Date(2026, 10, 9, 15, 0, 0).toISOString();
SettingsStorage.closeStoreManually(
  {
    mode: 'until_time',
    reopenAtIso: monday3pmIso,
  },
  monday1130am
);
const evalTempClosedUntil3pm = evaluateStoreAvailability(
  SettingsStorage.getSettings(),
  monday1130am
);
assert(
  evalTempClosedUntil3pm.status === 'temporarily_closed' &&
    evalTempClosedUntil3pm.canAcceptOrders === false &&
    evalTempClosedUntil3pm.explanation === 'Temporarily closed until 3:00 PM.',
  `13a. Store can be manually closed until a selected time ("${evalTempClosedUntil3pm.explanation}")`
);

// Once 3:00 PM passes (e.g., Monday Nov 9, 2026 at 3:05 PM), it automatically reopens because 3:05 PM is within Monday's 8:00 AM - 8:00 PM hours
const monday305pm = new Date(2026, 10, 9, 15, 5, 0);
const evalAutoReopenedAt305pm = evaluateStoreAvailability(
  SettingsStorage.getSettings(),
  monday305pm
);
assert(
  evalAutoReopenedAt305pm.status === 'open' &&
    evalAutoReopenedAt305pm.canAcceptOrders === true &&
    evalAutoReopenedAt305pm.explanation === 'Open until 8:00 PM.',
  '13b. Store closed until a selected time automatically reopens when the selected time arrives during scheduled hours'
);

// 14 & 15. Store can be manually closed until manually reopened, and does NOT automatically reopen at the next scheduled opening time
SettingsStorage.closeStoreManually(
  {
    mode: 'until_manual',
  },
  monday1130am
);
const evalManualIndefiniteMonday = evaluateStoreAvailability(
  SettingsStorage.getSettings(),
  monday1130am
);
assert(
  evalManualIndefiniteMonday.status === 'temporarily_closed' &&
    evalManualIndefiniteMonday.canAcceptOrders === false &&
    evalManualIndefiniteMonday.explanation ===
      'Closed manually. Reopen when ready.',
  `14. Store can be manually closed until manually reopened ("${evalManualIndefiniteMonday.explanation}")`
);

// Check Tuesday Nov 10, 2026 at 10:00 AM (next scheduled opening day during normal opening hours)
const tuesday10am = new Date(2026, 10, 10, 10, 0, 0);
const evalManualIndefiniteTuesday = evaluateStoreAvailability(
  SettingsStorage.getSettings(),
  tuesday10am
);
assert(
  evalManualIndefiniteTuesday.status === 'temporarily_closed' &&
    evalManualIndefiniteTuesday.canAcceptOrders === false &&
    evalManualIndefiniteTuesday.explanation ===
      'Closed manually. Reopen when ready.',
  '15. Manual closure until manually reopened does NOT automatically reopen at the next scheduled opening time'
);

// 16. Manual reopening respects normal opening hours
// Case 16a: Merchant clicks "Reopen Store" OUTSIDE normal opening hours (e.g. Monday 9:30 PM)
const monday930pm = new Date(2026, 10, 9, 21, 30, 0);
const reopenOutsideHoursResult = SettingsStorage.reopenStoreManually(monday930pm);
assert(
  reopenOutsideHoursResult.reopenedWithinSchedule === false &&
    reopenOutsideHoursResult.evaluation.status === 'closed' &&
    reopenOutsideHoursResult.evaluation.canAcceptOrders === false &&
    reopenOutsideHoursResult.message.includes(
      'outside your configured opening hours'
    ) &&
    reopenOutsideHoursResult.message.includes('Opens tomorrow at 8:00 AM'),
  `16a. Reopening outside normal opening hours clears the manual closure override, keeps the store Closed, and explains: "${reopenOutsideHoursResult.message}"`
);

// Case 16b: Merchant closes manually again, then clicks "Reopen Store" DURING normal opening hours (e.g. Tuesday 10:00 AM)
SettingsStorage.closeStoreManually({ mode: 'until_manual' }, tuesday10am);
const reopenDuringHoursResult = SettingsStorage.reopenStoreManually(tuesday10am);
assert(
  reopenDuringHoursResult.reopenedWithinSchedule === true &&
    reopenDuringHoursResult.evaluation.status === 'open' &&
    reopenDuringHoursResult.evaluation.canAcceptOrders === true,
  '16b. Reopening during normal opening hours immediately restores the store to Open'
);

// 17. Customers cannot place orders when the store is Closed or Temporarily Closed
const catalogProducts = ProductStorage.getProducts();
const sampleSimpleProduct =
  catalogProducts.find((p) => p.productType === 'simple') || catalogProducts[0];

// Case 17a: Temporarily Closed -> customer checkout blocked
SettingsStorage.closeStoreManually({ mode: 'until_manual' }, tuesday10am);
const tempClosedOrderResult = OrderStorage.createOrderFromConfirmedCheckout({
  customerName: 'Tunde Bakare',
  paymentConfirmed: true,
  referenceDate: tuesday10am,
  items: [
    {
      productId: sampleSimpleProduct.id,
      quantity: 1,
    },
  ],
});
assert(
  tempClosedOrderResult.created === false &&
    Boolean(tempClosedOrderResult.error?.includes('Temporarily Closed')),
  `17a. Customers cannot place orders when the store is Temporarily Closed ("${tempClosedOrderResult.error}")`
);

// Reopen store manually, then test placing an order outside scheduled hours (Monday 9:30 PM -> Closed)
SettingsStorage.reopenStoreManually(tuesday10am);
const closedHoursOrderResult = OrderStorage.createOrderFromConfirmedCheckout({
  customerName: 'Tunde Bakare',
  paymentConfirmed: true,
  referenceDate: monday930pm,
  items: [
    {
      productId: sampleSimpleProduct.id,
      quantity: 1,
    },
  ],
});
assert(
  closedHoursOrderResult.created === false &&
    Boolean(closedHoursOrderResult.error?.includes('Closed')),
  `17b. Customers cannot place orders when the store is Closed outside normal business hours ("${closedHoursOrderResult.error}")`
);

// Case 17c: During open hours (Tuesday 10:00 AM), customer CAN place an order and it records the store's averagePreparationTime
const openOrderResult = OrderStorage.createOrderFromConfirmedCheckout({
  customerName: 'Tunde Bakare',
  paymentConfirmed: true,
  referenceDate: tuesday10am,
  items: [
    {
      productId: sampleSimpleProduct.id,
      quantity: 1,
    },
  ],
});
assert(
  openOrderResult.created === true &&
    Boolean(openOrderResult.order?.id) &&
    openOrderResult.averagePreparationTime === '45–60 minutes',
  `17c. Customers can place orders when the store is Open, and the order reflects the configured Average Preparation Time (${openOrderResult.averagePreparationTime})`
);

// 19. Notification preferences and password changes work properly
SettingsStorage.updateNotificationPreferences({
  newOrderNotifications: true,
  orderUpdates: false,
  importantAccountNotifications: true,
});
assert(
  SettingsStorage.isNotificationEnabled('newOrderNotifications') === true &&
    SettingsStorage.isNotificationEnabled('orderUpdates') === false &&
    SettingsStorage.isNotificationEnabled('importantAccountNotifications') ===
      true,
  '19a. Notification preferences can be toggled and persisted'
);

const validPasswordChange = SettingsStorage.changeMerchantPassword({
  currentPassword: 'Errandify@2026',
  newPassword: 'NewSecurePass2026!',
  confirmPassword: 'NewSecurePass2026!',
});
assert(
  Boolean(validPasswordChange.updatedAt),
  '19b. Password change succeeds with valid current password and strong matching new password'
);

let wrongCurrentBlocked = false;
try {
  SettingsStorage.changeMerchantPassword({
    currentPassword: 'WrongCurrentPass!',
    newPassword: 'AnotherPass2026!',
    confirmPassword: 'AnotherPass2026!',
  });
} catch {
  wrongCurrentBlocked = true;
}
assert(
  wrongCurrentBlocked,
  '19c. Subsequent password change rejects an incorrect current password'
);

let mismatchBlocked = false;
try {
  SettingsStorage.changeMerchantPassword({
    currentPassword: 'NewSecurePass2026!',
    newPassword: 'AnotherPass2026!',
    confirmPassword: 'DifferentConfirm2026!',
  });
} catch {
  mismatchBlocked = true;
}
assert(
  mismatchBlocked,
  '19d. Password change rejects mismatched confirmation password'
);

const secondValidChange = SettingsStorage.changeMerchantPassword({
  currentPassword: 'NewSecurePass2026!',
  newPassword: 'Errandify@2026',
  confirmPassword: 'Errandify@2026',
});
assert(
  Boolean(secondValidChange.updatedAt),
  '19e. Subsequent password change verifies against the newly saved password'
);

console.log('--- ALL 19 STORE PROFILE & SETTINGS SCENARIOS VERIFIED ---');
