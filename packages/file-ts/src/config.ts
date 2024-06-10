import { ApiError, ErrorCode } from './ApiError';
import type { Backend, BackendConfiguration } from './backends/backend';
import { checkOptions, isBackend, isBackendConfig } from './backends/backend';
import * as fs from './emulation/index';
import { type MountMapping,setCred } from './emulation/shared';
import { FileSystem } from './filesystem';

/**
 * Configuration for a specific mount point
 */
export type MountConfiguration<FS extends FileSystem = FileSystem, TOptions extends object = object> = FS | BackendConfiguration<FS, TOptions> | Backend<FS, TOptions>;

function isMountConfig(arg: unknown): arg is MountConfiguration {
  return isBackendConfig(arg) || isBackend(arg) || arg instanceof FileSystem;
}

/**
 * Retrieve a file system with the given configuration.
 * @param config A BackendConfig object.
 */
export async function resolveMountConfig<FS extends FileSystem, TOptions extends object = object>(config: MountConfiguration<FS, TOptions>, _depth = 0): Promise<FS> {
  if (typeof config !== 'object' || config == null) {
    throw new ApiError(ErrorCode.EINVAL, 'Invalid options on mount configuration');
  }

  if (!isMountConfig(config)) {
    throw new ApiError(ErrorCode.EINVAL, 'Invalid mount configuration');
  }

  if (config instanceof FileSystem) {
    return config;
  }

  if (isBackend(config)) {
    config = <BackendConfiguration<FS, TOptions>>{ backend: config };
  }

  for (const [key, value] of Object.entries(config)) {
    if (key == 'backend') {
      continue;
    }

    if (!isMountConfig(value)) {
      continue;
    }

    if (_depth > 10) {
      throw new ApiError(ErrorCode.EINVAL, 'Invalid configuration, too deep and possibly infinite');
    }

    // @ts-ignore
    config[key] = await resolveMountConfig(value, ++_depth);
  }

  const { backend } = config;

  if (!(await backend.isAvailable())) {
    throw new ApiError(ErrorCode.EPERM, 'Backend not available: ' + backend);
  }
  checkOptions(backend, config);
  const mount = backend.create(config);
  await mount.ready();
  return mount;
}

/**
 *A mapping of mount points to their configurations
 */
export type MappingConfiguration = Partial<{
	uid: number;
	gid: number;
}> &
	Record<string, FileSystem | BackendConfiguration | Backend>;

/**
 * Configuration for the file systems
 */
export type Configuration = MountConfiguration | MappingConfiguration;

/**
 * Creates filesystems with the given configuration, and initializes ZenFS with it.
 * @see Configuration for more info on the configuration object.
 */
export async function configure(config: Configuration): Promise<void> {
  const uid = 'uid' in config ? +config.uid || 0 : 0;
  const gid = 'gid' in config ? +config.gid || 0 : 0;

  if (isMountConfig(config)) {
    // single FS
    config = { '/': config };
  }

  for (const [point, value] of Object.entries(config)) {
    if (point == 'uid' || point == 'gid' || typeof value == 'number') {
      continue;
    }
    config[point] = await resolveMountConfig(value);
  }

  fs.mountMapping(<MountMapping>config);
  setCred({ uid, gid, suid: uid, sgid: gid, euid: uid, egid: gid });
}
