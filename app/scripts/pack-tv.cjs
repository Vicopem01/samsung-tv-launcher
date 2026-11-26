// Zip dist-tv/ into a .wgt and sign it with your Samsung certificate profile.
// Usage: npm run pack:tv            (uses the active signing profile)
//        TIZEN_PROFILE=name npm run pack:tv
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const appDir = path.resolve(__dirname, '..')
const distDir = path.join(appDir, 'dist-tv')
const outDir = path.join(appDir, 'build-tv')
const unsigned = path.join(outDir, 'OurHome-unsigned.wgt')
const signed = path.join(outDir, 'OurHome.wgt')
const tz = process.env.TZ_CLI
  || path.join(os.homedir(), '.tizen-extension-platform/server/sdktools/data/tools/tizen-core/tz')

if (!fs.existsSync(path.join(distDir, 'config.xml'))) {
  console.error('dist-tv/ is missing or incomplete. Run: npm run build:tv')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
for (const file of [unsigned, signed]) fs.rmSync(file, { force: true })

execFileSync('zip', ['-r', '-X', '-q', unsigned, '.'], { cwd: distDir, stdio: 'inherit' })
console.log('Zipped', path.relative(appDir, unsigned))

const profile = process.env.TIZEN_PROFILE
const args = ['pack', '-t', 'wgt', '-b', unsigned, '-o', signed]
if (profile) args.push('-s', profile)
execFileSync(tz, args, { cwd: outDir, stdio: 'inherit' })

if (!fs.existsSync(signed)) {
  console.error('Signing did not produce', signed)
  process.exit(1)
}
console.log('Signed package:', path.relative(appDir, signed))
