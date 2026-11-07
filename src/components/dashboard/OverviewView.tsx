import React from 'react';
import type { Product } from '../../types/product';
import { calculateSummaryMetrics } from '../../services/productStorage';
import { Button } from '../common/Button';
import { Tag, ArrowRight, ClipboardList, TrendingUp } from 'lucide-react';

interface OverviewViewProps {
  products: Product[];
  onNavigateToProducts: () => void;
  onAddProduct: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  products,
  onNavigateToProducts,
  onAddProduct,
}) => {
  const metrics = calculateSummaryMetrics(products);
  const activeProductsCount = products.filter((p) => !p.isArchived).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Good morning, XYZ limited 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Open
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Here's what's happening with your store today.
          </p>
        </div>
      </div>

      {/* Approval Alert Banner (from New.png) */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <p className="text-sm text-amber-900 font-medium">
            You need to add at least 5 products for approval. You have{' '}
            <strong className="font-bold">{activeProductsCount} products</strong> listed.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onAddProduct}
          className="bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 text-white shrink-0 self-start sm:self-auto"
        >
          Add products
        </Button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs sm:text-sm font-medium text-slate-500">Today's sales</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">₦0</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <p className="text-xs sm:text-sm font-medium text-slate-500">Pending orders</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">0</p>
        </div>

        <div
          onClick={onNavigateToProducts}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs cursor-pointer hover:border-[#5E17EB]/40 transition-colors"
        >
          <p className="text-xs sm:text-sm font-medium text-slate-500">Listed products</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#5E17EB] mt-2">
            {metrics.totalProducts}
          </p>
        </div>

        <div
          onClick={onNavigateToProducts}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs cursor-pointer hover:border-[#5E17EB]/40 transition-colors"
        >
          <p className="text-xs sm:text-sm font-medium text-slate-500">Low stock products</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2">
            {metrics.outOfStockProducts}
          </p>
        </div>
      </div>

      {/* Sales Trend Graph Placeholder (Matching New.png) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#5E17EB]" />
            Sales trend
          </h3>
          <select className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>This month</option>
          </select>
        </div>

        {/* Minimal weekly chart visualization */}
        <div className="h-48 border border-slate-100 rounded-xl flex items-end justify-between px-6 pb-4 pt-8 bg-slate-50/50">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="w-8 sm:w-12 bg-[#5E17EB]/15 rounded-t-md hover:bg-[#5E17EB]/30 transition-colors"
                style={{ height: `${[15, 30, 20, 45, 60, 35, 20][idx]}%` }}
              />
              <span className="text-xs font-semibold text-slate-500">{day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders Section (Matching New.png empty state) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recent orders</h3>
          <button className="text-xs font-semibold text-[#5E17EB] hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Empty orders banner */}
        <div className="border border-slate-100 rounded-xl p-8 text-center bg-slate-50/30 flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
            <ClipboardList className="w-6 h-6 stroke-[1.5]" />
          </div>
          <p className="text-sm font-bold text-slate-800">No orders yet</p>
          <p className="text-xs text-slate-500">
            Recent orders will be displayed here when you start selling on Errandify.
          </p>
        </div>
      </div>
    </div>
  );
};
