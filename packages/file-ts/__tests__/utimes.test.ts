// @ts-nocheck
import { fs } from '../test-utils/common';

describe('utimes', () => {
  const filename = 'x.txt';

  function expect_ok(resource: string | number, atime: Date | number, mtime: Date | number) {
    const stats = typeof resource == 'string' ? fs.statSync(resource) : fs.fstatSync(resource);
    // check up to single-second precision since sub-second precision is OS and fs dependent
    expect(fs._toUnixTimestamp(atime)).toEqual(fs._toUnixTimestamp(stats.atime));
    expect(fs._toUnixTimestamp(mtime)).toEqual(fs._toUnixTimestamp(stats.mtime));
  }

  async function runTest(atime: Date | number, mtime: Date | number): Promise<void> {
    await fs.promises.utimes(filename, atime, mtime);
    expect_ok(filename, atime, mtime);

    try {
      await fs.promises.utimes('foobarbaz', atime, mtime);
    } catch (error) {
      // @ts-ignore
      expect(error.code).toEqual('ENOENT');
    }

    // don't close this fd
    const handle = await fs.promises.open(filename, 'r');

    await handle.utimes(atime, mtime);
    expect_ok(handle.fd, atime, mtime);

    fs.utimesSync(filename, atime, mtime);
    expect_ok(filename, atime, mtime);

    // some systems don't have futimes
    // if there's an error, it be ENOSYS
    try {
      fs.futimesSync(handle.fd, atime, mtime);
      expect_ok(handle.fd, atime, mtime);
    } catch (err) {
      expect(err.code).toEqual('ENOTSUP');
    }

    try {
      fs.utimesSync('foobarbaz', atime, mtime);
    } catch (err) {
      expect(err.code).toEqual('ENOENT');
    }

    try {
      fs.futimesSync(-1, atime, mtime);
    } catch (err) {
      expect(err.code).toEqual('EBADF');
    }
  }

  test('utimes work', async () => {
    await runTest(new Date('1982/09/10 13:37:00'), new Date('1982/09/10 13:37:00'));
    await runTest(new Date(), new Date());
    await runTest(123456.789, 123456.789);
    const stats = fs.statSync(filename);
    await runTest(stats.atime, stats.mtime);
  });
});
