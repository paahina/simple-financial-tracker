const { HttpStatus } = require('../config/constants');
const { parsePagination, paginatedResponse } = require('./pagination');

const resolveTimeZone = (value) => {
  const timezone = value || 'UTC';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return timezone;
  } catch {
    const error = new Error('Invalid timezone');
    error.statusCode = HttpStatus.BAD_REQUEST;
    throw error;
  }
};

const amountSums = (kind) => {
  if (kind === 'transaction') {
    return {
      addedAmount: { $sum: { $cond: [{ $eq: ['$type', 'INCOME'] }, '$amount', 0] } },
      deductedAmount: { $sum: { $cond: [{ $eq: ['$type', 'EXPENSE'] }, '$amount', 0] } },
    };
  }
  if (kind === 'transfer') {
    const noFromAccount = { $eq: [{ $ifNull: ['$fromAccountId', null] }, null] };
    const hasFromAccount = { $ne: [{ $ifNull: ['$fromAccountId', null] }, null] };
    const noToAccount = { $eq: [{ $ifNull: ['$toAccountId', null] }, null] };
    const hasToAccount = { $ne: [{ $ifNull: ['$toAccountId', null] }, null] };
    return {
      addedAmount: {
        $sum: {
          $cond: [{ $and: [noFromAccount, hasToAccount] }, '$amount', 0],
        },
      },
      deductedAmount: {
        $sum: {
          $cond: [{ $and: [hasFromAccount, noToAccount] }, '$amount', 0],
        },
      },
    };
  }
  return {
    addedAmount: { $sum: '$amount' },
    deductedAmount: { $sum: 0 },
  };
};

const listActivityDays = async (Model, filter, query, { kind = 'transaction' } = {}) => {
  const timezone = resolveTimeZone(query.timezone);
  const { page, limit, skip } = parsePagination(query);
  const [result] = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate', timezone } },
        count: { $sum: 1 },
        ...amountSums(kind),
      },
    },
    { $sort: { _id: -1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: 'total' }],
      },
    },
  ]);
  const total = result?.meta[0]?.total || 0;
  const data = (result?.data || []).map((row) => ({
    date: row._id,
    count: row.count,
    addedAmount: row.addedAmount,
    deductedAmount: row.deductedAmount,
  }));
  return paginatedResponse({ data, total, page, limit });
};

module.exports = { listActivityDays };
