// src/index.ts
import { Hono } from "hono"; // Hono 是一個輕量級的 Web 框架
import { D1Database } from "@cloudflare/workers-types"; // 確保已安裝 @cloudflare/workers-types

// 定義綁定到 Worker 的環境變數
interface Env {
	WORKLOG_DB: D1Database;
	BASIC_AUTH_PASSWORD: string;
}

// ——— 建立 Hono App ———
const app = new Hono<{ Bindings: Env }>();

// Basic Auth Middleware
app.use("*", async (c, next) => {
	const auth = c.req.header("Authorization") || "";
	// 預期格式 "Basic base64(username:password)"
	if (!auth.startsWith("Basic ")) {
		return c.text("Unauthorized", 401, { "WWW-Authenticate": 'Basic realm="Secure Area"' });
	}

	// 解碼
	const [user, pass] = atob(auth.slice(6)).split(":", 2);
	// 這裡 user 可以固定值（例如 "admin"），或忽略只比對密碼
	const validPassword = c.env.BASIC_AUTH_PASSWORD;
	// console.log("validPassword", validPassword);
	if (user !== "admin" || pass !== validPassword) {
		return c.text("Unauthorized", 401, { "WWW-Authenticate": 'Basic realm="Secure Area"' });
	}

	// 驗證通過，繼續後續處理
	await next();
});

// 404
app.notFound((c) => c.text("Not Found", 404));

// 1. Create：新增一筆工作日誌
app.post("/logs", async (c) => {
	const { name, content } = await c.req.json();
	const { lastInsertRowID } = await c.env.WORKLOG_DB.prepare(
		`
      INSERT INTO logs (name, content, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `
	)
		.bind(name, content)
		.run();
	return c.json({ id: lastInsertRowID });
});

// 2. Read 分頁＋搜尋：取得日誌
app.get("/logs", async (c) => {
	const db = c.env.WORKLOG_DB;

	// 分頁參數
	const limit = parseInt(c.req.query("limit") || "3", 10);
	const offset = parseInt(c.req.query("offset") || "0", 10);

	// 搜尋參數
	const searchTitle = c.req.query("searchTitle")?.trim();
	const searchContent = c.req.query("searchContent")?.trim();
	const searchDate = c.req.query("searchDate")?.trim(); // 格式 YYYY-MM-DD

	// 動態拼接 SQL
	let sql = `SELECT * FROM logs`;
	const binds: (string | number)[] = [];
	const clauses: string[] = [];

	if (searchTitle) {
		clauses.push(`name LIKE ?`);
		binds.push(`%${searchTitle}%`);
	}
	if (searchContent) {
		clauses.push(`content LIKE ?`);
		binds.push(`%${searchContent}%`);
	}
	if (searchDate) {
		clauses.push(`created_at <= ?`);
		binds.push(`${searchDate}%`);
	}
	if (clauses.length) {
		sql += ` WHERE ` + clauses.join(` AND `);
	}

	sql += ` ORDER BY created_at DESC
           LIMIT ? OFFSET ?`;
	binds.push(limit, offset);

	const { results } = await db
		.prepare(sql)
		.bind(...binds)
		.all();
	return c.json(results);
});

// 3. Read One：依 id 取得單筆
app.get("/logs/:id", async (c) => {
	const id = c.req.param("id");
	const row = await c.env.WORKLOG_DB.prepare("SELECT * FROM logs WHERE id = ?").bind(id).first();
	if (!row) return c.text("Not found", 404);
	return c.json(row);
});

// 4. Update：更新指定 id 的日誌 w 維修通道 w
// app.put("/logs/:id", async (c) => {
// 	const id = c.req.param("id");
// 	const { name, content } = await c.req.json();
// 	await c.env.WORKLOG_DB.prepare(
// 		`
//       UPDATE logs
//          SET name = ?, content = ?, updated_at = CURRENT_TIMESTAMP
//        WHERE id = ?
//     `
// 	)
// 		.bind(name, content, id)
// 		.run();
// 	return c.json({ success: true });
// });

// 5. Delete：刪除指定 id 的日誌
app.delete("/logs/:id", async (c) => {
	const id = c.req.param("id");
	await c.env.WORKLOG_DB.prepare("DELETE FROM logs WHERE id = ?").bind(id).run();
	return c.json({ success: true });
});

export default app;
