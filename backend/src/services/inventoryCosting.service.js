/**
 * Inventory Costing Service
 * Ported from: NavoditaERP/Managers/InventoryCostingManager.swift
 *
 * FIFO/LIFO/WAC inventory costing, lot tracking, COGS calculation,
 * stock on hand, and item stock summary.
 *
 * Note: The Swift version uses CoreData. This JS port expects a `db` object
 * (e.g. Knex or Sequelize query builder) for database access.
 */

// ============================================================================
// Costing Method Enum
// ============================================================================
const CostingMethod = {
  FIFO: 'FIFO',   // First In, First Out
  LIFO: 'LIFO',   // Last In, First Out
  WAC: 'WAC',     // Weighted Average Cost
};

const COSTING_METHOD_DESCRIPTIONS = {
  [CostingMethod.FIFO]: 'First In, First Out - Uses oldest purchase costs first',
  [CostingMethod.LIFO]: 'Last In, First Out - Uses newest purchase costs first',
  [CostingMethod.WAC]: 'Weighted Average Cost - Average of all purchase costs',
};

// ============================================================================
// Inventory Lot
// ============================================================================

/**
 * @typedef {Object} InventoryLot
 * @property {string} id
 * @property {string} itemId
 * @property {string|null} billId
 * @property {string|null} billNumber
 * @property {Date} purchaseDate
 * @property {number} quantity - Original purchased quantity
 * @property {number} unitCost
 * @property {number} remainingQuantity
 * @property {number} totalCost - computed: remainingQuantity * unitCost
 * @property {boolean} isAvailable - computed: remainingQuantity > 0
 */

function createLot({ id, itemId, billId, billNumber, purchaseDate, quantity, unitCost, remainingQuantity }) {
  return {
    id,
    itemId,
    billId: billId || null,
    billNumber: billNumber || null,
    purchaseDate,
    quantity,
    unitCost,
    remainingQuantity,
    get totalCost() {
      return this.remainingQuantity * this.unitCost;
    },
    get isAvailable() {
      return this.remainingQuantity > 0;
    },
  };
}

// ============================================================================
// Cost Allocation Result
// ============================================================================

/**
 * @typedef {Object} CostAllocation
 * @property {InventoryLot} lot
 * @property {number} quantityUsed
 * @property {number} unitCost
 * @property {number} totalCost - computed: quantityUsed * unitCost
 */

// ============================================================================
// COGS Calculation Result
// ============================================================================

/**
 * @typedef {Object} COGSResult
 * @property {string} itemId
 * @property {number} quantityRequested
 * @property {number} quantityAllocated
 * @property {number} totalCOGS
 * @property {number} weightedAverageCost
 * @property {CostAllocation[]} allocations
 * @property {boolean} hasInsufficientStock
 * @property {number} shortfall - computed: max(0, requested - allocated)
 */

// ============================================================================
// Item Stock Summary
// ============================================================================

/**
 * @typedef {Object} ItemStockSummary
 * @property {string} itemId
 * @property {string} itemName
 * @property {number} totalQuantityOnHand
 * @property {number} totalCostValue
 * @property {number} averageCost
 * @property {InventoryLot[]} lots - only available lots
 * @property {number} numberOfLots - computed: lots.length
 */

// ============================================================================
// Inventory Costing Manager
// ============================================================================

/**
 * Get available inventory lots for an item, ordered by purchase date.
 * Fetches purchase bills (BillItems) and subtracts sales (InvoiceItems)
 * using FIFO or LIFO order.
 *
 * @param {object} db - Database query interface
 * @param {string} itemId - Item UUID
 * @param {string} [method='FIFO'] - Costing method (FIFO or LIFO)
 * @returns {Promise<InventoryLot[]>}
 */
async function getInventoryLots(db, itemId, method = CostingMethod.FIFO) {
  // Fetch all BillItems for this item (purchases), joined with Bills for date
  const billItems = await db('bill_items')
    .join('bills', 'bill_items.bill_id', 'bills.id')
    .where('bill_items.item_id', itemId)
    .select(
      'bill_items.id',
      'bill_items.quantity',
      'bill_items.rate',
      'bills.id as bill_id',
      'bills.bill_number',
      'bills.date as purchase_date',
    )
    .orderBy('bills.date', method === CostingMethod.LIFO ? 'desc' : 'asc');

  // Calculate total sold from InvoiceItems
  const salesResult = await db('invoice_items')
    .where('item_id', itemId)
    .sum('quantity as total_sold')
    .first();

  let totalSold = parseFloat(salesResult?.total_sold) || 0;

  // Create lots and allocate sales against them
  const lots = [];

  for (const bi of billItems) {
    const purchasedQty = parseFloat(bi.quantity) || 0;
    const unitCost = parseFloat(bi.rate) || 0;

    // Calculate remaining quantity in this lot after sales
    const allocatedFromThisLot = Math.min(totalSold, purchasedQty);
    const remainingInLot = purchasedQty - allocatedFromThisLot;
    totalSold -= allocatedFromThisLot;

    lots.push(createLot({
      id: bi.id,
      itemId,
      billId: bi.bill_id,
      billNumber: bi.bill_number,
      purchaseDate: new Date(bi.purchase_date),
      quantity: purchasedQty,
      unitCost,
      remainingQuantity: remainingInLot,
    }));
  }

  return lots;
}

