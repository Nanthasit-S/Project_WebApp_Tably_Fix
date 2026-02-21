import { queryRows, withConnection, withTransaction } from "@/lib/db";

export type UiTextMap = Record<string, string>;

type UiTextRow = {
  text_key: string;
  text_value: string;
};

let uiTextsSchemaEnsured = false;

const ensureUiTextsTable = async () => {
  if (uiTextsSchemaEnsured) {
    return;
  }

  await withConnection(async (conn) => {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ui_texts (
        text_key VARCHAR(128) PRIMARY KEY,
        text_value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });

  uiTextsSchemaEnsured = true;
};

export async function readUiTexts(): Promise<UiTextMap> {
  await ensureUiTextsTable();
  const rows = await queryRows<UiTextRow>(
    "SELECT text_key, text_value FROM ui_texts",
  );

  return rows.reduce<UiTextMap>((acc, row) => {
    acc[row.text_key] = row.text_value;
    return acc;
  }, {});
}

export async function writeUiTexts(nextValue: UiTextMap): Promise<void> {
  await ensureUiTextsTable();

  await withTransaction(async (conn) => {
    await conn.query("DELETE FROM ui_texts");

    const entries = Object.entries(nextValue);
    for (const [key, value] of entries) {
      await conn.query(
        `
          INSERT INTO ui_texts (text_key, text_value, updated_at)
          VALUES (?, ?, NOW())
        `,
        [key, value],
      );
    }
  });
}

export async function updateUiText(
  key: string,
  value: string,
): Promise<UiTextMap> {
  const current = await readUiTexts();
  const trimmedKey = key.trim();

  if (!trimmedKey) {
    throw new Error("Text key is required.");
  }
  const next = {
    ...current,
    [trimmedKey]: value,
  };

  await writeUiTexts(next);

  return next;
}
