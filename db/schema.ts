import { pgTable, serial, text, varchar, timestamp, index, uniqueIndex, integer } from 'drizzle-orm/pg-core';

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  coverUrl: varchar('cover_url', { length: 2048 }),
  coverCaption: varchar('cover_caption', { length: 500 }),
  category: varchar('category', { length: 100 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  tags: text('tags').array(),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft | scheduled | published
  publishAt: timestamp('publish_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('slug_idx').on(table.slug),
  index('status_published_at_idx').on(table.status, table.publishedAt),
  index('category_published_at_idx').on(table.category, table.publishedAt),
]);

export const aiGenerationLogs = pgTable('ai_generation_logs', {
  id: serial('id').primaryKey(),
  prompt: text('prompt').notNull(),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'set null' }),
  articleTitle: varchar('article_title', { length: 255 }),
  category: varchar('category', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'published' | 'draft' | 'failed'
  model: varchar('model', { length: 100 }),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('ai_logs_created_at_idx').on(table.createdAt),
]);

export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

