import { Pool, QueryResult } from 'pg';

// PostgreSQL 连接配置
// Bun 内置支持 .env，无需 dotenv
const pool = new Pool({
  host: process.env.POSTGRES_HOST || '192.168.104.71',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'ai_site_generator',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 测试连接
pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

// 初始化数据库表
export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- 项目表
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'deploying', 'deployed', 'failed')),
        progress_message VARCHAR(255) DEFAULT '',
        progress_percent INTEGER DEFAULT 0,
        fly_app_name VARCHAR(100),
        preview_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 添加进度字段（如果不存在）
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='progress_message') THEN
          ALTER TABLE projects ADD COLUMN progress_message VARCHAR(255) DEFAULT '';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='progress_percent') THEN
          ALTER TABLE projects ADD COLUMN progress_percent INTEGER DEFAULT 0;
        END IF;
      END $$;

      -- 项目文件表
      CREATE TABLE IF NOT EXISTS project_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        file_path VARCHAR(255),
        content TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 编辑历史表（用于撤销/重做）
      CREATE TABLE IF NOT EXISTS edit_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        selector VARCHAR(255),
        property VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 创建更新时间触发器函数
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- 项目表触发器
      DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
      CREATE TRIGGER update_projects_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- 项目文件表触发器
      DROP TRIGGER IF EXISTS update_project_files_updated_at ON project_files;
      CREATE TRIGGER update_project_files_updated_at
        BEFORE UPDATE ON project_files
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('[DB] Database tables initialized');
  } finally {
    client.release();
  }
}

// 查询帮助函数
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('[DB] Executed query', { text: text.slice(0, 50), duration, rows: res.rowCount });
  return res;
}

// 获取单个结果
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] || null;
}

export { pool };
