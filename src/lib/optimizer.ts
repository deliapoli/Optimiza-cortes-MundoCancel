export interface StockPiece {
  id: string;
  length: number;
}

export interface DemandPiece {
  id: string;
  length: number;
  label?: string;
}

export interface OptimizedSolution {
  bins: {
    stockId: string;
    stockLength: number;
    cuts: { length: number; label: string }[];
    waste: number;
    remnant: number;
  }[];
  totalWaste: number;
  utilization: number;
}

export function optimizeCuts(
  stock: StockPiece[],
  demands: DemandPiece[],
  bladeWidth: number = 4
): OptimizedSolution {
  // Sort demands by length descending (FFD)
  const sortedDemands = [...demands].sort((a, b) => b.length - a.length);
  // Sort stock by length descending to use largest pieces first or smallest?
  // Usually, we want to fit into existing remnants first, but here we treat all stock as available.
  // Let's sort stock by length descending.
  const sortedStock = [...stock].sort((a, b) => b.length - a.length);

  const solutionBins: OptimizedSolution['bins'] = [];
  const activeStock = sortedStock.map(s => ({ ...s, remaining: s.length, used: false, cuts: [] as { length: number; label: string }[] }));

  for (const demand of sortedDemands) {
    let fitted = false;
    // Find first stock piece that can fit this cut + blade width (if not first cut)
    for (const bin of activeStock) {
      const neededSpace = bin.cuts.length === 0 ? demand.length : demand.length + bladeWidth;
      
      if (bin.remaining >= neededSpace) {
        bin.cuts.push({ length: demand.length, label: demand.label || `Cut ${demand.id}` });
        bin.remaining -= neededSpace;
        bin.used = true;
        fitted = true;
        break;
      }
    }
    
    if (!fitted) {
      // Piece too big for any individual stock? 
      // In a real app we'd report this error. Here we'll just skip it for now.
      console.warn(`Could not fit piece of length ${demand.length}`);
    }
  }

  const finalBins = activeStock
    .filter(b => b.used)
    .map(b => ({
      stockId: b.id,
      stockLength: b.length,
      cuts: b.cuts,
      waste: b.remaining, // This counts as waste unless we track remnants
      remnant: b.remaining
    }));

  const totalStockUsed = finalBins.reduce((sum, b) => sum + b.stockLength, 0);
  const totalCutLength = demands.reduce((sum, d) => sum + d.length, 0);
  const totalWaste = totalStockUsed - totalCutLength;
  const utilization = totalStockUsed > 0 ? (totalCutLength / totalStockUsed) * 100 : 0;

  return {
    bins: finalBins,
    totalWaste,
    utilization
  };
}
