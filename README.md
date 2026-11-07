# Errandify — Merchant Dashboard & Product Management

A responsive merchant dashboard and product management experience for the Errandify marketplace platform. Built with React 19, TypeScript, Tailwind CSS, and Vite.

![Errandify Merchant Dashboard](https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80)

## Overview

Errandify is an on-demand marketplace and errand-running platform. This dashboard serves as the central hub for store merchants to manage their product catalog, track stock availability, configure packaging and variant options, and manage publication statuses.

## Key Features

- **Store Products Catalog**:
  - Live summary metrics: Total Products, Published Products, Unpublished Drafts, and Out of Stock.
  - Multi-parameter filtering by Category (15 retail sectors), Stock Availability (In Stock, Low Stock, Out of Stock), and Publication Status.
  - Real-time search by product name and category with clear action.
  - Sorting by Recently Added, Product Name (A-Z), and Price (Low to High / High to Low).
  - Multi-select bulk actions: Bulk Unpublish, Bulk Publish, and safe Bulk Delete.
  - Responsive table matching Errandify's signature royal purple branding with custom status badges, option indicators, and row actions.

- **Dual-Model Product Architecture**:
  - **Type 1: Individual Product**: Distinct single-unit listing with specific units of sale (Weight, Packaging, Volume, Count, Length), unit pricing in Nigerian Naira (₦), and dedicated stock.
  - **Type 2: Product with Options**: Multi-variant listing with custom attributes (Colour, Size, Material, Style). Features automatic Cartesian combination generation, bulk pricing tools, individual combination price/stock overrides, and calculated total inventory.

- **Interactive Product Workflow**:
  - **Multi-Image Uploader**: Drag-and-drop, format validation (PNG, JPG, WebP), primary thumbnail selection, and image reordering.
  - **View Product Details**: Two-column layout with product image gallery, classification badges, full description, variant breakdown matrix, and platform audit records.
  - **Edit Product**: Full pre-populated edit experience preserving existing pricing, stock, and variant configurations.
  - **Confirmation Modals**: Dialogs for unpublishing, archiving, destructive deletion with order history safeguards, and unsaved changes warnings.

## Tech Stack

- **Framework**: React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Storage Layer**: Persistent browser storage (`ProductStorage`) with instant state synchronization

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ayomide-Richards/Errandify.git
   cd Errandify
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

## License

Private repository for Errandify. All rights reserved.
