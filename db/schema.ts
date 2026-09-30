import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), city: text('city').notNull(),
  created: text('created').notNull(), payload: text('payload').notNull(), stage: integer('stage').notNull().default(0)
}, table => [index('idx_records_city_created').on(table.city,table.created)]);
