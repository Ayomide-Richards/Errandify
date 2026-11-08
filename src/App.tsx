import { useState, useEffect } from 'react';
import type { Product } from './types/product';
import { ProductStorage } from './services/productStorage';
import { ToastProvider, useToast } from './components/common/Toast';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProductsListing } from './components/products/ProductsListing';
import { ProductForm } from './components/products/ProductForm';
import { ProductDetails } from './components/products/ProductDetails';
import { OverviewView } from './components/dashboard/OverviewView';
import { OrdersView } from './components/orders/OrdersView';
import { DeleteModal } from './components/products/modals/DeleteModal';
import { PromotionsPanel } from './components/promotions/PromotionsPanel';
import { Store, Wallet, Settings as SettingsIcon, Headphones } from 'lucide-react';

type ProductSubView = 'list' | 'add' | 'view' | 'edit' | 'promotions';

function ErrandifyApp() {
  const toast = useToast();

  // Navigation State - default to overview matching reference
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [productSubView, setProductSubView] = useState<ProductSubView>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Products Dataset State
  const [products, setProducts] = useState<Product[]>([]);

  // Modals triggered from Details or other places
  const [modalDeleteId, setModalDeleteId] = useState<string | null>(null);

  // Load products on mount
  useEffect(() => {
    try {
      const data = ProductStorage.getProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load products');
    }
  }, []);

  const refreshProducts = () => {
    const data = ProductStorage.getProducts();
    setProducts(data);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Navigation Handlers
  const handleNavigateToAddProduct = () => {
    setSelectedProductId(null);
    setProductSubView('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToViewProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setProductSubView('view');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToEditProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setProductSubView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setProductSubView('list');
    setSelectedProductId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // CRUD Operations
  const handleCreateProduct = async (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      const created = ProductStorage.createProduct(productData);
      refreshProducts();
      toast.success(
        `"${created.name}" created successfully`,
        created.isPublished ? 'Product is now published in your store.' : 'Saved as unpublished draft.'
      );
      setProductSubView('list');
    } catch (err: any) {
      toast.error('Failed to create product', err?.message || 'Please check form fields.');
      throw err;
    }
  };

  const handleUpdateProduct = async (
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!selectedProductId) return;

    try {
      const updated = ProductStorage.updateProduct(selectedProductId, productData);
      refreshProducts();
      toast.success(
        `"${updated.name}" updated successfully`,
        'Changes have been saved to your catalog.'
      );
      setProductSubView('view');
    } catch (err: any) {
      toast.error('Failed to update product', err?.message || 'Please check form fields.');
      throw err;
    }
  };

  const handleTogglePublish = (id: string) => {
    try {
      const updated = ProductStorage.togglePublish(id);
      refreshProducts();
      if (updated.isPublished) {
        toast.success(`"${updated.name}" published`, 'Product is now visible in the marketplace.');
      } else {
        toast.info(`"${updated.name}" unpublished`, 'Product is hidden from customer marketplace.');
      }
    } catch (err: any) {
      toast.error('Action failed', err?.message);
    }
  };

  const handleBulkUnpublish = (ids: string[]) => {
    try {
      ProductStorage.bulkUnpublish(ids);
      refreshProducts();
      toast.info(
        `${ids.length} products unpublished`,
        'Selected products will no longer be visible to customers.'
      );
    } catch (err: any) {
      toast.error('Bulk unpublish failed', err?.message);
    }
  };

  const handleBulkPublish = (ids: string[]) => {
    try {
      ProductStorage.bulkPublish(ids);
      refreshProducts();
      toast.success(
        `${ids.length} products published`,
        'Selected products are now visible in the marketplace.'
      );
    } catch (err: any) {
      toast.error('Bulk publish failed', err?.message);
    }
  };

  const handleArchive = (_id: string) => {
    // Archive functionality removed
  };

  const handleDelete = (id: string) => {
    try {
      const p = products.find((x) => x.id === id);
      ProductStorage.deleteProduct(id);
      refreshProducts();
      toast.success(`"${p?.name || 'Product'}" deleted`, 'Product permanently removed.');
      if (selectedProductId === id) {
        setProductSubView('list');
      }
    } catch (err: any) {
      toast.error('Delete failed', err?.message);
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    try {
      ProductStorage.bulkDelete(ids);
      refreshProducts();
      toast.success(
        `${ids.length} products deleted`,
        'Selected products have been permanently deleted.'
      );
    } catch (err: any) {
      toast.error('Bulk delete failed', err?.message);
    }
  };

  const handleResetData = () => {
    // Removed - replaced by Add Promotion flow
  };

  const handleToastFromPanel = (type: 'success' | 'info' | 'error', title: string, message?: string) => {
    if (type === 'success') toast.success(title, message);
    else if (type === 'info') toast.info(title, message);
    else toast.error(title, message);
  };

  return (
    <DashboardLayout
      currentTab={currentTab}
      onTabChange={(tab) => {
        setCurrentTab(tab);
        if (tab === 'products') {
          setProductSubView('list');
        }
      }}
    >
      {/* Tab 1: Overview */}
      {currentTab === 'overview' && (
        <OverviewView
          products={products}
          onNavigateToProducts={() => {
            setCurrentTab('products');
            setProductSubView('list');
          }}
          onNavigateToOrders={() => {
            setCurrentTab('orders');
          }}
        />
      )}

      {/* Tab 2: Products (Core Feature) */}
      {currentTab === 'products' && (
        <>
          {productSubView === 'list' && (
            <ProductsListing
              products={products}
              onAddProduct={handleNavigateToAddProduct}
              onViewProduct={handleNavigateToViewProduct}
              onEditProduct={handleNavigateToEditProduct}
              onTogglePublish={handleTogglePublish}
              onBulkUnpublish={handleBulkUnpublish}
              onBulkPublish={handleBulkPublish}
              onDeleteProduct={handleDelete}
              onBulkDelete={handleBulkDelete}
              onOpenPromotions={() => setProductSubView('promotions')}
            />
          )}

          {productSubView === 'promotions' && (
            <PromotionsPanel
              products={products}
              onBack={() => setProductSubView('list')}
              onToast={handleToastFromPanel}
            />
          )}

          {productSubView === 'add' && (
            <ProductForm
              isEditMode={false}
              onSubmit={handleCreateProduct}
              onCancel={handleBackToList}
            />
          )}

          {productSubView === 'view' && selectedProduct && (
            <ProductDetails
              product={selectedProduct}
              onBack={handleBackToList}
              onEdit={() => setProductSubView('edit')}
              onTogglePublish={() => handleTogglePublish(selectedProduct.id)}
              onDelete={() => setModalDeleteId(selectedProduct.id)}
            />
          )}

          {productSubView === 'edit' && selectedProduct && (
            <ProductForm
              initialProduct={selectedProduct}
              isEditMode={true}
              onSubmit={handleUpdateProduct}
              onCancel={() => setProductSubView('view')}
            />
          )}
        </>
      )}

      {/* Tab 3: Inventory Placeholder */}
      {currentTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mx-auto">
            <Store className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Inventory Management</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            View stock thresholds, batch stock updates, and reorder alerts. Manage individual product quantities directly in Products.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setCurrentTab('products');
                setProductSubView('list');
              }}
              className="text-sm font-semibold text-[#5E17EB] hover:underline"
            >
              Go to Products Catalog →
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Orders */}
      {currentTab === 'orders' && <OrdersView />}

      {/* Tab 5: Sales Placeholder */}
      {currentTab === 'sales' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <Wallet className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sales & Payouts</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            View real-time merchant payouts, transaction breakdowns, and bank settlements.
          </p>
        </div>
      )}

      {/* Tab 6: Settings Placeholder */}
      {currentTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <SettingsIcon className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Store Settings</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Configure store profile, business hours, bank account for settlements, and notification preferences.
          </p>
        </div>
      )}

      {/* Tab 7: Help Placeholder */}
      {currentTab === 'help' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#F3EFFE] text-[#5E17EB] flex items-center justify-center mx-auto">
            <Headphones className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Merchant Help & Support</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Need assistance with product listings, payouts, or runner delivery? Connect with Errandify Merchant Support.
          </p>
        </div>
      )}

      {/* Global Delete Modal for Detail view */}
      {modalDeleteId && (
        <DeleteModal
          isOpen={!!modalDeleteId}
          onClose={() => setModalDeleteId(null)}
          productName={products.find((p) => p.id === modalDeleteId)?.name}
          hasOrderHistory={
            products
              .find((p) => p.id === modalDeleteId)
              ?.name.includes('Ofada') || false
          }
          onConfirm={() => {
            handleDelete(modalDeleteId);
            setModalDeleteId(null);
          }}
        />
      )}

      {/* Global Archive Modal for Detail view - removed */}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ErrandifyApp />
    </ToastProvider>
  );
}
