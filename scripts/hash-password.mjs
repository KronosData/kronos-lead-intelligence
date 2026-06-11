#!/usr/bin/env node
/**
 * Generates INTERNAL_ACCESS_PASSWORD_HASH from a password you type locally.
 * The password is never stored — only the hash is printed.
 *
 * Usage (Windows PowerShell or terminal):
 *   node scripts/hash-password.mjs
 *
 * Copy the output line to Vercel as INTERNAL_ACCESS_PASSWORD_HASH.
 * Do NOT save it to any file or paste it in the chat.
 */

import { scrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const password = await readHiddenLine('Contraseña (no se mostrará en pantalla): ')

if (!password) {
  process.stderr.write('Error: contraseña vacía.\n')
  process.exit(1)
}

const salt = randomBytes(32)
const hash = await scryptAsync(password, salt, 64, { N: 65536, r: 8, p: 1 })

const result = `scrypt:65536:8:1:${salt.toString('hex')}:${hash.toString('hex')}`

process.stdout.write('\n')
process.stdout.write('─── Copia este valor en Vercel como INTERNAL_ACCESS_PASSWORD_HASH ───\n')
process.stdout.write(result + '\n')
process.stdout.write('──────────────────────────────────────────────────────────────────────\n')
process.stdout.write('(Solo en Vercel. No lo guardes en ningún archivo del repositorio.)\n')

// ── Helpers ────────────────────────────────────────────────────────────────

function readHiddenLine(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt)

    if (process.stdin.isTTY && process.stdin.setRawMode) {
      // Hide input character by character (Unix + Windows Terminal)
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
        } else if (char === '') {          // Ctrl+C
          process.stdout.write('\n')
          process.exit(0)
        } else if (char === '' || char === '\b') { // Backspace
          if (value.length > 0) value = value.slice(0, -1)
        } else if (char >= ' ') {               // Printable chars only
          value += char
        }
      }
      process.stdin.on('data', onData)
    } else {
      // Fallback: visible input (non-TTY / piped)
      process.stdin.setEncoding('utf8')
      process.stdin.resume()
      let buf = ''
      process.stdin.on('data', (chunk) => { buf += chunk })
      process.stdin.on('end', () => { resolve(buf.replace(/[\r\n]+$/, '')) })
    }
  })
}
