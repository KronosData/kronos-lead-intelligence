#!/usr/bin/env node
/**
 * Kronos Lead Intelligence — Configuración de acceso interno
 *
 * Qué hace este script:
 *   1. Pide la contraseña (sin mostrarla en pantalla)
 *   2. Genera un hash seguro con scrypt
 *   3. Genera SESSION_SECRET criptográfico
 *   4. Configura las variables en Vercel vía API REST (sin CLI subprocess)
 *   5. Actualiza el archivo .env local
 *
 * La contraseña nunca se guarda ni se imprime.
 * Solo el hash va a Vercel y al .env local.
 *
 * Uso: node scripts/configure-internal-access.mjs
 * Requiere: npx vercel login + npx vercel link (ya hecho)
 */

import { scrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { homedir } from 'node:os'
import { createInterface } from 'node:readline'

const scryptAsync = promisify(scrypt)
const ROOT = resolve(import.meta.dirname, '..')

// ── 1. Leer contraseña con input oculto ───────────────────────────────────

const password = await readHidden('\nContraseña nueva (no se mostrará): ')
process.stdout.write('\n')

if (!password || password.length < 8) {
  err('La contraseña debe tener al menos 8 caracteres.')
}

const confirm = await readHidden('Confirmar contraseña: ')
process.stdout.write('\n')

if (password !== confirm) {
  err('Las contraseñas no coinciden. Vuelve a ejecutar el script.')
}

// ── 2. Generar hash scrypt ─────────────────────────────────────────────────

process.stdout.write('\nGenerando hash seguro (scrypt N=65536, maxmem=128 MB)...\n')

const SCRYPT_PARAMS = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }
let passwordHash
try {
  const salt = randomBytes(32)
  const hashBuf = await scryptAsync(password, salt, 64, SCRYPT_PARAMS)
  passwordHash = `scrypt:65536:8:1:${salt.toString('hex')}:${hashBuf.toString('hex')}`
} catch (e) {
  err(`No se pudo generar el hash: ${e.message}\nAsegúrate de usar Node.js 18 o superior.`)
}

// ── 3. Generar SESSION_SECRET ──────────────────────────────────────────────

const sessionSecret = randomBytes(64).toString('hex')
process.stdout.write('SESSION_SECRET generado (64 bytes).\n')

// ── 4. Configurar Vercel vía API REST ──────────────────────────────────────

process.stdout.write('\nConfigurando variables en Vercel...\n')

const { token, projectId, teamId } = loadVercelConfig()

const envVars = [
  { key: 'INTERNAL_ACCESS_PASSWORD_HASH', value: passwordHash,             type: 'sensitive' },
  { key: 'SESSION_SECRET',                value: sessionSecret,            type: 'sensitive' },
  { key: 'AUTHORIZED_EMAILS',             value: 'alejandro@kronosdata.tech', type: 'plain' },
]
const targets = ['production', 'preview']

// Get existing vars once
const existing = await vercelListEnv(token, projectId, teamId)

for (const { key, value, type } of envVars) {
  const found = existing.find(e => e.key === key)
  if (found) {
    await vercelPatchEnv(token, projectId, teamId, found.id, value, targets)
    process.stdout.write(`  ✓ ${key} actualizada (production + preview)\n`)
  } else {
    await vercelCreateEnv(token, projectId, teamId, key, value, type, targets)
    process.stdout.write(`  ✓ ${key} creada (production + preview)\n`)
  }
}

// ── 5. Actualizar .env local ──────────────────────────────────────────────

process.stdout.write('\nActualizando .env local...\n')

const envPath = resolve(ROOT, '.env')
let envContent = ''
try { envContent = readFileSync(envPath, 'utf8') } catch { /* file might not exist */ }

const updates = {
  INTERNAL_ACCESS_PASSWORD_HASH: passwordHash,
  SESSION_SECRET: sessionSecret,
}

