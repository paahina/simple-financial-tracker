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

const listActivityDays = async (Model, filter, query, { signed = false } = {}) => {
  const timezone = resolveTimeZone(query.timezone);
  const { page, limit, skip } = parsePagination(query);
  const amount = signed
    ? { $cond: [{ $eq: ['$type', 'EXPENSE'] }, { $multiply: ['$amount', -1] }, '$amount'] }
    : '$amount';
  const [result] = await Model.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate', timezone } },
        count: { $sum: 1 },
        totalAmount: { $sum: amount },
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
    totalAmount: row.totalAmount,
  }));
  return paginatedResponse({ data, total, page, limit });
};

module.exports = { listActivityDays };
