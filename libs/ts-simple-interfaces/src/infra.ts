/*****************************************************
 * Infrastructure
 *****************************************************/

/**
 * NOTE: In order to make BufferLike work without node types, we had to use some displeasingly
 * vague types, like "object". This is considered acceptable in light of the goal of not requiring
 * node typings for this library.
 */
export type CharacterEncodings = 'utf8' | 'hex' | 'base64' | 'utf16';
export interface BufferLike {
  equals(otherBuffer: object): boolean;
  toString(encoding?: string, start?: number, end?: number): string;
  slice(start?: number, end?: number): BufferLike;
  indexOf(value: string | number | object, byteOffset?: number, encoding?: string): number;
  lastIndexOf(value: string | number | object, byteOffset?: number, encoding?: string): number;
  includes(value: string | number | object, byteOffset?: number, encoding?: string): boolean;
}