/**
 * Calculate Cost of Goods Sold for a given quantity using FIFO/LIFO.
 *
 * @param {object} db - Database query interface
 * @param {string} itemId
 * @param {number} quantity - Quantity to calculate COGS for
 * @param {string} [method='FIFO']
 * @returns {Promise<COGSResult>}
 */
async function calculateCOGS(db, itemId, quantity, method = CostingMethod.FIFO) {
  const lots = await getInventoryLots(db, itemId, method);
  const allocations = [];
  let remainingToAllocate = quantity;
  let totalCOGS = 0;

  // Allocate from available lots
  for (const lot of lots) {
    if (!lot.isAvailable || remainingToAllocate <= 0) continue;

    const quantityFromLot = Math.min(remainingToAllocate, lot.remainingQuantity);

    if (quantityFromLot > 0) {
      const allocation = {
        lot,
        quantityUsed: quantityFromLot,
        unitCost: lot.unitCost,
        get totalCost() {
          return this.quantityUsed * this.unitCost;
        },
      };
      allocations.push(allocation);
      totalCOGS += quantityFromLot * lot.unitCost;
      remainingToAllocate -= quantityFromLot;
    }
  }

  const quantityAllocated = quantity - remainingToAllocate;
  const avgCost = quantityAllocated > 0 ? totalCOGS / quantityAllocated : 0;

  return {
    itemId,
    quantityRequested: quantity,
    quantityAllocated,
    totalCOGS,
    weightedAverageCost: avgCost,
    allocations,
    hasInsufficientStock: remainingToAllocate > 0,
    get shortfall() {
      return Math.max(0, this.quantityRequested - this.quantityAllocated);
    },
  };
}

/**
 * Get Weighted Average Cost for an item.
 * Total value of remaining stock / total remaining quantity.
 *
 * @param {object} db
 * @param {string} itemId
 * @returns {Promise<number>}
 */
async function getWeightedAverageCost(db, itemId) {
  const lots = await getInventoryLots(db, itemId);

  let totalValue = 0;
  let totalQty = 0;

  for (const lot of lots) {
    totalValue += lot.totalCost;
    totalQty += lot.remainingQuantity;
  }

  return totalQty > 0 ? totalValue / totalQty : 0;
}

/**
 * Get total stock on hand for an item.
 *
 * @param {object} db
 * @param {string} itemId
 * @returns {Promise<number>}
 */
async function getStockOnHand(db, itemId) {
  const lots = await getInventoryLots(db, itemId);
  return lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
}

/**
 * Get stock summary for a single item.
 *
 * @param {object} db
 * @param {string} itemId
 * @param {string} itemName
 * @param {string} [method='FIFO']
 * @returns {Promise<ItemStockSummary>}
 */
async function getItemStockSummary(db, itemId, itemName, method = CostingMethod.FIFO) {
  const lots = await getInventoryLots(db, itemId, method);

  let totalQty = 0;
  let totalValue = 0;

  for (const lot of lots) {
    totalQty += lot.remainingQuantity;
    totalValue += lot.totalCost;
  }

  const avgCost = totalQty > 0 ? totalValue / totalQty : 0;

  return {
    itemId,
    itemName,
    totalQuantityOnHand: totalQty,
    totalCostValue: totalValue,
    averageCost: avgCost,
    lots: lots.filter((lot) => lot.isAvailable),
    get numberOfLots() {
      return this.lots.length;
    },
  };
}

/**
 * Get stock summary for all items.
 *
 * @param {object} db
 * @param {string} [method='FIFO']
 * @returns {Promise<ItemStockSummary[]>}
 */
async function getAllItemsStockSummary(db, method = CostingMethod.FIFO) {
  const items = await db('items')
    .select('id', 'name')
    .orderBy('name', 'asc');

  const summaries = [];
  for (const item of items) {
    const summary = await getItemStockSummary(db, item.id, item.name || 'Unknown', method);
    summaries.push(summary);
  }

  return summaries;
}

/**
 * Check stock availability for an item.
 *
 * @param {object} db
 * @param {string} itemId
 * @param {number} quantity
 * @returns {Promise<{ available: boolean, shortfall: number }>}
 */
async function checkStockAvailability(db, itemId, quantity) {
  const stockOnHand = await getStockOnHand(db, itemId);
  const shortfall = Math.max(0, quantity - stockOnHand);
  return { available: shortfall === 0, shortfall };
}

module.exports = {
  CostingMethod,
  COSTING_METHOD_DESCRIPTIONS,
  getInventoryLots,
  calculateCOGS,
  getWeightedAverageCost,
  getStockOnHand,
  getItemStockSummary,
  getAllItemsStockSummary,
  checkStockAvailability,
};
