import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Product } from '../../types/product';
import type {
  AdPlacementId,
  BannerDestinationType,
  HomepageBannerRequest,
  SponsoredCampaign,
} from '../../types/promotion';
import { CATEGORIES } from '../../data/categories';
import {
  formatNaira,
  getProductPriceDisplay,
  getProductStock,
} from '../../services/productStorage';
import {
  AdsBackendService,
  evaluateProductAdEligibility,
} from '../../services/promotionStorage';
import { SettingsStorage } from '../../services/settingsStorage';
import {
  AdCampaignStatusBadge,
  BannerRequestStatusBadge,
} from '../common/Badge';
import { Button } from '../common/Button';
import {
  AdWalletTopUpModal,
  CampaignDetailsView,
  CancelCampaignModal,
} from './PromotionForm';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Image as ImageIcon,
  Info,
  Layers,
  Lock,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Wallet,
  XCircle,
} from 'lucide-react';

interface PromotionsPanelProps {
  products: Product[];
  onToast?: (
    type: 'success' | 'info' | 'error',
    title: string,
    message?: string
  ) => void;
}

type PromotionsTabView = 'my_campaigns' | 'banner_requests';

type PromoteFlowStage = 'closed' | 'steps_1_to_4' | 'review_and_submit' | 'submitted';

type CampaignFilterGroup =
  | 'all'
  | 'active'
  | 'scheduled'
  | 'pending'
  | 'completed'
  | 'paused'
  | 'rejected'
  | 'cancelled'
  | 'suspended';

