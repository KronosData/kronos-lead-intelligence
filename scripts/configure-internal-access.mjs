#!/usr/bin/env node
/**
 * Kronos Lead Intelligence — Configuración de acceso interno
 *
 * Qué hace este script:
 *   1. Pide la contraseña (sin mostrarla en pantalla)
 *   2. Pide confirmarla
 *   3. Genera un hash seguro con scrypt
 *   4. Genera SESSION_SECRET criptográfico
 *   5. Configura las variables en Vercel (producción + preview)
 *   6. Actualiza el archivo .env local
 *
 * La contraseña nunca se guarda ni se imprime.
 * Solo el hash va a Vercel y al .env local.
 *
 * Uso: node scripts/configure-internal-access.mjs
 */

import { scrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

// ── 4. Configurar Vercel ───────────────────────────────────────────────────

process.stdout.write('\nConfigurando variables en Vercel...\n')

const envVars = [
  { name: 'INTERNAL_ACCESS_PASSWORD_HASH', value: passwordHash },
  { name: 'SESSION_SECRET',                value: sessionSecret },
  { name: 'AUTHORIZED_EMAILS',             value: 'alejandro@kronosdata.tech' },
]
const targets = ['production', 'preview']

for (const { name, value } of envVars) {
  for (const target of targets) {
    try {
      // Remove existing value first (ignore errors if it doesn't exist)
      await run('npx', ['vercel', 'env', 'rm', name, target, '--yes'], null)
    } catch { /* ok — might not exist */ }

    await run('npx', ['vercel', 'env', 'add', name, target], value)
    process.stdout.write(`  ✓ ${name} → ${target}\n`)
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

// ── Helpers ────────────────────────────────────────────────────────────────

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
      // Fallback for non-TTY (e.g. piped input)
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

function run(cmd, args, stdinValue) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      cwd: ROOT,
    })

    if (stdinValue !== null && stdinValue !== undefined) {
      proc.stdin.write(stdinValue + '\n')
    }
    proc.stdin.end()

    let out = ''
    proc.stdout.on('data', d => { out += d.toString() })
    proc.stderr.on('data', d => { out += d.toString() })

    proc.on('close', code => {
      if (code === 0) resolve(out)
      else reject(new Error(`[${cmd} ${args.join(' ')}] exit ${code}: ${out.trim()}`))
    })
  })
}
