import { JSONSchema6 } from 'json-schema';

export interface FilterOptions {
	// force no additional properties
	force: boolean;
}

export declare function merge(schema: JSONSchema6[]): JSONSchema6;

export declare function addFormat(format: string, callback: (value: any) => boolean): void;

export declare function isValid(schema: JSONSchema6, value: any): boolean;

export declare function match(schema: JSONSchema6, value: any): {
	valid: boolean;
	errors: string[];
};

export declare function validate(schema: JSONSchema6, value: any): void;

export declare function filter<T = any>(schema: JSONSchema6, value: any, options?: FilterOptions): Partial<T> | null;
