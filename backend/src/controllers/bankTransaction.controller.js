const db = require('../config/database');
const bankImportService = require('../services/bankImport.service');
const { BANK_FORMATS } = require('../services/statementParser.service');

/**
 * Recompute and update a bank account's current_balance from opening_balance + all transactions.
 * This is the authoritative balance calculation — it sums all deposits and withdrawals
 * from bank_transactions rather than relying on incremental updates.
 *
 * @param {string|number} bankAccountId
 */
async function updateBankAccountBalance(bankAccountId) {
  const account = await db('bank_accounts').where({ id: bankAccountId }).first();
  if (!account) return;

  const result = await db('bank_transactions')
    .where({ bank_account_id: bankAccountId })
    .select(
      db.raw('COALESCE(SUM(deposit_amount), 0) as total_deposits'),
      db.raw('COALESCE(SUM(withdrawal_amount), 0) as total_withdrawals')
    )
    .first();

  const openingBalance = parseFloat(account.opening_balance) || 0;
  const newBalance = openingBalance + parseFloat(result.total_deposits) - parseFloat(result.total_withdrawals);

  await db('bank_accounts').where({ id: bankAccountId }).update({
    current_balance: newBalance,
    updated_at: new Date()
  });
}

/**
 * GET / - List bank transactions with filters
 */
