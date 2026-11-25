import { describe, expect, it } from 'vitest';
import { ConflictError, createPage, NotFoundError, OrderStatus } from '../src/index.js';

describe('shared common types and helpers', () => {
  it('creates a page response with the correct page count', () => {
    expect(createPage(['a', 'b'], 2, 2, 3)).toEqual({
      items: ['a', 'b'],
      page: 2,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });
  });

  it('rejects invalid page arguments', () => {
    expect(() => createPage([], 0, 10, 0)).toThrow(RangeError);
    expect(OrderStatus.CONFIRMED).toBe('CONFIRMED');
  });

  it('uses stable error codes and status codes', () => {
    expect(new NotFoundError('Product', 'p1')).toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    expect(new ConflictError('Already processed')).toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
    });
  });
});
