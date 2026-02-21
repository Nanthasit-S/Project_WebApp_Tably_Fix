import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

declare global {
  var dbPool: Pool | undefined;
  var dbPoolCleanupRegistered: boolean | undefined;
  var dbPoolClosing: boolean | undefined;
}

type QueryParams = ReadonlyArray<unknown> | Record<string, unknown> | undefined;

type NonSelectResult = {
  affectedRows: number;
};

export type DbConnection = {
  query: <Row extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: QueryParams,
  ) => Promise<Row[] | NonSelectResult>;
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};

const connectionString =
  process.env.SUPABASE_DB_POOLER_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

const isSupabaseDirectHost = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return /^db\..+\.supabase\.co$/i.test(parsed.hostname);
  } catch {
    return false;
  }
};

const createPool = (): Pool => {
  if (!connectionString) {
    throw new Error(
      "Missing database connection string. Set SUPABASE_DB_POOLER_URL, SUPABASE_DB_URL or DATABASE_URL.",
    );
  }

  if (isSupabaseDirectHost(connectionString)) {
    throw new Error(
      "Detected Supabase Direct DB URL (db.<project-ref>.supabase.co). On Vercel use Supabase Pooler URL instead (port 6543, sslmode=require).",
    );
  }

  return new Pool({
    connectionString,
    max: 10,
    ssl:
      process.env.DB_DISABLE_SSL === "true"
        ? false
        : { rejectUnauthorized: false },
  });
};

const getPool = (): Pool => {
  if (!global.dbPool) {
    global.dbPool = createPool();
    registerGracefulShutdown();
  }

  return global.dbPool;
};

const registerGracefulShutdown = () => {
  if (global.dbPoolCleanupRegistered) {
    return;
  }

  const closePool = async () => {
    if (global.dbPoolClosing) {
      return;
    }

    global.dbPoolClosing = true;

    try {
      if (global.dbPool) {
        await global.dbPool.end();
        global.dbPool = undefined;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to close database pool gracefully:", error);
      }
    }
  };

  const terminateProcess = (code: number) => {
    if (typeof process.exit === "function") {
      process.exit(code);
    }
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    void (async () => {
      await closePool();
      const exitCode = signal === "SIGINT" ? 130 : 0;
      terminateProcess(exitCode);
    })();
  };

  process.once("beforeExit", () => {
    void closePool();
  });
  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  global.dbPoolCleanupRegistered = true;
};

const toPgParams = (params?: QueryParams): unknown[] => {
  if (!params) {
    return [];
  }
  if (Array.isArray(params)) {
    return [...params];
  }
  return Object.values(params);
};

const convertPlaceholders = (sql: string): string => {
  let placeholderIndex = 1;

  return sql.replace(/\?/g, () => `$${placeholderIndex++}`);
};

const isSelectLike = (sql: string): boolean => {
  const normalized = sql.trim().toLowerCase();

  return (
    normalized.startsWith("select") ||
    normalized.startsWith("with") ||
    normalized.startsWith("show") ||
    normalized.startsWith("describe")
  );
};

const runQuery = async <Row extends QueryResultRow = Record<string, unknown>>(
  client: PoolClient,
  sql: string,
  params?: QueryParams,
): Promise<Row[] | NonSelectResult> => {
  const pgSql = convertPlaceholders(sql);
  const values = toPgParams(params);
  const result: QueryResult<Row> = await client.query<Row>(pgSql, values);

  if (isSelectLike(sql) || result.fields.length > 0) {
    return result.rows;
  }

  return { affectedRows: result.rowCount ?? 0 };
};

const createConnection = (client: PoolClient): DbConnection => ({
  query: <Row extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params?: QueryParams,
  ) =>
    runQuery<Row>(client, sql, params),
  beginTransaction: async () => {
    await client.query("BEGIN");
  },
  commit: async () => {
    await client.query("COMMIT");
  },
  rollback: async () => {
    await client.query("ROLLBACK");
  },
});

export async function withConnection<T>(
  fn: (conn: DbConnection) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  const conn = createConnection(client);

  try {
    return await fn(conn);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  fn: (conn: DbConnection) => Promise<T>,
): Promise<T> {
  return withConnection(async (conn) => {
    await conn.beginTransaction();
    try {
      const result = await fn(conn);
      await conn.commit();

      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  });
}

export async function queryRows<Row extends QueryResultRow = Record<string, unknown>>(
  sql: string,
  params?: QueryParams,
): Promise<Row[]> {
  return withConnection(async (conn) => {
    const result = await conn.query<Row>(sql, params);

    return Array.isArray(result) ? result : [];
  });
}

export async function querySingle<Row extends QueryResultRow = Record<string, unknown>>(
  sql: string,
  params?: QueryParams,
): Promise<Row | null> {
  const rows = await queryRows<Row>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}
