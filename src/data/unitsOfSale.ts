export interface UnitGroup {
  groupName: string;
  units: { label: string; value: string; short: string }[];
}

export const UNITS_OF_SALE: UnitGroup[] = [
  {
    groupName: 'Weight',
    units: [
      { label: 'Kilogram (kg)', value: 'Kilogram (kg)', short: 'kg' },
      { label: 'Gram (g)', value: 'Gram (g)', short: 'g' },
    ],
  },
  {
    groupName: 'Packaging',
    units: [
      { label: 'Bag', value: 'Bag', short: 'bag' },
      { label: 'Basket', value: 'Basket', short: 'basket' },
      { label: 'Carton', value: 'Carton', short: 'carton' },
      { label: 'Pack', value: 'Pack', short: 'pack' },
      { label: 'Sachet', value: 'Sachet', short: 'sachet' },
    ],
  },
  {
    groupName: 'Volume',
    units: [
      { label: 'Litre (L)', value: 'Litre (L)', short: 'L' },
      { label: 'Millilitre (ml)', value: 'Millilitre (ml)', short: 'ml' },
    ],
  },
  {
    groupName: 'Count',
    units: [
      { label: 'Piece', value: 'Piece', short: 'pcs' },
      { label: 'Unit', value: 'Unit', short: 'unit' },
      { label: 'Pair', value: 'Pair', short: 'pair' },
      { label: 'Dozen', value: 'Dozen', short: 'dz' },
      { label: 'Crate', value: 'Crate', short: 'crate' },
    ],
  },
  {
    groupName: 'Length',
    units: [
      { label: 'Metre (m)', value: 'Metre (m)', short: 'm' },
      { label: 'Yard', value: 'Yard', short: 'yd' },
    ],
  },
];

