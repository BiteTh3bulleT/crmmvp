import { generateCorrelationId, getCorrelationIdFromRequest, createResponseHeaders } from '@/lib/correlation'

describe('Correlation ID', () => {
  describe('generateCorrelationId', () => {
    it('generates a valid UUID', () => {
      const id = generateCorrelationId()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('generates unique IDs', () => {
      const id1 = generateCorrelationId()
      const id2 = generateCorrelationId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('getCorrelationIdFromRequest', () => {
    it('returns existing correlation ID from headers', () => {
      const request = new Request('https://example.com', {
        headers: { 'x-correlation-id': 'existing-id-123' },
      })

      const id = getCorrelationIdFromRequest(request)
      expect(id).toBe('existing-id-123')
    })

    it('generates new ID when header is missing', () => {
      const request = new Request('https://example.com')

      const id = getCorrelationIdFromRequest(request)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('createResponseHeaders', () => {
    it('includes correlation ID header', () => {
      const headers = createResponseHeaders('test-id-123')
      expect(headers.get('x-correlation-id')).toBe('test-id-123')
    })

    it('includes additional headers', () => {
      const headers = createResponseHeaders('test-id-123', {
        'Content-Type': 'application/json',
      })
      expect(headers.get('x-correlation-id')).toBe('test-id-123')
      expect(headers.get('Content-Type')).toBe('application/json')
    })
  })
})