export const PromotionsPanel: React.FC<PromotionsPanelProps> = ({
  products,
  onToast,
}) => {
  // Main section tabs inside Promotions (Ad Wallet section removed; Promote steps open only when clicking "Promote a Product")
  const [activeView, setActiveView] =
    useState<PromotionsTabView>('my_campaigns');

  // Controls whether the "Promote a Product" wizard is open and which stage is active
  const [promoteStage, setPromoteStage] = useState<PromoteFlowStage>('closed');

  // Selected campaign for Campaign Details view
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null
  );

  // Synced backend state
  const [campaigns, setCampaigns] = useState<SponsoredCampaign[]>(() =>
    AdsBackendService.getCampaigns(undefined, products)
  );
  const [wallet, setWallet] = useState(() =>
    AdsBackendService.getWalletAccount()
  );
  const [bannerRequests, setBannerRequests] = useState<HomepageBannerRequest[]>(
    () => AdsBackendService.getBannerRequests()
  );
  const [walletConfig] = useState(() =>
    AdsBackendService.getWalletSystemConfig()
  );

  const placements = useMemo(() => AdsBackendService.getPlacements(), []);
  const curatedCollections = useMemo(
    () => AdsBackendService.getCuratedCollections(),
    []
  );
  const bannerUploadConfig = useMemo(
    () => AdsBackendService.getBannerUploadConfig(),
    []
  );

  const refreshAdsState = () => {
    setCampaigns(AdsBackendService.getCampaigns(undefined, products));
    setWallet(AdsBackendService.getWalletAccount());
    setBannerRequests(AdsBackendService.getBannerRequests());
  };

  useEffect(() => {
    refreshAdsState();
  }, [products]);

  useEffect(() => {
    const handleSync = () => refreshAdsState();
    window.addEventListener('errandify:ads-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('errandify:ads-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [products]);

  // --- Promote Flow State (Steps 1 to 4 -> Review & Submit) ---
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    const firstEligible = products.find(
      (p) => evaluateProductAdEligibility(p).isEligible
    );
    return firstEligible?.id || '';
  });
  const [selectedPlacement, setSelectedPlacement] =
    useState<AdPlacementId>('search_results');
  const availablePackagesForPlacement = useMemo(
    () => AdsBackendService.getAdvertisingPackages(selectedPlacement),
    [selectedPlacement]
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [startMode, setStartMode] = useState<'immediate' | 'future'>(
    'immediate'
  );
  const tomorrowDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const [futureStartDate, setFutureStartDate] =
    useState<string>(tomorrowDateStr);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [submittedConfirmation, setSubmittedConfirmation] =
    useState<SponsoredCampaign | null>(null);

  // Ensure a valid package is selected when placement changes
  useEffect(() => {
    if (availablePackagesForPlacement.length > 0) {
      const stillValid = availablePackagesForPlacement.some(
        (p) => p.id === selectedPackageId
      );
      if (!stillValid) {
        setSelectedPackageId(availablePackagesForPlacement[0].id);
      }
    } else {
      setSelectedPackageId('');
    }
  }, [availablePackagesForPlacement, selectedPackageId]);

  // --- My Campaigns Filter & Modals State ---
  const [campaignFilter, setCampaignFilter] =
    useState<CampaignFilterGroup>('all');
  const [cancelTargetCampaign, setCancelTargetCampaign] =
    useState<SponsoredCampaign | null>(null);

  // --- Ad Wallet Top-Up Modal State ---
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // --- Banner Request Form State ---
  const [bannerGoal, setBannerGoal] = useState('');
  const [bannerStartDate, setBannerStartDate] =
    useState<string>(tomorrowDateStr);
  const [bannerEndDate, setBannerEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [bannerDestType, setBannerDestType] =
    useState<BannerDestinationType>('product');
  const [bannerDestId, setBannerDestId] = useState<string>(() => {
    const firstEligible = products.find(
      (p) => evaluateProductAdEligibility(p).isEligible
    );
    return firstEligible?.id || '';
  });
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [bannerImageFileName, setBannerImageFileName] = useState<string>('');
  const [bannerImageMimeType, setBannerImageMimeType] = useState<string>('');
  const [bannerFormError, setBannerFormError] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  // Update default destination ID when destination type changes
  useEffect(() => {
    if (bannerDestType === 'product') {
      const firstEligible = products.find(
        (p) => evaluateProductAdEligibility(p).isEligible
      );
      setBannerDestId(firstEligible?.id || '');
    } else if (bannerDestType === 'category') {
      setBannerDestId(CATEGORIES[0]?.name || '');
    } else if (bannerDestType === 'curated_collection') {
      setBannerDestId(curatedCollections[0]?.id || '');
    }
  }, [bannerDestType, products, curatedCollections]);

  const notifyIfAllowed = (
    type: 'success' | 'info' | 'error',
    title: string,
    message?: string
  ) => {
    if (
      SettingsStorage.isNotificationEnabled('importantAccountNotifications')
    ) {
      onToast?.(type, title, message);
    }
  };

  const handleOpenPromoteFlow = () => {
    setSelectedCampaignId(null);
    setSubmittedConfirmation(null);
    setPromoteError(null);
    setPromoteStage('steps_1_to_4');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Derived Selections for Promote Wizard ---
  const productsWithEligibility = useMemo(() => {
    return products
      .map((product) => ({
        product,
        eligibility: evaluateProductAdEligibility(product),
        priceDisplay: getProductPriceDisplay(product),
        stock: getProductStock(product),
      }))
      .filter(({ product }) => {
        if (!productSearch.trim()) return true;
        const q = productSearch.toLowerCase();
        return (
          product.name.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q)
        );
      });
  }, [products, productSearch]);

  const selectedProductEntry = useMemo(
    () =>
      productsWithEligibility.find(
        (item) => item.product.id === selectedProductId
      ) ||
      products
        .map((p) => ({
          product: p,
          eligibility: evaluateProductAdEligibility(p),
          priceDisplay: getProductPriceDisplay(p),
          stock: getProductStock(p),
        }))
        .find((item) => item.product.id === selectedProductId),
    [productsWithEligibility, products, selectedProductId]
  );

  const selectedPlacementInfo = useMemo(
    () => placements.find((pl) => pl.id === selectedPlacement) || placements[0],
    [placements, selectedPlacement]
  );

  const selectedPackage = useMemo(
    () =>
      availablePackagesForPlacement.find((p) => p.id === selectedPackageId) ||
      null,
    [availablePackagesForPlacement, selectedPackageId]
  );

  const effectiveStartDateStr =
    startMode === 'immediate'
      ? new Date().toISOString().split('T')[0]
      : futureStartDate;

  const effectiveEndDateStr = useMemo(() => {
    if (!selectedPackage) return effectiveStartDateStr;
    const d = new Date(effectiveStartDateStr);
    if (isNaN(d.getTime())) return effectiveStartDateStr;
    d.setDate(d.getDate() + selectedPackage.durationDays);
    return d.toISOString().split('T')[0];
  }, [effectiveStartDateStr, selectedPackage]);

  const hasSufficientWalletFunds = selectedPackage
    ? wallet.availableBalance >= selectedPackage.price
    : true;

  const walletShortfall = selectedPackage
    ? Math.max(0, selectedPackage.price - wallet.availableBalance)
    : 0;

  const handleContinueToReview = () => {
    setPromoteError(null);
    if (!selectedProductEntry || !selectedProductEntry.eligibility.isEligible) {
      setPromoteError(
        'Please select an eligible product in Step 1 before continuing.'
      );
      return;
    }
    if (!selectedPackage) {
      setPromoteError(
        'Please select an available advertising package in Step 3 before continuing.'
      );
      return;
    }
    if (startMode === 'future' && (!futureStartDate || futureStartDate < tomorrowDateStr)) {
      setPromoteError(
        'Please select a valid future start date in Step 4 before continuing.'
      );
      return;
    }
    setPromoteStage('review_and_submit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Handlers: Promote ---
  const handleSaveDraft = () => {
    setPromoteError(null);
    if (!selectedProductEntry || !selectedProductEntry.eligibility.isEligible) {
      setPromoteError('Please select an eligible product first.');
      return;
    }
    if (!selectedPackage) {
      setPromoteError('Please select an advertising package.');
      return;
    }
    try {
      const draft = AdsBackendService.saveDraftCampaign({
        product: selectedProductEntry.product,
        placement: selectedPlacement,
        packageId: selectedPackage.id,
        startMode,
        startDate: effectiveStartDateStr,
      });
      refreshAdsState();
      notifyIfAllowed(
        'info',
        'Campaign draft saved',
        `"${draft.productName}" (${draft.placementName}) saved as Draft. No funds have been held.`
      );
      setPromoteStage('closed');
      setActiveView('my_campaigns');
    } catch (err: any) {
      setPromoteError(err?.message || 'Could not save draft campaign.');
    }
  };

  const handleSubmitCampaign = () => {
    setPromoteError(null);
    if (!selectedProductEntry || !selectedProductEntry.eligibility.isEligible) {
      setPromoteError(
        'Please select a product that meets all advertising eligibility requirements.'
      );
      return;
    }
    if (!selectedPackage) {
      setPromoteError('Please select an available advertising package.');
      return;
    }

    try {
      const idempotencyKey = `idem-${selectedProductEntry.product.id}-${selectedPlacement}-${selectedPackage.id}-${effectiveStartDateStr}-${Date.now()}`;
      const result = AdsBackendService.submitSponsoredCampaign({
        product: selectedProductEntry.product,
        placement: selectedPlacement,
        packageId: selectedPackage.id,
        startMode,
        startDate: effectiveStartDateStr,
        idempotencyKey,
      });
      refreshAdsState();
      setSubmittedConfirmation(result.campaign);
      setPromoteStage('submitted');
      notifyIfAllowed(
        'success',
        'Campaign submitted for review',
        `${formatNaira(result.campaign.price)} has been placed on hold in your Ad Wallet while "${result.campaign.productName}" awaits review.`
      );
    } catch (err: any) {
      setPromoteError(
        err?.message || 'Failed to submit campaign. Please check your inputs.'
      );
    }
  };

  // --- Handlers: Campaign Lifecycle Controls ---
  const handlePauseCampaign = (campaign: SponsoredCampaign) => {
    try {
      const updated = AdsBackendService.pauseCampaign(campaign.id);
      refreshAdsState();
      notifyIfAllowed(
        'info',
        'Campaign paused',
        `"${updated.productName}" is now Paused.`
      );
    } catch (err: any) {
      onToast?.('error', 'Could not pause campaign', err?.message);
    }
  };

  const handleResumeCampaign = (campaign: SponsoredCampaign) => {
    try {
      const updated = AdsBackendService.resumeCampaign(campaign.id, products);
      refreshAdsState();
      notifyIfAllowed(
        'success',
        'Campaign resumed',
        `"${updated.productName}" is now Live again.`
      );
    } catch (err: any) {
      onToast?.('error', 'Could not resume campaign', err?.message);
    }
  };

  const handleConfirmCancelCampaign = (campaign: SponsoredCampaign) => {
    try {
      const res = AdsBackendService.cancelCampaign(campaign.id);
      refreshAdsState();
      setCancelTargetCampaign(null);
      if (res.releaseTransaction) {
        notifyIfAllowed(
          'info',
          'Campaign cancelled & hold released',
          `${formatNaira(res.releaseTransaction.amount)} has been released back to your Ad Wallet Available Balance.`
        );
      } else {
        notifyIfAllowed(
          'info',
          'Campaign cancelled',
          `"${res.campaign.productName}" has been cancelled.`
        );
      }
    } catch (err: any) {
      onToast?.('error', 'Cancellation failed', err?.message);
    }
  };

  const handleSimulateAdminReview = (
    campaign: SponsoredCampaign,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ) => {
    try {
      const res = AdsBackendService.processAdminCampaignReview({
        campaignId: campaign.id,
        decision,
        rejectionReason,
      });
      refreshAdsState();
      if (decision === 'rejected') {
        notifyIfAllowed(
          'error',
          'Campaign rejected — held funds released',
          `Reason: ${res.campaign.reviewOutcome?.rejectionReason}. ${formatNaira(campaign.price)} released to your Ad Wallet.`
        );
      } else if (res.campaign.status === 'scheduled') {
        notifyIfAllowed(
          'success',
          'Campaign approved & scheduled',
          `"${res.campaign.productName}" is Approved / Scheduled to start on ${res.campaign.startDate}.`
        );
      } else {
        notifyIfAllowed(
          'success',
          'Campaign approved & now Live!',
          `"${res.campaign.productName}" is now Live and ${formatNaira(campaign.price)} has been charged from your held balance.`
        );
      }
    } catch (err: any) {
      onToast?.('error', 'Review action failed', err?.message);
    }
  };

  const handleSimulateActivateScheduled = (campaign: SponsoredCampaign) => {
    try {
      const res = AdsBackendService.activateScheduledCampaign(campaign.id);
      refreshAdsState();
      notifyIfAllowed(
        'success',
        'Campaign is now Live',
        `"${res.campaign.productName}" has started serving ads and ${formatNaira(res.campaign.price)} was charged.`
      );
    } catch (err: any) {
      onToast?.('error', 'Activation failed', err?.message);
    }
  };

  // --- Handlers: Wallet Top-Up ---
  const handleCompleteVerifiedTopUp = (params: {
    amount: number;
    reference: string;
    paymentOutcome: 'success' | 'failed';
  }) => {
    try {
      const res = AdsBackendService.verifyAndRecordPaystackTopUp({
        amount: params.amount,
        reference: params.reference,
        serverVerified: true,
        paymentOutcome: params.paymentOutcome,
      });
      refreshAdsState();
      if (params.paymentOutcome === 'success') {
        notifyIfAllowed(
          'success',
          'Ad Wallet top-up confirmed',
          `${formatNaira(params.amount)} has been added to your Available Balance (Ref: ${res.transaction.reference}).`
        );
      } else {
        notifyIfAllowed(
          'error',
          'Ad Wallet top-up failed',
          `Paystack payment (${params.reference}) was not completed. Your wallet balance was not changed.`
        );
      }
    } catch (err: any) {
      onToast?.('error', 'Top-up verification error', err?.message);
    }
  };

  // --- Handlers: Banner Request Upload & Submission ---
  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!bannerUploadConfig.allowedMimeTypes.includes(file.type)) {
      setBannerFormError(
        'Unsupported image format. Please upload a PNG, JPG, or WEBP creative.'
      );
      return;
    }

    if (
      bannerUploadConfig.maxFileSizeBytes !== null &&
      file.size > bannerUploadConfig.maxFileSizeBytes
    ) {
      setBannerFormError('File exceeds the configured maximum file size.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerImageUrl(reader.result);
        setBannerImageFileName(file.name);
        setBannerImageMimeType(file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitBannerRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setBannerFormError(null);

    try {
      const created = AdsBackendService.submitBannerRequest({
        advertisingGoal: bannerGoal,
        preferredStartDate: bannerStartDate,
        preferredEndDate: bannerEndDate,
        destinationType: bannerDestType,
        destinationId: bannerDestId,
        bannerImageUrl,
        bannerImageFileName,
        bannerImageMimeType,
        productsCatalog: products,
      });
      refreshAdsState();
      setBannerGoal('');
      setBannerImageUrl('');
      setBannerImageFileName('');
      setBannerImageMimeType('');
      notifyIfAllowed(
        'success',
        'Banner request submitted',
        `Your homepage banner request (${created.id}) has been sent to the Errandify team.`
      );
    } catch (err: any) {
      setBannerFormError(
        err?.message || 'Could not submit banner request. Please review all fields.'
      );
    }
  };

  // --- Filtered Campaigns ---
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (campaignFilter === 'all') return true;
      if (campaignFilter === 'active') return c.status === 'live';
      if (campaignFilter === 'scheduled') return c.status === 'scheduled';
      if (campaignFilter === 'pending')
        return c.status === 'pending_review' || c.status === 'draft';
      if (campaignFilter === 'completed') return c.status === 'completed';
      if (campaignFilter === 'paused') return c.status === 'paused';
      if (campaignFilter === 'rejected') return c.status === 'rejected';
      if (campaignFilter === 'cancelled') return c.status === 'cancelled';
      if (campaignFilter === 'suspended') return c.status === 'suspended';
      return true;
    });
  }, [campaigns, campaignFilter]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  // Summary counts for the Promotions Landing Overview
  const liveCount = campaigns.filter((c) => c.status === 'live').length;
  const scheduledCount = campaigns.filter(
    (c) => c.status === 'scheduled'
  ).length;
  const pendingReviewCount = campaigns.filter(
    (c) => c.status === 'pending_review'
  ).length;

  const formatDateShort = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header: Top Up Ad Wallet (1st button) & Promote a Product (2nd button) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Promotions & Advertising
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Promote eligible products across ErrandMarket, monitor campaign performance, and request homepage banners.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTopUpModalOpen(true)}
            leftIcon={<Wallet className="w-4 h-4 text-[#5E17EB]" />}
          >
            Top Up Ad Wallet
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenPromoteFlow}
            leftIcon={<Megaphone className="w-4 h-4" />}
          >
            Promote a Product
          </Button>
        </div>
      </div>

      {/* Promotions Landing Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ad Wallet Summary */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Ad Wallet Available Balance
            </p>
            <Wallet className="w-4 h-4 text-[#5E17EB]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {formatNaira(wallet.availableBalance)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Held: {formatNaira(wallet.heldBalance)} · Promo:{' '}
            {formatNaira(wallet.promotionalBalance)}
          </p>
        </div>

        {/* Card 2: Current & Upcoming Campaigns */}
        <div
          onClick={() => {
            setPromoteStage('closed');
            setSelectedCampaignId(null);
            setCampaignFilter('all');
            setActiveView('my_campaigns');
          }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-[#5E17EB]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 group-hover:text-[#5E17EB]">
              Live & Scheduled Campaigns
            </p>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {liveCount + scheduledCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {liveCount} Live · {scheduledCount} Scheduled
          </p>
        </div>

        {/* Card 3: Pending Review */}
        <div
          onClick={() => {
            setPromoteStage('closed');
            setSelectedCampaignId(null);
            setCampaignFilter('pending');
            setActiveView('my_campaigns');
          }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-[#5E17EB]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 group-hover:text-[#5E17EB]">
              Awaiting Review
            </p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {pendingReviewCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Funds held until review completes
          </p>
        </div>

        {/* Card 4: Homepage Banner Requests */}
        <div
          onClick={() => {
            setPromoteStage('closed');
            setSelectedCampaignId(null);
            setActiveView('banner_requests');
          }}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-[#5E17EB]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 group-hover:text-[#5E17EB]">
              Banner Requests
            </p>
            <ImageIcon className="w-4 h-4 text-[#5E17EB]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {bannerRequests.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Managed with Errandify Ads Team
          </p>
        </div>
      </div>

      {/* Why Promote Products on ErrandMarket? Section (Available to Spend frame removed) */}
      <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#5E17EB] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Why Promote Products on ErrandMarket?
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Sponsored product placements help shoppers discover your eligible products in{' '}
            <span className="font-semibold text-slate-900">Search Results</span>,{' '}
            <span className="font-semibold text-slate-900">Category Pages</span>, and{' '}
            <span className="font-semibold text-slate-900">Home Featured</span> sections. You pay a transparent fixed package price with no bidding or cost-per-click charges. Funds are held safely during review and charged only when your campaign goes Live.
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PROMOTE A PRODUCT FLOW (Only appears when clicking Promote a Product) */}
      {/* ===================================================================== */}
      {promoteStage !== 'closed' ? (
        <div className="space-y-6">
          {/* Flow Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (promoteStage === 'review_and_submit') {
                    setPromoteStage('steps_1_to_4');
                  } else {
                    setPromoteStage('closed');
                    setSubmittedConfirmation(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E17EB] hover:text-[#4E12C6] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {promoteStage === 'review_and_submit'
                  ? 'Back to Steps 1–4'
                  : 'Back to Promotions'}
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                {promoteStage === 'steps_1_to_4' &&
                  'Promote a Product — Complete Steps 1 to 4'}
                {promoteStage === 'review_and_submit' &&
                  'Promote a Product — Review & Submit Campaign'}
                {promoteStage === 'submitted' &&
                  'Promote a Product — Submission Confirmed'}
              </span>
            </div>

            {promoteStage !== 'submitted' && (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={`px-2.5 py-1 rounded-lg ${
                    promoteStage === 'steps_1_to_4'
                      ? 'bg-[#5E17EB] text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  1. Campaign Setup (Steps 1–4)
                </span>
                <span className="text-slate-400">→</span>
                <span
                  className={`px-2.5 py-1 rounded-lg ${
                    promoteStage === 'review_and_submit'
                      ? 'bg-[#5E17EB] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  2. Review & Submit
                </span>
              </div>
            )}
          </div>

          {/* STAGE 1: STEPS 1 TO 4 */}
          {promoteStage === 'steps_1_to_4' && (
            <div className="space-y-6">
              {/* STEP 1: Select a Product */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E17EB]">
                    Step 1 of 4
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Select an Eligible Product
                  </h2>
                  <p className="text-xs text-slate-500">
                    Only active, approved, in-stock products with compliant images and descriptions can be promoted.
                  </p>
                </div>

                {/* Product Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search your store products by name or category..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:bg-white focus:border-[#5E17EB]"
                  />
                </div>

                {/* Product Selection List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200/80 rounded-xl">
                  {productsWithEligibility.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No products match your search query.
                    </div>
                  ) : (
                    productsWithEligibility.map(
                      ({ product, eligibility, priceDisplay, stock }) => {
                        const isSelected = product.id === selectedProductId;
                        return (
                          <div
                            key={product.id}
                            onClick={() => {
                              if (eligibility.isEligible) {
                                setSelectedProductId(product.id);
                                setPromoteError(null);
                              }
                            }}
                            className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                              !eligibility.isEligible
                                ? 'bg-slate-50/70 opacity-75 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-[#F5F2FE] cursor-pointer'
                                  : 'hover:bg-slate-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <img
                                src={
                                  product.images?.[0]?.url ||
                                  'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=200&q=60'
                                }
                                alt={product.name}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                              />
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {product.name}
                                  </p>
                                  {eligibility.isEligible ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Eligible ({stock} in stock)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                      Ineligible
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">
                                  {product.category} ·{' '}
                                  <span className="font-semibold text-slate-800">
                                    {priceDisplay.display}
                                  </span>
                                </p>
                                {!eligibility.isEligible && (
                                  <p className="text-[11px] text-red-600 font-medium pt-0.5">
                                    {eligibility.reasons.join(' ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 self-center">
                              {eligibility.isEligible ? (
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'bg-[#5E17EB] border-[#5E17EB] text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  )}
                                </div>
                              ) : (
                                <Lock className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              </div>

              {/* STEP 2: Select an Advertising Placement */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E17EB]">
                    Step 2 of 4
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Select an Advertising Placement
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose where your sponsored product should appear on ErrandMarket.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {placements.map((pl) => {
                    const isSelected = pl.id === selectedPlacement;
                    return (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlacement(pl.id);
                          setPromoteError(null);
                        }}
                        className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#F5F2FE] border-[#5E17EB] ring-2 ring-[#5E17EB]/15'
                            : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {pl.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3EFFE] text-[#5E17EB]">
                              {pl.badgeLabel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {pl.whereItAppears}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {pl.visibilityBenefit}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                          {pl.placementRulesNote}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: Select an Advertising Package */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E17EB]">
                    Step 3 of 4
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Select an Advertising Package ({selectedPlacementInfo.name})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Fixed-price packages retrieved from system configuration. No bidding or cost-per-click charges.
                  </p>
                </div>

                {availablePackagesForPlacement.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      No Advertising Packages Currently Available for{' '}
                      {selectedPlacementInfo.name}
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      The Errandify team has not enabled active packages for this placement yet. Please select another placement or check back later.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {availablePackagesForPlacement.map((pkg) => {
                      const isSelected = pkg.id === selectedPackageId;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            setPromoteError(null);
                          }}
                          className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#F5F2FE] border-[#5E17EB] ring-2 ring-[#5E17EB]/15'
                              : 'bg-white border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3EFFE] text-[#5E17EB]">
                                {pkg.durationDays} Days
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-[#5E17EB]" />
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-900 pt-1">
                              {pkg.name}
                            </p>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {pkg.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60">
                            <p className="text-lg font-extrabold text-slate-900">
                              {formatNaira(pkg.price)}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Fixed package price · {selectedPlacementInfo.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 4: Select a Campaign Start Date */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E17EB]">
                    Step 4 of 4
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Select Campaign Start Date
                  </h2>
                  <p className="text-xs text-slate-500">
                    Campaigns do not serve ads until approved by the Errandify team.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setStartMode('immediate')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      startMode === 'immediate'
                        ? 'bg-[#F5F2FE] border-[#5E17EB] ring-2 ring-[#5E17EB]/15'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        Today (Immediate After Approval)
                      </span>
                      <Calendar className="w-4 h-4 text-[#5E17EB]" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Starts serving immediately once the Errandify team approves your campaign.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStartMode('future')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      startMode === 'future'
                        ? 'bg-[#F5F2FE] border-[#5E17EB] ring-2 ring-[#5E17EB]/15'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        Select a Future Start Date
                      </span>
                      <Clock className="w-4 h-4 text-[#5E17EB]" />
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Once approved, your campaign becomes Scheduled and goes Live on your selected date.
                    </p>
                  </button>
                </div>

                {startMode === 'future' && (
                  <div className="pt-2 max-w-xs">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferred Future Start Date
                    </label>
                    <input
                      type="date"
                      min={tomorrowDateStr}
                      value={futureStartDate}
                      onChange={(e) => setFutureStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                    />
                  </div>
                )}

                {promoteError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                    {promoteError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPromoteStage('closed')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={
                      !selectedProductEntry?.eligibility.isEligible ||
                      !selectedPackage
                    }
                    onClick={handleContinueToReview}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue to Review & Submit
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: REVIEW & SUBMIT (Appears only after completing Steps 1–4) */}
          {promoteStage === 'review_and_submit' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6 max-w-2xl mx-auto">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E17EB]">
                  Step 5 — Review & Confirm
                </span>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Review & Submit Campaign
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review your selected product, placement, package, and start date before submitting for review.
                </p>
              </div>

              {/* Selected Product Preview */}
              {selectedProductEntry && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
                  <img
                    src={selectedProductEntry.product.images?.[0]?.url}
                    alt={selectedProductEntry.product.name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {selectedProductEntry.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedProductEntry.product.category}
                    </p>
                    <p className="text-xs font-extrabold text-[#5E17EB] mt-0.5">
                      {selectedProductEntry.priceDisplay.display}
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Key-Value Details */}
              <div className="space-y-3 text-xs sm:text-sm border-t border-b border-slate-100 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Placement</span>
                  <span className="font-bold text-slate-900">
                    {selectedPlacementInfo.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Package</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPackage ? selectedPackage.name : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-bold text-slate-900">
                    {selectedPackage
                      ? `${selectedPackage.durationDays} Days`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Start Date</span>
                  <span className="font-bold text-slate-900">
                    {startMode === 'immediate'
                      ? `Today (${formatDateShort(effectiveStartDateStr)})`
                      : formatDateShort(effectiveStartDateStr)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estimated End Date</span>
                  <span className="font-medium text-slate-700">
                    {formatDateShort(effectiveEndDateStr)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-700">
                    Package Price (Hold on Submit)
                  </span>
                  <span className="text-base font-extrabold text-[#5E17EB]">
                    {selectedPackage
                      ? formatNaira(selectedPackage.price)
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Insufficient Wallet Balance Warning */}
              {!hasSufficientWalletFunds && selectedPackage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2 text-xs text-red-900">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        Insufficient Ad Wallet Available Balance
                      </p>
                      <p className="text-red-800 mt-0.5 leading-relaxed">
                        This package requires{' '}
                        <span className="font-bold">
                          {formatNaira(selectedPackage.price)}
                        </span>
                        , but your Available Balance is{' '}
                        <span className="font-bold">
                          {formatNaira(wallet.availableBalance)}
                        </span>{' '}
                        (shortfall: {formatNaira(walletShortfall)}). Held funds cannot be used for new purchases.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsTopUpModalOpen(true)}
                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                  >
                    Top Up Ad Wallet Now
                  </Button>
                </div>
              )}

              {/* Advertising Rules & Content Requirements Notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-600 leading-relaxed">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#5E17EB]" />
                  Advertising Rules & Content Requirements
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Uses your approved product listing and image (no misleading claims, competitor-bashing, or prohibited products).
                  </li>
                  <li>
                    Only the product is promoted. Merchant identity, shop number, WhatsApp/phone numbers, social handles, and market location remain hidden.
                  </li>
                  <li>
                    Placement is labelled <span className="font-semibold">Sponsored</span> and rotated fairly; it does not guarantee search rank, views, or sales.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">Hold & Charge:</span> Package price is placed on hold while <span className="font-semibold">Pending Review</span>, released if rejected or cancelled before start, and charged once <span className="font-semibold">Live</span>.
                  </li>
                </ul>
              </div>

              {promoteError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {promoteError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPromoteStage('steps_1_to_4')}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to Steps 1–4
                </Button>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !selectedProductEntry?.eligibility.isEligible ||
                      !selectedPackage
                    }
                    onClick={handleSaveDraft}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={
                      !selectedProductEntry?.eligibility.isEligible ||
                      !selectedPackage ||
                      !hasSufficientWalletFunds
                    }
                    onClick={handleSubmitCampaign}
                  >
                    Confirm & Submit for Review
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: SUBMISSION CONFIRMATION */}
          {promoteStage === 'submitted' && submittedConfirmation && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Campaign Submitted for Review
                    </h2>
                    <AdCampaignStatusBadge
                      status={submittedConfirmation.status}
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Your campaign for{' '}
                    <span className="font-bold text-slate-900">
                      {submittedConfirmation.productName}
                    </span>{' '}
                    in{' '}
                    <span className="font-bold text-slate-900">
                      {submittedConfirmation.placementName}
                    </span>{' '}
                    has been submitted.{' '}
                    <span className="font-bold text-slate-900">
                      {formatNaira(submittedConfirmation.price)}
                    </span>{' '}
                    has been placed on <span className="font-semibold">Hold</span> in your Ad Wallet (not charged as a completed expense yet).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-slate-500">Campaign ID</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {submittedConfirmation.id}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Package & Duration</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {submittedConfirmation.packageName} (
                    {submittedConfirmation.durationDays} days)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Scheduled Dates</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {formatDateShort(submittedConfirmation.startDate)} →{' '}
                    {formatDateShort(submittedConfirmation.endDate)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Wallet Hold Status</span>
                  <p className="font-bold text-amber-700 mt-0.5">
                    {formatNaira(submittedConfirmation.price)} Held
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    const id = submittedConfirmation.id;
                    setSubmittedConfirmation(null);
                    setPromoteStage('closed');
                    setActiveView('my_campaigns');
                    setSelectedCampaignId(id);
                  }}
                >
                  View Campaign Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedConfirmation(null);
                    setPromoteStage('closed');
                    setActiveView('my_campaigns');
                  }}
                >
                  Go to My Campaigns
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedConfirmation(null);
                    setPromoteStage('steps_1_to_4');
                  }}
                >
                  Promote Another Product
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Section Navigation Tabs (My Campaigns & Banner Requests) */}
          <div className="border-b border-slate-200 flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {[
              {
                id: 'my_campaigns' as PromotionsTabView,
                label: `My Campaigns (${campaigns.length})`,
                icon: Layers,
              },
              {
                id: 'banner_requests' as PromotionsTabView,
                label: `Banner Requests (${bannerRequests.length})`,
                icon: ImageIcon,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedCampaignId(null);
                    setActiveView(tab.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#5E17EB] text-[#5E17EB] bg-[#F5F2FE]/50 rounded-t-xl'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-xl'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ===================================================================== */}
          {/* VIEW: MY CAMPAIGNS & CAMPAIGN DETAILS                                 */}
          {/* ===================================================================== */}
          {activeView === 'my_campaigns' && (
            <div className="space-y-5">
              {selectedCampaign ? (
                <CampaignDetailsView
                  campaign={selectedCampaign}
                  onBack={() => setSelectedCampaignId(null)}
                  onPause={handlePauseCampaign}
                  onResume={handleResumeCampaign}
                  onRequestCancel={(c) => setCancelTargetCampaign(c)}
                  onSimulateAdminReview={handleSimulateAdminReview}
                  onSimulateActivateScheduled={handleSimulateActivateScheduled}
                />
              ) : (
                <>
                  {/* Campaign Group Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'all' as CampaignFilterGroup, label: 'All Campaigns' },
                        { id: 'active' as CampaignFilterGroup, label: 'Active (Live)' },
                        { id: 'scheduled' as CampaignFilterGroup, label: 'Scheduled' },
                        { id: 'pending' as CampaignFilterGroup, label: 'Pending' },
                        { id: 'completed' as CampaignFilterGroup, label: 'Completed' },
                        { id: 'paused' as CampaignFilterGroup, label: 'Paused' },
                        { id: 'rejected' as CampaignFilterGroup, label: 'Rejected' },
                        { id: 'cancelled' as CampaignFilterGroup, label: 'Cancelled' },
                        { id: 'suspended' as CampaignFilterGroup, label: 'Suspended' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setCampaignFilter(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            campaignFilter === f.id
                              ? 'bg-[#5E17EB] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenPromoteFlow}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      New Campaign
                    </Button>
                  </div>

                  {/* Campaigns Table */}
                  {filteredCampaigns.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mx-auto">
                        <Megaphone className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        No Campaigns Found
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {campaignFilter === 'all'
                          ? 'You have not created any sponsored product campaigns yet. Click "Promote a Product" to get started.'
                          : 'No campaigns match the selected status filter.'}
                      </p>
                      {campaignFilter === 'all' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleOpenPromoteFlow}
                        >
                          Promote a Product
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead className="bg-[#5E17EB] text-white text-xs font-semibold">
                            <tr>
                              <th className="py-3.5 px-4">Product</th>
                              <th className="py-3.5 px-4">Placement & Package</th>
                              <th className="py-3.5 px-4">Dates & Duration</th>
                              <th className="py-3.5 px-4">Cost</th>
                              <th className="py-3.5 px-4">Performance</th>
                              <th className="py-3.5 px-4 text-center">Status</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredCampaigns.map((camp) => (
                              <tr
                                key={camp.id}
                                onClick={() => setSelectedCampaignId(camp.id)}
                                className="hover:bg-[#F8F9FE] transition-colors cursor-pointer"
                              >
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={camp.productImage}
                                      alt={camp.productName}
                                      className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[180px]">
                                        {camp.productName}
                                      </p>
                                      <p className="text-[11px] text-slate-500">
                                        {camp.id}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <p className="font-semibold text-slate-900 text-xs">
                                    {camp.placementName}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {camp.packageName}
                                  </p>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <p className="text-xs font-medium text-slate-800">
                                    {formatDateShort(camp.startDate)} →{' '}
                                    {formatDateShort(camp.endDate)}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {camp.durationDays} days
                                  </p>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <p className="font-bold text-slate-900 text-xs">
                                    {formatNaira(camp.price)}
                                  </p>
                                  <p className="text-[11px] text-slate-500 capitalize">
                                    {camp.fundsState === 'held'
                                      ? 'Funds Held'
                                      : camp.fundsState === 'charged'
                                        ? 'Charged'
                                        : camp.fundsState === 'released'
                                          ? 'Hold Released'
                                          : camp.fundsState}
                                  </p>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  {camp.performance.hasData ? (
                                    <div className="text-xs">
                                      <p className="font-semibold text-slate-800">
                                        {camp.performance.impressions.toLocaleString()}{' '}
                                        views · {camp.performance.taps} taps
                                      </p>
                                      <p className="text-[11px] text-emerald-700 font-medium">
                                        {camp.performance.orders} orders (
                                        {formatNaira(camp.performance.orderValue)})
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      No daily metrics yet
                                    </span>
                                  )}
                                </td>

                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                  <AdCampaignStatusBadge status={camp.status} />
                                </td>

                                <td
                                  className="py-4 px-4 text-right whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCampaignId(camp.id)}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#5E17EB] bg-[#F5F2FE] hover:bg-[#EDE5FD] transition-colors inline-flex items-center gap-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Details
                                    </button>

                                    {camp.permissions.canPause && (
                                      <button
                                        type="button"
                                        onClick={() => handlePauseCampaign(camp)}
                                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                                        title="Pause campaign"
                                      >
                                        <PauseCircle className="w-4 h-4" />
                                      </button>
                                    )}

                                    {camp.status === 'paused' &&
                                      camp.permissions.canResume && (
                                        <button
                                          type="button"
                                          onClick={() => handleResumeCampaign(camp)}
                                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                                          title="Resume campaign"
                                        >
                                          <PlayCircle className="w-4 h-4" />
                                        </button>
                                      )}

                                    {camp.permissions.canCancel && (
                                      <button
                                        type="button"
                                        onClick={() => setCancelTargetCampaign(camp)}
                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                        title="Cancel campaign"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW: BANNER REQUESTS                                                 */}
          {/* ===================================================================== */}
          {activeView === 'banner_requests' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 cols: Banner Request Submission Form */}
              <form
                onSubmit={handleSubmitBannerRequest}
                className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
              >
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E17EB]">
                    Phase 1 Managed Request Flow
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Request Homepage Banner Advertising
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Submit a request for homepage banner placement. The Errandify team handles creative alignment, scheduling, and banner publishing.
                  </p>
                </div>

                {/* 1. Advertising Goal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Advertising Goal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={bannerGoal}
                    onChange={(e) => setBannerGoal(e.target.value)}
                    placeholder="Describe what you want this homepage banner to achieve (e.g. promote seasonal bulk rice arrival)..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Do not include phone numbers, WhatsApp contacts, social handles, or physical shop addresses.
                  </p>
                </div>

                {/* 2. Preferred Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferred Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={tomorrowDateStr}
                      value={bannerStartDate}
                      onChange={(e) => setBannerStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Preferred End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={bannerStartDate || tomorrowDateStr}
                      value={bannerEndDate}
                      onChange={(e) => setBannerEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                    />
                  </div>
                </div>

                {/* 3. Link Destination Type (Only Product, Category, Curated Collection) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Link Destination Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'product' as const, label: 'Product' },
                      { id: 'category' as const, label: 'Category' },
                      {
                        id: 'curated_collection' as const,
                        label: 'Curated Collection',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setBannerDestType(opt.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                          bannerDestType === opt.id
                            ? 'bg-[#F5F2FE] text-[#5E17EB] border-[#5E17EB]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Banners cannot link to merchant storefronts, profiles, shop numbers, or external contact links.
                  </p>
                </div>

                {/* Target Destination Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Destination <span className="text-red-500">*</span>
                  </label>
                  {bannerDestType === 'product' && (
                    <select
                      value={bannerDestId}
                      onChange={(e) => setBannerDestId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                    >
                      {products
                        .filter((p) => evaluateProductAdEligibility(p).isEligible)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.category})
                          </option>
                        ))}
                    </select>
                  )}

                  {bannerDestType === 'category' && (
                    <select
                      value={bannerDestId}
                      onChange={(e) => setBannerDestId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {bannerDestType === 'curated_collection' && (
                    <select
                      value={bannerDestId}
                      onChange={(e) => setBannerDestId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#5E17EB]"
                    >
                      {curatedCollections.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name} — {col.description}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 4. Banner Image Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Proposed Banner Image / Creative{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleBannerFileChange}
                    className="hidden"
                  />

                  {bannerImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-36">
                        <img
                          src={bannerImageUrl}
                          alt="Proposed banner preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate max-w-[200px]">
                          {bannerImageFileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef.current?.click()}
                          className="font-semibold text-[#5E17EB] hover:underline"
                        >
                          Replace Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="w-full py-6 px-4 border-2 border-dashed border-slate-200 hover:border-[#5E17EB] rounded-2xl bg-slate-50/60 text-center space-y-1.5 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-[#5E17EB] mx-auto" />
                      <p className="text-xs font-bold text-slate-800">
                        Click to Upload Proposed Banner Image
                      </p>
                      <p className="text-[11px] text-slate-500">
                        PNG, JPG, or WEBP ·{' '}
                        {bannerUploadConfig.dimensionSpecificationNote}
                      </p>
                    </button>
                  )}
                </div>

                {bannerFormError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                    {bannerFormError}
                  </div>
                )}

                <Button type="submit" variant="primary" className="w-full">
                  Submit Banner Request
                </Button>
              </form>

              {/* Right 7 cols: Banner Request Tracking */}
              <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Your Submitted Banner Requests
                  </h2>
                  <p className="text-xs text-slate-500">
                    Track the status of your homepage banner requests and feedback from the Errandify team.
                  </p>
                </div>

                {bannerRequests.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <ImageIcon className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-800">
                      No Banner Requests Submitted Yet
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Use the form on the left to submit a homepage banner request to the Errandify team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bannerRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {req.id}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">
                              Requested {formatDateShort(req.createdAt)}
                            </span>
                          </div>
                          <BannerRequestStatusBadge status={req.status} />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                          <img
                            src={req.bannerImageUrl}
                            alt={req.bannerImageFileName}
                            className="w-full sm:w-40 h-24 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                          />
                          <div className="space-y-1.5 text-xs flex-1">
                            <p className="font-bold text-slate-900">
                              Goal:{' '}
                              <span className="font-normal text-slate-700">
                                {req.advertisingGoal}
                              </span>
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-800">
                                Preferred Dates:
                              </span>{' '}
                              {formatDateShort(req.preferredStartDate)} →{' '}
                              {formatDateShort(req.preferredEndDate)}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-800">
                                Link Destination:
                              </span>{' '}
                              {req.destinationLabel}
                            </p>
                          </div>
                        </div>

                        {req.teamFeedback && (
                          <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2">
                            <Info className="w-4 h-4 text-[#5E17EB] shrink-0 mt-0.5" />
                            <span>{req.teamFeedback}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CancelCampaignModal
        campaign={cancelTargetCampaign}
        isOpen={!!cancelTargetCampaign}
        onClose={() => setCancelTargetCampaign(null)}
        onConfirmCancel={handleConfirmCancelCampaign}
      />

      <AdWalletTopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        walletConfig={walletConfig}
        merchantEmail={SettingsStorage.getSettings().email}
        onCompleteVerifiedTopUp={handleCompleteVerifiedTopUp}
      />
    </div>
  );
};
