#!/usr/bin/env node

import { spawnSync } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const args = new Set(process.argv.slice(2))
const useAltPort = args.has('--alt') || args.has('--alt-port')
const setupOnly = args.has('--no-dev') || args.has('--setup-only')
const dbPort = useAltPort ? 5434 : 5432
const composeFile = useAltPort ? 'docker-compose.alt.yml' : 'docker-compose.yml'
const isWin = process.platform === 'win32'
const npmCmd = 'npm'

const colors = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
}

function info(message) {
  console.log(colors.blue(`i ${message}`))
}
function ok(message) {
  console.log(colors.green(`OK ${message}`))
}
function warn(message) {
  console.log(colors.yellow(`! ${message}`))
}
function fail(message) {
  console.error(colors.red(`x ${message}`))
}

function exitWithHelp(code, message) {
  if (message) fail(message)
  console.error('')
  console.error('Usage:')
  console.error('  npm run startup')
  console.error('  npm run startup:alt')
  console.error('  node scripts/startup.mjs [--alt] [--no-dev]')
  process.exit(code)
}

function escapeCmdArg(arg) {
  const s = String(arg)
  const escaped = s
    .replaceAll('^', '^^')
    .replaceAll('&', '^&')
    .replaceAll('|', '^|')
    .replaceAll('<', '^<')
    .replaceAll('>', '^>')
    .replaceAll('(', '^(')
    .replaceAll(')', '^)')
    .replaceAll('!', '^!')
    .replaceAll('"', '\\"')
  return /[\s]/.test(escaped) ? `"${escaped}"` : escaped
}

function spawn(command, cmdArgs, options = {}) {
  if (!isWin) return spawnSync(command, cmdArgs, options)
  const cmdline = [command, ...cmdArgs].map(escapeCmdArg).join(' ')
  return spawnSync('cmd.exe', ['/d', '/s', '/c', cmdline], options)
}

function commandExists(command, cmdArgs = ['--version']) {
  const result = spawn(command, cmdArgs, { stdio: 'ignore' })
  return result.status === 0
}

function run(command, cmdArgs, options = {}) {
  const result = spawn(command, cmdArgs, { stdio: 'inherit', ...options })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${cmdArgs.join(' ')}`)
  }
}

function runCapture(command, cmdArgs, options = {}) {
  const result = spawn(command, cmdArgs, { encoding: 'utf8', ...options })
  const stdout = (result.stdout ?? '').toString()
  const stderr = (result.stderr ?? '').toString()
  return { status: result.status ?? 1, stdout, stderr }
}

function getCompose() {
  const pluginOk = commandExists('docker', ['compose', 'version'])
  if (pluginOk) return { cmd: 'docker', baseArgs: ['compose'] }

  const legacyOk = commandExists('docker-compose', ['version'])
  if (legacyOk) return { cmd: 'docker-compose', baseArgs: [] }

  return null
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, 'utf8')
}

function upsertEnvKey(content, key, value, eol) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^\\s*${escapedKey}\\s*=.*$`, 'm')
  const safeValue = `"${value.replaceAll('"', '\\"')}"`

  if (re.test(content)) return content.replace(re, `${key}=${safeValue}`)

  const trimmed = content.trimEnd()
  const suffix = trimmed.length === 0 ? '' : eol + eol
  return `${trimmed}${suffix}${key}=${safeValue}${eol}`
}

function parseEnv(content) {
  const map = new Map()
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    map.set(key, value)
  }
  return map
}

function randomSecretBase64() {
  return crypto.randomBytes(32).toString('base64')
}

function ensureNodeVersion() {
  const major = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10)
  if (Number.isNaN(major) || major < 18) {
    exitWithHelp(1, `Node.js 18+ is required (detected ${process.versions.node}).`)
  }
}

