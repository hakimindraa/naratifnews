import { pgTable, serial, text, varchar, timestamp, index, uniqueIndex, integer } from 'drizzle-orm/pg-core';

export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 150 }).notNull().default('Redaksi'),
  avatarUrl: varchar('avatar_url', { length: 2048 }),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

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
  authorId: integer('author_id').references(() => authors.id, { onDelete: 'set null' }),
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

export const jurnalisDrafts = pgTable('jurnalis_drafts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  source: text('source').notNull(),
  originalUrl: text('original_url').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  summary: text('summary'),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft | generated | published | archived
  generatedTitle: text('generated_title'),
  generatedArticle: text('generated_article'),
  category: varchar('category', { length: 100 }),
  tags: text('tags').array(),
  coverUrl: text('cover_url'),
  coverCaption: text('cover_caption'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('jurnalis_drafts_original_url_idx').on(table.originalUrl),
  index('jurnalis_drafts_status_created_at_idx').on(table.status, table.createdAt),
]);

