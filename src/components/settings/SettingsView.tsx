import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CATEGORIES } from '../../data/categories';
import {
  COUNTRY_CODES,
  DAYS_OF_WEEK_ORDER,
  PREPARATION_TIME_OPTIONS,
  SettingsStorage,
  VERIFIED_PICKUP_LOCATIONS,
  evaluateStoreAvailability,
  formatTime12h,
} from '../../services/settingsStorage';
import type {
  BusinessType,
  DailyOperatingHours,
  MerchantSettings,
  NotificationPreferences,
  PickupLocationInfo,
  PreparationTimeOption,
  SettingsSectionId,
} from '../../types/settings';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { UnsavedChangesModal } from '../products/modals/UnsavedChangesModal';
import {
  Store,
  Phone,
  MapPin,
  Clock,
  Landmark,
  Shield,
  Lock,
  Edit3,
  Check,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Headphones,
  Navigation,
  Bell,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  Power,
  Play,
  PauseCircle,
  CalendarClock,
  Globe,
  Building2,
} from 'lucide-react';

interface SettingsViewProps {
  onNavigateToSupport: () => void;
}

const SECTION_GROUPS: Array<{
  groupLabel: string;
  items: Array<{
    id: SettingsSectionId;
    label: string;
    icon: React.FC<{ className?: string }>;
  }>;
}> = [
  {
    groupLabel: 'Business Profile',
    items: [
      { id: 'store_information', label: 'Store Information', icon: Store },
      { id: 'contact_information', label: 'Contact Information', icon: Phone },
      { id: 'store_location', label: 'Store Location', icon: MapPin },
    ],
  },
  {
    groupLabel: 'Operations',
    items: [
      { id: 'store_operations', label: 'Store Operations', icon: Clock },
    ],
  },
  {
    groupLabel: 'Finance & Security',
    items: [
      {
        id: 'bank_payout_details',
        label: 'Bank & Payout Details',
        icon: Landmark,
      },
      {
        id: 'account_preferences',
        label: 'Account Preferences',
        icon: Shield,
      },
    ],
  },
];

