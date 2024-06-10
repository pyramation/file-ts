import { ApiError, ErrorCode } from '../ApiError';
import { FileSystem } from '../filesystem';
import { levenshtein, type RequiredKeys } from '../utils';

type OptionType = 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function';

/**
 * Resolves the type of Backend.options from the options interface
 */
type OptionsConfig<T> = {
	[K in keyof T]: {
		/**
		 * The basic JavaScript type(s) for this option.
		 */
		type: OptionType | readonly OptionType[];

		/**
		 * Description of the option. Used in error messages and documentation.
		 */
		description: string;

		/**
		 * Whether or not the option is required (optional can be set to null or undefined). Defaults to false.
		 */
		required: K extends RequiredKeys<T> ? true : false;

		/**
		 * A custom validation function to check if the option is valid.
		 * When async, resolves if valid and rejects if not.
		 * When sync, it will throw an error if not valid.
		 */
		validator?(opt: T[K]): void | Promise<void>;
	};
};

/**
 * A backend
 */
export interface Backend<FS extends FileSystem = FileSystem, TOptions extends object = object> {
	/**
	 * Create a new instance of the backend
	 */
	create(options: TOptions): FS;

	/**
	 * A name to identify the backend.
	 */
	name: string;

	/**
	 * Describes all of the options available for this backend.
	 */
	options: OptionsConfig<TOptions>;

	/**
	 * Whether the backend is available in the current environment.
	 * It supports checking synchronously and asynchronously
	 * Sync:
	 * Returns 'true' if this backend is available in the current
	 * environment. For example, a `localStorage`-backed filesystem will return
	 * 'false' if the browser does not support that API.
	 *
	 * Defaults to 'false', as the FileSystem base class isn't usable alone.
	 */
	isAvailable(): boolean | Promise<boolean>;
}

/**
 * @internal
 */
export function isBackend(arg: unknown): arg is Backend {
  return arg != null && typeof arg == 'object' && 'isAvailable' in arg && typeof arg.isAvailable == 'function' && 'create' in arg && typeof arg.create == 'function';
}

/**
 * Checks that the given options object is valid for the file system options.
 * @internal
 */
export async function checkOptions<T extends Backend>(backend: T, opts: object): Promise<void> {
  if (typeof opts != 'object' || opts === null) {
    throw new ApiError(ErrorCode.EINVAL, 'Invalid options');
  }

  // Check for required options.
  for (const [optName, opt] of Object.entries(backend.options)) {
    // @ts-ignore
    const providedValue = opts?.[optName];

    if (providedValue === undefined || providedValue === null) {
      if (!opt.required) {
        continue;
      }
      /* Required option not provided.
			if any incorrect options provided, which ones are close to the provided one?
			(edit distance 5 === close)*/
      const incorrectOptions = Object.keys(opts)
        .filter(o => !(o in backend.options))
        .map((a: string) => {
          return { str: a, distance: levenshtein(optName, a) };
        })
        .filter(o => o.distance < 5)
        .sort((a, b) => a.distance - b.distance);

      throw new ApiError(
        ErrorCode.EINVAL,
        `${backend.name}: Required option '${optName}' not provided.${incorrectOptions.length > 0 ? ` You provided '${incorrectOptions[0].str}', did you mean '${optName}'.` : ''
        }`
      );
    }
    // Option provided, check type.
    const typeMatches = Array.isArray(opt.type) ? opt.type.indexOf(typeof providedValue) != -1 : typeof providedValue == opt.type;
    if (!typeMatches) {
      throw new ApiError(
        ErrorCode.EINVAL,
        `${backend.name}: Value provided for option ${optName} is not the proper type. Expected ${Array.isArray(opt.type) ? `one of {${opt.type.join(', ')}}` : opt.type
        }, but received ${typeof providedValue}`
      );
    }

    if (opt.validator) {
      await opt.validator(providedValue);
    }
    // Otherwise: All good!
  }
}

export function createBackend<B extends Backend>(backend: B, options?: object): Promise<ReturnType<B['create']>> {
  checkOptions(backend, options);
  const fs = <ReturnType<B['create']>>backend.create(options);
  return fs.ready();
}

/**
 * Specifies a file system backend type and its options.
 *
 * Individual options can recursively contain BackendConfig objects for
 * option values that require file systems.
 *
 * The option object for each file system corresponds to that file system's option object passed to its `Create()` method.
 */
export type BackendConfiguration<FS extends FileSystem = FileSystem, TOptions extends object = object> = TOptions & {
	backend: Backend<FS, TOptions>;
};

/**
 * @internal
 */
export function isBackendConfig(arg: unknown): arg is BackendConfiguration {
  return arg != null && typeof arg == 'object' && 'backend' in arg && isBackend(arg.backend);
}
