import { JSONSchema6 } from 'json-schema';

export interface MatchOptions {
	// Custom formats to add validation for
	customFormats?: {
		[format: string]: (value: any) => boolean;
	};
	// Only validate the schema
	schemaOnly?: boolean;
	// Additional keywords to use (see https://github.com/epoberezkin/ajv-keywords)
	keywords?: string[];
}

export interface FilterOptions extends MatchOptions {
	// Force no additional properties
	force: boolean;
}

export declare function merge(schema: Array<JSONSchema6 | null>): JSONSchema6;

export declare function isValid(schema: JSONSchema6, value: any, options?: MatchOptions): boolean;

export declare function match(schema: JSONSchema6, value: any, options?: MatchOptions): {
	valid: boolean;
	errors: string[];
	score: number;
};

export declare function validate(schema: JSONSchema6, value: any, options?: MatchOptions): void;

export declare function filter<T = any>(schema: JSONSchema6, value: any, options?: FilterOptions): Partial<T> | null;
