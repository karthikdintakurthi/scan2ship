import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}))

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-32-chars'
process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-32-chars'
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock crypto for testing
const crypto = require('crypto')
Object.defineProperty(global, 'crypto', {
  value: {
    randomBytes: crypto.randomBytes,
    createHash: crypto.createHash,
    createHmac: crypto.createHmac,
    createCipheriv: crypto.createCipheriv,
    createDecipheriv: crypto.createDecipheriv,
    randomUUID: crypto.randomUUID,
  },
})

// Mock fetch
global.fetch = jest.fn()

// Mock Request and Response for Next.js API routes
global.Request = class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url
    this.method = init.method || 'GET'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.body = init.body
  }
  
  async json() {
    return JSON.parse(this.body || '{}')
  }
  
  async formData() {
    return new FormData()
  }
}

global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(Object.entries(init.headers || {}))
  }
  
  async json() {
    return JSON.parse(this.body || '{}')
  }
}

// Mock NextResponse
global.NextResponse = {
  json: jest.fn((data, init = {}) => ({
    json: jest.fn().mockResolvedValue(data),
    status: init.status || 200,
    headers: new Map(Object.entries(init.headers || {})),
  })),
  redirect: jest.fn((url, status = 302) => ({
    status,
    headers: new Map([['location', url]]),
  })),
  next: jest.fn(() => ({
    status: 200,
  })),
}

global.Headers = class Headers {
  constructor(init = {}) {
    this.map = new Map(Object.entries(init))
  }
  
  get(name) {
    return this.map.get(name.toLowerCase())
  }
  
  set(name, value) {
    this.map.set(name.toLowerCase(), value)
  }
  
  has(name) {
    return this.map.has(name.toLowerCase())
  }
  
  delete(name) {
    this.map.delete(name.toLowerCase())
  }
  
  entries() {
    return this.map.entries()
  }
  
  keys() {
    return this.map.keys()
  }
  
  values() {
    return this.map.values()
  }
}

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
  jest.clearAllMocks()
})

// Mock Prisma - using dedicated mock file
// jest.mock('@/lib/prisma') // Commented out to avoid module resolution issues

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn(),
}))

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
}))

// Mock isomorphic-dompurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((input) => input),
}))

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  rename: jest.fn(),
  rmdir: jest.fn(),
}))

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => {
    const lastDot = filename.lastIndexOf('.')
    return lastDot === -1 ? '' : filename.substring(lastDot)
  }),
  basename: jest.fn((filename) => {
    const lastSlash = filename.lastIndexOf('/')
    return lastSlash === -1 ? filename : filename.substring(lastSlash + 1)
  }),
}))

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    clientId: 'test-client-id',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  createMockClient: (overrides = {}) => ({
    id: 'test-client-id',
    name: 'Test Client',
    email: 'client@example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  createMockOrder: (overrides = {}) => ({
    id: 'test-order-id',
    clientId: 'test-client-id',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  createMockRequest: (overrides = {}) => ({
    headers: new Map(),
    json: jest.fn(),
    formData: jest.fn(),
    nextUrl: new URL('http://localhost:3000'),
    ...overrides,
  }),
  createMockResponse: () => ({
    json: jest.fn(),
    status: jest.fn(),
    headers: new Map(),
  }),
}
