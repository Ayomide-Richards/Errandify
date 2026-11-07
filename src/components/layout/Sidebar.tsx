import React from 'react';
import {
  LayoutGrid,
  Package,
  Store,
  ShoppingCart,
  Wallet,
  Settings,
  Headphones,
  Store as StoreIcon,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  mobileOpen = false,
  onMobileClose,
}) => {
  const mainNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Store },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'sales', label: 'Sales & Earnings', icon: Wallet },
  ];

  const generalNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: Headphones },
  ];

  const handleNavClick = (id: string) => {
    onTabChange(id);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 w-64 select-none">
      {/* Brand Logo Header */}
      <div className="px-6 py-6 flex items-center justify-between border-b border-transparent">
        <div className="flex items-center gap-2.5">
          {/* Errandify Pin Logo */}
          <div className="w-8 h-8 rounded-full bg-[#5E17EB] flex items-center justify-center text-white shadow-sm shadow-[#5E17EB]/30">
            <div className="relative flex items-center justify-center">
              <span className="font-extrabold text-sm tracking-tighter">E</span>
              <div className="w-1.5 h-1.5 rounded-full bg-white absolute -top-1 -right-1" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-wider text-[#5E17EB]">
            ERRANDIFY
          </span>
        </div>
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-[#F5F2FE] text-[#5E17EB] font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-[#5E17EB]' : 'text-slate-500'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Section Divider */}
        <div className="pt-6 pb-2 px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            GENERAL
          </p>
        </div>

        {generalNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-[#F5F2FE] text-[#5E17EB] font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-[#5E17EB]' : 'text-slate-500'
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Store Profile Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center shrink-0 border border-[#DDD0FA]">
            <StoreIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">
              XYZ limited
            </p>
            <p className="text-xs text-slate-500">Store profile</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-0 h-screen">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