const list = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 50, search, sort_by, sort_order = 'desc',
      bank_account_id, category, is_reconciled, start_date, end_date,
      categorization_status,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = db('bank_transactions')
      .leftJoin('bank_accounts', 'bank_transactions.bank_account_id', 'bank_accounts.id')
      .leftJoin('chart_of_accounts as sub_account', 'bank_transactions.sub_account_id', 'sub_account.id')
      .leftJoin('customers', 'bank_transactions.customer_id', 'customers.id')
      .leftJoin('vendors', 'bank_transactions.vendor_id', 'vendors.id')
      .leftJoin('bank_accounts as transfer_account', 'bank_transactions.transfer_account_id', 'transfer_account.id')
      .select(
        'bank_transactions.*',
        'bank_accounts.account_name',
        'bank_accounts.bank_name',
        'sub_account.account_name as sub_account_name',
        'sub_account.account_code as sub_account_code',
        'customers.display_name as customer_name',
        'vendors.display_name as vendor_name',
        'transfer_account.account_name as transfer_account_name'
      );

    if (bank_account_id) {
      query = query.where('bank_transactions.bank_account_id', bank_account_id);
    }

    if (category) {
      query = query.where('bank_transactions.category', category);
    }

    if (is_reconciled !== undefined) {
      query = query.where('bank_transactions.is_reconciled', is_reconciled === 'true');
    }

    if (categorization_status) {
      query = query.where('bank_transactions.categorization_status', categorization_status);
    }

    if (start_date) {
      query = query.where('bank_transactions.transaction_date', '>=', start_date);
    }

    if (end_date) {
      query = query.where('bank_transactions.transaction_date', '<=', end_date);
    }

    if (search) {
      query = query.where(function () {
        this.where('bank_transactions.description', 'ilike', `%${search}%`)
          .orWhere('bank_transactions.reference_number', 'ilike', `%${search}%`)
          .orWhere('bank_transactions.category', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await query.clone().clearSelect().count('bank_transactions.id');
    const data = await query
      .orderBy(sort_by ? `bank_transactions.${sort_by}` : 'bank_transactions.transaction_date', sort_order)
      .limit(limit)
      .offset(offset);

    res.json({ data, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /:id - Get bank transaction by ID with bank account details
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const txn = await db('bank_transactions')
      .leftJoin('bank_accounts', 'bank_transactions.bank_account_id', 'bank_accounts.id')
      .select(
        'bank_transactions.*',
        'bank_accounts.account_name',
        'bank_accounts.bank_name'
      )
      .where('bank_transactions.id', id)
      .first();

    if (!txn) {
      return res.status(404).json({ error: 'Bank transaction not found' });
    }

    res.json({ data: txn });
  } catch (err) {
    next(err);
  }
};

/**
 * POST / - Create bank transaction and update bank account balance
 */
const create = async (req, res, next) => {
  try {
    const txnData = req.body;

    if (!txnData.bank_account_id || !txnData.transaction_date) {
      return res.status(400).json({ error: 'Bank account and transaction date are required' });
    }

    const account = await db('bank_accounts')
      .where({ id: txnData.bank_account_id })
      .first();

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const deposit = parseFloat(txnData.deposit_amount) || 0;
    const withdrawal = parseFloat(txnData.withdrawal_amount) || 0;

    // Set running balance for display (trigger will update account.current_balance)
    const newBalance = parseFloat(account.current_balance) + deposit - withdrawal;
    txnData.balance = parseFloat(newBalance.toFixed(2));

    // Check for duplicate: same account + date + amounts + reference
    if (txnData.reference_number) {
      const dup = await db('bank_transactions')
        .where({
          bank_account_id: txnData.bank_account_id,
          transaction_date: txnData.transaction_date,
          deposit_amount: deposit,
          withdrawal_amount: withdrawal,
          reference_number: txnData.reference_number,
        }).first();
      if (dup) {
        return res.status(409).json({ error: 'Duplicate transaction — same date, amount and reference already exists', data: dup });
      }
    }

    const [txn] = await db('bank_transactions')
      .insert(txnData)
      .returning('*');

    // Trigger auto-updates bank account current_balance — no manual update needed

    res.status(201).json({ data: txn });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /import - Import array of transactions (for CSV import)
 */
const importTransactions = async (req, res, next) => {
  try {
    const { bank_account_id, transactions } = req.body;

    if (!bank_account_id || !transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Bank account ID and transactions array are required' });
    }

    const account = await db('bank_accounts')
      .where({ id: bank_account_id })
      .first();

    if (!account) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const importBatchId = `IMP-${Date.now()}`;
    let imported = 0;
    let duplicates = 0;

    for (const txn of transactions) {
      const deposit = parseFloat(txn.deposit_amount) || 0;
      const withdrawal = parseFloat(txn.withdrawal_amount) || 0;

      // ── Duplicate check: reference_number (strongest), then date+amount+description ──
      let existingDup = null;

      if (txn.reference_number && txn.reference_number.trim()) {
        // Reference number is unique per account — most reliable check
        existingDup = await db('bank_transactions')
          .where({
            bank_account_id,
            transaction_date: txn.transaction_date,
            deposit_amount: deposit,
            withdrawal_amount: withdrawal,
            reference_number: txn.reference_number.trim(),
          })
          .first();
      }

      if (!existingDup) {
        // Fallback: same date + same amounts + same description (first 80 chars)
        const descCheck = (txn.description || '').substring(0, 80);
        existingDup = await db('bank_transactions')
          .where({
            bank_account_id,
            transaction_date: txn.transaction_date,
            deposit_amount: deposit,
            withdrawal_amount: withdrawal,
          })
          .whereRaw('LEFT(description, 80) = ?', [descCheck])
          .first();
      }

      if (existingDup) {
        duplicates++;
        continue;
      }

      // balance column = running balance from statement (for display only)
      // account.current_balance is maintained by DB trigger automatically
      const runningBalance = parseFloat(txn.balance) || 0;

      await db('bank_transactions').insert({
        bank_account_id,
        transaction_date: txn.transaction_date,
        value_date: txn.value_date || txn.transaction_date,
        description: txn.description,
        reference_number: txn.reference_number || null,
        deposit_amount: deposit,
        withdrawal_amount: withdrawal,
        balance: runningBalance,
        category: txn.category || null,
        import_batch_id: importBatchId,
      });

      imported++;
    }

    // Recompute bank account balance from opening_balance + all transactions
    await updateBankAccountBalance(bank_account_id);

    res.status(201).json({
      data: { import_batch_id: importBatchId },
      imported,
      duplicates,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /categorize - Batch update categories
 */
const categorize = async (req, res, next) => {
  try {
    const { transaction_ids, category, category_type } = req.body;

    if (!transaction_ids || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return res.status(400).json({ error: 'Transaction IDs array is required' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const updateData = { category, updated_at: new Date() };
    if (category_type) {
      updateData.category_type = category_type;
    }

    const updated = await db('bank_transactions')
      .whereIn('id', transaction_ids)
      .update(updateData);

    res.json({ updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id - Update bank transaction
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const txnData = req.body;

    const existing = await db('bank_transactions').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Bank transaction not found' });
    }

    txnData.updated_at = new Date();

    const [updated] = await db('bank_transactions')
      .where({ id })
      .update(txnData)
      .returning('*');

    // DB trigger auto-recalculates bank account current_balance after update
    // Also call explicit recalculation as safety net
    await updateBankAccountBalance(existing.bank_account_id);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /:id - Delete and reverse bank account balance update
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const txn = await db('bank_transactions').where({ id }).first();
    if (!txn) {
      return res.status(404).json({ error: 'Bank transaction not found' });
    }

    if (txn.is_reconciled) {
      return res.status(400).json({ error: 'Cannot delete a reconciled transaction' });
    }

    await db('bank_transactions').where({ id }).del();

    // Recompute bank account balance from opening_balance + all remaining transactions
    await updateBankAccountBalance(txn.bank_account_id);

    res.json({ message: 'Bank transaction deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /import-file - Import bank statement file (CSV/Excel) with parsing
 * Expects multipart form data: file, bank_account_id, bank_format (optional)
 */
const importFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a CSV or Excel file.' });
    }

    const bankAccountId = req.body.bank_account_id;
    if (!bankAccountId) {
      return res.status(400).json({ error: 'Bank account ID is required' });
    }

    const bankFormat = req.body.bank_format || 'AUTO';
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;

    const result = await bankImportService.importStatement(
      bankAccountId,
      fileBuffer,
      originalName,
      bankFormat
    );

    // Recompute bank account balance from opening_balance + all transactions
    if (result.imported_count > 0) {
      await updateBankAccountBalance(bankAccountId);
    }

    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Bank account not found') {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
};

/**
 * POST /preview - Preview bank statement file without importing
 * Expects multipart form data: file, bank_format (optional)
 * Returns parsed transactions for preview in the UI
 */
const previewFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please attach a CSV or Excel file.' });
    }

    const bankFormat = req.body.bank_format || 'AUTO';
    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;

    const result = await bankImportService.previewStatement(
      fileBuffer,
      originalName,
      bankFormat
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /bank-formats - Return available bank format options
 */
const getBankFormats = async (req, res) => {
  const formats = [
    { key: 'AUTO', label: 'Auto-Detect' },
    ...Object.entries(BANK_FORMATS).map(([key, val]) => ({
      key,
      label: val.label,
    })),
  ];
  res.json({ data: formats });
};

/**
 * PUT /:id/categorize - Categorize a single transaction (Zoho Books style)
 * Accepts category key, optional sub_account_id, customer_id, vendor_id,
 * transfer_account_id, invoice_ids, bill_ids.
 * Sets categorization_status to 'categorized'.
 * When customer payment with invoice_ids, updates invoice balance_due/status.
 * When vendor payment with bill_ids, updates bill balance_due/status.
 */
const categorizeTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      category,
      sub_account_id,
      customer_id,
      vendor_id,
      transfer_account_id,
      invoice_ids,
      bill_ids,
      store_as_advance,
      advance_amount,
    } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const existing = await db('bank_transactions').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Bank transaction not found' });
    }

    // ── Clean up any existing payment records from previous categorization ──
    // This handles re-categorization: if a transaction was previously categorized
    // as customer_payment or vendor_payment, we need to reverse the invoice/bill
    // allocations and delete the old payment records before creating new ones.
    const prevPaymentReceived = await db('payments_received').where({ bank_transaction_id: id }).first();
    if (prevPaymentReceived) {
      // Reverse invoice allocations from the previous payment
      const prevReceivedAllocations = await db('payment_received_allocations')
        .where({ payment_received_id: prevPaymentReceived.id });
      for (const alloc of prevReceivedAllocations) {
        const invoice = await db('invoices').where({ id: alloc.invoice_id }).first();
        if (invoice) {
          const newPaid = Math.max(parseFloat(invoice.amount_paid) - parseFloat(alloc.allocated_amount), 0);
          const newBalance = parseFloat(invoice.total_amount) - newPaid;
          let newStatus = 'Final';
          if (newPaid >= parseFloat(invoice.total_amount)) newStatus = 'Paid';
          else if (newPaid > 0) newStatus = 'Partial';
          await db('invoices').where({ id: alloc.invoice_id }).update({
            amount_paid: parseFloat(newPaid.toFixed(2)),
            balance_due: parseFloat(Math.max(0, newBalance).toFixed(2)),
            status: newStatus,
            updated_at: new Date(),
          });
        }
      }
      await db('payment_received_allocations').where({ payment_received_id: prevPaymentReceived.id }).del();
      await db('payments_received').where({ id: prevPaymentReceived.id }).del();
    }

    const prevPaymentMade = await db('payments_made').where({ bank_transaction_id: id }).first();
    if (prevPaymentMade) {
      // Reverse bill allocations from the previous payment
      const prevMadeAllocations = await db('payment_made_allocations')
        .where({ payment_made_id: prevPaymentMade.id });
      for (const alloc of prevMadeAllocations) {
        const bill = await db('bills').where({ id: alloc.bill_id }).first();
        if (bill) {
          const newPaid = Math.max(parseFloat(bill.amount_paid) - parseFloat(alloc.allocated_amount), 0);
          const newBalance = parseFloat(bill.total_amount) - newPaid;
          let newStatus = 'Pending';
          if (newPaid >= parseFloat(bill.total_amount)) newStatus = 'Paid';
          else if (newPaid > 0) newStatus = 'Partial';
          await db('bills').where({ id: alloc.bill_id }).update({
            amount_paid: parseFloat(newPaid.toFixed(2)),
            balance_due: parseFloat(Math.max(0, newBalance).toFixed(2)),
            status: newStatus,
            updated_at: new Date(),
          });
        }
      }
      await db('payment_made_allocations').where({ payment_made_id: prevPaymentMade.id }).del();
      await db('payments_made').where({ id: prevPaymentMade.id }).del();
    }

    // Build update payload
    const updatePayload = {
      category,
      categorization_status: 'categorized',
      updated_at: new Date(),
      // Clear previous links (to allow re-categorization)
      customer_id: customer_id || null,
      vendor_id: vendor_id || null,
      transfer_account_id: transfer_account_id || null,
      linked_invoice_ids: JSON.stringify(invoice_ids || []),
      linked_bill_ids: JSON.stringify(bill_ids || []),
    };

    // If sub_account_id provided, validate it
    let subAccount = null;
    if (sub_account_id) {
      subAccount = await db('chart_of_accounts').where({ id: sub_account_id }).first();
      if (!subAccount) {
        return res.status(400).json({ error: 'Sub-account not found in chart of accounts' });
      }
      updatePayload.sub_account_id = sub_account_id;
    } else {
      updatePayload.sub_account_id = null;
    }

    // Determine category_type based on category key
    const depositCategories = ['customer_payment', 'retainer_payment', 'transfer_from', 'interest_income', 'other_income', 'expense_refund', 'deposit_other'];
    const withdrawalCategories = ['vendor_payment', 'expense', 'payroll', 'owners_contribution', 'vendor_credit_refund', 'transfer_to'];
    if (depositCategories.includes(category)) {
      updatePayload.category_type = 'Deposit';
    } else if (withdrawalCategories.includes(category)) {
      updatePayload.category_type = 'Withdrawal';
    }

    const [updated] = await db('bank_transactions')
      .where({ id })
      .update(updatePayload)
      .returning('*');

    // Update invoice balances when customer payment with invoice_ids
    if (category === 'customer_payment' && invoice_ids && invoice_ids.length > 0) {
      const txnAmount = parseFloat(existing.deposit_amount) || 0;
      let remainingAmount = txnAmount;

      for (const invAlloc of invoice_ids) {
        // invoice_ids can be array of { id, amount } objects or plain IDs
        const invoiceId = typeof invAlloc === 'object' ? invAlloc.id : invAlloc;
        const allocAmount = typeof invAlloc === 'object' ? parseFloat(invAlloc.amount) || 0 : 0;

        const invoice = await db('invoices').where({ id: invoiceId }).first();
        if (!invoice) continue;

        const applyAmount = allocAmount > 0 ? allocAmount : Math.min(remainingAmount, parseFloat(invoice.balance_due) || 0);
        if (applyAmount <= 0) continue;

        const newAmountPaid = (parseFloat(invoice.amount_paid) || 0) + applyAmount;
        const newBalanceDue = (parseFloat(invoice.total_amount) || 0) - newAmountPaid;
        let newStatus = invoice.status;
        if (newBalanceDue <= 0) {
          newStatus = 'Paid';
        } else if (newAmountPaid > 0) {
          newStatus = 'Partial';
        }

        await db('invoices').where({ id: invoiceId }).update({
          amount_paid: parseFloat(newAmountPaid.toFixed(2)),
          balance_due: parseFloat(Math.max(0, newBalanceDue).toFixed(2)),
          status: newStatus,
          updated_at: new Date(),
        });

        remainingAmount -= applyAmount;
        if (remainingAmount <= 0) break;
      }
    }

    // ── Create payments_received record for customer_payment ──
    // This ensures the payment appears in customer statements/ledger.
    // Created regardless of whether invoice_ids are provided (unallocated payments are valid).
    if (category === 'customer_payment' && customer_id) {
      const paymentReceivedNumber = `PMT-R-BNK-${Date.now().toString().slice(-6)}`;
      const paymentAmount = parseFloat(existing.deposit_amount) || 0;

      if (paymentAmount > 0) {
        const excessForCustomer = store_as_advance ? parseFloat(advance_amount) || 0 : 0;
        const [paymentReceived] = await db('payments_received').insert({
          payment_number: paymentReceivedNumber,
          customer_id: customer_id,
          payment_date: existing.transaction_date,
          amount: paymentAmount,
          original_amount: paymentAmount,
          excess_amount: excessForCustomer > 0 ? excessForCustomer : 0,
          payment_mode: 'Bank Transfer',
          reference_number: existing.reference_number || `Bank Txn: ${(existing.description || '').substring(0, 100)}`,
          status: 'Received',
          currency_code: 'INR',
          exchange_rate: 1,
          notes: `Auto-created from bank transaction categorization. Bank: ${existing.description || ''}${excessForCustomer > 0 ? ` | Advance: ₹${excessForCustomer.toFixed(2)}` : ''}`,
          bank_transaction_id: id,
        }).returning('*');

        // Create allocation records linking the payment to specific invoices
        if (paymentReceived && invoice_ids && invoice_ids.length > 0) {
          for (const invAlloc of invoice_ids) {
            const invoiceId = typeof invAlloc === 'object' ? invAlloc.id : invAlloc;
            const allocAmount = typeof invAlloc === 'object' ? parseFloat(invAlloc.amount) || 0 : 0;
            if (allocAmount > 0) {
              await db('payment_received_allocations').insert({
                payment_received_id: paymentReceived.id,
                invoice_id: invoiceId,
                allocated_amount: allocAmount,
              });
            }
          }
        }
      }
    }

    // Update bill balances when vendor payment with bill_ids
    if (category === 'vendor_payment' && bill_ids && bill_ids.length > 0) {
      const txnAmount = parseFloat(existing.withdrawal_amount) || 0;
      let remainingAmount = txnAmount;

      for (const billAlloc of bill_ids) {
        const billId = typeof billAlloc === 'object' ? billAlloc.id : billAlloc;
        const allocAmount = typeof billAlloc === 'object' ? parseFloat(billAlloc.amount) || 0 : 0;

        const bill = await db('bills').where({ id: billId }).first();
        if (!bill) continue;

        const applyAmount = allocAmount > 0 ? allocAmount : Math.min(remainingAmount, parseFloat(bill.balance_due) || 0);
        if (applyAmount <= 0) continue;

        const newAmountPaid = (parseFloat(bill.amount_paid) || 0) + applyAmount;
        const newBalanceDue = (parseFloat(bill.total_amount) || 0) - newAmountPaid;
        let newStatus = bill.status;
        if (newBalanceDue <= 0) {
          newStatus = 'Paid';
        } else if (newAmountPaid > 0) {
          newStatus = 'Partial';
        }

        await db('bills').where({ id: billId }).update({
          amount_paid: parseFloat(newAmountPaid.toFixed(2)),
          balance_due: parseFloat(Math.max(0, newBalanceDue).toFixed(2)),
          status: newStatus,
          updated_at: new Date(),
        });

        remainingAmount -= applyAmount;
        if (remainingAmount <= 0) break;
      }
    }

    // ── Create payments_made record for vendor_payment ──
    // This ensures the payment appears in vendor statements/ledger.
    // Created regardless of whether bill_ids are provided (unallocated payments are valid).
    if (category === 'vendor_payment' && vendor_id) {
      const paymentMadeNumber = `PMT-M-BNK-${Date.now().toString().slice(-6)}`;
      const paymentAmount = parseFloat(existing.withdrawal_amount) || 0;

      if (paymentAmount > 0) {
        const excessForVendor = store_as_advance ? parseFloat(advance_amount) || 0 : 0;
        const [paymentMade] = await db('payments_made').insert({
          payment_number: paymentMadeNumber,
          vendor_id: vendor_id,
          payment_date: existing.transaction_date,
          amount: paymentAmount,
          original_amount: paymentAmount,
          excess_amount: excessForVendor > 0 ? excessForVendor : 0,
          payment_mode: 'Bank Transfer',
          reference_number: existing.reference_number || `Bank Txn: ${(existing.description || '').substring(0, 100)}`,
          status: 'Paid',
          currency_code: 'INR',
          exchange_rate: 1,
          notes: `Auto-created from bank transaction categorization. Bank: ${existing.description || ''}${excessForVendor > 0 ? ` | Vendor Credit: ₹${excessForVendor.toFixed(2)}` : ''}`,
          bank_transaction_id: id,
        }).returning('*');

        // Create allocation records linking the payment to specific bills
        if (paymentMade && bill_ids && bill_ids.length > 0) {
          for (const billAlloc of bill_ids) {
            const billId = typeof billAlloc === 'object' ? billAlloc.id : billAlloc;
            const allocAmount = typeof billAlloc === 'object' ? parseFloat(billAlloc.amount) || 0 : 0;
            if (allocAmount > 0) {
              await db('payment_made_allocations').insert({
                payment_made_id: paymentMade.id,
                bill_id: billId,
                allocated_amount: allocAmount,
              });
            }
          }
        }
      }
    }

    // Recompute bank account balance (ensures consistency after any changes)
    await updateBankAccountBalance(existing.bank_account_id);

    // Build response with enriched data
    const responseData = { ...updated };
    if (subAccount) {
      responseData.sub_account_name = subAccount.account_name;
      responseData.sub_account_code = subAccount.account_code;
    }

    res.json({ data: responseData });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /sub-accounts - Fetch chart_of_accounts entries for sub-account dropdown
 * Returns expense and income accounts suitable for categorizing bank transactions
 */
const getSubAccounts = async (req, res, next) => {
  try {
    const { account_type } = req.query;

    let query = db('chart_of_accounts')
      .select('id', 'account_name', 'account_code', 'account_type')
      .where(function () {
        this.where('is_active', true).orWhereNull('is_active');
      })
      .orderBy('account_type', 'asc')
      .orderBy('account_code', 'asc');

    if (account_type) {
      query = query.where('account_type', account_type);
    }

    const accounts = await query;

    res.json({ data: accounts });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /categorization-options - Zoho Books style categorization options
 * Returns deposit and withdrawal categories with their types
 */
const getCategorizationOptions = async (req, res) => {
  const deposit_categories = [
    { key: 'customer_payment', label: 'Customer Payment', type: 'customer_link' },
    { key: 'retainer_payment', label: 'Retainer Payment', type: 'customer_link' },
    { key: 'transfer_from', label: 'Transfer From Another Account', type: 'bank_account' },
    { key: 'interest_income', label: 'Interest Income', type: 'sub_account', account_types: ['Income'] },
    { key: 'other_income', label: 'Other Income', type: 'sub_account', account_types: ['Income', 'Other Income'] },
    { key: 'expense_refund', label: 'Expense Refund', type: 'sub_account', account_types: ['Expense'] },
    { key: 'deposit_other', label: 'Deposit From Other Accounts', type: 'bank_account' },
  ];
  const withdrawal_categories = [
    { key: 'vendor_payment', label: 'Vendor Payment', type: 'vendor_link' },
    { key: 'expense', label: 'Expense', type: 'sub_account', account_types: ['Expense', 'Cost Of Goods Sold'] },
    { key: 'payroll', label: 'Payroll', type: 'simple' },
    { key: 'owners_contribution', label: "Owner's Contribution", type: 'sub_account', account_types: ['Equity'] },
    { key: 'vendor_credit_refund', label: 'Vendor Credit Refund', type: 'vendor_link' },
    { key: 'transfer_to', label: 'Transfer To Another Account', type: 'bank_account' },
  ];
  res.json({ deposit_categories, withdrawal_categories });
};

/**
 * GET /customers-with-invoices - Customers with outstanding (unpaid/partially paid) invoices
 */
const getCustomersWithInvoices = async (req, res, next) => {
  try {
    // Get all customers
    const customers = await db('customers')
      .select('id', 'display_name as name', 'email', 'phone')
      .where(function () {
        this.where('is_active', true).orWhereNull('is_active');
      })
      .orderBy('display_name', 'asc');

    // Get outstanding invoices (Draft, Final, Partial, Overdue - i.e. not Paid or Cancelled)
    const invoices = await db('invoices')
      .select('id', 'customer_id', 'invoice_number', 'total_amount', 'balance_due', 'amount_paid', 'invoice_date', 'due_date', 'status')
      .whereIn('status', ['Draft', 'Final', 'Partial', 'Overdue'])
      .where('balance_due', '>', 0)
      .orderBy('invoice_date', 'desc');

    // Group invoices by customer
    const invoicesByCustomer = {};
    for (const inv of invoices) {
      if (!invoicesByCustomer[inv.customer_id]) {
        invoicesByCustomer[inv.customer_id] = [];
      }
      invoicesByCustomer[inv.customer_id].push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        total_amount: parseFloat(inv.total_amount) || 0,
        amount_due: parseFloat(inv.balance_due) || 0,
        amount_paid: parseFloat(inv.amount_paid) || 0,
        date: inv.invoice_date,
        due_date: inv.due_date,
        status: inv.status,
      });
    }

    const result = customers.map((c) => ({
      ...c,
      outstanding_invoices: invoicesByCustomer[c.id] || [],
      total_outstanding: (invoicesByCustomer[c.id] || []).reduce((sum, inv) => sum + inv.amount_due, 0),
    }));

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /vendors-with-bills - Vendors with outstanding (unpaid/partially paid) bills
 */
const getVendorsWithBills = async (req, res, next) => {
  try {
    // Get all vendors
    const vendors = await db('vendors')
      .select('id', 'display_name as name', 'email', 'phone')
      .where(function () {
        this.where('is_active', true).orWhereNull('is_active');
      })
      .orderBy('display_name', 'asc');

    // Get outstanding bills (Pending, Partial - i.e. not Paid)
    const bills = await db('bills')
      .select('id', 'vendor_id', 'bill_number', 'total_amount', 'balance_due', 'amount_paid', 'bill_date', 'due_date', 'status')
      .whereIn('status', ['Pending', 'Partial'])
      .where('balance_due', '>', 0)
      .orderBy('bill_date', 'desc');

    // Group bills by vendor
    const billsByVendor = {};
    for (const bill of bills) {
      if (!billsByVendor[bill.vendor_id]) {
        billsByVendor[bill.vendor_id] = [];
      }
      billsByVendor[bill.vendor_id].push({
        id: bill.id,
        bill_number: bill.bill_number,
        total_amount: parseFloat(bill.total_amount) || 0,
        amount_due: parseFloat(bill.balance_due) || 0,
        amount_paid: parseFloat(bill.amount_paid) || 0,
        date: bill.bill_date,
        due_date: bill.due_date,
        status: bill.status,
      });
    }

    const result = vendors.map((v) => ({
      ...v,
      outstanding_bills: billsByVendor[v.id] || [],
      total_outstanding: (billsByVendor[v.id] || []).reduce((sum, bill) => sum + bill.amount_due, 0),
    }));

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete imported batch - removes all non-reconciled transactions from a batch
 */
const removeBatch = async (req, res, next) => {
  try {
    const { batchId } = req.params;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    // Find all transactions in this batch
    const batchTxns = await db('bank_transactions')
      .where({ import_batch_id: batchId });

    if (batchTxns.length === 0) {
      return res.status(404).json({ error: 'No transactions found for this batch' });
    }

    // Check for reconciled transactions
    const reconciledCount = batchTxns.filter((t) => t.is_reconciled).length;
    const deletableIds = batchTxns.filter((t) => !t.is_reconciled).map((t) => t.id);

    // Delete non-reconciled transactions
    let deletedCount = 0;
    if (deletableIds.length > 0) {
      deletedCount = await db('bank_transactions')
        .whereIn('id', deletableIds)
        .del();
    }

    res.json({
      data: {
        deleted_count: deletedCount,
        skipped_reconciled: reconciledCount,
        total_in_batch: batchTxns.length,
        batch_id: batchId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /:id/uncategorize - Reset a transaction back to uncategorized.
 * Reverses any payment allocations that were created during categorization.
 */
const uncategorizeTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db('bank_transactions').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Bank transaction not found' });
    }
    if (existing.categorization_status !== 'categorized') {
      return res.status(400).json({ error: 'Transaction is not categorized' });
    }
    if (existing.is_reconciled) {
      return res.status(400).json({ error: 'Cannot uncategorize a reconciled transaction' });
    }

    // Reverse payment_received allocations (customer payments)
    const prevPaymentReceived = await db('payments_received').where({ bank_transaction_id: id }).first();
    if (prevPaymentReceived) {
      const prevAllocations = await db('payment_received_allocations')
        .where({ payment_received_id: prevPaymentReceived.id });
      for (const alloc of prevAllocations) {
        const invoice = await db('invoices').where({ id: alloc.invoice_id }).first();
        if (invoice) {
          const newPaid = Math.max(parseFloat(invoice.amount_paid) - parseFloat(alloc.allocated_amount), 0);
          const newBalance = parseFloat(invoice.total_amount) - newPaid;
          let newStatus = 'Final';
          if (newPaid >= parseFloat(invoice.total_amount)) newStatus = 'Paid';
          else if (newPaid > 0) newStatus = 'Partial';
          await db('invoices').where({ id: alloc.invoice_id }).update({
            amount_paid: parseFloat(newPaid.toFixed(2)),
            balance_due: parseFloat(Math.max(0, newBalance).toFixed(2)),
            status: newStatus,
            updated_at: new Date(),
          });
        }
      }
      await db('payment_received_allocations').where({ payment_received_id: prevPaymentReceived.id }).del();
      await db('payments_received').where({ id: prevPaymentReceived.id }).del();
    }

    // Reverse payment_made allocations (vendor payments)
    const prevPaymentMade = await db('payments_made').where({ bank_transaction_id: id }).first();
    if (prevPaymentMade) {
      const prevAllocations = await db('payment_made_allocations')
        .where({ payment_made_id: prevPaymentMade.id });
      for (const alloc of prevAllocations) {
        const bill = await db('bills').where({ id: alloc.bill_id }).first();
        if (bill) {
          const newPaid = Math.max(parseFloat(bill.amount_paid) - parseFloat(alloc.allocated_amount), 0);
          const newBalance = parseFloat(bill.total_amount) - newPaid;
          let newStatus = 'Pending';
          if (newPaid >= parseFloat(bill.total_amount)) newStatus = 'Paid';
          else if (newPaid > 0) newStatus = 'Partial';
          await db('bills').where({ id: alloc.bill_id }).update({
            amount_paid: parseFloat(newPaid.toFixed(2)),
            balance_due: parseFloat(Math.max(0, newBalance).toFixed(2)),
            status: newStatus,
            updated_at: new Date(),
          });
        }
      }
      await db('payment_made_allocations').where({ payment_made_id: prevPaymentMade.id }).del();
      await db('payments_made').where({ id: prevPaymentMade.id }).del();
    }

    // Reset categorization fields
    await db('bank_transactions').where({ id }).update({
      category: null,
      category_type: null,
      categorization_status: 'uncategorized',
      sub_account_id: null,
      customer_id: null,
      vendor_id: null,
      transfer_account_id: null,
      store_as_advance: false,
      advance_amount: null,
      notes: null,
      updated_at: new Date(),
    });

    const updated = await db('bank_transactions').where({ id }).first();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  create,
  importTransactions,
  importFile,
  previewFile,
  getBankFormats,
  categorize,
  categorizeTransaction,
  uncategorizeTransaction,
  getSubAccounts,
  getCategorizationOptions,
  getCustomersWithInvoices,
  getVendorsWithBills,
  update,
  remove,
  removeBatch,
};
