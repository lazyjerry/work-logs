CREATE TABLE logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,                       -- 你的新欄位
      content     TEXT    NOT NULL,                       -- 工作內容
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 在每次 UPDATE 時自動刷新 updated_at
    CREATE TRIGGER set_updated_at
      AFTER UPDATE ON logs
    BEGIN
      UPDATE logs
         SET updated_at = CURRENT_TIMESTAMP
       WHERE id = old.id;
    END;

    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_name ON logs(name);
    CREATE INDEX IF NOT EXISTS idx_logs_content ON logs(content);