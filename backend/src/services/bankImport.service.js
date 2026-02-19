/**
 * Bank Import Service
 * Ported from: NavoditaERP/BankingViews/BankingManager.swift (importStatement, checkForDuplicate, updateBalance)
 *
 * Handles the full bank statement import workflow:
 * 1. Parse file using statementParser
 * 2. Check for duplicates
 * 3. Insert transactions
 * 4. Update bank account balance
 * 5. Return import summary
 */

const db = require('../config/database');
const statementParser = require('./statementParser.service');

// ============================================================================
// Duplicate Detection
// ============================================================================

/**
 * Check if a transaction already exists in the database.
 * Matches on: bank_account_id + transaction_date + deposit_amount + withdrawal_amount + description
 * (Mirrors BankingManager.checkForDuplicate from Swift)
 *
 * @param {string} bankAccountId
 * @param {object} txn - normalized transaction
 * @returns {Promise<boolean>}
 */
async function isDuplicate(bankAccountId, txn) {
  const existing = await db('bank_transactions')
    .where({
      bank_account_id: bankAccountId,
      transaction_date: txn.transaction_date,
      deposit_amount: txn.deposit_amount,
      withdrawal_amount: txn.withdrawal_amount,
    })
    .where(function () {
      // Match description to reduce false duplicate detection
      // (same date + same amount to different parties are NOT duplicates)
      if (txn.description) {
        this.where('description', txn.description);
      }
    })
    .where(function () {
      // Also match reference number when available
      if (txn.reference_number) {
        this.where('reference_number', txn.reference_number);
      }
    })
    .first();

  return !!existing;
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Import a bank statement file into the database.
 *
 * @param {string} bankAccountId - UUID of the bank account
 * @param {Buffer} fileBuffer - file content
 * @param {string} originalName - original filename
 * @param {string} [bankFormat='AUTO'] - bank format key or 'AUTO'
 * @returns {Promise<object>} import results
 */
async function importStatement(bankAccountId, fileBuffer, originalName, bankFormat = 'AUTO') {
  // Validate bank account exists
  const account = await db('bank_accounts')
    .where({ id: bankAccountId })
    .first();

  if (!account) {
    throw new Error('Bank account not found');
  }

  // Parse the file
  const parseResult = await statementParser.parseStatement(fileBuffer, originalName, bankFormat);

  if (parseResult.transactions.length === 0) {
    return {
      imported_count: 0,
      skipped_count: 0,
      total_count: parseResult.totalRows,
      errors: parseResult.errors.length > 0
        ? parseResult.errors
        : ['No valid transactions found in the file'],
      detected_format: parseResult.detectedFormat,
      mapping: parseResult.mapping,
    };
  }

  // Generate import batch ID
  const importBatchId = `IMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  let importedCount = 0;
  let skippedCount = 0;
  let currentBalance = parseFloat(account.current_balance) || 0;
  const errors = [...parseResult.errors];

  // Process transactions in batches for performance
  const BATCH_SIZE = 50;
  const txnsToInsert = [];

  for (let i = 0; i < parseResult.transactions.length; i++) {
    const txn = parseResult.transactions[i];

    try {
      // Check for duplicates
      const dup = await isDuplicate(bankAccountId, txn);
      if (dup) {
        skippedCount++;
        continue;
      }

      // Calculate running balance
      currentBalance = currentBalance + txn.deposit_amount - txn.withdrawal_amount;

      txnsToInsert.push({
        bank_account_id: bankAccountId,
        transaction_date: txn.transaction_date,
        value_date: txn.value_date || txn.transaction_date,
        description: txn.description,
        reference_number: txn.reference_number,
        deposit_amount: txn.deposit_amount,
        withdrawal_amount: txn.withdrawal_amount,
        balance: txn.balance != null ? txn.balance : parseFloat(currentBalance.toFixed(2)),
        category: txn.category || null,
        import_batch_id: importBatchId,
        is_duplicate: false,
        is_reconciled: false,
      });

      importedCount++;

      // Batch insert
      if (txnsToInsert.length >= BATCH_SIZE) {
        await db('bank_transactions').insert(txnsToInsert);
        txnsToInsert.length = 0;
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
      if (errors.length > 20) {
        errors.push('Too many errors, stopping.');
        break;
      }
    }
  }

  // Insert remaining batch
  if (txnsToInsert.length > 0) {
    await db('bank_transactions').insert(txnsToInsert);
  }

  // Update bank account current_balance
  if (importedCount > 0) {
    await db('bank_accounts')
      .where({ id: bankAccountId })
      .update({
        current_balance: parseFloat(currentBalance.toFixed(2)),
        updated_at: new Date(),
      });
  }

  return {
    imported_count: importedCount,
    skipped_count: skippedCount,
    total_count: parseResult.totalRows,
    errors: errors.length > 0 ? errors : undefined,
    import_batch_id: importBatchId,
    detected_format: parseResult.detectedFormat,
    mapping: parseResult.mapping,
  };
}

/**
 * Preview a bank statement file without importing.
 * Returns parsed transactions and metadata for the frontend preview step.
 *
 * @param {Buffer} fileBuffer - file content
 * @param {string} originalName - original filename
 * @param {string} [bankFormat='AUTO'] - bank format key or 'AUTO'
 * @returns {Promise<object>} preview data
 */
async function previewStatement(fileBuffer, originalName, bankFormat = 'AUTO') {
  const parseResult = await statementParser.parseStatement(fileBuffer, originalName, bankFormat);

  return {
    transactions: parseResult.transactions,
    headers: parseResult.headers,
    mapping: parseResult.mapping,
    detected_format: parseResult.detectedFormat,
    total_rows: parseResult.totalRows,
    parsed_count: parseResult.transactions.length,
    errors: parseResult.errors.length > 0 ? parseResult.errors : undefined,
  };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  importStatement,
  previewStatement,
  isDuplicate,
};
