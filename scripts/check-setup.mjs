#!/usr/bin/env node

import { spawnSync } from 'child_process'
import fs from 'fs'

const isWin = process.platform === 'win32'
const npmCmd = 'npm'

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

function spawn(command, args, options = {}) {
  if (!isWin) return spawnSync(command, args, options)
  const cmdline = [command, ...args].map(escapeCmdArg).join(' ')
  return spawnSync('cmd.exe', ['/d', '/s', '/c', cmdline], options)
}

const colors = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
}

function runCapture(command, args) {
  const result = spawn(command, args, { encoding: 'utf8' })
  const stdout = (result.stdout ?? '').toString()
  const stderr = (result.stderr ?? '').toString()
  return { status: result.status ?? 1, stdout, stderr }
}

let passed = 0
let failed = 0

function pass(message) {
  passed++
  console.log(colors.green(`OK ${message}`))
}
function fail(message) {
  failed++
  console.log(colors.red(`x ${message}`))
}
function warn(message) {
  console.log(colors.yellow(`! ${message}`))
}
function info(message) {
  console.log(colors.blue(`i ${message}`))
}

function versionGte(version, requiredMajor) {
  const major = Number.parseInt(version.split('.')[0] ?? '0', 10)
  return !Number.isNaN(major) && major >= requiredMajor
}

console.log(colors.blue('CRM MVP Setup Validation'))
console.log(colors.blue('========================'))

if (versionGte(process.versions.node, 18)) pass(`Node.js ${process.versions.node} (18+ required)`)
else fail(`Node.js ${process.versions.node} (18+ required)`)

{
  const res = runCapture(npmCmd, ['-v'])
  if (res.status === 0) pass(`npm ${res.stdout.trim()}`)
  else fail('npm not found')
}

{
  const res = runCapture('docker', ['--version'])
  if (res.status === 0) pass(res.stdout.trim())
  else fail('Docker not found')
}

{
  const plugin = runCapture('docker', ['compose', 'version'])
  const legacy = runCapture('docker-compose', ['version'])
  if (plugin.status === 0) pass(`Docker Compose (plugin) ${plugin.stdout.trim()}`)
  else if (legacy.status === 0) pass(`Docker Compose ${legacy.stdout.trim()}`)
  else fail('Docker Compose not found')
}

if (fs.existsSync('package.json')) pass('In CRM MVP directory (package.json)')
else fail('Not in CRM MVP directory (package.json not found)')

if (fs.existsSync('prisma/schema.prisma')) pass('Prisma schema exists (prisma/schema.prisma)')
else fail('Prisma schema not found (prisma/schema.prisma)')

if (fs.existsSync('docker-compose.yml')) pass('Docker Compose config exists (docker-compose.yml)')
else fail('Docker Compose config not found (docker-compose.yml)')

if (fs.existsSync('node_modules')) pass('node_modules directory exists')
else warn("node_modules directory missing (run 'npm install' or 'npm run startup')")

if (fs.existsSync('.env.local')) pass('.env.local exists')
else if (fs.existsSync('.env.example')) warn(".env.local missing (created by 'npm run startup')")
else fail('No environment file found (.env.local or .env.example)')

console.log('')
info(`Passed: ${passed}`)
if (failed > 0) {
  fail(`Failed: ${failed}`)
  process.exit(1)
} else {
  pass('Ready to start!')
}
