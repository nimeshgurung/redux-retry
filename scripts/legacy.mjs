import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.compat/legacy');
const version = '0.0.8';
const integrity =
  '9yzOk52yjhhF/dBXOPG8nMVDbfKWir8IWDD7k9EF6DCCd8RE0Xj+bJOrXflapV8rGSkUNW3NSPP4AIOUyKrqSQ==';
mkdirSync(output, { recursive: true });

function run(command, args, cwd = root, capture = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    env: {
      ...process.env,
      npm_config_cache: process.env.npm_config_cache ?? '/tmp/redux-retry-npm-cache',
    },
  });
}

const response = await fetch('https://registry.npmjs.org/redux-retry/-/redux-retry-0.0.7.tgz');
assert.ok(response.ok, `Legacy package download failed: ${response.status}`);
const originalArchive = new Uint8Array(await response.arrayBuffer());
assert.equal(createHash('sha512').update(originalArchive).digest('base64'), integrity);
const originalTarball = join(output, 'redux-retry-0.0.7.tgz');
writeFileSync(originalTarball, originalArchive);
const original = join(output, 'original');
const candidate = join(output, 'candidate');
const unpacked = join(output, 'unpacked');
for (const directory of [original, candidate, unpacked]) {
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
}
run('tar', ['-xzf', originalTarball, '-C', original]);
cpSync(join(original, 'package'), candidate, { recursive: true });
const originalManifest = JSON.parse(readFileSync(join(candidate, 'package.json'), 'utf8'));
const manifest = {
  ...originalManifest,
  version,
  files: ['dist', 'LICENSE', 'README.md', 'assets/logos/blue-nodes.png'],
};
writeFileSync(join(candidate, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
cpSync(join(root, 'docs/legacy.md'), join(candidate, 'README.md'));
mkdirSync(join(candidate, 'assets/logos'), { recursive: true });
cpSync(join(root, 'assets/logos/blue-nodes.png'), join(candidate, 'assets/logos/blue-nodes.png'));
const [pack] = JSON.parse(
  run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', output], candidate, true),
);
const tarball = join(output, pack.filename);
run('tar', ['-xzf', tarball, '-C', unpacked]);
const packaged = join(unpacked, 'package');
const packagedManifest = JSON.parse(readFileSync(join(packaged, 'package.json'), 'utf8'));
const { version: packagedVersion, files, ...contract } = packagedManifest;
assert.equal(packagedVersion, version);
assert.deepEqual(files, manifest.files);
const originalContract = { ...originalManifest };
delete originalContract.version;
assert.deepEqual(contract, originalContract);
const runtimeFiles = readdirSync(join(original, 'package/dist')).sort();
assert.deepEqual(readdirSync(join(packaged, 'dist')).sort(), runtimeFiles);
for (const file of [...runtimeFiles.map((name) => `dist/${name}`), 'LICENSE']) {
  assert.deepEqual(
    readFileSync(join(packaged, file)),
    readFileSync(join(original, 'package', file)),
  );
}
assert.deepEqual(
  readFileSync(join(packaged, 'README.md')),
  readFileSync(join(root, 'docs/legacy.md')),
);
assert.deepEqual(
  readFileSync(join(packaged, 'assets/logos/blue-nodes.png')),
  readFileSync(join(root, 'assets/logos/blue-nodes.png')),
);

const consumer = join(output, 'consumer');
mkdirSync(consumer, { recursive: true });
writeFileSync(
  join(consumer, 'package.json'),
  JSON.stringify({
    name: 'redux-retry-legacy-consumer',
    private: true,
    dependencies: {
      'redux-retry': `file:${tarball}`,
      'redux-retry-original': `file:${originalTarball}`,
      react: '16.14.0',
      'react-dom': '16.14.0',
      'react-test-renderer': '16.14.0',
      'react-redux': '6.0.1',
      redux: '4.2.1',
      'redux-saga': '1.5.1',
      'redux-thunk': '2.4.2',
    },
  }),
);
// Reinstall the local archives so npm cannot reuse an earlier documentation build.
for (const name of ['redux-retry', 'redux-retry-original']) {
  rmSync(join(consumer, 'node_modules', name), { recursive: true, force: true });
}
run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
run(process.execPath, ['--test', 'tests/legacy-consumer.mjs']);
const report = {
  version,
  basedOn: '0.0.7',
  runtimeFiles,
  runtimeIdentical: true,
  manifestContractIdentical: true,
  sha512: createHash('sha512').update(readFileSync(tarball)).digest('base64'),
  tarball,
};
writeFileSync(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Verified legacy ${version}: unchanged runtime and peer requirements; consumer tests passed.`,
);
