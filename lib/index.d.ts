import { JSONSchema6 } from 'json-schema';

export declare function merge(schema: JSONSchema6[]): JSONSchema6;
export declare function addFormat(format: string, callback: (value: any) => boolean): void;
