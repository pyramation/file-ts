// @ts-nocheck
import type * as Node from 'fs';

import { ApiError, ErrorCode } from '../ApiError';
import { FileContents, NoArgCallback, ThreeArgCallback, TwoArgCallback } from '../filesystem';
import { BigIntStats, type BigIntStatsFs, type Stats, type StatsFs } from '../stats';
import { R_OK } from './constants';
import { type Dir, Dirent } from './dir';
import * as promises from './promises';
import { fd2file, nop, normalizeMode, PathLike } from './shared';
import { ReadStream, WriteStream } from './streams';

/**
 * Asynchronous rename. No arguments other than a possible exception are given
 * to the completion callback.
 * @param oldPath
 * @param newPath
 * @param callback
 */
export function rename(oldPath: PathLike, newPath: PathLike, cb: NoArgCallback = nop): void {
  promises
    .rename(oldPath, newPath)
    .then(() => cb())
    .catch(cb);
}

/**
 * Test whether or not the given path exists by checking with the file system.
 * Then call the callback argument with either true or false.
 * @param path
 * @param callback
 * @deprecated Use {@link stat} or {@link access} instead.
 */
export function exists(path: PathLike, cb: (exists: boolean) => unknown = nop): void {
  promises
    .exists(path)
    .then(cb)
    .catch(() => cb(false));
}

/**
 * Asynchronous `stat`.
 * @param path
 * @param callback
 */
export function stat(path: PathLike, callback: TwoArgCallback<Stats>): void;
export function stat(path: PathLike, options: Node.StatOptions & { bigint?: false }, callback: TwoArgCallback<Stats>): void;
export function stat(path: PathLike, options: Node.StatOptions & { bigint: true }, callback: TwoArgCallback<BigIntStats>): void;
export function stat(path: PathLike, options: Node.StatOptions, callback: TwoArgCallback<Stats | BigIntStats>): void;
export function stat(path: PathLike, options?: Node.StatOptions | TwoArgCallback<Stats>, callback: TwoArgCallback<Stats> | TwoArgCallback<BigIntStats> = nop): void {
  callback = typeof options == 'function' ? options : callback;
  promises
    .stat(path, typeof options != 'function' ? options : ({} as object))
    .then(stats => callback(null, stats as Stats & BigIntStats))
    .catch(callback);
}

/**
 * Asynchronous `lstat`.
 * `lstat()` is identical to `stat()`, except that if path is a symbolic link,
 * then the link itself is stat-ed, not the file that it refers to.
 * @param path
 * @param callback
 */
export function lstat(path: PathLike, callback: TwoArgCallback<Stats>): void;
export function lstat(path: PathLike, options: Node.StatOptions & { bigint?: false }, callback: TwoArgCallback<Stats>): void;
export function lstat(path: PathLike, options: Node.StatOptions & { bigint: true }, callback: TwoArgCallback<BigIntStats>): void;
export function lstat(path: PathLike, options: Node.StatOptions, callback: TwoArgCallback<Stats | BigIntStats>): void;
export function lstat(path: PathLike, options?: Node.StatOptions | TwoArgCallback<Stats>, callback: TwoArgCallback<Stats> | TwoArgCallback<BigIntStats> = nop): void {
  callback = typeof options == 'function' ? options : callback;
  promises
    .lstat(path, typeof options != 'function' ? options : ({} as object))
    .then(stats => callback(null, stats as Stats & BigIntStats))
    .catch(callback);
}

/**
 * Asynchronous `truncate`.
 * @param path
 * @param len
 * @param callback
 */
