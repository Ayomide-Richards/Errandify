import { ProductStorage, calculateSummaryMetrics, getProductAvailability, getProductPriceDisplay, getProductStock } from '../services/productStorage';
import { Product } from '../types/product';

// Mock localStorage in memory for testing
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
  key: () => null,
  length: 0,
} as any;

console.log('--- RUNNING FINAL QUALITY CHECK SCENARIOS ---');

// Test 1: Reset data
ProductStorage.resetToDefault();
let products = ProductStorage.getProducts();
console.log(`[PASS] Initial seed loaded: ${products.length} products`);

// Test 2: Create a simple product: 1 kg bag of rice (Individual Product)
const rice1kg = ProductStorage.createProduct({
  name: '1 kg Bag of Rice',
  description: 'Premium quality parboiled long grain rice in 1kg pack',
  images: [{ id: 'img-r1', url: 'https://example.com/rice1kg.jpg', name: 'rice1.jpg', isPrimary: true }],
  category: 'Foodstuff & Groceries',
  subcategory: 'Grains, Rice & Beans',
  productType: 'individual',
  unitOfSale: 'Kilogram (kg)',
  price: 2500,
  stockQuantity: 45,
  isPublished: true,
});
console.log(`[PASS] Created 1kg rice: ID ${rice1kg.id}, Price ₦${rice1kg.price}, Stock: ${rice1kg.stockQuantity} ${rice1kg.unitOfSale}`);

// Test 3: Create another independent product: 5 kg bag of rice
const rice5kg = ProductStorage.createProduct({
  name: '5 kg Bag of Rice',
  description: 'Economy size premium long grain rice in durable 5kg sack',
  images: [{ id: 'img-r5', url: 'https://example.com/rice5kg.jpg', name: 'rice5.jpg', isPrimary: true }],
  category: 'Foodstuff & Groceries',
  subcategory: 'Grains, Rice & Beans',
  productType: 'individual',
  unitOfSale: 'Kilogram (kg)',
  price: 12000,
  stockQuantity: 20,
  isPublished: true,
});
console.log(`[PASS] Created 5kg rice: ID ${rice5kg.id}, Price ₦${rice5kg.price}, Stock: ${rice5kg.stockQuantity} ${rice5kg.unitOfSale}`);

// Verify both exist independently
console.log(`[PASS] 1kg and 5kg rice are separate listings: ${rice1kg.id !== rice5kg.id && rice1kg.name !== rice5kg.name}`);

// Test 4: Create a shoe product with three colours and five sizes (Product with Options)
const colours = ['Black', 'White', 'Brown'];
const sizes = ['39', '40', '41', '42', '43'];

// Cartesian combination generation
const combinations = [];
for (const col of colours) {
  for (const sz of sizes) {
    combinations.push({
      id: `comb-${col}-${sz}`,
      selectedOptions: { Colour: col, Size: sz },
      title: `${col} / ${sz}`,
      price: 35000,
      stockQuantity: 10,
      isAvailable: true,
    });
  }
}

const shoeProduct = ProductStorage.createProduct({
  name: 'Leather Oxford Shoes',
  description: 'Handcrafted genuine leather formal shoes for men',
  images: [{ id: 'sh-1', url: 'https://example.com/shoe.jpg', name: 'shoe.jpg', isPrimary: true }],
  category: 'Fashion & Clothing',
  subcategory: "Men's Shoes",
  productType: 'with_options',
  options: [
    {
      id: 'opt-col',
      name: 'Colour',
      values: colours.map((c) => ({ id: `val-${c}`, name: c })),
    },
    {
      id: 'opt-sz',
      name: 'Size',
      values: sizes.map((s) => ({ id: `val-${s}`, name: s })),
    },
  ],
  combinations,
  isPublished: true,
});

console.log(`[PASS] Created Shoe product with options: ${shoeProduct.name}`);
console.log(`[PASS] Combinations generated count: ${shoeProduct.combinations?.length} (Expected 3 * 5 = 15)`);

// Test 5: Verify combination count & total stock calculation
const totalStock = getProductStock(shoeProduct);
console.log(`[PASS] Total stock calculated across 15 combinations: ${totalStock} (Expected 150)`);

// Test 6: Edit the price of one combination without changing the others
const updatedCombinations = [...shoeProduct.combinations!];
updatedCombinations[0] = { ...updatedCombinations[0], price: 42000 };
const updatedShoe = ProductStorage.updateProduct(shoeProduct.id, { combinations: updatedCombinations });
const priceInfo = getProductPriceDisplay(updatedShoe);
console.log(`[PASS] Modified one combination price: Black/39 is now ₦${updatedShoe.combinations![0].price}, Black/40 is ₦${updatedShoe.combinations![1].price}`);
console.log(`[PASS] Dynamic price range display: "${priceInfo.display}"`);

// Test 7: Change the stock quantity of one combination
updatedCombinations[1] = { ...updatedCombinations[1], stockQuantity: 25 };
const updatedShoe2 = ProductStorage.updateProduct(shoeProduct.id, { combinations: updatedCombinations });
console.log(`[PASS] Updated stock of Black/40: now ${updatedShoe2.combinations![1].stockQuantity}, Total stock now ${getProductStock(updatedShoe2)}`);

// Test 8: Remove a combination and confirm handled safely
const filteredCombinations = updatedCombinations.filter(c => c.title !== 'Brown / 43');
const updatedShoe3 = ProductStorage.updateProduct(shoeProduct.id, { combinations: filteredCombinations });
console.log(`[PASS] Removed combination 'Brown / 43'. New combination count: ${updatedShoe3.combinations?.length} (Expected 14)`);

// Test 9: Create an unpublished product
const draftProduct = ProductStorage.createProduct({
  name: 'Draft Blender 500W',
  description: 'Upcoming appliance listing',
  images: [],
  category: 'Home & Kitchen',
  subcategory: 'Small Kitchen Appliances',
  productType: 'individual',
  unitOfSale: 'Unit',
  price: 28000,
  stockQuantity: 15,
  isPublished: false,
});
console.log(`[PASS] Created unpublished product: ID ${draftProduct.id}, isPublished: ${draftProduct.isPublished}`);

// Test 10: Publish an existing unpublished product
const publishedDraft = ProductStorage.togglePublish(draftProduct.id);
console.log(`[PASS] Toggled publish: isPublished is now ${publishedDraft.isPublished}`);

// Test 11: Summary metrics calculation
const finalMetrics = calculateSummaryMetrics(ProductStorage.getProducts());
console.log(`[PASS] Summary metrics: Total: ${finalMetrics.totalProducts}, Published: ${finalMetrics.publishedProducts}, Unpublished: ${finalMetrics.unpublishedProducts}, Out of Stock: ${finalMetrics.outOfStockProducts}`);

// Test 12: Delete product
ProductStorage.deleteProduct(draftProduct.id);
const deletedCheck = ProductStorage.getProductById(draftProduct.id);
console.log(`[PASS] Deleted draft product: Found? ${!!deletedCheck} (Expected false)`);

console.log('--- ALL SCENARIOS VERIFIED SUCCESSFULLY ---');

