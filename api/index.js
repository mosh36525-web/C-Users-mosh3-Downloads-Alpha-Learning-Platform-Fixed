// server/app.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "webdev_app_session";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var userRoleValues = ["user", "owner", "platform_manager", "content_moderator", "support_moderator"];
var users = mysqlTable("users", { id: int("id").autoincrement().primaryKey(), openId: varchar("openId", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), passwordHash: text("passwordHash"), emailVerified: int("emailVerified").default(0).notNull(), verificationToken: varchar("verificationToken", { length: 128 }), verificationExpiresAt: timestamp("verificationExpiresAt"), resetToken: varchar("resetToken", { length: 128 }), resetExpiresAt: timestamp("resetExpiresAt"), loginMethod: varchar("loginMethod", { length: 64 }), role: mysqlEnum("role", userRoleValues).default("user").notNull(), status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull() });
var contentItems = mysqlTable("contentItems", { id: int("id").autoincrement().primaryKey(), title: varchar("title", { length: 255 }).notNull(), description: text("description").notNull(), category: varchar("category", { length: 80 }).notNull(), duration: varchar("duration", { length: 80 }).notNull(), lessons: int("lessons").default(0).notNull(), accent: varchar("accent", { length: 32 }).default("gold").notNull(), isPublished: int("isPublished").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() });
var educationalFiles = mysqlTable("educationalFiles", { id: int("id").autoincrement().primaryKey(), contentId: int("contentId"), title: varchar("title", { length: 255 }).notNull(), kind: varchar("kind", { length: 80 }).notNull(), size: varchar("size", { length: 40 }).notNull(), pages: int("pages").default(0).notNull(), downloadUrl: text("downloadUrl"), isPublished: int("isPublished").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() });
var quizzes = mysqlTable("quizzes", { id: int("id").autoincrement().primaryKey(), title: varchar("title", { length: 255 }).notNull(), section: varchar("section", { length: 80 }).notNull().default("\u0642\u0633\u0645 1"), coverImageUrl: text("coverImageUrl"), questions: int("questions").default(11).notNull(), isPublished: int("isPublished").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
var quizQuestions = mysqlTable("quizQuestions", { id: int("id").autoincrement().primaryKey(), quizId: int("quizId").notNull(), position: int("position").notNull(), prompt: text("prompt").notNull(), imageUrl: text("imageUrl"), optionA: text("optionA").notNull(), optionB: text("optionB").notNull(), optionC: text("optionC").notNull(), optionD: text("optionD").notNull(), correctOption: mysqlEnum("correctOption", ["A", "B", "C", "D"]).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
var quizAttempts = mysqlTable("quizAttempts", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), quizId: int("quizId").notNull(), score: int("score").default(0).notNull(), correctCount: int("correctCount").default(0).notNull(), submittedAt: timestamp("submittedAt").defaultNow().notNull(), durationSeconds: int("durationSeconds").default(0).notNull() });
var errorBank = mysqlTable("errorBank", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), questionId: int("questionId").notNull(), resolvedAt: timestamp("resolvedAt"), createdAt: timestamp("createdAt").defaultNow().notNull() });
var studentFolders = mysqlTable("studentFolders", { id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), name: varchar("name", { length: 120 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
var folderQuestions = mysqlTable("folderQuestions", { id: int("id").autoincrement().primaryKey(), folderId: int("folderId").notNull(), prompt: text("prompt").notNull(), imageUrl: text("imageUrl"), createdAt: timestamp("createdAt").defaultNow().notNull() });
var competitions = mysqlTable("competitions", { id: int("id").autoincrement().primaryKey(), quizId: int("quizId").notNull(), creatorId: int("creatorId").notNull(), inviteCode: varchar("inviteCode", { length: 24 }).notNull().unique(), status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
var competitionPlayers = mysqlTable("competitionPlayers", { id: int("id").autoincrement().primaryKey(), competitionId: int("competitionId").notNull(), userId: int("userId").notNull(), inviteStatus: mysqlEnum("inviteStatus", ["pending", "accepted", "rejected"]).default("pending").notNull(), score: int("score").default(0).notNull(), correctCount: int("correctCount").default(0).notNull(), finishedAt: timestamp("finishedAt") });
var platformSettings = mysqlTable("platformSettings", { id: int("id").autoincrement().primaryKey(), platformName: varchar("platformName", { length: 120 }).default("ALPHA").notNull(), logoUrl: text("logoUrl").notNull(), fontFamily: varchar("fontFamily", { length: 120 }).default("IBM Plex Sans Arabic").notNull(), primaryColor: varchar("primaryColor", { length: 20 }).default("#f2c75d").notNull(), backgroundColor: varchar("backgroundColor", { length: 20 }).default("#090b0e").notNull(), faviconUrl: text("faviconUrl"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() });
var supportSettings = mysqlTable("supportSettings", { id: int("id").autoincrement().primaryKey(), title: varchar("title", { length: 160 }).default("\u0627\u0644\u062F\u0639\u0645 \u0627\u0644\u0641\u0646\u064A").notNull(), contactText: text("contactText").notNull(), contactUrl: text("contactUrl"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull() });
var videoLessons = mysqlTable("videoLessons", { id: int("id").autoincrement().primaryKey(), title: varchar("title", { length: 255 }).notNull(), description: text("description"), videoUrl: text("videoUrl").notNull(), thumbnailUrl: text("thumbnailUrl"), isPublished: int("isPublished").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
var visitLog = mysqlTable("visitLog", { id: int("id").autoincrement().primaryKey(), deviceHash: varchar("deviceHash", { length: 128 }).notNull().unique(), userId: int("userId"), email: varchar("email", { length: 320 }), name: text("name"), visitCount: int("visitCount").default(1).notNull(), firstVisitedAt: timestamp("firstVisitedAt").defaultNow().notNull(), lastVisitedAt: timestamp("lastVisitedAt").defaultNow().onUpdateNow().notNull(), lastPath: varchar("lastPath", { length: 255 }) });
var visitArchive = mysqlTable("visitArchive", { id: int("id").autoincrement().primaryKey(), deviceHash: varchar("deviceHash", { length: 128 }).notNull(), userId: int("userId"), email: varchar("email", { length: 320 }), name: text("name"), visitCount: int("visitCount").default(1).notNull(), firstVisitedAt: timestamp("firstVisitedAt"), lastVisitedAt: timestamp("lastVisitedAt"), lastPath: varchar("lastPath", { length: 255 }), archivedAt: timestamp("archivedAt").defaultNow().notNull() });
var dailyQuotes = mysqlTable("dailyQuotes", { id: int("id").autoincrement().primaryKey(), text: text("text").notNull(), source: varchar("source", { length: 255 }).notNull(), quoteDate: varchar("quoteDate", { length: 10 }).notNull().unique() });

// server/_core/env.ts
var ENV = {
  get appId() {
    return process.env.MANUS_PROJECT_ID ?? "";
  },
  get cookieSecret() {
    return process.env.MANUS_JWT_SECRET ?? "";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL ?? "";
  },
  get oAuthServerUrl() {
    return process.env.MANUS_OAUTH_API_URL ?? "";
  },
  // Preserve the legacy hint when supplied; otherwise roles remain application data.
  get ownerOpenId() {
    return process.env.OWNER_OPEN_ID ?? "";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get forgeApiUrl() {
    return process.env.MANUS_API_URL ?? "";
  },
  get forgeApiKey() {
    return process.env.MANUS_API_KEY ?? "";
  },
  get cloudinaryCloudName() {
    return process.env.CLOUDINARY_CLOUD_NAME ?? "";
  },
  get cloudinaryUploadPreset() {
    return process.env.CLOUDINARY_UPLOAD_PRESET ?? "";
  }
};

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set MANUS_API_URL and MANUS_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}
function cloudinaryCreateUpload(contentType = "application/octet-stream") {
  const cloudName = ENV.cloudinaryCloudName;
  const uploadPreset = ENV.cloudinaryUploadPreset;
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary config missing: set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET");
  }
  const resourceType = contentType.startsWith("video/") ? "video" : "raw";
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    uploadPreset,
    contentType
  };
}

// server/db.ts
var DEFAULT_LOGO = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663977439276/InkbArJSGjNOnrfG.png";
var OWNER_EMAIL = "zdfga123456@gmail.com";
var _db = null;
var seedPromise = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (_db && !seedPromise) seedPromise = seedDatabase(_db).catch((error) => console.warn("[Database] Seed skipped:", error));
  if (seedPromise) await seedPromise;
  return _db;
}
async function seedDatabase(db) {
  const [{ count: settingsCount }] = await db.select({ count: sql`count(*)` }).from(platformSettings);
  if (Number(settingsCount) === 0) await db.insert(platformSettings).values({ platformName: "ALPHA", logoUrl: DEFAULT_LOGO, fontFamily: "IBM Plex Sans Arabic", primaryColor: "#f2c75d", backgroundColor: "#090b0e", faviconUrl: DEFAULT_LOGO });
  await db.delete(educationalFiles).where(sql`lower(${educationalFiles.title}) like '%مجمع%الفا%'`);
  await db.update(educationalFiles).set({ downloadUrl: "/files/alpha-demo.pdf", kind: "PDF", size: "1 KB" }).where(sql`lower(${educationalFiles.title}) like '%تجريبي%' and (${educationalFiles.downloadUrl} is null or ${educationalFiles.downloadUrl} = '')`);
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values = { openId: user.openId };
  const updateSet = {};
  for (const field of ["name", "email", "loginMethod"]) {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId || user.email === OWNER_EMAIL) {
    values.role = "owner";
    updateSet.role = "owner";
  }
  if (user.status !== void 0) {
    values.status = user.status;
    updateSet.status = user.status;
  } else if (user.openId === ENV.ownerOpenId || user.email === OWNER_EMAIL) {
    values.status = "active";
    updateSet.status = "active";
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  return (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
}
async function createPasswordUser(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const openId = `email:${input.email}`;
  await db.insert(users).values({ openId, name: input.name, email: input.email, passwordHash: input.passwordHash, emailVerified: 0, loginMethod: "email", role: input.email === OWNER_EMAIL ? "owner" : "user", status: "active", lastSignedIn: /* @__PURE__ */ new Date() });
  return getUserByOpenId(openId);
}
async function createPasswordReset(email, tokenHash, expiresAt) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const user = await getUserByEmail(email);
  if (!user?.passwordHash) return false;
  await db.update(users).set({ resetToken: tokenHash, resetExpiresAt: expiresAt }).where(eq(users.id, user.id));
  return true;
}
async function getUserByResetToken(tokenHash) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(users).where(eq(users.resetToken, tokenHash)).limit(1);
  const user = rows[0];
  return user && user.resetExpiresAt && new Date(user.resetExpiresAt).getTime() > Date.now() ? user : void 0;
}
async function updatePasswordFromReset(id, passwordHash) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ passwordHash, resetToken: null, resetExpiresAt: null, emailVerified: 1 }).where(eq(users.id, id));
}
async function markPasswordUserSignedIn(id) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq(users.id, id));
  return db.select().from(users).where(eq(users.id, id)).limit(1).then((rows) => rows[0]);
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  const user = result[0];
  if (user && (openId === ENV.ownerOpenId || user.email === OWNER_EMAIL) && (user.role !== "owner" || user.status !== "active")) {
    await db.update(users).set({ role: "owner", status: "active" }).where(eq(users.id, user.id));
    return { ...user, role: "owner", status: "active" };
  }
  return user;
}
async function getBranding() {
  const db = await getDb();
  if (!db) return { id: 0, platformName: "ALPHA", logoUrl: DEFAULT_LOGO, fontFamily: "IBM Plex Sans Arabic", primaryColor: "#f2c75d", backgroundColor: "#090b0e", faviconUrl: DEFAULT_LOGO };
  const rows = await db.select().from(platformSettings).limit(1);
  return rows[0] ?? { id: 0, platformName: "ALPHA", logoUrl: DEFAULT_LOGO, fontFamily: "IBM Plex Sans Arabic", primaryColor: "#f2c75d", backgroundColor: "#090b0e", faviconUrl: DEFAULT_LOGO };
}
async function updateBranding(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = (await db.select().from(platformSettings).limit(1))[0];
  const values = { platformName: input.platformName ?? current?.platformName ?? "ALPHA", logoUrl: input.logoUrl ?? current?.logoUrl ?? DEFAULT_LOGO, fontFamily: input.fontFamily ?? current?.fontFamily ?? "IBM Plex Sans Arabic", primaryColor: input.primaryColor ?? current?.primaryColor ?? "#f2c75d", backgroundColor: input.backgroundColor ?? current?.backgroundColor ?? "#090b0e", faviconUrl: input.faviconUrl ?? current?.faviconUrl ?? DEFAULT_LOGO };
  if (current) await db.update(platformSettings).set(values).where(eq(platformSettings.id, current.id));
  else await db.insert(platformSettings).values(values);
  return getBranding();
}
async function getPublicContent() {
  const db = await getDb();
  return db ? db.select().from(contentItems).where(eq(contentItems.isPublished, 1)).orderBy(desc(contentItems.createdAt)) : [];
}
async function getPublicFiles() {
  const db = await getDb();
  return db ? db.select().from(educationalFiles).where(eq(educationalFiles.isPublished, 1)).orderBy(desc(educationalFiles.createdAt)) : [];
}
async function getPublicQuizzes() {
  const db = await getDb();
  return db ? db.select().from(quizzes).where(eq(quizzes.isPublished, 1)).orderBy(quizzes.id) : [];
}
async function getQuizDetails(id) {
  const db = await getDb();
  if (!db) return { quiz: null, questions: [] };
  const quiz = (await db.select().from(quizzes).where(eq(quizzes.id, id)).limit(1))[0] ?? null;
  const questions = quiz ? await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, id)).orderBy(quizQuestions.position) : [];
  return { quiz, questions };
}
async function submitQuizAttempt(userId, quizId, answers, durationSeconds, questionIds, competitionId) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const todays = await db.select({ quizId: quizAttempts.quizId, submittedAt: quizAttempts.submittedAt }).from(quizAttempts).where(eq(quizAttempts.userId, userId));
  const startOfToday = /* @__PURE__ */ new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const distinct = new Set(todays.filter((row) => new Date(row.submittedAt).getTime() >= startOfToday.getTime() && row.quizId !== quizId).map((row) => row.quizId));
  if (distinct.size >= 3) throw new Error("\u062A\u0645 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u062D\u062F \u0627\u0644\u064A\u0648\u0645\u064A: 3 \u0643\u0648\u064A\u0632\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0629");
  const allQuestions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.position);
  const questions = questionIds?.length ? allQuestions.filter((question) => questionIds.includes(question.id)) : allQuestions;
  const correctCount = questions.reduce((n, q) => n + (answers[String(q.id)] === q.correctOption ? 1 : 0), 0);
  for (const question of questions) {
    const isCorrect = answers[String(question.id)] === question.correctOption;
    const existing = (await db.select().from(errorBank).where(sql`${errorBank.userId} = ${userId} and ${errorBank.questionId} = ${question.id}`).limit(1))[0];
    if (isCorrect) {
      if (existing && !existing.resolvedAt) await db.update(errorBank).set({ resolvedAt: /* @__PURE__ */ new Date() }).where(eq(errorBank.id, existing.id));
    } else if (!existing) {
      await db.insert(errorBank).values({ userId, questionId: question.id });
    } else if (existing.resolvedAt) {
      await db.update(errorBank).set({ resolvedAt: null }).where(eq(errorBank.id, existing.id));
    }
  }
  await db.insert(quizAttempts).values({ userId, quizId, score: Math.round(correctCount / Math.max(questions.length, 1) * 100), correctCount, durationSeconds });
  if (competitionId) {
    await db.update(competitionPlayers).set({ score: Math.round(correctCount / Math.max(questions.length, 1) * 100), correctCount, finishedAt: /* @__PURE__ */ new Date() }).where(sql`${competitionPlayers.userId} = ${userId} and ${competitionPlayers.competitionId} = ${competitionId}`);
  }
  return { correctCount, total: questions.length, score: Math.round(correctCount / Math.max(questions.length, 1) * 100) };
}
async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { uniqueDevices: 0, newDevices: 0, members: 0, files: 0, quizzes: 0 };
  const [[memberRow], [fileRow], [quizRow], [contentRow], [deviceRow]] = await Promise.all([db.select({ count: sql`count(*)` }).from(users), db.select({ count: sql`count(*)` }).from(educationalFiles).where(eq(educationalFiles.isPublished, 1)), db.select({ count: sql`count(*)` }).from(quizzes).where(eq(quizzes.isPublished, 1)), db.select({ count: sql`count(*)` }).from(contentItems).where(eq(contentItems.isPublished, 1)), db.select({ count: sql`count(*)` }).from(visitLog)]);
  const devices = Number(deviceRow?.count ?? 0);
  return { uniqueDevices: devices, newDevices: devices, members: Number(memberRow?.count ?? 0), files: Number(fileRow?.count ?? 0) + Number(contentRow?.count ?? 0), quizzes: Number(quizRow?.count ?? 0) };
}
async function getRecentUsers() {
  const db = await getDb();
  return db ? db.select().from(users).orderBy(desc(users.createdAt)).limit(12) : [];
}
async function getAllUsers() {
  const db = await getDb();
  return db ? db.select().from(users).orderBy(desc(users.createdAt)) : [];
}
async function updateUserAccess(id, role, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ role, status }).where(eq(users.id, id));
  return db.select().from(users).where(eq(users.id, id)).limit(1);
}
async function updateUserStatus(id, status) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ status }).where(eq(users.id, id));
}
async function listContent() {
  const db = await getDb();
  return db ? db.select().from(contentItems).orderBy(desc(contentItems.createdAt)) : [];
}
async function createContent(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(contentItems).values(input);
}
async function updateContent(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(contentItems).set(input).where(eq(contentItems.id, id));
}
async function deleteContent(id) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(contentItems).where(eq(contentItems.id, id));
}
async function listQuizzes() {
  const db = await getDb();
  return db ? db.select().from(quizzes).orderBy(quizzes.id) : [];
}
async function createQuiz(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const quizValues = { title: input.title, section: input.section, questions: 11, isPublished: input.isPublished ?? 1 };
  const inserted = await db.insert(quizzes).values(quizValues);
  const quizId = Number(inserted[0].insertId);
  try {
    await db.insert(quizQuestions).values(Array.from({ length: 11 }, (_, index) => ({ quizId, position: index + 1, prompt: `\u0633\u0624\u0627\u0644 ${index + 1} \u0641\u064A ${input.section}`, optionA: "\u0623", optionB: "\u0628", optionC: "\u062C", optionD: "\u062F", correctOption: "A" })));
  } catch (error) {
    console.warn("[Database] Quiz created but default questions could not be seeded:", error);
  }
  return (await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1))[0];
}
async function updateQuiz(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(quizzes).set(input).where(eq(quizzes.id, id));
}
async function deleteQuiz(id) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const competitionsForQuiz = await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.quizId, id));
  const competitionIds = competitionsForQuiz.map((row) => row.id);
  if (competitionIds.length) {
    await db.delete(competitionPlayers).where(inArray(competitionPlayers.competitionId, competitionIds));
    await db.delete(competitions).where(inArray(competitions.id, competitionIds));
  }
  await db.delete(quizAttempts).where(eq(quizAttempts.quizId, id));
  const questionsForQuiz = await db.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.quizId, id));
  const questionIds = questionsForQuiz.map((row) => row.id);
  if (questionIds.length) await db.delete(errorBank).where(inArray(errorBank.questionId, questionIds));
  await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
  await db.delete(quizzes).where(eq(quizzes.id, id));
}
async function getQuizQuestionsForAdmin(quizId) {
  const db = await getDb();
  return db ? db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.position) : [];
}
async function replaceQuizQuestions(quizId, items) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  if (items.length) await db.insert(quizQuestions).values(items);
  await db.update(quizzes).set({ questions: items.length }).where(eq(quizzes.id, quizId));
}
async function listFiles() {
  const db = await getDb();
  return db ? db.select().from(educationalFiles).orderBy(desc(educationalFiles.createdAt)) : [];
}
async function createFile(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(educationalFiles).values(input);
}
async function updateFile(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(educationalFiles).set(input).where(eq(educationalFiles.id, id));
}
async function deleteFile(id) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(educationalFiles).where(eq(educationalFiles.id, id));
}
async function uploadEducationalFile(input) {
  const raw = input.data.includes(",") ? input.data.slice(input.data.indexOf(",") + 1) : input.data;
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length === 0 || buffer.length > 25 * 1024 * 1024) throw new Error("\u062D\u062C\u0645 \u0627\u0644\u0645\u0644\u0641 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 1 \u0628\u0627\u064A\u062A \u064825 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A");
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "file";
  const uploaded = await storagePut(`alpha/files/${Date.now()}-${safeName}`, buffer, input.contentType || "application/octet-stream");
  return { ...uploaded, size: buffer.length, fileName: input.fileName, contentType: input.contentType };
}
async function createCompetition(quizId, creatorId, identifiers) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const clean = [...new Set(identifiers.map((value) => value.trim().toUpperCase()).filter(Boolean))];
  if (clean.length < 1 || clean.length > 3) throw new Error("\u0623\u062F\u062E\u0644 \u0645\u0639\u0631\u0641 \u0637\u0627\u0644\u0628 \u0648\u0627\u062D\u062F\u064B\u0627 \u0625\u0644\u0649 \u062B\u0644\u0627\u062B\u0629 \u0637\u0644\u0627\u0628");
  const alphaIds = clean.filter((value) => /^ALPHA-\d{6}$/.test(value)).map((value) => Number(value.slice(6)));
  const invited = await database.select().from(users).where(inArray(users.email, clean));
  const byOpenId = await database.select().from(users).where(inArray(users.openId, clean));
  const byAlpha = alphaIds.length ? await database.select().from(users).where(inArray(users.id, alphaIds)) : [];
  const participants = [...new Map([...invited, ...byOpenId, ...byAlpha].map((user) => [user.id, user])).values()];
  if (participants.length !== clean.length) throw new Error("\u062A\u0623\u0643\u062F \u0645\u0646 \u0645\u0639\u0631\u0641\u0627\u062A \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u062F\u0639\u0648\u064A\u0646");
  const inviteCode = `ALPHA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const inserted = await database.insert(competitions).values({ quizId, creatorId, inviteCode, status: "active" });
  const competitionId = Number(inserted[0].insertId);
  await database.insert(competitionPlayers).values([{ competitionId, userId: creatorId, inviteStatus: "accepted" }, ...participants.map((user) => ({ competitionId, userId: user.id, inviteStatus: "pending" }))]);
  return { competitionId, inviteCode, playerCount: participants.length + 1 };
}
async function getCompetitionInvites(userId) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ player: competitionPlayers, competition: competitions, quiz: quizzes, creator: users }).from(competitionPlayers).innerJoin(competitions, eq(competitionPlayers.competitionId, competitions.id)).innerJoin(quizzes, eq(competitions.quizId, quizzes.id)).innerJoin(users, eq(competitions.creatorId, users.id)).where(eq(competitionPlayers.userId, userId)).orderBy(desc(competitions.createdAt));
  return rows.filter((row) => row.player.inviteStatus !== "rejected");
}
async function respondCompetitionInvite(userId, competitionId, response) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(competitionPlayers).set({ inviteStatus: response }).where(sql`${competitionPlayers.userId} = ${userId} and ${competitionPlayers.competitionId} = ${competitionId}`);
  return { success: true, response };
}
async function getCompetitionDetails(userId, competitionId) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ player: competitionPlayers, user: users }).from(competitionPlayers).innerJoin(users, eq(competitionPlayers.userId, users.id)).where(eq(competitionPlayers.competitionId, competitionId));
  if (!rows.some((row) => row.player.userId === userId && row.player.inviteStatus !== "rejected")) throw new Error("\u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062A\u062D\u062F\u064A");
  return rows;
}
async function getStudentDashboard(userId) {
  const db = await getDb();
  if (!db) return { attempts: [], errors: [], errorQuestions: [], folders: [], completed: 0, remaining: 3, errorCount: 0, masteredCount: 0 };
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const [attempts, allErrors, folders] = await Promise.all([db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.submittedAt)), db.select().from(errorBank).where(eq(errorBank.userId, userId)).orderBy(desc(errorBank.createdAt)), db.select().from(studentFolders).where(eq(studentFolders.userId, userId)).orderBy(asc(studentFolders.id))]);
  const questionIds = allErrors.map((error) => error.questionId);
  const questionRows = questionIds.length ? await db.select({ errorId: errorBank.id, questionId: errorBank.questionId, resolvedAt: errorBank.resolvedAt, quizId: quizQuestions.quizId, position: quizQuestions.position }).from(errorBank).innerJoin(quizQuestions, eq(errorBank.questionId, quizQuestions.id)).where(eq(errorBank.userId, userId)) : [];
  const quizIds = [...new Set(questionRows.map((row) => row.quizId))];
  const quizRows = quizIds.length ? await db.select({ id: quizzes.id, title: quizzes.title }).from(quizzes).where(inArray(quizzes.id, quizIds)) : [];
  const errorQuestions = questionRows.map((row) => ({ ...row, quiz: quizRows.find((quiz) => quiz.id === row.quizId) ?? null }));
  const errors = allErrors.filter((error) => !error.resolvedAt);
  const todayQuizIds = new Set(attempts.filter((attempt) => new Date(attempt.submittedAt).getTime() >= today.getTime()).map((attempt) => attempt.quizId));
  return { attempts, errors, errorQuestions, folders, completed: attempts.length, remaining: Math.max(0, 3 - todayQuizIds.size), errorCount: errors.length, masteredCount: allErrors.filter((error) => Boolean(error.resolvedAt)).length };
}
async function getLeaderboard() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ userId: quizAttempts.userId, score: sql`sum(${quizAttempts.score})`, correct: sql`sum(${quizAttempts.correctCount})`, last: sql`min(${quizAttempts.submittedAt})` }).from(quizAttempts).groupBy(quizAttempts.userId).orderBy(desc(sql`sum(${quizAttempts.correctCount})`), asc(sql`min(${quizAttempts.submittedAt})`)).limit(30);
  const all = await db.select().from(users);
  return rows.map((row, index) => ({ ...row, rank: index + 1, user: all.find((u) => u.id === row.userId) ?? null }));
}
async function listVideos() {
  const db = await getDb();
  return db ? db.select().from(videoLessons).orderBy(desc(videoLessons.createdAt)) : [];
}
async function createVideo(input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(videoLessons).values(input);
}
async function updateVideo(id, input) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(videoLessons).set(input).where(eq(videoLessons.id, id));
  return { success: true };
}
async function deleteVideo(id) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(videoLessons).where(eq(videoLessons.id, id));
  return { success: true };
}
async function listVisitLog() {
  const db = await getDb();
  return db ? db.select().from(visitLog).orderBy(desc(visitLog.lastVisitedAt)).limit(100) : [];
}
async function recordVisit(input) {
  const db = await getDb();
  if (!db) return;
  const existing = (await db.select().from(visitLog).where(eq(visitLog.deviceHash, input.deviceHash)).limit(1))[0];
  if (existing) {
    await db.update(visitLog).set({ visitCount: existing.visitCount + 1, userId: input.userId ?? existing.userId, email: input.email ?? existing.email, name: input.name ?? existing.name, lastPath: input.lastPath ?? existing.lastPath, lastVisitedAt: /* @__PURE__ */ new Date() }).where(eq(visitLog.id, existing.id));
  } else await db.insert(visitLog).values({ deviceHash: input.deviceHash, userId: input.userId ?? null, email: input.email ?? null, name: input.name ?? null, lastPath: input.lastPath ?? "/" });
}
async function getVisitStats() {
  const db = await getDb();
  if (!db) return { devices: 0, visits: 0 };
  const [row] = await db.select({ devices: sql`count(*)`, visits: sql`coalesce(sum(${visitLog.visitCount}),0)` }).from(visitLog);
  return { devices: Number(row?.devices ?? 0), visits: Number(row?.visits ?? 0) };
}
async function resetVisitLog() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const visitors = await database.select().from(visitLog).where(isNull(visitLog.userId));
  if (visitors.length) await database.insert(visitArchive).values(visitors.map((visitor) => ({ deviceHash: visitor.deviceHash, userId: visitor.userId, email: visitor.email, name: visitor.name, visitCount: visitor.visitCount, firstVisitedAt: visitor.firstVisitedAt, lastVisitedAt: visitor.lastVisitedAt, lastPath: visitor.lastPath })));
  await database.delete(visitLog).where(isNull(visitLog.userId));
  return { success: true, archived: visitors.length };
}

// server/_core/cookies.ts
function getSessionCookieOptions(_req) {
  return { httpOnly: true, path: "/", sameSite: "none", secure: true };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: MANUS_OAUTH_API_URL is not configured! Set MANUS_OAUTH_API_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret) throw new Error("MANUS_JWT_SECRET is unavailable");
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || (!isNonEmptyString(appId) || appId !== ENV.appId) || typeof name !== "string") {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken && req.path.startsWith("/api/scheduled/")) {
      const ticket = cookies.get("app_session_id");
      const identity = await this.verifySession(ticket);
      if (identity?.openId.startsWith(CRON_OPEN_ID_PREFIX)) sessionToken = ticket;
    }
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    if (user.status === "suspended") {
      throw ForbiddenError("Account suspended");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        ...userInfo.openId === ENV.ownerOpenId ? { role: "owner" } : {},
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error instanceof Error ? error.message : "unknown error");
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/publicConfig.ts
function publicPlatformConfig(env = process.env) {
  return {
    projectId: env.MANUS_PROJECT_ID ?? "",
    oauthPortalUrl: env.MANUS_OAUTH_PORTAL_URL ?? "",
    apiUrl: env.MANUS_API_URL ?? "",
    apiBrowserKey: env.MANUS_API_BROWSER_KEY ?? ""
  };
}
function publicPlatformScript(env = process.env) {
  const json = JSON.stringify(publicPlatformConfig(env)).replaceAll("<", "\\u003c");
  return `window.__MANUS_CONFIG__=${json};`;
}

// server/routers.ts
import { z as z2 } from "zod";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({ transformer: superjson });
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  if (!opts.ctx.user) throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
});
var requireRoles = (roles) => t.middleware(async (opts) => {
  if (!opts.ctx.user) throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  if (!roles.includes(opts.ctx.user.role)) throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(requireRoles(["owner", "platform_manager", "content_moderator", "support_moderator"]));
var ownerProcedure = t.procedure.use(requireRoles(["owner"]));
var platformManagerProcedure = t.procedure.use(requireRoles(["owner", "platform_manager"]));
var contentProcedure = t.procedure.use(requireRoles(["owner", "platform_manager", "content_moderator"]));
var supportProcedure = t.procedure.use(requireRoles(["owner", "platform_manager", "support_moderator"]));

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var scrypt = promisify(scryptCallback);
var emailInput = z2.string().trim().email().max(320).transform((value) => value.toLowerCase());
var passwordInput = z2.string().min(8, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644").max(128);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}
var contentInput = z2.object({ title: z2.string().min(2).max(255), description: z2.string().min(2), category: z2.string().min(1).max(80), duration: z2.string().min(1).max(80), lessons: z2.number().int().min(0).max(999), accent: z2.enum(["gold", "blue", "violet"]), isPublished: z2.number().int().min(0).max(1) });
var quizInput = z2.object({ title: z2.string().min(2).max(255), section: z2.string().min(1).max(80), questions: z2.number().int().min(0).max(9999), isPublished: z2.number().int().min(0).max(1) });
var fileInput = z2.object({ title: z2.string().min(2).max(255), kind: z2.string().min(1).max(80), size: z2.string().min(1).max(40), pages: z2.number().int().min(0).max(9999), downloadUrl: z2.string().optional().nullable(), isPublished: z2.number().int().min(0).max(1) });
var videoInput = z2.object({ title: z2.string().min(2).max(255), description: z2.string().optional().nullable(), videoUrl: z2.string().min(1).refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), "\u0623\u062F\u062E\u0644 \u0631\u0627\u0628\u0637 \u0641\u064A\u062F\u064A\u0648 \u0635\u062D\u064A\u062D"), thumbnailUrl: z2.string().min(1).refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), "\u0623\u062F\u062E\u0644 \u0631\u0627\u0628\u0637 \u0635\u0648\u0631\u0629 \u0635\u062D\u064A\u062D").optional().nullable(), isPublished: z2.number().int().min(0).max(1) });
var brandingInput = z2.object({ platformName: z2.string().min(2).max(120), logoUrl: z2.string().min(1), fontFamily: z2.string().min(2).max(120), primaryColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/), backgroundColor: z2.string().regex(/^#[0-9a-fA-F]{6}$/), faviconUrl: z2.string().min(1) });
var roleInput = z2.enum(["user", "platform_manager", "content_moderator", "support_moderator"]);
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(z2.object({ name: z2.string().trim().min(2, "\u0627\u0643\u062A\u0628 \u0627\u0633\u0645\u064B\u0627 \u0645\u0646 \u062D\u0631\u0641\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644").max(120), email: emailInput, password: passwordInput })).mutation(async ({ ctx, input }) => {
      if (await getUserByEmail(input.email)) throw new Error("\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644");
      const user = await createPasswordUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
      if (!user) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628");
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? input.name });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 31536e6 });
      return user;
    }),
    login: publicProcedure.input(z2.object({ email: emailInput, password: passwordInput })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(input.email);
      if (!user?.passwordHash || !await verifyPassword(input.password, user.passwordHash)) throw new Error("\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629");
      if (user.status === "suspended") throw new Error("\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0648\u0642\u0648\u0641");
      const signedIn = await markPasswordUserSignedIn(user.id);
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 31536e6 });
      return signedIn;
    }),
    requestPasswordReset: publicProcedure.input(z2.object({ email: emailInput })).mutation(async ({ input }) => {
      const generic = { success: true, message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062C\u0644\u064B\u0627\u060C \u0633\u062A\u0635\u0644\u0643 \u0631\u0633\u0627\u0644\u0629 \u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0631\u0627\u0628\u0637 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631." };
      const user = await getUserByEmail(input.email);
      if (!user?.passwordHash) return generic;
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await createPasswordReset(input.email, tokenHash, new Date(Date.now() + 30 * 60 * 1e3));
      const appUrl = (process.env.APP_URL || "https://alpha-2030.vercel.app").replace(/\/$/, "");
      const resetUrl = `${appUrl}/account?reset=${token}`;
      const apiKey = process.env.BREVO_API_KEY;
      if (!apiKey) throw new Error("\u0645\u064A\u0632\u0629 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u062A\u062D\u062A\u0627\u062C \u0625\u0636\u0627\u0641\u0629 BREVO_API_KEY \u0641\u064A Vercel");
      const fromEmail = process.env.BREVO_FROM_EMAIL;
      if (!fromEmail) throw new Error("\u0623\u0636\u0641 BREVO_FROM_EMAIL \u0641\u064A Vercel \u0628\u0639\u062F \u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0628\u0631\u064A\u062F \u062F\u0627\u062E\u0644 Brevo");
      const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", "api-key": apiKey }, body: JSON.stringify({ sender: { name: "Alpha Learning", email: fromEmail }, to: [{ email: input.email }], subject: "\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 - Alpha Learning", htmlContent: `<div dir="rtl" style="font-family:Arial;line-height:1.8"><h2>\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631</h2><p>\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0627\u0644\u062A\u0627\u0644\u064A \u0644\u0625\u0646\u0634\u0627\u0621 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629. \u0627\u0644\u0631\u0627\u0628\u0637 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 30 \u062F\u0642\u064A\u0642\u0629.</p><p><a href="${resetUrl}" style="display:inline-block;background:#f2c75d;color:#111;padding:12px 22px;border-radius:8px;text-decoration:none">\u0625\u0646\u0634\u0627\u0621 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629</a></p><p>\u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u0630\u0644\u0643\u060C \u062A\u062C\u0627\u0647\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.</p></div>` }) });
      if (!response.ok) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629\u060C \u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Brevo \u0648\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0645\u0648\u062B\u0642");
      return generic;
    }),
    resetPassword: publicProcedure.input(z2.object({ token: z2.string().min(40), password: passwordInput })).mutation(async ({ ctx, input }) => {
      const tokenHash = createHash("sha256").update(input.token).digest("hex");
      const user = await getUserByResetToken(tokenHash);
      if (!user) throw new Error("\u0631\u0627\u0628\u0637 \u0627\u0644\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u062A\u0647");
      await updatePasswordFromReset(user.id, await hashPassword(input.password));
      const session = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      ctx.res.cookie(COOKIE_NAME, session, { ...getSessionCookieOptions(ctx.req), maxAge: 31536e6 });
      return { success: true };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const opts = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...opts, maxAge: -1 });
      return { success: true };
    })
  }),
  platform: router({ settings: publicProcedure.query(() => getBranding()), updateSettings: ownerProcedure.input(brandingInput).mutation(({ input }) => updateBranding(input)), saveBranding: ownerProcedure.input(brandingInput).mutation(({ input }) => updateBranding(input)) }),
  student: router({ dashboard: protectedProcedure.query(({ ctx }) => getStudentDashboard(ctx.user.id)), competitionInvites: protectedProcedure.query(({ ctx }) => getCompetitionInvites(ctx.user.id)), respondCompetitionInvite: protectedProcedure.input(z2.object({ competitionId: z2.number().int(), response: z2.enum(["accepted", "rejected"]) })).mutation(({ ctx, input }) => respondCompetitionInvite(ctx.user.id, input.competitionId, input.response)), competitionDetails: protectedProcedure.input(z2.object({ competitionId: z2.number().int() })).query(({ ctx, input }) => getCompetitionDetails(ctx.user.id, input.competitionId)), errorBank: protectedProcedure.query(({ ctx }) => getStudentDashboard(ctx.user.id).then((data) => data.errorQuestions)), leaderboard: publicProcedure.query(() => getLeaderboard()), createCompetition: protectedProcedure.input(z2.object({ quizId: z2.number().int(), friendIds: z2.array(z2.string().min(1)).min(1).max(3) })).mutation(({ ctx, input }) => createCompetition(input.quizId, ctx.user.id, input.friendIds)) }),
  analytics: router({ recordVisit: publicProcedure.input(z2.object({ deviceHash: z2.string().min(16).max(128), path: z2.string().max(255), name: z2.string().nullable().optional(), email: z2.string().nullable().optional(), userId: z2.number().int().nullable().optional() })).mutation(({ input }) => recordVisit({ deviceHash: input.deviceHash, lastPath: input.path, name: input.name, email: input.email, userId: input.userId })) }),
  content: router({ featured: publicProcedure.query(() => getPublicContent()), videos: protectedProcedure.query(() => listVideos().then((rows) => rows.filter((row) => row.isPublished))), files: protectedProcedure.query(() => getPublicFiles()), quizzes: protectedProcedure.query(() => getPublicQuizzes()), quizDetails: protectedProcedure.input(z2.object({ id: z2.number().int() })).query(({ input }) => getQuizDetails(input.id)), submitAttempt: protectedProcedure.input(z2.object({ quizId: z2.number().int(), answers: z2.record(z2.string(), z2.enum(["A", "B", "C", "D"])), durationSeconds: z2.number().int().min(0).max(660), questionIds: z2.array(z2.number().int()).optional(), competitionId: z2.number().int().optional() })).mutation(({ ctx, input }) => submitQuizAttempt(ctx.user.id, input.quizId, input.answers, input.durationSeconds, input.questionIds, input.competitionId)) }),
  admin: router({
    stats: adminProcedure.query(() => getDashboardStats()),
    recentUsers: adminProcedure.query(() => getRecentUsers()),
    users: adminProcedure.query(() => getAllUsers()),
    updateUser: ownerProcedure.input(z2.object({ id: z2.number().int(), role: roleInput, status: z2.enum(["active", "suspended"]) })).mutation(({ input }) => updateUserAccess(input.id, input.role, input.status)),
    updateUserStatus: platformManagerProcedure.input(z2.object({ id: z2.number().int(), status: z2.enum(["active", "suspended"]) })).mutation(({ input }) => updateUserStatus(input.id, input.status)),
    content: ownerProcedure.query(() => listContent()),
    createContent: ownerProcedure.input(contentInput).mutation(({ input }) => createContent(input)),
    updateContent: ownerProcedure.input(contentInput.extend({ id: z2.number().int() })).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateContent(id, data);
    }),
    deleteContent: ownerProcedure.input(z2.object({ id: z2.number().int() })).mutation(({ input }) => deleteContent(input.id)),
    files: ownerProcedure.query(() => listFiles()),
    uploadTarget: ownerProcedure.input(z2.object({ fileName: z2.string().min(1).max(255), contentType: z2.string().max(120), size: z2.number().int().positive().max(500 * 1024 * 1024) })).mutation(({ input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "file";
      return cloudinaryCreateUpload(input.contentType || "application/octet-stream");
    }),
    uploadFile: ownerProcedure.input(z2.object({ fileName: z2.string().min(1).max(255), contentType: z2.string().max(120), data: z2.string().min(1), size: z2.number().int().positive().max(25 * 1024 * 1024) })).mutation(({ input }) => uploadEducationalFile(input)),
    createFile: ownerProcedure.input(fileInput).mutation(({ input }) => createFile(input)),
    updateFile: ownerProcedure.input(fileInput.extend({ id: z2.number().int() })).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateFile(id, data);
    }),
    deleteFile: ownerProcedure.input(z2.object({ id: z2.number().int() })).mutation(({ input }) => deleteFile(input.id)),
    quizzes: ownerProcedure.query(() => listQuizzes()),
    quizQuestions: ownerProcedure.input(z2.object({ quizId: z2.number().int() })).query(({ input }) => getQuizQuestionsForAdmin(input.quizId)),
    saveQuizQuestions: ownerProcedure.input(z2.object({ quizId: z2.number().int(), questions: z2.array(z2.object({ position: z2.number().int().min(1).max(11), prompt: z2.string().min(1), imageUrl: z2.string().optional().nullable(), optionA: z2.string().min(1), optionB: z2.string().min(1), optionC: z2.string().min(1), optionD: z2.string().min(1), correctOption: z2.enum(["A", "B", "C", "D"]) }).strict()).length(11) })).mutation(({ input }) => replaceQuizQuestions(input.quizId, input.questions.map((question) => ({ ...question, quizId: input.quizId })))),
    addQuiz: ownerProcedure.input(z2.object({ title: z2.string().trim().min(2).max(255), section: z2.string().trim().min(1).max(80), isPublished: z2.number().int().min(0).max(1) })).mutation(({ input }) => createQuiz({ title: input.title, section: input.section, questions: 11, isPublished: input.isPublished })),
    createQuiz: ownerProcedure.input(quizInput).mutation(({ input }) => createQuiz(input)),
    updateQuiz: ownerProcedure.input(quizInput.extend({ id: z2.number().int() })).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateQuiz(id, data);
    }),
    deleteQuiz: ownerProcedure.input(z2.object({ id: z2.number().int() })).mutation(({ input }) => deleteQuiz(input.id)),
    supportSummary: supportProcedure.query(() => getAllUsers()),
    videos: contentProcedure.query(() => listVideos()),
    videoUploadTarget: contentProcedure.input(z2.object({ fileName: z2.string().min(1).max(255), contentType: z2.string().max(120), size: z2.number().int().positive().max(500 * 1024 * 1024) })).mutation(({ input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "video";
      return cloudinaryCreateUpload(input.contentType || "video/mp4");
    }),
    createVideo: contentProcedure.input(videoInput).mutation(({ input }) => createVideo(input)),
    updateVideo: contentProcedure.input(videoInput.extend({ id: z2.number().int() })).mutation(({ input }) => {
      const { id, ...data } = input;
      return updateVideo(id, data);
    }),
    deleteVideo: contentProcedure.input(z2.object({ id: z2.number().int() })).mutation(({ input }) => deleteVideo(input.id)),
    visitStats: adminProcedure.query(() => getVisitStats()),
    visitLog: adminProcedure.query(() => listVisitLog()),
    resetVisits: ownerProcedure.mutation(() => resetVisitLog())
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/app.ts
function createApp() {
  const app2 = express();
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  app2.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app2.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app2.use((error, _req, res, _next) => {
    console.error("[API] Unhandled error:", error);
    if (res.headersSent) return;
    res.status(500).json({ error: { message: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645. \u062A\u062D\u0642\u0642 \u0645\u0646 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0645\u062A\u063A\u064A\u0631\u0627\u062A Vercel." } });
  });
  return app2;
}

// api/index.ts
var app = createApp();
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
