const parsePagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const paginatedResponse = ({ data, total, page, limit }) => ({
  data,
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
});

const isPaged = (query) => query.page !== undefined && query.page !== '';

const slicePage = (items, query, pageKey = 'page', limitKey = 'limit') => {
  const { page, limit, skip } = parsePagination({
    page: query[pageKey],
    limit: query[limitKey],
  });
  return paginatedResponse({
    data: items.slice(skip, skip + limit),
    total: items.length,
    page,
    limit,
  });
};

module.exports = { parsePagination, paginatedResponse, isPaged, slicePage };
