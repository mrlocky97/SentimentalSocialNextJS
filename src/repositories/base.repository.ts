/**
 * Base Repository Interface
 * Following Dependency Inversion Principle - depend on abstractions, not concretions
 */

export interface BaseRepository<
  T,
  CreateData = Partial<T>,
  UpdateData = Partial<T>,
> {
  create(data: CreateData): Promise<T>;
  findById(id: string): Promise<T | null>;
  findMany(filter?: Partial<T>, options?: QueryOptions): Promise<T[]>;
  update(id: string, data: UpdateData): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  include?: string[];
}

export type TransactionContext = Record<string, unknown>;
