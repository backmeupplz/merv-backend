import 'core-js'
import 'reflect-metadata'

import { spawn } from 'bun'
import checkPendingSignerRequests from 'helpers/checkPendingSignerRequests'

const cpus = navigator.hardwareConcurrency
const buns = new Array(cpus)

console.log(`Starting ${cpus} buns`)

for (let i = 0; i < cpus; i++) {
  buns[i] = spawn({
    cmd: ['bun', './src/app.ts'],
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })
}

console.log('All buns started')

setInterval(async () => {
  await checkPendingSignerRequests()
}, 10_000)
console.log('Checking pending signer requests every 10 seconds started')

function kill() {
  console.log('Killing all buns')
  for (const bun of buns) {
    bun.kill()
  }
  process.exit()
}

process.on('SIGINT', kill)
process.on('exit', kill)
