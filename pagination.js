// Parses ?page= & ?limit= from a request query.
// Returns null when neither is supplied, so routes can preserve their existing
// "return the full array" behavior for internal/service-to-service callers
// that don't know about (or need) pagination.
function parsePagination(query) {
  const { page, limit } = query;
  if (page === undefined && limit === undefined) return null;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  return { page: pageNum, limit: limitNum, skip: (pageNum - 1) * limitNum };
}

// Wraps a page of results in a standard envelope.
function paginatedResponse(data, total, { page, limit }) {
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

module.exports = { parsePagination, paginatedResponse };