const DESCRIPTION_MAX_LENGTH = 300;
const MAX_LOGO_SIZE_MB = 2;

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNavigateToSupport,
}) => {
  const toast = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Master persisted settings state
  const [settings, setSettings] = useState<MerchantSettings>(() =>
    SettingsStorage.getSettings()
  );
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('store_information');
  const [pendingSection, setPendingSection] =
    useState<SettingsSectionId | null>(null);

  // Live clock reference for evaluating automatic opening/closing & temporary closures
  const [clockNow, setClockNow] = useState<Date>(() => new Date());

  // ============================================================================
  // SECTION 1: STORE INFORMATION EDIT STATE
  // ============================================================================
  const [isEditingStoreInfo, setIsEditingStoreInfo] = useState(false);
  const [storeInfoDraft, setStoreInfoDraft] = useState({
    businessName: settings.businessName,
    logoUrl: settings.logoUrl,
    logoFileName: settings.logoFileName,
    businessDescription: settings.businessDescription,
    businessType: settings.businessType as BusinessType,
    businessCategory: settings.businessCategory,
  });
  const [storeInfoError, setStoreInfoError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // ============================================================================
  // SECTION 2: CONTACT INFORMATION EDIT STATE
  // ============================================================================
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({
    countryCode: settings.countryCode,
    phoneNumber: settings.phoneNumber,
    email: settings.email,
  });
  const [contactError, setContactError] = useState<string | null>(null);

  // ============================================================================
  // SECTION 3: STORE LOCATION EDIT STATE
  // ============================================================================
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState<PickupLocationInfo>({
    ...settings.pickupLocation,
  });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocatingDevice, setIsLocatingDevice] = useState(false);

  // ============================================================================
  // SECTION 4: STORE OPERATIONS EDIT STATE
  // ============================================================================
  const [isEditingOperations, setIsEditingOperations] = useState(false);
  const [prepTimeDraft, setPrepTimeDraft] = useState<PreparationTimeOption>(
    settings.averagePreparationTime
  );
  const [hoursDraft, setHoursDraft] = useState<DailyOperatingHours[]>(() =>
    settings.openingHours.map((h) => ({ ...h }))
  );
  const [operationsError, setOperationsError] = useState<string | null>(null);

  // Manual Temporary Closure Modal State
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [closureModeDraft, setClosureModeDraft] = useState<
    'until_time' | 'until_manual'
  >('until_time');
  const [closureReopenTimeStr, setClosureReopenTimeStr] = useState<string>(() => {
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const hh = String(twoHoursLater.getHours()).padStart(2, '0');
    const mm = String(twoHoursLater.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [closureError, setClosureError] = useState<string | null>(null);

  // ============================================================================
  // SECTION 6: ACCOUNT PREFERENCES (NOTIFICATIONS & PASSWORD) STATE
  // ============================================================================
  const [isEditingNotifications, setIsEditingNotifications] = useState(false);
  const [notifDraft, setNotifDraft] = useState<NotificationPreferences>({
    ...settings.notificationPreferences,
  });

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Refresh clock every 30s so automatic opening/closing updates live
  useEffect(() => {
    const interval = setInterval(() => {
      setClockNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      const latest = SettingsStorage.getSettings();
      setSettings(latest);
    };
    window.addEventListener('errandify:settings-updated', syncSettings);
    window.addEventListener('storage', syncSettings);
    return () => {
      window.removeEventListener('errandify:settings-updated', syncSettings);
      window.removeEventListener('storage', syncSettings);
    };
  }, []);

  const availability = useMemo(
    () => evaluateStoreAvailability(settings, clockNow),
    [settings, clockNow]
  );

  // Check if current section has unsaved changes
  const hasUnsavedChangesInCurrentSection = useMemo(() => {
    if (activeSection === 'store_information' && isEditingStoreInfo) {
      return (
        storeInfoDraft.businessName !== settings.businessName ||
        storeInfoDraft.logoUrl !== settings.logoUrl ||
        storeInfoDraft.businessDescription !== settings.businessDescription ||
        storeInfoDraft.businessType !== settings.businessType ||
        storeInfoDraft.businessCategory !== settings.businessCategory
      );
    }
    if (activeSection === 'contact_information' && isEditingContact) {
      return (
        contactDraft.countryCode !== settings.countryCode ||
        contactDraft.phoneNumber !== settings.phoneNumber ||
        contactDraft.email !== settings.email
      );
    }
    if (activeSection === 'store_location' && isEditingLocation) {
      return (
        locationDraft.addressLine !== settings.pickupLocation.addressLine ||
        locationDraft.areaOrCity !== settings.pickupLocation.areaOrCity ||
        locationDraft.state !== settings.pickupLocation.state ||
        (locationDraft.landmarkNote || '') !==
          (settings.pickupLocation.landmarkNote || '') ||
        locationDraft.latitude !== settings.pickupLocation.latitude ||
        locationDraft.longitude !== settings.pickupLocation.longitude
      );
    }
    if (activeSection === 'store_operations' && isEditingOperations) {
      return (
        prepTimeDraft !== settings.averagePreparationTime ||
        JSON.stringify(hoursDraft) !== JSON.stringify(settings.openingHours)
      );
    }
    if (activeSection === 'account_preferences') {
      const notifDirty =
        isEditingNotifications &&
        JSON.stringify(notifDraft) !==
          JSON.stringify(settings.notificationPreferences);
      const passDirty =
        isEditingPassword &&
        (passwordDraft.currentPassword !== '' ||
          passwordDraft.newPassword !== '' ||
          passwordDraft.confirmPassword !== '');
      return notifDirty || passDirty;
    }
    return false;
  }, [
    activeSection,
    isEditingStoreInfo,
    storeInfoDraft,
    isEditingContact,
    contactDraft,
    isEditingLocation,
    locationDraft,
    isEditingOperations,
    prepTimeDraft,
    hoursDraft,
    isEditingNotifications,
    notifDraft,
    isEditingPassword,
    passwordDraft,
    settings,
  ]);

  const discardCurrentSectionEdits = () => {
    setIsEditingStoreInfo(false);
    setStoreInfoDraft({
      businessName: settings.businessName,
      logoUrl: settings.logoUrl,
      logoFileName: settings.logoFileName,
      businessDescription: settings.businessDescription,
      businessType: settings.businessType,
      businessCategory: settings.businessCategory,
    });
    setStoreInfoError(null);
    setLogoError(null);

    setIsEditingContact(false);
    setContactDraft({
      countryCode: settings.countryCode,
      phoneNumber: settings.phoneNumber,
      email: settings.email,
    });
    setContactError(null);

    setIsEditingLocation(false);
    setLocationDraft({ ...settings.pickupLocation });
    setLocationError(null);

    setIsEditingOperations(false);
    setPrepTimeDraft(settings.averagePreparationTime);
    setHoursDraft(settings.openingHours.map((h) => ({ ...h })));
    setOperationsError(null);

    setIsEditingNotifications(false);
    setNotifDraft({ ...settings.notificationPreferences });

    setIsEditingPassword(false);
    setPasswordDraft({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordError(null);
  };

  const handleSelectSection = (targetSection: SettingsSectionId) => {
    if (targetSection === activeSection) return;
    if (hasUnsavedChangesInCurrentSection) {
      setPendingSection(targetSection);
      return;
    }
    discardCurrentSectionEdits();
    setActiveSection(targetSection);
  };

  // ============================================================================
  // HANDLERS: 1. STORE INFORMATION
  // ============================================================================
  const handleStartEditStoreInfo = () => {
    setStoreInfoDraft({
      businessName: settings.businessName,
      logoUrl: settings.logoUrl,
      logoFileName: settings.logoFileName,
      businessDescription: settings.businessDescription,
      businessType: settings.businessType,
      businessCategory: settings.businessCategory,
    });
    setStoreInfoError(null);
    setLogoError(null);
    setIsEditingStoreInfo(true);
  };

  const handleCancelEditStoreInfo = () => {
    setStoreInfoDraft({
      businessName: settings.businessName,
      logoUrl: settings.logoUrl,
      logoFileName: settings.logoFileName,
      businessDescription: settings.businessDescription,
      businessType: settings.businessType,
      businessCategory: settings.businessCategory,
    });
    setStoreInfoError(null);
    setLogoError(null);
    setIsEditingStoreInfo(false);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError(
        'Unsupported file format. Please upload a PNG, JPG, or WebP image.'
      );
      e.target.value = '';
      return;
    }

    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      setLogoError(
        `Image size exceeds the ${MAX_LOGO_SIZE_MB}MB limit. Please choose a smaller image.`
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStoreInfoDraft((prev) => ({
          ...prev,
          logoUrl: reader.result as string,
          logoFileName: file.name,
        }));
      }
    };
    reader.onerror = () => {
      setLogoError('Unable to read image file. Please try another file.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setStoreInfoError(null);
    try {
      const updated = SettingsStorage.updateStoreInformation({
        businessName: storeInfoDraft.businessName,
        logoUrl: storeInfoDraft.logoUrl,
        logoFileName: storeInfoDraft.logoFileName,
        businessDescription: storeInfoDraft.businessDescription,
        businessType: storeInfoDraft.businessType,
        businessCategory: storeInfoDraft.businessCategory,
      });
      setSettings(updated);
      setIsEditingStoreInfo(false);
      toast.success(
        'Store information saved',
        'Your customer-facing business profile has been updated.'
      );
    } catch (err: any) {
      setStoreInfoError(
        err?.message || 'Unable to save store information. Please check inputs.'
      );
    }
  };

  // ============================================================================
  // HANDLERS: 2. CONTACT INFORMATION
  // ============================================================================
  const handleStartEditContact = () => {
    setContactDraft({
      countryCode: settings.countryCode,
      phoneNumber: settings.phoneNumber,
      email: settings.email,
    });
    setContactError(null);
    setIsEditingContact(true);
  };

  const handleCancelEditContact = () => {
    setContactDraft({
      countryCode: settings.countryCode,
      phoneNumber: settings.phoneNumber,
      email: settings.email,
    });
    setContactError(null);
    setIsEditingContact(false);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    try {
      const updated = SettingsStorage.updateContactInformation(contactDraft);
      setSettings(updated);
      setIsEditingContact(false);
      toast.success(
        'Contact information saved',
        'Your business phone number and email address have been updated.'
      );
    } catch (err: any) {
      setContactError(
        err?.message || 'Unable to save contact information.'
      );
    }
  };

  // ============================================================================
  // HANDLERS: 3. STORE LOCATION
  // ============================================================================
  const handleStartEditLocation = () => {
    setLocationDraft({ ...settings.pickupLocation });
    setLocationError(null);
    setIsEditingLocation(true);
  };

  const handleCancelEditLocation = () => {
    setLocationDraft({ ...settings.pickupLocation });
    setLocationError(null);
    setIsEditingLocation(false);
  };

  const handleApplyVerifiedLocation = (suggestionId: string) => {
    const found = VERIFIED_PICKUP_LOCATIONS.find((l) => l.id === suggestionId);
    if (!found) return;
    setLocationDraft({
      addressLine: found.addressLine,
      areaOrCity: found.areaOrCity,
      state: found.state,
      landmarkNote: found.landmarkNote,
      latitude: found.latitude,
      longitude: found.longitude,
    });
    setLocationError(null);
  };

  const handleUseBrowserGeolocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError(
        'Browser geolocation is not available in this environment. Please enter coordinates or select a verified location.'
      );
      return;
    }
    setIsLocatingDevice(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationDraft((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
        setIsLocatingDevice(false);
        toast.info(
          'Map pin updated from device GPS',
          'Verify your written pickup address matches the updated coordinates before saving.'
        );
      },
      (err) => {
        setIsLocatingDevice(false);
        setLocationError(
          err.message ||
            'Could not retrieve device location. You can adjust the map pin coordinates manually.'
        );
      },
      { timeout: 8000 }
    );
  };

  const handleNudgePin = (dLat: number, dLng: number) => {
    setLocationDraft((prev) => ({
      ...prev,
      latitude: Number((prev.latitude + dLat).toFixed(6)),
      longitude: Number((prev.longitude + dLng).toFixed(6)),
    }));
  };

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    setLocationError(null);
    try {
      const updated = SettingsStorage.updatePickupLocation(locationDraft);
      setSettings(updated);
      setIsEditingLocation(false);
      toast.success(
        'Pickup location updated',
        'Runner pickup address and map coordinates have been saved.'
      );
    } catch (err: any) {
      setLocationError(err?.message || 'Unable to save pickup location.');
    }
  };

  // ============================================================================
  // HANDLERS: 4. STORE OPERATIONS & AVAILABILITY
  // ============================================================================
  const handleStartEditOperations = () => {
    setPrepTimeDraft(settings.averagePreparationTime);
    setHoursDraft(settings.openingHours.map((h) => ({ ...h })));
    setOperationsError(null);
    setIsEditingOperations(true);
  };

  const handleCancelEditOperations = () => {
    setPrepTimeDraft(settings.averagePreparationTime);
    setHoursDraft(settings.openingHours.map((h) => ({ ...h })));
    setOperationsError(null);
    setIsEditingOperations(false);
  };

  const handleUpdateDayDraft = (
    index: number,
    patch: Partial<DailyOperatingHours>
  ) => {
    setHoursDraft((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleSaveOperations = (e: React.FormEvent) => {
    e.preventDefault();
    setOperationsError(null);
    try {
      const updated = SettingsStorage.updateStoreOperations({
        averagePreparationTime: prepTimeDraft,
        openingHours: hoursDraft,
      });
      setSettings(updated);
      setIsEditingOperations(false);
      toast.success(
        'Store operations updated',
        `Preparation time (${updated.averagePreparationTime}) and weekly opening hours saved.`
      );
    } catch (err: any) {
      setOperationsError(err?.message || 'Unable to save store operations.');
    }
  };

  const handleConfirmManualClosure = (e: React.FormEvent) => {
    e.preventDefault();
    setClosureError(null);
    try {
      let reopenAtIso: string | undefined;
      if (closureModeDraft === 'until_time') {
        if (!closureReopenTimeStr || !closureReopenTimeStr.includes(':')) {
          throw new Error('Please choose a valid reopening time.');
        }
        const [hh, mm] = closureReopenTimeStr.split(':').map(Number);
        const now = new Date();
        const candidate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hh,
          mm,
          0,
          0
        );
        // If the chosen time is earlier than or equal to current time today, schedule it for tomorrow at that time
        if (candidate.getTime() <= now.getTime()) {
          candidate.setDate(candidate.getDate() + 1);
        }
        reopenAtIso = candidate.toISOString();
      }

      const { settings: updated, evaluation } =
        SettingsStorage.closeStoreManually(
          {
            mode: closureModeDraft,
            reopenAtIso,
          },
          new Date()
        );

      setSettings(updated);
      setClockNow(new Date());
      setIsClosureModalOpen(false);
      toast.info('Store temporarily closed', evaluation.explanation);
    } catch (err: any) {
      setClosureError(err?.message || 'Unable to close store manually.');
    }
  };

  const handleReopenStoreManually = () => {
    try {
      const now = new Date();
      const result = SettingsStorage.reopenStoreManually(now);
      setSettings(result.settings);
      setClockNow(now);
      if (result.reopenedWithinSchedule) {
        toast.success('Store reopened', result.message);
      } else {
        toast.info('Manual closure removed', result.message);
      }
    } catch (err: any) {
      toast.error(
        'Action failed',
        err?.message || 'Unable to reopen store.'
      );
    }
  };

  // ============================================================================
  // HANDLERS: 6. ACCOUNT PREFERENCES (NOTIFICATIONS & PASSWORD)
  // ============================================================================
  const handleSaveNotifications = () => {
    try {
      const updated = SettingsStorage.updateNotificationPreferences(notifDraft);
      setSettings(updated);
      setIsEditingNotifications(false);
      if (updated.notificationPreferences.importantAccountNotifications) {
        toast.success(
          'Notification preferences saved',
          'Your in-app dashboard notification settings have been updated.'
        );
      }
    } catch (err: any) {
      toast.error(
        'Failed to save preferences',
        err?.message || 'Please try again.'
      );
    }
  };

  const handleCancelNotifications = () => {
    setNotifDraft({ ...settings.notificationPreferences });
    setIsEditingNotifications(false);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    try {
      SettingsStorage.changeMerchantPassword(passwordDraft);
      setPasswordDraft({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsEditingPassword(false);
      toast.success(
        'Password updated successfully',
        'Your merchant account password has been changed.'
      );
    } catch (err: any) {
      setPasswordError(err?.message || 'Unable to update password.');
    }
  };

  // Availability Badge helper
  const renderAvailabilityBadge = () => {
    if (availability.status === 'open') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse" />
          Open
        </span>
      );
    }
    if (availability.status === 'temporarily_closed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#A16207] border border-[#FEF08A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A16207]" />
          Temporarily Closed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        Closed
      </span>
    );
  };

  // Compute OpenStreetMap embed bounding box from current or draft coordinates
  const activeCoords = isEditingLocation
    ? locationDraft
    : settings.pickupLocation;
  const osmDelta = 0.008;
  const osmBbox = `${(activeCoords.longitude - osmDelta).toFixed(6)},${(
    activeCoords.latitude - osmDelta
  ).toFixed(6)},${(activeCoords.longitude + osmDelta).toFixed(6)},${(
    activeCoords.latitude + osmDelta
  ).toFixed(6)}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    osmBbox
  )}&layer=mapnik&marker=${encodeURIComponent(
    `${activeCoords.latitude},${activeCoords.longitude}`
  )}`;

  return (
    <div className=" pb-12">
      {/* Main Settings Surface Container (matching Settings page reference.jpg) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Top Merchant Profile & Status Strip */}
        <div className="px-5 sm:px-8 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA] overflow-hidden flex items-center justify-center shrink-0">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {settings.businessName}
                </h2>
                {renderAvailabilityBadge()}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {availability.explanation} · Avg. Prep:{' '}
                {settings.averagePreparationTime}
              </p>
            </div>
          </div>

          {/* Top-Right Quick Action Icons (matching reference layout) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleSelectSection('store_operations')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${
                activeSection === 'store_operations'
                  ? 'bg-[#5E17EB] text-white border-[#5E17EB]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-[#F3EFFE] hover:text-[#5E17EB] hover:border-[#DDD0FA]'
              }`}
              title="Manage store availability and opening hours"
            >
              <Clock className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSelectSection('store_location')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border ${
                activeSection === 'store_location'
                  ? 'bg-[#5E17EB] text-white border-[#5E17EB]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-[#F3EFFE] hover:text-[#5E17EB] hover:border-[#DDD0FA]'
              }`}
              title="Runner pickup location"
            >
              <MapPin className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNavigateToSupport}
              className="w-9 h-9 rounded-full bg-slate-50 text-slate-600 border border-slate-200 hover:bg-[#F3EFFE] hover:text-[#5E17EB] hover:border-[#DDD0FA] flex items-center justify-center transition-colors"
              title="Contact Errandify Support"
            >
              <Headphones className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Two-Column Body: Left Settings Navigation Column (just after the sidebar) + Right Content Panel */}
        <div className="flex flex-col lg:flex-row min-h-[640px]">
          {/* Left Side Settings Navigation Column (Guided by Settings page reference.jpg) */}
          <div className="w-full lg:w-64 xl:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 p-5 sm:p-7 bg-white">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
              Settings
            </h1>

            {/* Desktop Vertical Grouped Navigation */}
            <nav
              aria-label="Settings sections"
              className="hidden lg:block space-y-6"
            >
              {SECTION_GROUPS.map((group) => (
                <div key={group.groupLabel} className="space-y-2.5">
                  <p className="text-xs font-medium text-slate-400">
                    {group.groupLabel}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSection(item.id)}
                          className={`w-full text-left py-1.5 text-sm transition-colors flex items-center justify-between group ${
                            isActive
                              ? 'text-[#5E17EB] font-bold'
                              : 'text-slate-800 font-semibold hover:text-[#5E17EB]'
                          }`}
                        >
                          <span
                            className={`inline-block pb-0.5 border-b-2 transition-all ${
                              isActive
                                ? 'border-[#5E17EB]'
                                : 'border-transparent group-hover:border-[#5E17EB]/30'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Mobile / Tablet Horizontal Scrollable Section Bar */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {SECTION_GROUPS.flatMap((g) => g.items).map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSection(item.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#5E17EB] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side Main Section Content Panel */}
          <div className="flex-1 p-5 sm:p-8 lg:p-10 min-w-0">
            {/* ====================================================================
                1. STORE INFORMATION
                ==================================================================== */}
            {activeSection === 'store_information' && (
              <div className="max-w-2xl space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Store Information
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Manage your business identity, customer-facing store
                      profile, business type, and category.
                    </p>
                  </div>
                  {!isEditingStoreInfo && (
                    <Button
                      type="button"
                      variant="purple-light"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={handleStartEditStoreInfo}
                    >
                      Edit Details
                    </Button>
                  )}
                </div>

                {storeInfoError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{storeInfoError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveStoreInfo} className="space-y-6">
                  {/* Store Logo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2">
                      Store Logo
                    </label>
                    <div className="sm:col-span-2 space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-[#F3EFFE] border border-[#DDD0FA] overflow-hidden flex items-center justify-center shrink-0">
                          {(
                            isEditingStoreInfo
                              ? storeInfoDraft.logoUrl
                              : settings.logoUrl
                          ) ? (
                            <img
                              src={
                                isEditingStoreInfo
                                  ? storeInfoDraft.logoUrl
                                  : settings.logoUrl
                              }
                              alt="Store logo preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-7 h-7 text-[#5E17EB]" />
                          )}
                        </div>

                        {isEditingStoreInfo ? (
                          <div className="space-y-1.5">
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/jpg"
                              onChange={handleLogoFileChange}
                              className="hidden"
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                leftIcon={<Upload className="w-3.5 h-3.5" />}
                                onClick={() => logoInputRef.current?.click()}
                              >
                                {storeInfoDraft.logoUrl
                                  ? 'Replace Logo'
                                  : 'Choose File'}
                              </Button>
                              {storeInfoDraft.logoUrl && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() =>
                                    setStoreInfoDraft((prev) => ({
                                      ...prev,
                                      logoUrl: undefined,
                                      logoFileName: undefined,
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Supported formats: PNG, JPG, WebP (Max{' '}
                              {MAX_LOGO_SIZE_MB}MB).
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-medium text-slate-800">
                              {settings.logoUrl
                                ? settings.logoFileName || 'Custom store logo'
                                : 'Default store emblem'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Displayed to customers browsing your store on
                              Errandify.
                            </p>
                          </div>
                        )}
                      </div>

                      {logoError && (
                        <p className="text-xs text-red-600 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{logoError}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Business Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label
                      htmlFor="settings-business-name"
                      className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                    >
                      Business Name
                    </label>
                    <div className="sm:col-span-2">
                      {isEditingStoreInfo ? (
                        <input
                          id="settings-business-name"
                          type="text"
                          value={storeInfoDraft.businessName}
                          onChange={(e) =>
                            setStoreInfoDraft((prev) => ({
                              ...prev,
                              businessName: e.target.value,
                            }))
                          }
                          placeholder="Enter your business or store name"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                        />
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                          {settings.businessName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Business Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label
                      htmlFor="settings-business-desc"
                      className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                    >
                      Business Description
                    </label>
                    <div className="sm:col-span-2 space-y-1.5">
                      {isEditingStoreInfo ? (
                        <>
                          <textarea
                            id="settings-business-desc"
                            rows={3}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            value={storeInfoDraft.businessDescription}
                            onChange={(e) =>
                              setStoreInfoDraft((prev) => ({
                                ...prev,
                                businessDescription: e.target.value,
                              }))
                            }
                            placeholder="Write a short description for customers browsing your store..."
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] resize-none"
                          />
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>
                              Shown on your storefront header in the customer
                              app.
                            </span>
                            <span className="font-semibold tabular-nums">
                              {DESCRIPTION_MAX_LENGTH -
                                storeInfoDraft.businessDescription.length}{' '}
                              characters remaining
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50/70 border border-slate-200/80 rounded-xl leading-relaxed">
                          {settings.businessDescription ||
                            'No store description provided.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Business Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2">
                      Business Type
                    </label>
                    <div className="sm:col-span-2 space-y-2">
                      {isEditingStoreInfo ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(
                            [
                              {
                                id: 'physical_store',
                                title: 'Physical Store',
                                desc: 'Walk-in retail shop or store location.',
                                icon: Building2,
                              },
                              {
                                id: 'online_store',
                                title: 'Online Store',
                                desc: 'Digital storefront with a runner pickup point.',
                                icon: Globe,
                              },
                            ] as const
                          ).map((opt) => {
                            const Icon = opt.icon;
                            const selected =
                              storeInfoDraft.businessType === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setStoreInfoDraft((prev) => ({
                                    ...prev,
                                    businessType: opt.id,
                                  }))
                                }
                                className={`text-left p-3.5 rounded-xl border transition-all ${
                                  selected
                                    ? 'bg-[#F8F6FE] border-[#5E17EB] ring-1 ring-[#5E17EB]/20'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-xs font-bold flex items-center gap-1.5 ${
                                      selected
                                        ? 'text-[#5E17EB]'
                                        : 'text-slate-900'
                                    }`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                    {opt.title}
                                  </span>
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                      selected
                                        ? 'border-[#5E17EB] bg-[#5E17EB]'
                                        : 'border-slate-300'
                                    }`}
                                  >
                                    {selected && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {opt.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl flex items-center gap-2">
                          {settings.businessType === 'physical_store' ? (
                            <>
                              <Building2 className="w-4 h-4 text-[#5E17EB]" />
                              <span>Physical Store</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-4 h-4 text-[#5E17EB]" />
                              <span>Online Store</span>
                            </>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Both Physical Stores and Online Stores retain a physical
                        pickup address so Errandify runners can collect prepared
                        orders.
                      </p>
                    </div>
                  </div>

                  {/* Business Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label
                      htmlFor="settings-business-category"
                      className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                    >
                      Business Category
                    </label>
                    <div className="sm:col-span-2">
                      {isEditingStoreInfo ? (
                        <select
                          id="settings-business-category"
                          value={storeInfoDraft.businessCategory}
                          onChange={(e) =>
                            setStoreInfoDraft((prev) => ({
                              ...prev,
                              businessCategory: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] cursor-pointer"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                          {settings.businessCategory}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save / Cancel Actions for Store Information */}
                  {isEditingStoreInfo && (
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditStoreInfo}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </form>

                {/* Read-Only CAC Registration Information */}
                <div className="pt-6 border-t border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-500" />
                        CAC Registration Information
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Registered corporate records submitted during merchant
                        onboarding. This information is read-only and cannot be
                        edited directly.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <Lock className="w-3 h-3" />
                      Read-Only
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 block">
                          CAC Registration Number
                        </span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block tabular-nums">
                          {settings.cacRegistration.registrationNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          Registered Entity Name
                        </span>
                        <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                          {settings.cacRegistration.registeredBusinessName}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Need to correct or update your CAC registration details?
                        Contact Errandify Support for verification assistance.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Headphones className="w-3.5 h-3.5" />}
                        onClick={onNavigateToSupport}
                      >
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================================
                2. CONTACT INFORMATION
                ==================================================================== */}
            {activeSection === 'contact_information' && (
              <div className="max-w-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Contact Information
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Manage the business phone number and email address used
                      for runner coordination and store communications.
                    </p>
                  </div>
                  {!isEditingContact && (
                    <Button
                      type="button"
                      variant="purple-light"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={handleStartEditContact}
                    >
                      Edit Contact Details
                    </Button>
                  )}
                </div>

                {contactError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{contactError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveContact} className="space-y-6">
                  {/* Business Phone Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label
                      htmlFor="settings-phone"
                      className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                    >
                      Business Phone Number
                    </label>
                    <div className="sm:col-span-2 space-y-1.5">
                      {isEditingContact ? (
                        <div className="flex items-center gap-2">
                          <select
                            aria-label="Country code"
                            value={contactDraft.countryCode}
                            onChange={(e) =>
                              setContactDraft((prev) => ({
                                ...prev,
                                countryCode: e.target.value,
                              }))
                            }
                            className="px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] shrink-0"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <input
                            id="settings-phone"
                            type="tel"
                            value={contactDraft.phoneNumber}
                            onChange={(e) =>
                              setContactDraft((prev) => ({
                                ...prev,
                                phoneNumber: e.target.value,
                              }))
                            }
                            placeholder="8034567890"
                            className="flex-1 px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                          />
                        </div>
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl tabular-nums">
                          {settings.countryCode} {settings.phoneNumber}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Used by Errandify dispatch runners if they need pickup
                        directions at your store.
                      </p>
                    </div>
                  </div>

                  {/* Business Email Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label
                      htmlFor="settings-email"
                      className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                    >
                      Business Email Address
                    </label>
                    <div className="sm:col-span-2 space-y-1.5">
                      {isEditingContact ? (
                        <input
                          id="settings-email"
                          type="email"
                          value={contactDraft.email}
                          onChange={(e) =>
                            setContactDraft((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="store@example.com"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                        />
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                          {settings.email}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500">
                        Official contact email associated with your merchant
                        store profile.
                      </p>
                    </div>
                  </div>

                  {isEditingContact && (
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditContact}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ====================================================================
                3. STORE LOCATION
                ==================================================================== */}
            {activeSection === 'store_location' && (
              <div className="max-w-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Store Location
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      This physical pickup address and map pin indicate where
                      Errandify runners collect prepared customer orders.
                    </p>
                  </div>
                  {!isEditingLocation && (
                    <Button
                      type="button"
                      variant="purple-light"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={handleStartEditLocation}
                    >
                      Edit Location
                    </Button>
                  )}
                </div>

                {/* Business Type Pickup Requirement Notice */}
                <div className="p-3.5 bg-[#F8F6FE] border border-[#DDD0FA] rounded-xl flex items-start gap-2.5 text-xs text-slate-700">
                  <MapPin className="w-4 h-4 text-[#5E17EB] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">
                      Runner Order Collection Point (
                      {settings.businessType === 'online_store'
                        ? 'Online Store'
                        : 'Physical Store'}
                      ):
                    </span>{' '}
                    Both Physical Stores and Online Stores must maintain an
                    accurate physical pickup address and map pin so Errandify
                    runners can collect orders for delivery.
                  </div>
                </div>

                {locationError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{locationError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveLocation} className="space-y-5">
                  {/* Verified Location Directory Suggestions (Synchronizes Address & Map Coordinates) */}
                  {isEditingLocation && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label
                          htmlFor="verified-location-select"
                          className="text-xs font-bold text-slate-800"
                        >
                          Quick-Select Verified Commercial Location (Syncs
                          Address & Map Pin)
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={isLocatingDevice}
                          leftIcon={<Navigation className="w-3.5 h-3.5" />}
                          onClick={handleUseBrowserGeolocation}
                        >
                          Use Device GPS
                        </Button>
                      </div>
                      <select
                        id="verified-location-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleApplyVerifiedLocation(e.target.value);
                          }
                        }}
                        className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#5E17EB] cursor-pointer"
                      >
                        <option value="">
                          Select a verified Lagos commercial area or enter
                          custom address below...
                        </option>
                        {VERIFIED_PICKUP_LOCATIONS.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.label} ({loc.latitude.toFixed(4)},{' '}
                            {loc.longitude.toFixed(4)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Street Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label
                      htmlFor="pickup-address-line"
                      className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                    >
                      Pickup Street Address
                    </label>
                    <div className="sm:col-span-2">
                      {isEditingLocation ? (
                        <input
                          id="pickup-address-line"
                          type="text"
                          value={locationDraft.addressLine}
                          onChange={(e) =>
                            setLocationDraft((prev) => ({
                              ...prev,
                              addressLine: e.target.value,
                            }))
                          }
                          placeholder="e.g. 14 Admiralty Way"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                        />
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                          {settings.pickupLocation.addressLine}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* City / Area & State */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5">
                      City / Area & State
                    </label>
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {isEditingLocation ? (
                        <>
                          <input
                            type="text"
                            aria-label="City or Area"
                            value={locationDraft.areaOrCity}
                            onChange={(e) =>
                              setLocationDraft((prev) => ({
                                ...prev,
                                areaOrCity: e.target.value,
                              }))
                            }
                            placeholder="Area / City (e.g. Lekki Phase 1)"
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                          />
                          <input
                            type="text"
                            aria-label="State"
                            value={locationDraft.state}
                            onChange={(e) =>
                              setLocationDraft((prev) => ({
                                ...prev,
                                state: e.target.value,
                              }))
                            }
                            placeholder="State (e.g. Lagos)"
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                          />
                        </>
                      ) : (
                        <div className="sm:col-span-2 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                          {settings.pickupLocation.areaOrCity},{' '}
                          {settings.pickupLocation.state}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Runner Landmark / Pickup Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                    <label
                      htmlFor="pickup-landmark"
                      className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                    >
                      Runner Pickup Note
                    </label>
                    <div className="sm:col-span-2">
                      {isEditingLocation ? (
                        <input
                          id="pickup-landmark"
                          type="text"
                          value={locationDraft.landmarkNote || ''}
                          onChange={(e) =>
                            setLocationDraft((prev) => ({
                              ...prev,
                              landmarkNote: e.target.value,
                            }))
                          }
                          placeholder="Landmark or dispatch counter directions for runners"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                        />
                      ) : (
                        <div className="px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                          {settings.pickupLocation.landmarkNote ||
                            'No additional landmark note specified.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Map Pin & Coordinates Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Pickup Map Pin & Coordinates
                        </h3>
                        <p className="text-xs text-slate-500">
                          Pinned coordinates guide Errandify runners directly to
                          your order collection point.
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#5E17EB] bg-[#F3EFFE] px-2.5 py-1 rounded-lg border border-[#DDD0FA] tabular-nums">
                        {activeCoords.latitude.toFixed(4)}° N,{' '}
                        {activeCoords.longitude.toFixed(4)}° E
                      </span>
                    </div>

                    {/* Interactive Pin Adjustment Controls when editing */}
                    {isEditingLocation && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="pin-lat-input"
                              className="text-xs font-semibold text-slate-600 block mb-1"
                            >
                              Pin Latitude
                            </label>
                            <input
                              id="pin-lat-input"
                              type="number"
                              step="0.0001"
                              value={locationDraft.latitude}
                              onChange={(e) =>
                                setLocationDraft((prev) => ({
                                  ...prev,
                                  latitude: Number(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 tabular-nums"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="pin-lng-input"
                              className="text-xs font-semibold text-slate-600 block mb-1"
                            >
                              Pin Longitude
                            </label>
                            <input
                              id="pin-lng-input"
                              type="number"
                              step="0.0001"
                              value={locationDraft.longitude}
                              onChange={(e) =>
                                setLocationDraft((prev) => ({
                                  ...prev,
                                  longitude: Number(e.target.value),
                                }))
                              }
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 tabular-nums"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          <span className="text-[11px] text-slate-500">
                            Fine-tune map pin position:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleNudgePin(0.0005, 0)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
                            >
                              Move North ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgePin(-0.0005, 0)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
                            >
                              Move South ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgePin(0, -0.0005)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
                            >
                              Move West ←
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNudgePin(0, 0.0005)}
                              className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700"
                            >
                              Move East →
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OpenStreetMap Live Marker View */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100">
                      <iframe
                        title="Merchant Pickup Location Map"
                        src={osmEmbedUrl}
                        className="w-full h-64 border-0"
                        loading="lazy"
                      />
                      <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span>
                          Pinned Pickup Address:{' '}
                          <strong className="text-slate-800">
                            {activeCoords.addressLine},{' '}
                            {activeCoords.areaOrCity}, {activeCoords.state}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          Live drag-pin reverse geocoding requires a configured
                          Google Maps / Places API key
                        </span>
                      </div>
                    </div>
                  </div>

                  {isEditingLocation && (
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditLocation}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* ====================================================================
                4. STORE OPERATIONS (AVAILABILITY, PREP TIME & OPENING HOURS)
                ==================================================================== */}
            {activeSection === 'store_operations' && (
              <div className="max-w-2xl space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Store Operations
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Manage your live store availability, average order
                      preparation time, and weekly opening hours.
                    </p>
                  </div>
                </div>

                {/* C. Store Availability Card (Prominent at the top of Store Operations) */}
                <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/70 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Current Store Availability
                        </span>
                        {renderAvailabilityBadge()}
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {availability.explanation}
                      </p>
                      <p className="text-xs text-slate-500">
                        {availability.canAcceptOrders
                          ? 'Your store is currently visible as Open to customers on Errandify and can accept new orders.'
                          : 'Customers cannot place orders while your store is Closed or Temporarily Closed.'}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {availability.isManualOverrideActive ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                          onClick={handleReopenStoreManually}
                        >
                          Reopen Store
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<PauseCircle className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setClosureError(null);
                            setIsClosureModalOpen(true);
                          }}
                        >
                          Close Store Temporarily
                        </Button>
                      )}
                    </div>
                  </div>

                  {availability.isManualOverrideActive &&
                    availability.nextScheduledOpenExplanation && (
                      <div className="pt-3 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-600">
                        <CalendarClock className="w-4 h-4 text-[#5E17EB] shrink-0" />
                        <span>
                          Manual reopening respects your normal weekly schedule
                          ({availability.nextScheduledOpenExplanation}).
                        </span>
                      </div>
                    )}
                </div>

                {/* A. Average Order Preparation Time & B. Opening Hours Form */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Preparation Time & Weekly Opening Hours
                      </h3>
                      <p className="text-xs text-slate-500">
                        Your store automatically opens and closes according to
                        this schedule unless manually closed.
                      </p>
                    </div>
                    {!isEditingOperations && (
                      <Button
                        type="button"
                        variant="purple-light"
                        size="sm"
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={handleStartEditOperations}
                      >
                        Edit Schedule & Prep Time
                      </Button>
                    )}
                  </div>

                  {operationsError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{operationsError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveOperations} className="space-y-6">
                    {/* A. Average Order Preparation Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 items-start">
                      <label
                        htmlFor="avg-prep-time"
                        className="text-xs sm:text-sm font-semibold text-slate-700 sm:pt-2.5"
                      >
                        Average Order Preparation Time
                      </label>
                      <div className="sm:col-span-2 space-y-1.5">
                        {isEditingOperations ? (
                          <select
                            id="avg-prep-time"
                            value={prepTimeDraft}
                            onChange={(e) =>
                              setPrepTimeDraft(
                                e.target.value as PreparationTimeOption
                              )
                            }
                            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] cursor-pointer"
                          >
                            {PREPARATION_TIME_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                            {settings.averagePreparationTime}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500">
                          Shown to customers browsing your store and used to
                          coordinate runner pickup timing.
                        </p>
                      </div>
                    </div>

                    {/* B. Weekly Opening Hours (Monday to Sunday) */}
                    <div className="space-y-3">
                      <label className="text-xs sm:text-sm font-semibold text-slate-700 block">
                        Weekly Opening Hours (Monday – Sunday)
                      </label>

                      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white">
                        {(isEditingOperations
                          ? hoursDraft
                          : settings.openingHours
                        ).map((dayEntry, idx) => {
                          const dayMeta = DAYS_OF_WEEK_ORDER.find(
                            (d) => d.day === dayEntry.day
                          );
                          return (
                            <div
                              key={dayEntry.day}
                              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/60"
                            >
                              <div className="flex items-center justify-between sm:w-44">
                                <span className="text-xs sm:text-sm font-semibold text-slate-900">
                                  {dayMeta?.label || dayEntry.label}
                                </span>
                                {isEditingOperations && (
                                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none sm:hidden">
                                    <input
                                      type="checkbox"
                                      checked={!dayEntry.isClosed}
                                      onChange={(e) =>
                                        handleUpdateDayDraft(idx, {
                                          isClosed: !e.target.checked,
                                        })
                                      }
                                      className="rounded text-[#5E17EB] focus:ring-[#5E17EB]"
                                    />
                                    <span className="text-xs font-medium text-slate-600">
                                      {dayEntry.isClosed ? 'Closed' : 'Open'}
                                    </span>
                                  </label>
                                )}
                              </div>

                              {isEditingOperations ? (
                                <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 flex-wrap">
                                  <label className="hidden sm:inline-flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!dayEntry.isClosed}
                                      onChange={(e) =>
                                        handleUpdateDayDraft(idx, {
                                          isClosed: !e.target.checked,
                                        })
                                      }
                                      className="w-4 h-4 rounded text-[#5E17EB] focus:ring-[#5E17EB]"
                                    />
                                    <span className="text-xs font-semibold text-slate-700 w-12">
                                      {dayEntry.isClosed ? 'Closed' : 'Open'}
                                    </span>
                                  </label>

                                  {dayEntry.isClosed ? (
                                    <span className="text-xs font-semibold text-slate-400 px-3 py-1.5 bg-slate-100 rounded-lg">
                                      Closed all day
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="time"
                                        aria-label={`${dayEntry.label} opening time`}
                                        value={dayEntry.openTime}
                                        onChange={(e) =>
                                          handleUpdateDayDraft(idx, {
                                            openTime: e.target.value,
                                          })
                                        }
                                        className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#5E17EB]"
                                      />
                                      <span className="text-xs text-slate-400">
                                        to
                                      </span>
                                      <input
                                        type="time"
                                        aria-label={`${dayEntry.label} closing time`}
                                        value={dayEntry.closeTime}
                                        onChange={(e) =>
                                          handleUpdateDayDraft(idx, {
                                            closeTime: e.target.value,
                                          })
                                        }
                                        className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#5E17EB]"
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs sm:text-right">
                                  {dayEntry.isClosed ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                      Closed
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-slate-800 tabular-nums">
                                      {formatTime12h(dayEntry.openTime)} –{' '}
                                      {formatTime12h(dayEntry.closeTime)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isEditingOperations && (
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEditOperations}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* ====================================================================
                5. BANK & PAYOUT DETAILS (READ-ONLY)
                ==================================================================== */}
            {activeSection === 'bank_payout_details' && (
              <div className="max-w-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                      Bank & Payout Details
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                      Your registered settlement bank account provided during
                      merchant onboarding.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start">
                    <Lock className="w-3.5 h-3.5" />
                    Read-Only
                  </span>
                </div>

                {/* Read-Only Registered Bank Account Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA] flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#5E17EB] block">
                        Automatic Settlement Destination
                      </span>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        Eligible funds from delivered orders are automatically
                        settled to this bank account once customer delivery
                        confirmation codes are verified.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/80">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Bank Name
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-1 block">
                        {settings.bankDetails.bankName}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block">
                        Account Name
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-1 block">
                        {settings.bankDetails.accountName}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 block">
                        Account Number
                      </span>
                      <span className="text-sm font-bold text-slate-900 mt-1 block tabular-nums">
                        {settings.bankDetails.maskedAccountNumber}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      For security reasons, registered payout bank accounts
                      cannot be edited or deleted directly in Settings. To
                      request a bank account change, please contact Errandify
                      Support.
                    </p>
                    <Button
                      type="button"
                      variant="purple-light"
                      size="sm"
                      leftIcon={<Headphones className="w-3.5 h-3.5" />}
                      onClick={onNavigateToSupport}
                    >
                      Contact Errandify Support
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ====================================================================
                6. ACCOUNT PREFERENCES (NOTIFICATION PREFERENCES & PASSWORD)
                ==================================================================== */}
            {activeSection === 'account_preferences' && (
              <div className="max-w-2xl space-y-8">
                {/* A. Notification Preferences */}
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        Notification Preferences
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                        Choose which in-app dashboard notifications you want to
                        receive while managing your store.
                      </p>
                    </div>
                    {!isEditingNotifications && (
                      <Button
                        type="button"
                        variant="purple-light"
                        size="sm"
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setNotifDraft({
                            ...settings.notificationPreferences,
                          });
                          setIsEditingNotifications(true);
                        }}
                      >
                        Edit Preferences
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {(
                      [
                        {
                          key: 'newOrderNotifications',
                          title: 'New Order Notifications',
                          desc: 'In-app alerts when a customer places a paid order and it enters your New Order queue.',
                        },
                        {
                          key: 'orderUpdates',
                          title: 'Order Updates',
                          desc: 'In-app notifications for order preparation transitions, stock deductions, and runner pickup confirmations.',
                        },
                        {
                          key: 'importantAccountNotifications',
                          title: 'Important Account & Settlement Notifications',
                          desc: 'In-app notifications for automatic settlement status updates, low-stock alerts, and account security prompts.',
                        },
                      ] as const
                    ).map((item) => {
                      const checked = isEditingNotifications
                        ? notifDraft[item.key]
                        : settings.notificationPreferences[item.key];
                      return (
                        <div
                          key={item.key}
                          className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Bell className="w-4 h-4 text-[#5E17EB]" />
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-slate-900">
                                {item.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={checked}
                            aria-label={item.title}
                            disabled={!isEditingNotifications}
                            onClick={() => {
                              if (!isEditingNotifications) return;
                              setNotifDraft((prev) => ({
                                ...prev,
                                [item.key]: !prev[item.key],
                              }));
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                              checked ? 'bg-[#5E17EB]' : 'bg-slate-300'
                            } ${
                              isEditingNotifications
                                ? 'cursor-pointer'
                                : 'opacity-75 cursor-default'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                                checked ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {isEditingNotifications && (
                    <div className="flex items-center justify-end gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelNotifications}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                        onClick={handleSaveNotifications}
                      >
                        Save Preferences
                      </Button>
                    </div>
                  )}
                </div>

                {/* B. Password & Security */}
                <div className="pt-6 border-t border-slate-200/80 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[#5E17EB]" />
                        Password & Security
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Update the password used to sign in to your merchant
                        account.
                      </p>
                    </div>
                    {!isEditingPassword && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPasswordError(null);
                          setPasswordDraft({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                          });
                          setIsEditingPassword(true);
                        }}
                      >
                        Change Password
                      </Button>
                    )}
                  </div>

                  {passwordError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {isEditingPassword ? (
                    <form
                      onSubmit={handleSavePassword}
                      className="p-5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-4"
                    >
                      {/* Current Password */}
                      <div>
                        <label
                          htmlFor="current-password"
                          className="text-xs font-semibold text-slate-700 block mb-1.5"
                        >
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            id="current-password"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordDraft.currentPassword}
                            onChange={(e) =>
                              setPasswordDraft((prev) => ({
                                ...prev,
                                currentPassword: e.target.value,
                              }))
                            }
                            placeholder="Enter your current password"
                            className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword((prev) => !prev)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Toggle current password visibility"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label
                          htmlFor="new-password"
                          className="text-xs font-semibold text-slate-700 block mb-1.5"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordDraft.newPassword}
                            onChange={(e) =>
                              setPasswordDraft((prev) => ({
                                ...prev,
                                newPassword: e.target.value,
                              }))
                            }
                            placeholder="At least 8 characters with letters and numbers"
                            className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label="Toggle new password visibility"
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label
                          htmlFor="confirm-new-password"
                          className="text-xs font-semibold text-slate-700 block mb-1.5"
                        >
                          Confirm New Password
                        </label>
                        <input
                          id="confirm-new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordDraft.confirmPassword}
                          onChange={(e) =>
                            setPasswordDraft((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          placeholder="Re-enter your new password"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#5E17EB]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingPassword(false);
                            setPasswordError(null);
                            setPasswordDraft({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: '',
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Update Password
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-slate-700 font-medium">
                          Password protection is active on your merchant
                          account.
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono">••••••••••••</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Temporary Closure Modal */}
      <Modal
        isOpen={isClosureModalOpen}
        onClose={() => setIsClosureModalOpen(false)}
        title="Close Store Temporarily"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmManualClosure} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Closing your store temporarily stops customers from placing new
            orders on Errandify. Choose when your store should become eligible
            to reopen:
          </p>

          {closureError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{closureError}</span>
            </div>
          )}

          <div className="space-y-2.5">
            {/* Option 1: Close until a selected time */}
            <label
              className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                closureModeDraft === 'until_time'
                  ? 'bg-[#F8F6FE] border-[#5E17EB] ring-1 ring-[#5E17EB]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="closure-mode"
                  checked={closureModeDraft === 'until_time'}
                  onChange={() => setClosureModeDraft('until_time')}
                  className="text-[#5E17EB] focus:ring-[#5E17EB]"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Close until a selected time
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-6">
                Your store will become eligible to reopen at the selected time
                (respecting your normal opening hours).
              </p>

              {closureModeDraft === 'until_time' && (
                <div className="mt-3 pl-6 flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    Reopen time:
                  </span>
                  <input
                    type="time"
                    value={closureReopenTimeStr}
                    onChange={(e) => setClosureReopenTimeStr(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#5E17EB]"
                  />
                </div>
              )}
            </label>

            {/* Option 2: Close until manually reopened */}
            <label
              className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                closureModeDraft === 'until_manual'
                  ? 'bg-[#F8F6FE] border-[#5E17EB] ring-1 ring-[#5E17EB]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="closure-mode"
                  checked={closureModeDraft === 'until_manual'}
                  onChange={() => setClosureModeDraft('until_manual')}
                  className="text-[#5E17EB] focus:ring-[#5E17EB]"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Close until manually reopened
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 pl-6">
                Your store will remain closed across scheduled opening times
                until you explicitly reopen it.
              </p>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsClosureModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Power className="w-3.5 h-3.5" />}
            >
              Confirm Temporary Closure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unsaved Changes Confirmation Modal when switching sections */}
      <UnsavedChangesModal
        isOpen={pendingSection !== null}
        onClose={() => setPendingSection(null)}
        onDiscard={() => {
          if (pendingSection) {
            discardCurrentSectionEdits();
            setActiveSection(pendingSection);
            setPendingSection(null);
          }
        }}
      />
    </div>
  );
};