for (const [key, val] of Object.entries(updates)) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  if (pattern.test(envContent)) {
    envContent = envContent.replace(pattern, `${key}=${val}`)
  } else {
    envContent += `\n${key}=${val}`
  }
}

writeFileSync(envPath, envContent.trim() + '\n', 'utf8')
process.stdout.write('  ✓ .env actualizado\n')

// ── 6. Listo ───────────────────────────────────────────────────────────────

process.stdout.write('\n✅ Configuración completada.\n')
process.stdout.write('   La contraseña NO fue guardada en ningún archivo.\n')
process.stdout.write('   Vuelve a Claude Code — continuará automáticamente.\n\n')

// ── Helpers: Vercel API ─────────────────────────────────────────────────────

function loadVercelConfig() {
  // Read Vercel auth token
  const tokenPaths = [
    join(homedir(), 'AppData', 'Roaming', 'xdg.data', 'com.vercel.cli', 'auth.json'),
    join(homedir(), '.vercel', 'auth.json'),
    join(homedir(), '.config', 'vercel', 'auth.json'),
  ]
  let token = process.env.VERCEL_TOKEN || null
  if (!token) {
    for (const p of tokenPaths) {
      try {
        const data = JSON.parse(readFileSync(p, 'utf8'))
        if (data.token) { token = data.token; break }
      } catch { /* not found at this path */ }
    }
  }
  if (!token) err('No se encontró token de Vercel. Ejecuta: npx vercel login')

  // Read project config from .vercel/repo.json
  const repoPath = join(ROOT, '.vercel', 'repo.json')
  let projectId, teamId
  try {
    const data = JSON.parse(readFileSync(repoPath, 'utf8'))
    projectId = data.projects?.[0]?.id
    teamId = data.projects?.[0]?.orgId
  } catch {
    err('No se encontró .vercel/repo.json. Ejecuta: npx vercel link')
  }
  if (!projectId) err('project.json no contiene un ID de proyecto. Ejecuta: npx vercel link')

  return { token, projectId, teamId }
}

async function vercelApi(path, token, method, body) {
  const url = `https://api.vercel.com${path}`
  const opts = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Vercel API ${method} ${path} → ${res.status}: ${txt.slice(0, 200)}`)
  }
  return res.json()
}

async function vercelListEnv(token, projectId, teamId) {
  const data = await vercelApi(`/v9/projects/${projectId}/env?teamId=${teamId}&limit=50`, token, 'GET')
  return data.envs || []
}

async function vercelPatchEnv(token, projectId, teamId, envId, value, targets) {
  await vercelApi(`/v9/projects/${projectId}/env/${envId}?teamId=${teamId}`, token, 'PATCH', { value, target: targets })
}

async function vercelCreateEnv(token, projectId, teamId, key, value, type, targets) {
  await vercelApi(`/v10/projects/${projectId}/env?teamId=${teamId}`, token, 'POST', { key, value, type, target: targets })
}

// ── Helpers: I/O ────────────────────────────────────────────────────────────

function err(msg) {
  process.stderr.write(`\n❌ ${msg}\n\n`)
  process.exit(1)
}

function readHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt)

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.setEncoding('utf8')
      process.stdin.resume()
      let value = ''

      const onData = (char) => {
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.removeListener('data', onData)
          resolve(value)
        } else if (char === '') {
          process.stdout.write('\n')
          process.exit(0)
        } else if (char === '' || char === '\b') {
          if (value.length > 0) value = value.slice(0, -1)
        } else if (char >= ' ') {
          value += char
        }
      }
      process.stdin.on('data', onData)
    } else {
      // Fallback for non-TTY (piped input)
      process.stdin.setEncoding('utf8')
      process.stdin.resume()
      let buf = ''
      const onData = (chunk) => { buf += chunk }
      const onEnd = () => resolve(buf.replace(/[\r\n]+$/, ''))
      process.stdin.once('data', onData)
      process.stdin.once('end', onEnd)
    }
  })
}
