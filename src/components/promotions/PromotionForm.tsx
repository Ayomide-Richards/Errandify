import React, { useState } from 'react';
import type {
  AdWalletSystemConfig,
  SponsoredCampaign,
} from '../../types/promotion';
import { formatNaira } from '../../services/productStorage';
import {
  AdCampaignStatusBadge,
  CAMPAIGN_STATUS_LABELS,
} from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Info,
  Layers,
  MousePointerClick,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  XCircle,
} from 'lucide-react';

interface CampaignDetailsViewProps {
  campaign: SponsoredCampaign;
  onBack: () => void;
  onPause: (campaign: SponsoredCampaign) => void;
  onResume: (campaign: SponsoredCampaign) => void;
  onRequestCancel: (campaign: SponsoredCampaign) => void;
  onSimulateAdminReview?: (
    campaign: SponsoredCampaign,
    decision: 'approved' | 'rejected',
    rejectionReason?: string
  ) => void;
  onSimulateActivateScheduled?: (campaign: SponsoredCampaign) => void;
}

export const CampaignDetailsView: React.FC<CampaignDetailsViewProps> = ({
  campaign,
  onBack,
  onPause,
  onResume,
  onRequestCancel,
  onSimulateAdminReview,
  onSimulateActivateScheduled,
}) => {
  const [chartMode, setChartMode] = useState<'visibility' | 'conversions'>(
    'visibility'
  );
  const [rejectReasonInput, setRejectReasonInput] = useState(
    'Product image contains promotional text overlay not permitted by listing standards.'
  );
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
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

  const isSalesEarningsSource = campaign.paymentSource === 'sales_earnings';
  const paymentSourceLabel = isSalesEarningsSource
    ? 'Sales & Earnings (Available Earnings)'
    : 'Ad Wallet (Prepaid Balance)';

  const fundsStateLabels: Record<SponsoredCampaign['fundsState'], string> = {
    none: 'No funds held (Draft)',
    held: isSalesEarningsSource
      ? 'Reserved from Sales Earnings (Awaiting Review / Start)'
      : 'Held in Ad Wallet (Awaiting Review / Start)',
    charged: isSalesEarningsSource
      ? 'Charged from Sales Earnings'
      : 'Charged from Ad Wallet',
    released: isSalesEarningsSource
      ? 'Hold Released back to Available Sales Earnings'
      : 'Hold Released back to Ad Wallet',
    refunded: isSalesEarningsSource
      ? 'Refunded to Available Sales Earnings'
      : 'Refunded to Ad Wallet',
  };

  const perf = campaign.performance;
  const maxImpressions = Math.max(
    1,
    ...perf.dailyMetrics.map((d) => d.impressions)
  );
  const maxConversions = Math.max(
    1,
    ...perf.dailyMetrics.map((d) => Math.max(d.addToCarts, d.orders))
  );

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E17EB] hover:text-[#4E12C6] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to My Campaigns
          </button>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {campaign.productName}
            </h2>
            <AdCampaignStatusBadge status={campaign.status} />
            {campaign.isTestFixture && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Test Fixture
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Campaign ID: <span className="font-mono font-medium text-slate-700">{campaign.id}</span>
            {campaign.submittedAt && (
              <>
                {' '}
                · Submitted {formatDate(campaign.submittedAt)}
              </>
            )}
          </p>
        </div>

        {/* Permitted Merchant Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {campaign.permissions.canPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPause(campaign)}
              leftIcon={<PauseCircle className="w-4 h-4 text-amber-600" />}
            >
              Pause Campaign
            </Button>
          )}

          {campaign.status === 'paused' && (
            <Button
              variant="primary"
              size="sm"
              disabled={!campaign.permissions.canResume}
              onClick={() => onResume(campaign)}
              leftIcon={<PlayCircle className="w-4 h-4" />}
              title={campaign.permissions.resumeDisabledReason}
            >
              Resume Campaign
            </Button>
          )}

          {campaign.permissions.canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onRequestCancel(campaign)}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Cancel Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Review Outcome / Rejection Banner */}
      {campaign.status === 'rejected' && campaign.reviewOutcome && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-bold text-red-900">
              Campaign Did Not Pass Review — Held Funds Released
            </p>
            <p className="text-red-800 text-xs leading-relaxed">
              <span className="font-semibold">Rejection Reason:</span>{' '}
              {campaign.reviewOutcome.rejectionReason}
            </p>
            {campaign.reviewOutcome.adminNote && (
              <p className="text-red-700 text-xs leading-relaxed">
                <span className="font-semibold">Administrator Note:</span>{' '}
                {campaign.reviewOutcome.adminNote}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Paused Status Explanation */}
      {campaign.status === 'paused' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <PauseCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-bold">Campaign is Currently Paused</p>
            <p>
              {campaign.pauseReason ||
                'Your sponsored product is temporarily paused and not serving impressions.'}
            </p>
            {!campaign.permissions.canResume &&
              campaign.permissions.resumeDisabledReason && (
                <p className="font-semibold text-red-700">
                  {campaign.permissions.resumeDisabledReason}
                </p>
              )}
          </div>
        </div>
      )}

      {/* Sandbox / Backend Review Event Trigger for Pending Review or Scheduled campaigns */}
      {(campaign.status === 'pending_review' ||
        campaign.status === 'scheduled') &&
        (onSimulateAdminReview || onSimulateActivateScheduled) && (
          <div className="bg-[#F8F6FE] border border-[#DDD0FA] rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[#5E17EB] uppercase tracking-wider">
                  Backend Review & Scheduling Event Simulator (Test Helper)
                </p>
                <p className="text-xs text-slate-600">
                  Because the Errandify Admin Console is separate from the merchant dashboard, you can simulate the backend review webhook for this campaign here to verify wallet hold charging or release.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {campaign.status === 'pending_review' && onSimulateAdminReview && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        onSimulateAdminReview(campaign, 'approved')
                      }
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Simulate Admin Approval
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectPrompt((v) => !v)}
                      leftIcon={<XCircle className="w-3.5 h-3.5 text-red-600" />}
                    >
                      Simulate Rejection
                    </Button>
                  </>
                )}

                {campaign.status === 'scheduled' &&
                  onSimulateActivateScheduled && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSimulateActivateScheduled(campaign)}
                      leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
                    >
                      Simulate Scheduled Start (Go Live & Charge Hold)
                    </Button>
                  )}
              </div>
            </div>

            {showRejectPrompt &&
              campaign.status === 'pending_review' &&
              onSimulateAdminReview && (
                <div className="pt-2 border-t border-[#DDD0FA] flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="Enter admin rejection reason..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#5E17EB]"
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      onSimulateAdminReview(
                        campaign,
                        'rejected',
                        rejectReasonInput
                      );
                      setShowRejectPrompt(false);
                    }}
                  >
                    Confirm Rejection & Release Hold
                  </Button>
                </div>
              )}
          </div>
        )}

      {/* Campaign Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Promoted Product Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Promoted Product</h3>
          <div className="flex items-center gap-3.5">
            <img
              src={campaign.productImage}
              alt={campaign.productName}
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
            />
            <div className="min-w-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F3EFFE] text-[#5E17EB] mb-1">
                Sponsored
              </span>
              <p className="text-sm font-bold text-slate-900 truncate">
                {campaign.productName}
              </p>
              <p className="text-xs text-slate-500">
                {campaign.productCategory}
              </p>
              <p className="text-sm font-extrabold text-slate-900 mt-1">
                {formatNaira(campaign.productSellingPrice)}
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
            Shoppers see this approved product listing with a{' '}
            <span className="font-semibold text-slate-800">Sponsored</span>{' '}
            label. Your merchant identity, shop number, and market location remain hidden from shoppers.
          </div>
        </div>

        {/* Middle & Right: Campaign Details Metadata */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Campaign Summary & Financial Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <p className="text-slate-500">Placement</p>
              <p className="font-bold text-slate-900 text-sm mt-1">
                {campaign.placementName}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <p className="text-slate-500">Package & Duration</p>
              <p className="font-bold text-slate-900 text-sm mt-1">
                {campaign.durationDays} Days
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {campaign.packageName}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <p className="text-slate-500">Package Price</p>
              <p className="font-extrabold text-[#5E17EB] text-sm mt-1">
                {formatNaira(campaign.price)}
              </p>
              <p className="text-[11px] text-slate-500">Fixed-price package</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <p className="text-slate-500">Start Date</p>
              <p className="font-bold text-slate-900 mt-1">
                {formatDate(campaign.startDate)}
              </p>
              <p className="text-[11px] text-slate-500">
                {campaign.startMode === 'immediate'
                  ? 'Immediate upon approval'
                  : 'Scheduled future start'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <p className="text-slate-500">End Date</p>
              <p className="font-bold text-slate-900 mt-1">
                {formatDate(campaign.endDate)}
              </p>
              <p className="text-[11px] text-slate-500">
                {campaign.durationDays}-day run
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <p className="text-slate-500">Payment Source</p>
              <p className="font-bold text-slate-900 mt-1">
                {paymentSourceLabel}
              </p>
              <p className="text-[11px] text-slate-500">
                {fundsStateLabels[campaign.fundsState]}
              </p>
            </div>
          </div>

          {campaign.reviewOutcome && campaign.status !== 'rejected' && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Reviewed and approved on{' '}
                {formatDate(campaign.reviewOutcome.reviewedAt)}.{' '}
                {campaign.reviewOutcome.adminNote}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Performance Section (Section 5) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Campaign Performance
            </h3>
            <p className="text-xs text-slate-500">
              Daily aggregated performance metrics from ErrandMarket shopper activity.
            </p>
          </div>
          {perf.lastAggregatedAt && (
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full self-start sm:self-auto">
              Daily aggregation · Last updated {formatDate(perf.lastAggregatedAt)}
            </span>
          )}
        </div>

        {/* 7 Documented Headline Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Eye className="w-3.5 h-3.5 text-[#5E17EB]" />
              Impressions
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1.5">
              {perf.hasData ? perf.impressions.toLocaleString() : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Times shown to shoppers
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <MousePointerClick className="w-3.5 h-3.5 text-[#5E17EB]" />
              Taps
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1.5">
              {perf.hasData ? perf.taps.toLocaleString() : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Product opens from ad
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-[#5E17EB]" />
              Tap Rate
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1.5">
              {perf.hasData ? `${perf.tapRate}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Taps ÷ Impressions
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <ShoppingCart className="w-3.5 h-3.5 text-[#5E17EB]" />
              Add-to-Carts
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1.5">
              {perf.hasData ? perf.addToCarts.toLocaleString() : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Cart additions after tap
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <ShoppingBag className="w-3.5 h-3.5 text-[#5E17EB]" />
              Orders
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1.5">
              {perf.hasData ? perf.orders.toLocaleString() : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Attributed paid orders
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Order Value
            </div>
            <p className="text-lg font-extrabold text-emerald-700 mt-1.5">
              {perf.hasData ? formatNaira(perf.orderValue) : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Sales from ad orders
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              Cost per Order
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1.5">
              {perf.hasData && perf.costPerOrder !== null
                ? formatNaira(perf.costPerOrder)
                : '—'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Package Cost ÷ Orders
            </p>
          </div>
        </div>

        {/* Daily Aggregated Chart or Honest Unavailable State */}
        {!perf.hasData || perf.dailyMetrics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              Daily Performance Data Not Yet Available
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {perf.unavailableReason ||
                'Performance metrics are aggregated once per day after a campaign is approved and begins serving impressions.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daily Activity Breakdown ({perf.dailyMetrics.length} Days Recorded)
              </p>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMode('visibility')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    chartMode === 'visibility'
                      ? 'bg-white text-[#5E17EB] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Impressions & Taps
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('conversions')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    chartMode === 'conversions'
                      ? 'bg-white text-[#5E17EB] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Add-to-Carts & Orders
                </button>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/40">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end min-h-[160px] pt-4">
                {perf.dailyMetrics.map((day) => {
                  const primaryVal =
                    chartMode === 'visibility'
                      ? day.impressions
                      : day.addToCarts;
                  const secondaryVal =
                    chartMode === 'visibility' ? day.taps : day.orders;
                  const maxRef =
                    chartMode === 'visibility'
                      ? maxImpressions
                      : maxConversions;

                  const primaryHeight = Math.max(
                    12,
                    Math.round((primaryVal / maxRef) * 110)
                  );
                  const secondaryHeight = Math.max(
                    8,
                    Math.round((secondaryVal / maxRef) * 110)
                  );

                  return (
                    <div
                      key={day.date}
                      className="flex flex-col items-center gap-2 bg-white border border-slate-100 rounded-xl p-3 shadow-2xs"
                    >
                      <div className="flex items-end gap-2 h-28">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-[#5E17EB] mb-1">
                            {primaryVal}
                          </span>
                          <div
                            style={{ height: `${primaryHeight}px` }}
                            className="w-5 rounded-t-md bg-[#5E17EB]"
                            title={
                              chartMode === 'visibility'
                                ? `${day.impressions} Impressions`
                                : `${day.addToCarts} Add-to-Carts`
                            }
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-emerald-700 mb-1">
                            {secondaryVal}
                          </span>
                          <div
                            style={{ height: `${secondaryHeight}px` }}
                            className="w-5 rounded-t-md bg-emerald-500"
                            title={
                              chartMode === 'visibility'
                                ? `${day.taps} Taps`
                                : `${day.orders} Orders`
                            }
                          />
                        </div>
                      </div>
                      <div className="text-center border-t border-slate-100 w-full pt-1.5">
                        <p className="text-xs font-bold text-slate-800">
                          {day.label}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatNaira(day.orderValue)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 pt-3 mt-3 border-t border-slate-200/60 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#5E17EB]" />
                  {chartMode === 'visibility' ? 'Impressions' : 'Add-to-Carts'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  {chartMode === 'visibility' ? 'Taps' : 'Orders'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CancelCampaignModalProps {
  campaign: SponsoredCampaign | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (campaign: SponsoredCampaign) => void;
}

export const CancelCampaignModal: React.FC<CancelCampaignModalProps> = ({
  campaign,
  isOpen,
  onClose,
  onConfirmCancel,
}) => {
  if (!campaign) return null;

  const isPreStartHold =
    (campaign.status === 'pending_review' ||
      campaign.status === 'scheduled') &&
    campaign.fundsState === 'held';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md" title="Cancel Advertising Campaign?">
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <img
            src={campaign.productImage}
            alt={campaign.productName}
            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {campaign.productName}
            </p>
            <p className="text-xs text-slate-500">
              {campaign.placementName} · {campaign.packageName} (
              {formatNaira(campaign.price)})
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Current Status:{' '}
              <span className="font-semibold text-slate-800">
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </span>
            </p>
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
            isPreStartHold
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <p className="font-bold">
            {isPreStartHold
              ? 'Pre-Start Cancellation — Full Hold Release'
              : 'Cancellation & Refund Policy Notice'}
          </p>
          <p>{campaign.permissions.cancellationPolicyNote}</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Keep Campaign
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirmCancel(campaign)}
            leftIcon={<XCircle className="w-4 h-4" />}
          >
            Confirm Cancellation
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface AdWalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletConfig: AdWalletSystemConfig;
  merchantEmail: string;
  onCompleteVerifiedTopUp: (params: {
    amount: number;
    reference: string;
    paymentOutcome: 'success' | 'failed';
  }) => void;
}

export const AdWalletTopUpModal: React.FC<AdWalletTopUpModalProps> = ({
  isOpen,
  onClose,
  walletConfig,
  merchantEmail,
  onCompleteVerifiedTopUp,
}) => {
  const [step, setStep] = useState<'enter' | 'review' | 'paystack'>('enter');
  const [amountInput, setAmountInput] = useState<string>('15000');
  const [reference, setReference] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amountInput.replace(/,/g, ''));

  const handleResetAndClose = () => {
    setStep('enter');
    setError(null);
    onClose();
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid top-up amount greater than ₦0.');
      return;
    }

    if (
      walletConfig.minimumTopUpAmount !== null &&
      numericAmount < walletConfig.minimumTopUpAmount
    ) {
      setError(
        `Minimum top-up amount configured by the system is ${formatNaira(
          walletConfig.minimumTopUpAmount
        )}.`
      );
      return;
    }

    const generatedRef = `PSK-AD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setReference(generatedRef);
    setStep('review');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      maxWidth="md"
      title="Top Up Ad Wallet via Paystack"
    >
      {step === 'enter' && (
        <form onSubmit={handleProceedToReview} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#F8F6FE] border border-[#DDD0FA] text-xs text-slate-700 leading-relaxed">
            Your Ad Wallet is a prepaid balance for funding ErrandMarket advertising packages independently of your Sales &amp; Earnings. You can also pay for promotions directly from your eligible available sales earnings when creating a campaign.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Top-Up Amount (₦)
            </label>
            <input
              type="number"
              min={walletConfig.minimumTopUpAmount ?? 1}
              step="any"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setError(null);
              }}
              placeholder="Enter amount in Naira"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {walletConfig.minimumTopUpAmount !== null
                ? `Configured minimum top-up: ${formatNaira(walletConfig.minimumTopUpAmount)}`
                : 'No minimum top-up amount is currently enforced by platform configuration.'}
            </p>
          </div>

          {/* Quick suggested amounts */}
          <div className="flex flex-wrap gap-2">
            {[5000, 10000, 25000, 50000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmountInput(String(preset));
                  setError(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  numericAmount === preset
                    ? 'bg-[#F3EFFE] text-[#5E17EB] border-[#5E17EB]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {formatNaira(preset)}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetAndClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Review Top-Up Amount
            </Button>
          </div>
        </form>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Top-Up Amount</span>
              <span className="text-base font-extrabold text-slate-900">
                {formatNaira(numericAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payment Gateway</span>
              <span className="font-semibold text-slate-800">
                Paystack (Card / Bank Transfer / USSD)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Merchant Email</span>
              <span className="font-medium text-slate-700">
                {merchantEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payment Reference</span>
              <span className="font-mono font-medium text-slate-700">
                {reference}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Server-Side Verification Policy</p>
              <p>
                Your Ad Wallet balance is updated only after Paystack payment verification is confirmed by the backend server/webhook. Client-side redirects alone do not credit the wallet.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('enter')}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => setStep('paystack')}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Continue to Paystack
            </Button>
          </div>
        </div>
      )}

      {step === 'paystack' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#5E17EB]" />
                <span className="text-xs font-bold text-slate-900">
                  Paystack Checkout & Backend Verification
                </span>
              </div>
              <span className="text-xs font-extrabold text-[#5E17EB]">
                {formatNaira(numericAmount)}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {walletConfig.paystackConfigured
                ? 'Complete your payment in Paystack. The backend webhook will verify reference '
                : 'Live Paystack public key / backend webhook endpoint is not configured in this local environment. Use the backend verification controls below to test a server-verified Paystack success or payment failure for reference '}
              <span className="font-mono font-semibold text-slate-800">
                {reference}
              </span>
              .
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                onCompleteVerifiedTopUp({
                  amount: numericAmount,
                  reference,
                  paymentOutcome: 'success',
                });
                handleResetAndClose();
              }}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm Server-Verified Payment
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onCompleteVerifiedTopUp({
                  amount: numericAmount,
                  reference,
                  paymentOutcome: 'failed',
                });
                handleResetAndClose();
              }}
              leftIcon={<XCircle className="w-4 h-4 text-red-600" />}
            >
              Simulate Payment Failure
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
