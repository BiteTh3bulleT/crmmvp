import { logger } from '@/lib/logger'

describe('Structured Logger', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('logs info messages with JSON format', () => {
    logger.info('Test message')

    expect(consoleLogSpy).toHaveBeenCalled()
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])
    expect(loggedData.level).toBe('info')
    expect(loggedData.message).toBe('Test message')
    expect(loggedData.timestamp).toBeDefined()
  })

  it('logs warnings to console.warn', () => {
    logger.warn('Warning message')

    expect(consoleWarnSpy).toHaveBeenCalled()
    const loggedData = JSON.parse(consoleWarnSpy.mock.calls[0][0])
    expect(loggedData.level).toBe('warn')
  })

  it('logs errors to console.error', () => {
    logger.error('Error message')

    expect(consoleErrorSpy).toHaveBeenCalled()
    const loggedData = JSON.parse(consoleErrorSpy.mock.calls[0][0])
    expect(loggedData.level).toBe('error')
  })

  it('includes correlation ID when provided', () => {
    logger.info('Test message', { correlationId: 'test-correlation-123' })

    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])
    expect(loggedData.correlationId).toBe('test-correlation-123')
  })

  it('includes user ID when provided', () => {
    logger.info('Test message', { userId: 'user-123' })

    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])
    expect(loggedData.userId).toBe('user-123')
  })

  it('includes metadata when provided', () => {
    logger.info('Test message', { metadata: { action: 'test', value: 42 } })

    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0])
    expect(loggedData.metadata).toEqual({ action: 'test', value: 42 })
  })
})
