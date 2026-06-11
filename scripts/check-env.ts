import 'dotenv/config'
const url = process.env.DATABASE_URL ?? ''
const masked = url.replace(/:([^@]+)@/, ':***@')
console.log('DATABASE_URL:', masked || 'NOT SET ❌')
console.log('Configured:', !!url ? '✓' : '❌')
