export interface CategoryItem {
  id: string;
  name: string;
  subcategories: string[];
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'foodstuff-groceries',
    name: 'Foodstuff & Groceries',
    subcategories: [
      'Grains, Rice & Beans',
      'Flour & Meals',
      'Oils & Cooking Fats',
      'Spices & Seasonings',
      'Tubers, Yams & Potatoes',
      'Dried Fish & Seafood',
      'Fresh Meat & Poultry',
      'Fresh Fruits & Vegetables',
      'Canned & Packaged Foods',
    ],
  },
  {
    id: 'food-beverages',
    name: 'Food & Beverages',
    subcategories: [
      'Juices & Soft Drinks',
      'Water & Sparkling Water',
      'Tea, Coffee & Cocoa',
      'Milk & Dairy Products',
      'Snacks & Confectionery',
      'Bakery & Pastries',
      'Alcoholic Beverages',
    ],
  },
  {
    id: 'fashion-clothing',
    name: 'Fashion & Clothing',
    subcategories: [
      "Men's Clothing",
      "Women's Clothing",
      "Men's Shoes",
      "Women's Shoes",
      'Traditional & Native Wear',
      'Bags & Luggage',
      'Watches & Jewelry',
      'Eyewear & Accessories',
    ],
  },
  {
    id: 'electronics-gadgets',
    name: 'Electronics & Gadgets',
    subcategories: [
      'Smartphones & Tablets',
      'Laptops & Computers',
      'Audio & Headphones',
      'Televisions & Home Theatres',
      'Cameras & Photography',
      'Smart Home & Wearables',
      'Cables, Chargers & Accessories',
    ],
  },
  {
    id: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    subcategories: [
      'Skincare & Moisturizers',
      'Hair Care & Braids',
      'Fragrances & Perfumes',
      'Makeup & Cosmetics',
      'Oral Care',
      'Bath & Body',
      "Men's Grooming",
    ],
  },
  {
    id: 'health-pharmacy',
    name: 'Health & Pharmacy',
    subcategories: [
      'First Aid & Bandages',
      'Vitamins & Supplements',
      'Pain Relief',
      'Cold & Flu Remedies',
      'Medical Supplies & Monitors',
      'Eye Care',
    ],
  },
  {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    subcategories: [
      'Cookware & Pots',
      'Kitchen Utensils & Cutlery',
      'Small Kitchen Appliances',
      'Bedding & Mattresses',
      'Home Decor & Lighting',
      'Cleaning Supplies & Detergents',
      'Storage & Organization',
    ],
  },
  {
    id: 'baby-kids',
    name: 'Baby & Kids',
    subcategories: [
      'Baby Food & Formula',
      'Diapers & Wipes',
      'Baby Clothing & Footwear',
      'Strollers & Car Seats',
      'Toys & Educational Games',
      'Nursery & Feeding Supplies',
    ],
  },
  {
    id: 'books-stationery',
    name: 'Books & Stationery',
    subcategories: [
      'Notebooks & Notepads',
      'Pens, Pencils & Markers',
      'Office Supplies & Paper',
      'Textbooks & Educational',
      'Fiction & Non-Fiction',
      'Art & Craft Materials',
    ],
  },
  {
    id: 'building-hardware',
    name: 'Building & Hardware',
    subcategories: [
      'Hand Tools & Power Tools',
      'Electrical & Wiring',
      'Plumbing Fixtures & Pipes',
      'Paints & Primers',
      'Locks, Hinges & Fasteners',
      'Safety Gear & Protective Wear',
    ],
  },
  {
    id: 'sports-fitness',
    name: 'Sports & Fitness',
    subcategories: [
      'Gym & Exercise Equipment',
      'Athletic Apparel',
      'Sports Shoes & Cleats',
      'Outdoor Recreation & Camping',
      'Water Sports & Swimming',
    ],
  },
  {
    id: 'pet-supplies',
    name: 'Pet Supplies',
    subcategories: [
      'Dog Food & Treats',
      'Cat Food & Litter',
      'Pet Collars, Leashes & Harnesses',
      'Pet Grooming & Healthcare',
      'Aquarium & Fish Supplies',
    ],
  },
  {
    id: 'gifts-lifestyle',
    name: 'Gifts & Lifestyle',
    subcategories: [
      'Hampers & Gift Baskets',
      'Greeting Cards & Wrapping',
      'Scented Candles & Diffusers',
      'Party Supplies & Decorations',
      'Souvenirs & Keepsakes',
    ],
  },
  {
    id: 'automotive',
    name: 'Automotive',
    subcategories: [
      'Car Care & Cleaning',
      'Engine Oils & Fluids',
      'Tires & Maintenance Tools',
      'Car Electronics & Mounts',
      'Interior Accessories & Seat Covers',
    ],
  },
  {
    id: 'other',
    name: 'Other',
    subcategories: [
      'General Merchandise',
      'Seasonal Items',
      'Miscellaneous Services',
    ],
  },
];

