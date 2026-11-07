import React, { useState } from 'react';
import type { ProductOption, ProductOptionValue, ProductCombination } from '../../types/product';
import { Plus, X, Trash2, Layers, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { CombinationsTable } from './CombinationsTable';
import { Modal } from '../common/Modal';

interface OptionsManagerProps {
  options: ProductOption[];
  combinations: ProductCombination[];
  onOptionsChange: (options: ProductOption[]) => void;
  onCombinationsChange: (combinations: ProductCombination[]) => void;
  basePrice?: number;
}

export const OptionsManager: React.FC<OptionsManagerProps> = ({
  options,
  combinations,
  onOptionsChange,
  onCombinationsChange,
  basePrice = 0,
}) => {
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});
  const [combToDelete, setCombToDelete] = useState<ProductCombination | null>(null);
  const [optionToDelete, setOptionToDelete] = useState<ProductOption | null>(null);

  const suggestedOptionTypes = ['Colour', 'Size', 'Material', 'Style'];

  // Helper to re-generate combinations while preserving existing user-edited data
  const regenerateCombinations = (currentOptions: ProductOption[]) => {
    const validOptions = currentOptions.filter((o) => o.values.length > 0);
    if (validOptions.length === 0) {
      onCombinationsChange([]);
      return;
    }

    // Cartesian product
    const cartesian = (arrays: ProductOptionValue[][]): ProductOptionValue[][] => {
      return arrays.reduce<ProductOptionValue[][]>(
        (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
        [[]]
      );
    };

    const valueArrays = validOptions.map((o) => o.values);
    const combinationsList = cartesian(valueArrays);

    const newCombinations: ProductCombination[] = combinationsList.map((valGroup) => {
      const selectedOptions: Record<string, string> = {};
      valGroup.forEach((v, idx) => {
        const optName = validOptions[idx].name;
        selectedOptions[optName] = v.name;
      });

      const title = valGroup.map((v) => v.name).join(' / ');
      const combKey = Object.entries(selectedOptions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');

      // Check if an existing combination matches
      const existing = combinations.find((c) => {
        const existingKey = Object.entries(c.selectedOptions)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${v}`)
          .join('|');
        return existingKey === combKey;
      });

      if (existing) {
        return {
          ...existing,
          title,
          selectedOptions,
        };
      }

      return {
        id: `comb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        selectedOptions,
        price: basePrice > 0 ? basePrice : 0,
        stockQuantity: 0,
        isAvailable: true,
      };
    });

    onCombinationsChange(newCombinations);
  };

  const handleAddOption = (name: string) => {
    if (!name.trim()) return;
    if (options.some((o) => o.name.toLowerCase() === name.trim().toLowerCase())) {
      return;
    }

    const newOption: ProductOption = {
      id: `opt-${Date.now().toString(36)}`,
      name: name.trim(),
      values: [],
    };

    const updated = [...options, newOption];
    onOptionsChange(updated);
    regenerateCombinations(updated);
  };

  const handleRemoveOption = (optionId: string) => {
    const opt = options.find((o) => o.id === optionId);
    if (!opt) return;

    // If options already have values and combinations with entered stock, warn first
    const hasData = combinations.some((c) => c.stockQuantity > 0 || c.price > 0);
    if (hasData && opt.values.length > 0) {
      setOptionToDelete(opt);
    } else {
      executeRemoveOption(optionId);
    }
  };

  const executeRemoveOption = (optionId: string) => {
    const updated = options.filter((o) => o.id !== optionId);
    onOptionsChange(updated);
    regenerateCombinations(updated);
    setOptionToDelete(null);
  };

  const handleAddValue = (optionId: string) => {
    const text = (newValueInputs[optionId] || '').trim();
    if (!text) return;

    const optIndex = options.findIndex((o) => o.id === optionId);
    if (optIndex === -1) return;

    const opt = options[optIndex];
    // Check duplicate
    if (opt.values.some((v) => v.name.toLowerCase() === text.toLowerCase())) {
      return;
    }

    const newValue: ProductOptionValue = {
      id: `val-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      name: text,
    };

    const updated = [...options];
    updated[optIndex] = {
      ...opt,
      values: [...opt.values, newValue],
    };

    setNewValueInputs((prev) => ({ ...prev, [optionId]: '' }));
    onOptionsChange(updated);
    regenerateCombinations(updated);
  };

  const handleRemoveValue = (optionId: string, valueId: string) => {
    const optIndex = options.findIndex((o) => o.id === optionId);
    if (optIndex === -1) return;

    const opt = options[optIndex];
    const updated = [...options];
    updated[optIndex] = {
      ...opt,
      values: opt.values.filter((v) => v.id !== valueId),
    };

    onOptionsChange(updated);
    regenerateCombinations(updated);
  };

  const handleCustomOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.currentTarget;
      handleAddOption(input.value);
      input.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Option Types Definition */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#5E17EB]" />
              Product Option Types
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Define the attributes customers can choose from (e.g. Colour, Size, Material).
            </p>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Suggestions:</span>
            {suggestedOptionTypes.map((type) => {
              const alreadyAdded = options.some(
                (o) => o.name.toLowerCase() === type.toLowerCase()
              );
              if (alreadyAdded) return null;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddOption(type)}
                  className="text-[11px] bg-white border border-slate-200 hover:border-[#5E17EB] text-slate-600 hover:text-[#5E17EB] px-2.5 py-1 rounded-md transition-colors"
                >
                  + {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Existing Options List */}
        <div className="space-y-4">
          {options.map((option, idx) => (
            <div
              key={option.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#F3EFFE] text-[#5E17EB] text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {option.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(option.id)}
                  className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove {option.name}</span>
                </button>
              </div>

              {/* Values Tag List */}
              <div className="flex flex-wrap items-center gap-2">
                {option.values.map((val) => (
                  <span
                    key={val.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-medium"
                  >
                    <span>{val.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(option.id, val.id)}
                      className="text-slate-400 hover:text-red-500 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Add Value Input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={`Add ${option.name} value (press Enter)...`}
                    value={newValueInputs[option.id] || ''}
                    onChange={(e) =>
                      setNewValueInputs((prev) => ({ ...prev, [option.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValue(option.id);
                      }
                    }}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg w-48 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="purple-light"
                    onClick={() => handleAddValue(option.id)}
                    className="py-1 px-2.5 text-xs"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {option.values.length === 0 && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please add at least one value for {option.name} (e.g.{' '}
                  {option.name.toLowerCase() === 'colour'
                    ? 'Black, White, Blue'
                    : option.name.toLowerCase() === 'size'
                    ? '39, 40, 41'
                    : 'Standard, Custom'}
                  )
                </p>
              )}
            </div>
          ))}

          {/* Add Custom Option Input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Add another option type (e.g. Finish, Pack Size, Material)..."
              onKeyDown={handleCustomOptionKeyDown}
              id="custom-option-input"
              className="text-xs px-3.5 py-2 border border-slate-300 rounded-xl max-w-sm w-full text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5E17EB]/20 focus:border-[#5E17EB] bg-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = document.getElementById('custom-option-input') as HTMLInputElement;
                if (el && el.value) {
                  handleAddOption(el.value);
                  el.value = '';
                }
              }}
            >
              Add Option Type
            </Button>
          </div>
        </div>
      </div>

      {/* Combination Matrix Section */}
      {combinations.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Product Combinations Matrix</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F3EFFE] text-[#5E17EB] border border-[#DDD0FA]">
                  {combinations.length} combinations generated
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Set individual price overrides and stock inventory for each variant combination.
              </p>
            </div>
          </div>

          <CombinationsTable
            combinations={combinations}
            onChange={onCombinationsChange}
            onRequestDelete={(comb) => setCombToDelete(comb)}
          />
        </div>
      )}

      {/* Delete Single Combination Warning Modal */}
      {combToDelete && (
        <Modal
          isOpen={!!combToDelete}
          onClose={() => setCombToDelete(null)}
          title={`Remove combination "${combToDelete.title}"?`}
          subtitle="Are you sure you want to remove this combination? If it has inventory or custom pricing entered, that data will be removed."
          maxWidth="sm"
        >
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="outline" onClick={() => setCombToDelete(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onCombinationsChange(combinations.filter((c) => c.id !== combToDelete.id));
                setCombToDelete(null);
              }}
              className="flex-1"
            >
              Remove
            </Button>
          </div>
        </Modal>
      )}

      {/* Delete Option Type Warning Modal */}
      {optionToDelete && (
        <Modal
          isOpen={!!optionToDelete}
          onClose={() => setOptionToDelete(null)}
          title={`Remove option "${optionToDelete.name}"?`}
          subtitle={`Removing the "${optionToDelete.name}" option will delete all associated values and recalculate all combination prices and stocks.`}
          maxWidth="sm"
        >
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="outline" onClick={() => setOptionToDelete(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => executeRemoveOption(optionToDelete.id)}
              className="flex-1"
            >
              Remove Option
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