export function truncate(path: PathLike, cb?: NoArgCallback): void;
export function truncate(path: PathLike, len: number, cb?: NoArgCallback): void;
export function truncate(path: PathLike, cbLen: number | NoArgCallback = 0, cb: NoArgCallback = nop): void {
  cb = typeof cbLen === 'function' ? cbLen : cb;
  const len = typeof cbLen === 'number' ? cbLen : 0;
  promises
    .truncate(path, len)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `unlink`.
 * @param path
 * @param callback
 */
export function unlink(path: PathLike, cb: NoArgCallback = nop): void {
  promises
    .unlink(path)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous file open.
 * Exclusive mode ensures that path is newly created.
 *
 * `flags` can be:
 *
 * * `'r'` - Open file for reading. An exception occurs if the file does not exist.
 * * `'r+'` - Open file for reading and writing. An exception occurs if the file does not exist.
 * * `'rs'` - Open file for reading in synchronous mode. Instructs the filesystem to not cache writes.
 * * `'rs+'` - Open file for reading and writing, and opens the file in synchronous mode.
 * * `'w'` - Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
 * * `'wx'` - Like 'w' but opens the file in exclusive mode.
 * * `'w+'` - Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
 * * `'wx+'` - Like 'w+' but opens the file in exclusive mode.
 * * `'a'` - Open file for appending. The file is created if it does not exist.
 * * `'ax'` - Like 'a' but opens the file in exclusive mode.
 * * `'a+'` - Open file for reading and appending. The file is created if it does not exist.
 * * `'ax+'` - Like 'a+' but opens the file in exclusive mode.
 *
 * @see http://www.manpagez.com/man/2/open/
 * @param path
 * @param flags
 * @param mode defaults to `0644`
 * @param callback
 */
export function open(path: PathLike, flag: string, cb?: TwoArgCallback<number>): void;
export function open(path: PathLike, flag: string, mode: number | string, cb?: TwoArgCallback<number>): void;
export function open(path: PathLike, flag: string, cbMode?: number | string | TwoArgCallback<number>, cb: TwoArgCallback<number> = nop): void {
  const mode = normalizeMode(cbMode, 0o644);
  cb = typeof cbMode === 'function' ? cbMode : cb;
  promises
    .open(path, flag, mode)
    .then(handle => cb(null, handle.fd))
    .catch(cb);
}

/**
 * Asynchronously reads the entire contents of a file.
 * @param filename
 * @param options
 * @option options encoding The string encoding for the file contents. Defaults to `null`.
 * @option options flag Defaults to `'r'`.
 * @param callback If no encoding is specified, then the raw buffer is returned.
 */
export function readFile(filename: PathLike, cb: TwoArgCallback<Uint8Array>): void;
export function readFile(filename: PathLike, options: { flag?: string }, callback?: TwoArgCallback<Uint8Array>): void;
export function readFile(filename: PathLike, options: { encoding: BufferEncoding; flag?: string } | BufferEncoding, cb: TwoArgCallback<string>): void;
export function readFile(
  filename: PathLike,
  options?: Node.WriteFileOptions | BufferEncoding | TwoArgCallback<Uint8Array>,
  cb: TwoArgCallback<string> | TwoArgCallback<Uint8Array> = nop
) {
  cb = typeof options === 'function' ? options : cb;

  promises
    .readFile(filename, typeof options === 'function' ? null : options)
    .then(data => cb(null, <string & Uint8Array>data))
    .catch(cb);
}

/**
 * Asynchronously writes data to a file, replacing the file if it already
 * exists.
 *
 * The encoding option is ignored if data is a buffer.
 *
 * @param filename
 * @param data
 * @param options
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'w'`.
 * @param callback
 */
export function writeFile(filename: PathLike, data: FileContents, cb?: NoArgCallback): void;
export function writeFile(filename: PathLike, data: FileContents, encoding?: BufferEncoding, cb?: NoArgCallback): void;
export function writeFile(filename: PathLike, data: FileContents, options?: Node.WriteFileOptions, cb?: NoArgCallback): void;
export function writeFile(filename: PathLike, data: FileContents, cbEncOpts?: Node.WriteFileOptions | NoArgCallback, cb: NoArgCallback = nop): void {
  cb = typeof cbEncOpts === 'function' ? cbEncOpts : cb;
  promises
    .writeFile(filename, data, typeof cbEncOpts != 'function' ? cbEncOpts : null)
    .then(() => cb(null))
    .catch(cb);
}

/**
 * Asynchronously append data to a file, creating the file if it not yet
 * exists.
 *
 * @param filename
 * @param data
 * @param options
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'a'`.
 * @param callback
 */
export function appendFile(filename: PathLike, data: FileContents, cb?: NoArgCallback): void;
export function appendFile(filename: PathLike, data: FileContents, options?: { encoding?: string; mode?: number | string; flag?: string }, cb?: NoArgCallback): void;
export function appendFile(filename: PathLike, data: FileContents, encoding?: string, cb?: NoArgCallback): void;
export function appendFile(filename: PathLike, data: FileContents, cbEncOpts?, cb: NoArgCallback = nop): void {
  cb = typeof cbEncOpts === 'function' ? cbEncOpts : cb;
  promises
    .appendFile(filename, data, typeof cbEncOpts === 'function' ? null : cbEncOpts)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `fstat`.
 * `fstat()` is identical to `stat()`, except that the file to be stat-ed is
 * specified by the file descriptor `fd`.
 * @param fd
 * @param callback
 */
export function fstat(fd: number, cb: TwoArgCallback<Stats>): void;
export function fstat(fd: number, options: Node.StatOptions & { bigint?: false }, cb: TwoArgCallback<Stats>): void;
export function fstat(fd: number, options: Node.StatOptions & { bigint: true }, cb: TwoArgCallback<BigIntStats>): void;
export function fstat(fd: number, options?: Node.StatOptions | TwoArgCallback<Stats>, cb: TwoArgCallback<Stats> | TwoArgCallback<BigIntStats> = nop): void {
  cb = typeof options == 'function' ? options : cb;

  fd2file(fd)
    .stat()
    .then(stats => cb(null, <Stats & BigIntStats>(typeof options == 'object' && options?.bigint ? new BigIntStats(stats) : stats)))
    .catch(cb);
}

/**
 * Asynchronous close.
 * @param fd
 * @param callback
 */
export function close(fd: number, cb: NoArgCallback = nop): void {
  new promises.FileHandle(fd)
    .close()
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous ftruncate.
 * @param fd
 * @param len
 * @param callback
 */
export function ftruncate(fd: number, cb?: NoArgCallback): void;
export function ftruncate(fd: number, len?: number, cb?: NoArgCallback): void;
export function ftruncate(fd: number, lenOrCB?, cb: NoArgCallback = nop): void {
  const length = typeof lenOrCB === 'number' ? lenOrCB : 0;
  cb = typeof lenOrCB === 'function' ? lenOrCB : cb;
  const file = fd2file(fd);
  if (length < 0) {
    throw new ApiError(ErrorCode.EINVAL);
  }
  file.truncate(length)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous fsync.
 * @param fd
 * @param callback
 */
export function fsync(fd: number, cb: NoArgCallback = nop): void {
  fd2file(fd)
    .sync()
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous fdatasync.
 * @param fd
 * @param callback
 */
export function fdatasync(fd: number, cb: NoArgCallback = nop): void {
  fd2file(fd)
    .datasync()
    .then(() => cb())
    .catch(cb);
}

/**
 * Write buffer to the file specified by `fd`.
 * Note that it is unsafe to use fs.write multiple times on the same file
 * without waiting for the callback.
 * @param fd
 * @param buffer Uint8Array containing the data to write to
 *   the file.
 * @param offset Offset in the buffer to start reading data from.
 * @param length The amount of bytes to write to the file.
 * @param position Offset from the beginning of the file where this
 *   data should be written. If position is null, the data will be written at
 *   the current position.
 * @param callback The number specifies the number of bytes written into the file.
 */
export function write(fd: number, buffer: Uint8Array, offset: number, length: number, cb?: ThreeArgCallback<number, Uint8Array>): void;
export function write(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number, cb?: ThreeArgCallback<number, Uint8Array>): void;
export function write(fd: number, data: FileContents, cb?: ThreeArgCallback<number, string>): void;
export function write(fd: number, data: FileContents, position?: number, cb?: ThreeArgCallback<number, string>): void;
export function write(fd: number, data: FileContents, position: number | null, encoding: BufferEncoding, cb?: ThreeArgCallback<number, string>): void;
export function write(fd: number, data: FileContents, cbPosOff?, cbLenEnc?, cbPos?, cb: ThreeArgCallback<number, Uint8Array> | ThreeArgCallback<number, string> = nop): void {
  let buffer: Buffer,
    offset: number,
    length: number,
    position: number | null = null,
    encoding: BufferEncoding;
  const handle = new promises.FileHandle(fd);
  if (typeof data === 'string') {
    // Signature 1: (fd, string, [position?, [encoding?]], cb?)
    encoding = 'utf8';
    switch (typeof cbPosOff) {
    case 'function':
      // (fd, string, cb)
      cb = cbPosOff;
      break;
    case 'number':
      // (fd, string, position, encoding?, cb?)
      position = cbPosOff;
      encoding = <BufferEncoding>(typeof cbLenEnc === 'string' ? cbLenEnc : 'utf8');
      cb = typeof cbPos === 'function' ? cbPos : cb;
      break;
    default:
      // ...try to find the callback and get out of here!
      cb = typeof cbLenEnc === 'function' ? cbLenEnc : typeof cbPos === 'function' ? cbPos : cb;
      cb(new ApiError(ErrorCode.EINVAL, 'Invalid arguments.'));
      return;
    }
    buffer = Buffer.from(data);
    offset = 0;
    length = buffer.length;

    const _cb = <ThreeArgCallback<number, string>>cb;

    handle
      .write(buffer, offset, length, position)
      .then(({ bytesWritten }) => _cb(null, bytesWritten, buffer.toString(encoding)))
      .catch(_cb);
  } else {
    // Signature 2: (fd, buffer, offset, length, position?, cb?)
    buffer = Buffer.from(data);
    offset = cbPosOff;
    length = cbLenEnc;
    position = typeof cbPos === 'number' ? cbPos : null;
    const _cb = <ThreeArgCallback<number, Uint8Array>>(typeof cbPos === 'function' ? cbPos : cb);
    handle
      .write(buffer, offset, length, position)
      .then(({ bytesWritten }) => _cb(null, bytesWritten, buffer))
      .catch(_cb);
  }
}

/**
 * Read data from the file specified by `fd`.
 * @param buffer The buffer that the data will be
 *   written to.
 * @param offset The offset within the buffer where writing will
 *   start.
 * @param length An integer specifying the number of bytes to read.
 * @param position An integer specifying where to begin reading from
 *   in the file. If position is null, data will be read from the current file
 *   position.
 * @param callback The number is the number of bytes read
 */
export function read(fd: number, buffer: Uint8Array, offset: number, length: number, position?: number, cb: ThreeArgCallback<number, Uint8Array> = nop): void {
  new promises.FileHandle(fd)
    .read(buffer, offset, length, position)
    .then(({ bytesRead, buffer }) => cb(null, bytesRead, buffer))
    .catch(cb);
}

/**
 * Asynchronous `fchown`.
 * @param fd
 * @param uid
 * @param gid
 * @param callback
 */
export function fchown(fd: number, uid: number, gid: number, cb: NoArgCallback = nop): void {
  new promises.FileHandle(fd)
    .chown(uid, gid)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `fchmod`.
 * @param fd
 * @param mode
 * @param callback
 */
export function fchmod(fd: number, mode: string | number, cb: NoArgCallback): void {
  new promises.FileHandle(fd)
    .chmod(mode)
    .then(() => cb())
    .catch(cb);
}

/**
 * Change the file timestamps of a file referenced by the supplied file
 * descriptor.
 * @param fd
 * @param atime
 * @param mtime
 * @param callback
 */
export function futimes(fd: number, atime: number | Date, mtime: number | Date, cb: NoArgCallback = nop): void {
  new promises.FileHandle(fd)
    .utimes(atime, mtime)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `rmdir`.
 * @param path
 * @param callback
 */
export function rmdir(path: PathLike, cb: NoArgCallback = nop): void {
  promises
    .rmdir(path)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `mkdir`.
 * @param path
 * @param mode defaults to `0777`
 * @param callback
 */
export function mkdir(path: PathLike, mode?: Node.Mode, cb: NoArgCallback = nop): void {
  promises
    .mkdir(path, mode)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `readdir`. Reads the contents of a directory.
 * The callback gets two arguments `(err, files)` where `files` is an array of
 * the names of the files in the directory excluding `'.'` and `'..'`.
 * @param path
 * @param callback
 */
export function readdir(path: PathLike, cb: TwoArgCallback<string[]>): void;
export function readdir(path: PathLike, options: { withFileTypes?: false }, cb: TwoArgCallback<string[]>): void;
export function readdir(path: PathLike, options: { withFileTypes: true }, cb: TwoArgCallback<Dirent[]>): void;
export function readdir(path: PathLike, _options: { withFileTypes?: boolean } | TwoArgCallback<string[]>, cb: TwoArgCallback<string[]> | TwoArgCallback<Dirent[]> = nop): void {
  cb = typeof _options == 'function' ? _options : cb;
  const options = typeof _options != 'function' ? _options : {};
  promises
    .readdir(path, options as object)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(entries => cb(null, entries as any))
    .catch(cb);
}

/**
 * Asynchronous `link`.
 * @param existing
 * @param newpath
 * @param callback
 */
export function link(existing: PathLike, newpath: PathLike, cb: NoArgCallback = nop): void {
  promises
    .link(existing, newpath)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `symlink`.
 * @param target target path
 * @param path link path
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 * @param callback
 */
export function symlink(target: PathLike, path: PathLike, cb?: NoArgCallback): void;
export function symlink(target: PathLike, path: PathLike, type?: Node.symlink.Type, cb?: NoArgCallback): void;
export function symlink(target: PathLike, path: PathLike, typeOrCB?: Node.symlink.Type | NoArgCallback, cb: NoArgCallback = nop): void {
  const type = typeof typeOrCB === 'string' ? typeOrCB : 'file';
  cb = typeof typeOrCB === 'function' ? typeOrCB : cb;
  promises
    .symlink(target, path, type)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous readlink.
 * @param path
 * @param callback
 */
export function readlink(path: PathLike, callback: TwoArgCallback<string> & any): void;
export function readlink(path: PathLike, options: Node.BufferEncodingOption, callback: TwoArgCallback<Uint8Array>): void;
export function readlink(path: PathLike, options: Node.EncodingOption, callback: TwoArgCallback<string | Uint8Array>): void;
export function readlink(path: PathLike, options: Node.EncodingOption, callback: TwoArgCallback<string>): void;
export function readlink(
  path: PathLike,
  options: Node.BufferEncodingOption | Node.EncodingOption | TwoArgCallback<string>,
  callback: TwoArgCallback<string> | TwoArgCallback<Uint8Array> = nop
): void {
  callback = typeof options == 'function' ? options : callback;
  promises
    .readlink(path)
    .then(result => callback(null, result as string & Uint8Array))
    .catch(callback);
}

/**
 * Asynchronous `chown`.
 * @param path
 * @param uid
 * @param gid
 * @param callback
 */
export function chown(path: PathLike, uid: number, gid: number, cb: NoArgCallback = nop): void {
  promises
    .chown(path, uid, gid)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `lchown`.
 * @param path
 * @param uid
 * @param gid
 * @param callback
 */
export function lchown(path: PathLike, uid: number, gid: number, cb: NoArgCallback = nop): void {
  promises
    .lchown(path, uid, gid)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `chmod`.
 * @param path
 * @param mode
 * @param callback
 */
export function chmod(path: PathLike, mode: number | string, cb: NoArgCallback = nop): void {
  promises
    .chmod(path, mode)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `lchmod`.
 * @param path
 * @param mode
 * @param callback
 */
export function lchmod(path: PathLike, mode: number | string, cb: NoArgCallback = nop): void {
  promises
    .lchmod(path, mode)
    .then(() => cb())
    .catch(cb);
}

/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 * @param callback
 */
export function utimes(path: PathLike, atime: number | Date, mtime: number | Date, cb: NoArgCallback = nop): void {
  promises
    .utimes(path, atime, mtime)
    .then(() => cb())
    .catch(cb);
}

/**
 * Change file timestamps of the file referenced by the supplied path.
 * @param path
 * @param atime
 * @param mtime
 * @param callback
 */
export function lutimes(path: PathLike, atime: number | Date, mtime: number | Date, cb: NoArgCallback = nop): void {
  promises
    .lutimes(path, atime, mtime)
    .then(() => cb())
    .catch(cb);
}

/**
 * Asynchronous `realpath`. The callback gets two arguments
 * `(err, resolvedPath)`. May use `process.cwd` to resolve relative paths.
 *
 * @param path
 * @param callback
 */
export function realpath(path: PathLike, cb?: TwoArgCallback<string>): void;
export function realpath(path: PathLike, options: Node.EncodingOption, cb: TwoArgCallback<string>): void;
export function realpath(path: PathLike, arg2?: TwoArgCallback<string> | Node.EncodingOption, cb: TwoArgCallback<string> = nop): void {
  cb = typeof arg2 === 'function' ? arg2 : cb;
  promises
    .realpath(path, typeof arg2 === 'function' ? null : arg2)
    .then(result => cb(null, result))
    .catch(cb);
}

/**
 * Asynchronous `access`.
 * @param path
 * @param mode
 * @param callback
 */
export function access(path: PathLike, cb: NoArgCallback): void;
export function access(path: PathLike, mode: number, cb: NoArgCallback): void;
export function access(path: PathLike, cbMode, cb: NoArgCallback = nop): void {
  const mode = typeof cbMode === 'number' ? cbMode : R_OK;
  cb = typeof cbMode === 'function' ? cbMode : cb;
  promises
    .access(path, typeof cbMode === 'function' ? null : cbMode)
    .then(() => cb())
    .catch(cb);
}

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * @todo Implement
 */
export function watchFile(filename: PathLike, listener: (curr: Stats, prev: Stats) => void): void;
export function watchFile(filename: PathLike, options: { persistent?: boolean; interval?: number }, listener: (curr: Stats, prev: Stats) => void): void;
export function watchFile(filename: PathLike, optsListener, listener: (curr: Stats, prev: Stats) => void = nop): void {
  throw ApiError.With('ENOTSUP', filename, 'watchFile');
}

/**
 * @todo Implement
 */
export function unwatchFile(filename: PathLike, listener: (curr: Stats, prev: Stats) => void = nop): void {
  throw ApiError.With('ENOTSUP', filename, 'unwatchFile');
}

/**
 * @todo Implement
 */
export function watch(filename: PathLike, listener?: (event: string, filename: string) => any): Node.FSWatcher;
export function watch(filename: PathLike, options: { persistent?: boolean }, listener?: (event: string, filename: string) => any): Node.FSWatcher;
export function watch(filename: PathLike, options, listener: (event: string, filename: string) => any = nop): Node.FSWatcher {
  throw ApiError.With('ENOTSUP', filename, 'watch');
}

/**
 * @todo Implement
 */
export function createReadStream(
  path: PathLike,
  options?: {
    flags?: string;
    encoding?: string;
    fd?: number;
    mode?: number;
    autoClose?: boolean;
  }
): ReadStream {
  throw ApiError.With('ENOTSUP', path, 'createReadStream');
}

/**
 * @todo Implement
 */
export function createWriteStream(
  path: PathLike,
  options?: {
    flags?: string;
    encoding?: string;
    fd?: number;
    mode?: number;
  }
): WriteStream {
  throw ApiError.With('ENOTSUP', path, 'createWriteStream');
}

/* eslint-enable @typescript-eslint/no-unused-vars */

export function rm(path: PathLike, callback: NoArgCallback): void;
export function rm(path: PathLike, options: Node.RmOptions, callback: NoArgCallback): void;
export function rm(path: PathLike, options: Node.RmOptions | NoArgCallback, callback: NoArgCallback = nop): void {
  callback = typeof options === 'function' ? options : callback;
  promises
    .rm(path, typeof options === 'function' ? null : options)
    .then(() => callback(null))
    .catch(callback);
}

/**
 * Asynchronously creates a unique temporary directory.
 * Generates six random characters to be appended behind a required prefix to create a unique temporary directory.
 */
export function mkdtemp(prefix: string, callback: TwoArgCallback<string>): void;
export function mkdtemp(prefix: string, options: Node.EncodingOption, callback: TwoArgCallback<string>): void;
export function mkdtemp(prefix: string, options: Node.BufferEncodingOption, callback: TwoArgCallback<Buffer>): void;
export function mkdtemp(
  prefix: string,
  options: Node.EncodingOption | Node.BufferEncodingOption | TwoArgCallback<string>,
  callback: TwoArgCallback<Buffer> | TwoArgCallback<string> = nop
): void {
  callback = typeof options === 'function' ? options : callback;
  promises
    .mkdtemp(prefix, typeof options != 'function' ? <Node.EncodingOption>options : null)
    .then(result => callback(null, <string & Buffer>result))
    .catch(callback);
}

export function copyFile(src: PathLike, dest: PathLike, callback: NoArgCallback): void;
export function copyFile(src: PathLike, dest: PathLike, flags: number, callback: NoArgCallback): void;
export function copyFile(src: PathLike, dest: PathLike, flags: number | NoArgCallback, callback?: NoArgCallback): void {
  callback = typeof flags === 'function' ? flags : callback;
  promises
    .copyFile(src, dest, typeof flags === 'function' ? null : flags)
    .then(() => callback(null))
    .catch(callback);
}

type readvCb = ThreeArgCallback<number, NodeJS.ArrayBufferView[]>;

export function readv(fd: number, buffers: readonly NodeJS.ArrayBufferView[], cb: readvCb): void;
export function readv(fd: number, buffers: readonly NodeJS.ArrayBufferView[], position: number, cb: readvCb): void;
export function readv(fd: number, buffers: readonly NodeJS.ArrayBufferView[], position: number | readvCb, cb: readvCb = nop): void {
  cb = typeof position === 'function' ? position : cb;
  new promises.FileHandle(fd)
    .readv(buffers, typeof position === 'function' ? null : position)
    .then(({ buffers, bytesRead }) => cb(null, bytesRead, buffers))
    .catch(cb);
}

type writevCb = ThreeArgCallback<number, NodeJS.ArrayBufferView[]>;

export function writev(fd: number, buffers: NodeJS.ArrayBufferView[], cb: writevCb): void;
export function writev(fd: number, buffers: NodeJS.ArrayBufferView[], position: number, cb: writevCb): void;
export function writev(fd: number, buffers: NodeJS.ArrayBufferView[], position: number | writevCb, cb: writevCb = nop) {
  cb = typeof position === 'function' ? position : cb;
  new promises.FileHandle(fd)
    .writev(buffers, typeof position === 'function' ? null : position)
    .then(({ buffers, bytesWritten }) => cb(null, bytesWritten, buffers))
    .catch(cb);
}

export function opendir(path: PathLike, cb: TwoArgCallback<Dir>): void;
export function opendir(path: PathLike, options: Node.OpenDirOptions, cb: TwoArgCallback<Dir>): void;
export function opendir(path: PathLike, options: Node.OpenDirOptions | TwoArgCallback<Dir>, cb: TwoArgCallback<Dir> = nop): void {
  cb = typeof options === 'function' ? options : cb;
  promises
    .opendir(path, typeof options === 'function' ? null : options)
    .then(result => cb(null, result))
    .catch(cb);
}

export function cp(source: PathLike, destination: PathLike, callback: NoArgCallback): void;
export function cp(source: PathLike, destination: PathLike, opts: Node.CopyOptions, callback: NoArgCallback): void;
export function cp(source: PathLike, destination: PathLike, opts: Node.CopyOptions | NoArgCallback, callback?: NoArgCallback): void {
  callback = typeof opts === 'function' ? opts : callback;
  promises
    .cp(source, destination, typeof opts === 'function' ? null : opts)
    .then(() => callback(null))
    .catch(callback);
}

export function statfs(path: PathLike, callback: TwoArgCallback<StatsFs>): void;
export function statfs(path: PathLike, options: Node.StatFsOptions & { bigint?: false }, callback: TwoArgCallback<StatsFs>): void;
export function statfs(path: PathLike, options: Node.StatFsOptions & { bigint: true }, callback: TwoArgCallback<BigIntStatsFs>): void;
export function statfs(path: PathLike, options?: Node.StatFsOptions | TwoArgCallback<StatsFs>, callback: TwoArgCallback<StatsFs> | TwoArgCallback<BigIntStatsFs> = nop): void {
  callback = typeof options === 'function' ? options : callback;
  promises
    .statfs(path, typeof options === 'function' ? null : options)
    .then(result => callback(null, <StatsFs & BigIntStatsFs>result))
    .catch(callback);
}

/* eslint-disable @typescript-eslint/no-unused-vars */

export function openAsBlob(path: PathLike, options?: Node.OpenAsBlobOptions): Promise<Blob> {
  throw ApiError.With('ENOTSUP', path, 'openAsBlob');
}

/* eslint-enable @typescript-eslint/no-unused-vars */