function ensureEnvFiles() {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  const envExamplePath = path.join(process.cwd(), '.env.example')
  const envPath = path.join(process.cwd(), '.env')

  let envLocal = readTextIfExists(envLocalPath)
  if (envLocal == null) {
    const example = readTextIfExists(envExamplePath)
    envLocal = example ?? ''
    fs.writeFileSync(envLocalPath, envLocal, 'utf8')
    ok('Created .env.local')
  }

  const eol = detectEol(envLocal)
  const existing = parseEnv(envLocal)

  const required = {
    DATABASE_URL: `postgresql://postgres:password@localhost:${dbPort}/crm_mvp?schema=public`,
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: randomSecretBase64(),
    SEED_USER_EMAIL: existing.get('SEED_USER_EMAIL') || 'admin@example.com',
    SEED_USER_PASSWORD: 'Password123!',
  }

  let updated = envLocal
  for (const [key, defaultValue] of Object.entries(required)) {
    const current = existing.get(key)
    if (current == null || current === '') {
      updated = upsertEnvKey(updated, key, defaultValue, eol)
      ok(`Set ${key} in .env.local`)
    }
  }

  const parsedAfter = parseEnv(updated)
  const dbUrl = parsedAfter.get('DATABASE_URL')
  const isLocalDbUrl = !!dbUrl && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1'))
  if (isLocalDbUrl && dbUrl && !dbUrl.includes(`:${dbPort}/`)) {
    updated = upsertEnvKey(
      updated,
      'DATABASE_URL',
      `postgresql://postgres:password@localhost:${dbPort}/crm_mvp?schema=public`,
      eol
    )
    ok(`Updated DATABASE_URL to port ${dbPort}`)
  }

  if (updated !== envLocal) fs.writeFileSync(envLocalPath, updated, 'utf8')
  const envExisting = readTextIfExists(envPath)
  if (envExisting == null) {
    fs.writeFileSync(envPath, updated, 'utf8')
    ok('Created .env (for Prisma CLI)')
  } else if (envExisting !== updated) {
    fs.writeFileSync(envPath, updated, 'utf8')
    ok('Updated .env (for Prisma CLI)')
  }

  return parseEnv(updated)
}

async function waitForDatabase(containerId) {
  info('Waiting for database to be ready...')
  const maxRetries = 30
  for (let i = 0; i < maxRetries; i++) {
    const res = spawn('docker', ['exec', containerId, 'pg_isready', '-U', 'postgres'], {
      stdio: 'ignore',
    })
    if (res.status === 0) {
      ok('Database is ready')
      return
    }
    process.stdout.write('.')
    await sleep(2000)
  }
  console.log('')
  throw new Error('Database failed to start in time')
}

function getContainerId(compose, file) {
  const res = runCapture(compose.cmd, [...compose.baseArgs, '-f', file, 'ps', '-q', 'postgres'])
  if (res.status !== 0) return ''
  return res.stdout.trim()
}

async function main() {
  console.log(colors.blue('CRM MVP Startup'))
  console.log(colors.blue('=============='))

  ensureNodeVersion()

  if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
    exitWithHelp(1, 'package.json not found. Run this from the repo root.')
  }

  if (!commandExists('docker', ['--version'])) {
    exitWithHelp(1, 'Docker is not installed (or not on PATH). Install Docker Desktop first.')
  }

  {
    const res = runCapture('docker', ['info'])
    if (res.status !== 0) {
      fail('Docker is installed but the Docker daemon is not reachable.')
      warn('Start Docker Desktop and wait until it shows \"Engine running\".')
      warn('If Docker Desktop is set to Windows containers, switch to Linux containers.')
      process.exit(1)
    }
  }

  const compose = getCompose()
  if (!compose) {
    exitWithHelp(
      1,
      'Docker Compose is not available. Install Docker Desktop (Compose plugin) or docker-compose.'
    )
  }

  if (!fs.existsSync(path.join(process.cwd(), composeFile))) {
    exitWithHelp(1, `Missing ${composeFile}.`)
  }

  info(`Using PostgreSQL port ${dbPort} (${composeFile})`)

  const env = ensureEnvFiles()

  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    info('Installing dependencies...')
    run(npmCmd, ['install'])
    ok('Dependencies installed')
  } else {
    info('Dependencies already installed')
  }

  info('Starting PostgreSQL database...')
  run(compose.cmd, [...compose.baseArgs, '-f', composeFile, 'up', '-d', 'postgres'])

  const containerId = getContainerId(compose, composeFile)
  if (!containerId) {
    fail('PostgreSQL container not found. It may have failed to start (port conflict?).')
    warn('Try: npm run startup:alt')
    process.exit(1)
  }

  try {
    await waitForDatabase(containerId)
  } catch (e) {
    fail(String(e?.message ?? e))
    info('Container logs (last 50 lines):')
    run('docker', ['logs', '--tail', '50', containerId])
    process.exit(1)
  }

  const childEnv = { ...process.env, ...Object.fromEntries(env) }

  info('Generating Prisma client...')
  run(npmCmd, ['run', 'db:generate'], { env: childEnv })
  ok('Prisma client generated')

  info('Applying database migrations...')
  run(npmCmd, ['run', 'db:migrate'], { env: childEnv })
  ok('Database migrations applied')

  info('Seeding database with demo data...')
  run(npmCmd, ['run', 'db:seed'], { env: childEnv })
  ok('Demo data seeded')

  if (setupOnly) {
    ok('Setup complete (skipping dev server due to --no-dev)')
    return
  }

  info('Starting development server...')
  info('App: http://localhost:3000')
  info(`DB:  localhost:${dbPort}`)
  info(`Login: ${env.get('SEED_USER_EMAIL') || 'admin@example.com'} / ${env.get('SEED_USER_PASSWORD') || 'Password123!'}`)

  run(npmCmd, ['run', 'dev'], { env: childEnv })
}

await main()
