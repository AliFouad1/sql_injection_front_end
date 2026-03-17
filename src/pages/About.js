import React, { useState } from 'react';
import { BookOpen, Layers, Zap, Code, ChevronDown, ChevronUp, AlertTriangle, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translations } from '../i18n/translations';

// ─────────────────────────────────────────────────────────
// كل هجوم له نسختان: إنجليزية وعربية
// النصوص العربية مكتوبة بشكل طبيعي كما يكتبها متخصص أمني
// ─────────────────────────────────────────────────────────
const ATTACKS = [
  {
    category:    { en: 'Authentication Bypass',      ar: 'تجاوز المصادقة' },
    color:       'var(--red)',
    colorDim:    'var(--red-dim)',
    icon:        '🔓',
    name:        { en: 'Classic OR Tautology',        ar: 'حقن OR الكلاسيكي (تحقق دائم)' },
    what: {
      en: "Forces the WHERE clause to always be TRUE, bypassing password checks entirely. The attacker never needs to know the real password.",
      ar: "يجبر شرط WHERE على أن يكون صحيحاً دائماً، مما يتخطى التحقق من كلمة المرور كلياً. المهاجم لا يحتاج لمعرفة كلمة المرور الحقيقية أبداً.",
    },
    how: {
      en: "By injecting ' OR 1=1 --, the attacker closes the username string early with ', then adds a condition that is always true (1=1), then comments out the rest of the query so the AND password = '...' part is ignored.",
      ar: "عبر حقن ' OR 1=1 --، يُغلق المهاجم نص اسم المستخدم مبكراً بعلامة '، ثم يضيف شرطاً صحيحاً دائماً وهو 1=1، ثم يحوّل باقي الاستعلام إلى تعليق بـ -- فيُتجاهل شرط كلمة المرور تماماً.",
    },
    danger: {
      en: "Logs in as the first user in the database — usually the admin account.",
      ar: "يسمح بالدخول بصلاحيات أول مستخدم في قاعدة البيانات — وغالباً يكون المدير.",
    },
    sql_note: {
      en: "Everything after -- is a comment. OR 1=1 makes the WHERE clause always true.",
      ar: "كل ما بعد -- يُعامَل كتعليق ويُتجاهَل. الشرط OR 1=1 يجعل شرط WHERE صحيحاً في جميع الأحوال.",
    },
    payload:     "' OR 1=1 --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'\n  AND password = 'abc123'`,
    sql_after:   `SELECT * FROM users\nWHERE username = ''\n   OR 1=1\n-- ' AND password = 'abc123'`,
    waf_pattern: "Tautology (OR 1=1)",
  },
  {
    category:    { en: 'Authentication Bypass',      ar: 'تجاوز المصادقة' },
    color:       'var(--red)',
    colorDim:    'var(--red-dim)',
    icon:        '🔓',
    name:        { en: 'AND Tautology',               ar: 'حقن AND (تحقق دائم بالسلسلة)' },
    what: {
      en: "Same principle as OR tautology but uses AND with a true condition. Often used when the query structure doesn't allow OR.",
      ar: "نفس مبدأ حقن OR، لكنه يستخدم AND مع شرط صحيح دائماً. يُستخدم عندما لا يسمح تركيب الاستعلام بـ OR.",
    },
    how: {
      en: "Injects AND '1'='1' — a string comparison that is always true, combined with a comment to remove the remaining query logic.",
      ar: "يحقن الشرط AND '1'='1' وهو مقارنة نصية صحيحة دائماً، مقترناً بتعليق -- يُلغي باقي منطق الاستعلام.",
    },
    danger: {
      en: "Bypasses login, can also be used to confirm injection points without changing query results.",
      ar: "يتخطى تسجيل الدخول، ويمكن استخدامه للتحقق من نقاط الحقن دون التأثير الظاهر على نتائج الاستعلام.",
    },
    sql_note: {
      en: "'1'='1' is always true. The password check is commented out.",
      ar: "الشرط '1'='1' صحيح دائماً، وشرط كلمة المرور أصبح تعليقاً لا يُنفَّذ.",
    },
    payload:     "' AND '1'='1' --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'\n  AND password = 'abc123'`,
    sql_after:   `SELECT * FROM users\nWHERE username = ''\n  AND '1'='1'\n-- AND password = 'abc123'`,
    waf_pattern: "Tautology (AND 1=1)",
  },
  {
    category:    { en: 'Data Extraction',             ar: 'سرقة البيانات' },
    color:       'var(--accent)',
    colorDim:    'var(--accent-dim)',
    icon:        '📤',
    name:        { en: 'UNION SELECT — Data Dump',    ar: 'UNION SELECT — سحب بيانات المستخدمين' },
    what: {
      en: "Appends a second SELECT statement to the original query, allowing the attacker to read data from any table in the database — including usernames, passwords, emails.",
      ar: "يُلحق استعلام SELECT ثانياً بالاستعلام الأصلي، ليتمكن المهاجم من قراءة البيانات من أي جدول في قاعدة البيانات بما فيها أسماء المستخدمين وكلمات المرور والبريد الإلكتروني.",
    },
    how: {
      en: "UNION SELECT combines the results of two queries. The attacker must match the column count of the original query. The -- discards the rest of the original query.",
      ar: "UNION SELECT يدمج نتائج استعلامين في مجموعة واحدة. يجب أن يتطابق عدد الأعمدة مع الاستعلام الأصلي، و-- يُلغي ما تبقى منه.",
    },
    danger: {
      en: "Complete data breach — all usernames, hashed passwords, emails, and any other table can be extracted.",
      ar: "اختراق كامل للبيانات — يمكن سرقة جميع أسماء المستخدمين وكلمات المرور المشفرة والبريد الإلكتروني وأي جدول آخر.",
    },
    sql_note: {
      en: "The UNION appends a second result set. The attacker now receives a list of all users and their password hashes.",
      ar: "UNION يُضيف مجموعة نتائج ثانية. يتلقى المهاجم الآن قائمة بجميع المستخدمين وكلمات مرورهم المشفرة.",
    },
    payload:     "' UNION SELECT username, password FROM auth_user --",
    sql_before:  `SELECT id, name FROM products\nWHERE category = '[INPUT]'`,
    sql_after:   `SELECT id, name FROM products\nWHERE category = ''\nUNION\nSELECT username, password\nFROM auth_user\n-- '`,
    waf_pattern: "UNION SELECT attack",
  },
  {
    category:    { en: 'Data Extraction',             ar: 'سرقة البيانات' },
    color:       'var(--accent)',
    colorDim:    'var(--accent-dim)',
    icon:        '📋',
    name:        { en: 'Schema Enumeration',          ar: 'استطلاع هيكل قاعدة البيانات' },
    what: {
      en: "Queries the database's own internal metadata table (information_schema) to discover all table names, column names, and data types. This is reconnaissance — the attacker maps the entire database before extracting data.",
      ar: "يستعلم عن جدول البيانات الوصفية الداخلي (information_schema) لاكتشاف أسماء الجداول والأعمدة وأنواع البيانات. هذا استطلاع مبدئي — يرسم المهاجم خريطة قاعدة البيانات كاملة قبل سرقة البيانات.",
    },
    how: {
      en: "information_schema.tables is a built-in table in MySQL, PostgreSQL, and SQL Server that lists every table. The attacker uses UNION SELECT to read it.",
      ar: "information_schema.tables جدول مدمج في MySQL وPostgreSQL وSQL Server يحتوي على قائمة بكل الجداول. يستخدم المهاجم UNION SELECT لقراءته.",
    },
    danger: {
      en: "Reveals the full database structure — table names, column names, data types. Enables targeted follow-up attacks.",
      ar: "يكشف الهيكل الكامل لقاعدة البيانات: أسماء الجداول والأعمدة وأنواع البيانات. يُمكّن من شن هجمات استخراج موجَّهة ودقيقة.",
    },
    sql_note: {
      en: "Returns a list of every table in the database instead of product data.",
      ar: "تعيد النتيجة قائمة بكل جداول قاعدة البيانات بدلاً من بيانات المنتجات.",
    },
    payload:     "' UNION SELECT table_name,2 FROM information_schema.tables --",
    sql_before:  `SELECT id, name FROM products\nWHERE category = '[INPUT]'`,
    sql_after:   `SELECT id, name FROM products\nWHERE category = ''\nUNION\nSELECT table_name, 2\nFROM information_schema.tables\n-- '`,
    waf_pattern: "Schema enumeration (information_schema)",
  },
  {
    category:    { en: 'Destructive',                 ar: 'هجمات تدمير البيانات' },
    color:       'var(--red)',
    colorDim:    'var(--red-dim)',
    icon:        '💣',
    name:        { en: 'Stacked Query — DROP TABLE',  ar: 'استعلام مكدّس — حذف جدول كامل' },
    what: {
      en: "Uses a semicolon to inject a completely separate SQL statement after the original query. The second statement can be anything — including DROP TABLE, which permanently deletes an entire table.",
      ar: "يستخدم الفاصلة المنقوطة ; لحقن جملة SQL منفصلة تماماً بعد الاستعلام الأصلي. الجملة الثانية يمكن أن تكون أي شيء — بما فيها DROP TABLE التي تحذف جدولاً بالكامل بشكل نهائي.",
    },
    how: {
      en: "The ; character ends the first query and starts a new one. Most databases support multiple statements separated by semicolons.",
      ar: "الفاصلة المنقوطة ; تنهي الاستعلام الأول وتبدأ جملة جديدة. معظم قواعد البيانات تدعم تنفيذ عدة جمل مفصولة بها.",
    },
    danger: {
      en: "Permanent, irreversible data destruction. Can delete tables, databases, or user accounts. No backup = complete data loss.",
      ar: "تدمير دائم لا يمكن التراجع عنه. قادر على حذف جداول أو قواعد بيانات كاملة أو حسابات المستخدمين. بدون نسخة احتياطية = فقدان كل البيانات.",
    },
    sql_note: {
      en: "Two statements execute: the original SELECT, then DROP TABLE. The users table is permanently deleted.",
      ar: "يُنفَّذ جملتان: الاستعلام الأصلي، ثم DROP TABLE. جدول المستخدمين يُحذف نهائياً.",
    },
    payload:     "'; DROP TABLE auth_user; --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = '';\n\nDROP TABLE auth_user;\n-- '`,
    waf_pattern: "Stacked queries (semicolon) + Destructive DDL",
  },
  {
    category:    { en: 'Destructive',                 ar: 'هجمات تدمير البيانات' },
    color:       'var(--red)',
    colorDim:    'var(--red-dim)',
    icon:        '✏️',
    name:        { en: 'INSERT / UPDATE Injection',   ar: 'حقن INSERT/UPDATE — تعديل البيانات' },
    what: {
      en: "Injects an INSERT or UPDATE statement to add fake users, change passwords, or modify any data in the database.",
      ar: "يحقن جملة INSERT أو UPDATE لإضافة مستخدمين وهميين، أو تغيير كلمات المرور، أو تعديل أي بيانات في قاعدة البيانات.",
    },
    how: {
      en: "Using stacked queries, the attacker runs a second statement that modifies data. INSERT creates new records; UPDATE changes existing ones.",
      ar: "باستخدام الاستعلامات المكدسة، يُنفّذ المهاجم جملة ثانية تُعدّل البيانات. INSERT يُنشئ سجلات جديدة، وUPDATE يُعدّل السجلات الموجودة.",
    },
    danger: {
      en: "Creates backdoor admin accounts, changes passwords, corrupts data, or escalates privileges.",
      ar: "ينشئ حسابات إدارية خفية، يغيّر كلمات المرور، يُفسد البيانات، أو يرفع مستوى الصلاحيات.",
    },
    sql_note: {
      en: "A new admin user 'hacker' is inserted into the users table. The attacker now has permanent access.",
      ar: "يُضاف مستخدم جديد بصلاحيات المدير إلى جدول المستخدمين. المهاجم أصبح يملك وصولاً دائماً للنظام.",
    },
    payload:     "'; INSERT INTO auth_user(username,password,is_staff) VALUES('hacker','hash',1); --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = '';\n\nINSERT INTO auth_user\n  (username, password, is_staff)\nVALUES ('hacker', 'hash', 1);\n-- '`,
    waf_pattern: "DML injection (INSERT/UPDATE/DELETE)",
  },
  {
    category:    { en: 'Blind — Time Based',          ar: 'الحقن الأعمى — الزمني' },
    color:       'var(--yellow)',
    colorDim:    'var(--yellow-dim)',
    icon:        '⏱️',
    name:        { en: 'SLEEP() — Time-Based Blind (MySQL)', ar: 'SLEEP() — الحقن الأعمى الزمني (MySQL)' },
    what: {
      en: "When the application doesn't show error messages or query results, the attacker uses time delays to extract information. If the response is slow, the condition was true.",
      ar: "حين لا تُظهر التطبيقات رسائل خطأ أو نتائج الاستعلام، يستخدم المهاجم التأخير الزمني لاستخراج المعلومات. إذا كان الرد بطيئاً فالشرط كان صحيحاً.",
    },
    how: {
      en: "SLEEP(5) pauses the database for 5 seconds. Paired with a condition (IF), the attacker can ask yes/no questions: 'Did the response take 5 seconds? Then admin exists.'",
      ar: "SLEEP(5) يُوقف قاعدة البيانات لمدة 5 ثوانٍ. مقترناً بشرط IF، يطرح المهاجم أسئلة نعم/لا: 'هل استغرق الرد 5 ثوانٍ؟ إذن المستخدم موجود.'",
    },
    danger: {
      en: "Can extract entire databases character by character, with no visible output. Also causes denial of service by tying up database connections.",
      ar: "قادر على استخراج قواعد بيانات كاملة حرفاً بحرف دون أي مخرجات مرئية. يُسبب أيضاً تعطلاً في الخدمة عبر احتجاز اتصالات قاعدة البيانات.",
    },
    sql_note: {
      en: "The database pauses for 5 seconds. The attacker measures the response time to confirm injection works. Then uses IF(condition, SLEEP(5), 0) to extract data bit by bit.",
      ar: "قاعدة البيانات تتوقف 5 ثوانٍ. المهاجم يقيس وقت الاستجابة لتأكيد نجاح الحقن، ثم يستخدم IF(شرط, SLEEP(5), 0) لاستخراج البيانات جزءاً جزءاً.",
    },
    payload:     "' AND SLEEP(5) --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = ''\n  AND SLEEP(5)\n-- '`,
    waf_pattern: "Time-based blind SQLi (SLEEP/WAITFOR)",
  },
  {
    category:    { en: 'Blind — Time Based',          ar: 'الحقن الأعمى — الزمني' },
    color:       'var(--yellow)',
    colorDim:    'var(--yellow-dim)',
    icon:        '⏱️',
    name:        { en: 'WAITFOR DELAY — Time-Based Blind (MSSQL)', ar: 'WAITFOR DELAY — الحقن الأعمى الزمني (MSSQL)' },
    what: {
      en: "The Microsoft SQL Server equivalent of SLEEP(). Works identically — pauses execution for a specified time to signal true/false conditions.",
      ar: "مكافئ SLEEP() في SQL Server من مايكروسوفت. يعمل بنفس الطريقة تماماً — يوقف التنفيذ لمدة محددة للإشارة إلى صحة أو خطأ شرط ما.",
    },
    how: {
      en: "WAITFOR DELAY '0:0:5' delays for 5 seconds. Used on MSSQL servers (Windows servers running SQL Server, common in enterprise environments).",
      ar: "WAITFOR DELAY '0:0:5' يُحدث تأخيراً مدته 5 ثوانٍ. يُستخدم على خوادم MSSQL (خوادم Windows التي تشغّل SQL Server، شائعة في بيئات الشركات).",
    },
    danger: {
      en: "Same as SLEEP — complete blind data extraction. Particularly dangerous in enterprise environments where MSSQL is common.",
      ar: "مطابق لخطورة SLEEP — استخراج أعمى كامل للبيانات. خطير بشكل خاص في بيئات الشركات حيث يُستخدم MSSQL على نطاق واسع.",
    },
    sql_note: {
      en: "SQL Server pauses for 5 seconds. Attacker detects the delay and confirms injection. Identical exploitation technique to SLEEP() but for MSSQL.",
      ar: "SQL Server يتوقف 5 ثوانٍ. المهاجم يرصد التأخير ويؤكد نجاح الحقن. نفس أسلوب استغلال SLEEP() لكن لـ MSSQL.",
    },
    payload:     "'; WAITFOR DELAY '0:0:5' --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = '';\n\nWAITFOR DELAY '0:0:5';\n-- '`,
    waf_pattern: "Time-based blind SQLi (SLEEP/WAITFOR)",
  },
  {
    category:    { en: 'Blind — Boolean',             ar: 'الحقن الأعمى — المنطقي' },
    color:       'var(--yellow)',
    colorDim:    'var(--yellow-dim)',
    icon:        '❓',
    name:        { en: 'Boolean Conditional (IF/CASE)', ar: 'الشرط المنطقي IF/CASE — استنتاج البيانات' },
    what: {
      en: "Asks the database a true/false question and observes whether the page behaves differently. No timing needed — just looks for different page content or status codes.",
      ar: "يطرح على قاعدة البيانات سؤالاً صح/خطأ ويراقب ما إذا كانت الصفحة تتصرف بشكل مختلف. لا يحتاج لتوقيت — بل يبحث فقط عن اختلاف في محتوى الصفحة أو رمز الحالة.",
    },
    how: {
      en: "IF(1=1, 'true_value', 'false_value') returns different results based on a condition. The attacker changes the condition to test database facts: 'Does the admin user exist? Is the first char of the password H?'",
      ar: "IF(1=1, 'قيمة_صحيحة', 'قيمة_خاطئة') يُعيد نتائج مختلفة بحسب الشرط. المهاجم يُغيّر الشرط لاختبار حقائق قاعدة البيانات: 'هل المستخدم admin موجود؟ هل أول حرف في كلمة المرور هو H؟'",
    },
    danger: {
      en: "Stealthy, reliable data extraction with no errors or timeouts. Automated tools can extract entire databases in minutes.",
      ar: "استخراج بيانات خفي وموثوق دون أي أخطاء أو انتهاء مهلة. الأدوات الآلية تستطيع استخراج قواعد بيانات كاملة في دقائق.",
    },
    sql_note: {
      en: "When condition is true → page loads normally. When false → page shows error or no results. Attacker detects the difference to infer data.",
      ar: "حين يكون الشرط صحيحاً ← الصفحة تُحمَّل بشكل طبيعي. حين يكون خاطئاً ← تظهر رسالة خطأ أو لا نتائج. المهاجم يرصد الفرق ليستنتج البيانات.",
    },
    payload:     "' AND IF(1=1, 'a', 'b')='a' --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = ''\n  AND IF(1=1, 'a', 'b') = 'a'\n-- '`,
    waf_pattern: "Conditional blind SQLi (IF/CASE)",
  },
  {
    category:    { en: 'Obfuscation / Bypass',        ar: 'التمويه والتحايل على الفلاتر' },
    color:       'var(--purple)',
    colorDim:    'var(--purple-dim)',
    icon:        '🎭',
    name:        { en: 'Hex Encoding Bypass',         ar: 'التشفير السداسي عشري — إخفاء الحمولة' },
    what: {
      en: "Encodes the attack payload in hexadecimal so it doesn't look like SQL to naive filters. The database automatically decodes hex values before executing.",
      ar: "يُشفّر حمولة الهجوم بالنظام السداسي عشري لتبدو غير مشبوهة للفلاتر البسيطة. قاعدة البيانات تفكّ الشفرة تلقائياً قبل التنفيذ.",
    },
    how: {
      en: "0x61646d696e is the hex encoding of the string 'admin'. The database engine converts it back to 'admin' at execution time, bypassing any filter that looks for the literal word 'admin'.",
      ar: "0x61646d696e هو التمثيل السداسي عشري للنص 'admin'. محرك قاعدة البيانات يحوّله إلى 'admin' عند التنفيذ، متجاوزاً أي فلتر يبحث عن الكلمة مباشرةً.",
    },
    danger: {
      en: "Bypasses simple keyword-based WAFs and input filters. The actual attack is hidden inside what looks like a random number.",
      ar: "يتخطى جدران الحماية والفلاتر البسيطة القائمة على الكلمات المفتاحية. الهجوم الحقيقي مخفي داخل ما يبدو كرقم عشوائي.",
    },
    sql_note: {
      en: "0x61646d696e decodes to 'admin'. The database receives the query as if 'admin' was typed directly. No quotes needed — bypasses quote-based filters.",
      ar: "0x61646d696e يُحوَّل إلى 'admin'. تتلقى قاعدة البيانات الاستعلام كأن 'admin' كُتبت مباشرةً. لا حاجة للاقتباسات — يتخطى فلاتر الاقتباس.",
    },
    payload:     "0x61646d696e",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = 0x61646d696e`,
    waf_pattern: "Hex-encoded SQLi bypass",
  },
  {
    category:    { en: 'Obfuscation / Bypass',        ar: 'التمويه والتحايل على الفلاتر' },
    color:       'var(--purple)',
    colorDim:    'var(--purple-dim)',
    icon:        '🎭',
    name:        { en: 'CHAR() Function Obfuscation', ar: 'دالة CHAR() — بناء النص من رموز ASCII' },
    what: {
      en: "Builds strings from ASCII character codes instead of using quote characters. Used to bypass filters that block quotes or keyword matching.",
      ar: "يبني النصوص من رموز ASCII بدلاً من الاقتباسات. يُستخدم للتحايل على الفلاتر التي تحجب الاقتباسات أو مطابقة الكلمات المفتاحية.",
    },
    how: {
      en: "CHAR(97,100,109,105,110) builds the string 'admin' character by character using ASCII codes. No quotes are needed anywhere in the payload.",
      ar: "CHAR(97,100,109,105,110) يبني النص 'admin' حرفاً بحرف من رموز ASCII. لا توجد اقتباسات في أي مكان من الحمولة.",
    },
    danger: {
      en: "Bypasses quote-based filters and simple keyword blacklists. Any string can be represented this way, making it impossible to block with naive filtering.",
      ar: "يتخطى فلاتر الاقتباس وقوائم الكلمات المحجوبة. يمكن تمثيل أي نص بهذه الطريقة، مما يجعل الحجب بالفلترة البسيطة مستحيلاً.",
    },
    sql_note: {
      en: "CHAR(97,100,109,105,110) = 'admin'. The filter never sees the word 'admin' yet the database queries for exactly that username.",
      ar: "CHAR(97,100,109,105,110) = 'admin'. الفلتر لا يرى كلمة 'admin' أبداً، لكن قاعدة البيانات تبحث بالضبط عن ذلك الاسم.",
    },
    payload:     "' OR username=CHAR(97,100,109,105,110) --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = ''\n   OR username = CHAR(97,100,109,105,110)\n-- '`,
    waf_pattern: "CHAR() obfuscation",
  },
  {
    category:    { en: 'Obfuscation / Bypass',        ar: 'التمويه والتحايل على الفلاتر' },
    color:       'var(--purple)',
    colorDim:    'var(--purple-dim)',
    icon:        '💬',
    name:        { en: 'Inline Comment Bypass (/**/)', ar: 'تعليق مضمّن /**/ — تفكيك الكلمات المفتاحية' },
    what: {
      en: "Inserts SQL comments (/**/) in the middle of keywords to break up strings that keyword filters would catch, while the database still executes the full keyword.",
      ar: "يُدرج تعليقات SQL (**/) وسط الكلمات المفتاحية لتفكيكها بحيث لا تتعرف عليها فلاتر الكلمات، بينما لا تزال قاعدة البيانات تُنفّذها بالكامل.",
    },
    how: {
      en: "SQL treats /**/ as whitespace. So SEL/**/ECT is valid SQL for SELECT, but a filter searching for the word 'SELECT' won't match it.",
      ar: "SQL تُعامل /**/ كمسافة بيضاء. SEL/**/ECT استعلام SELECT صالح تماماً، لكن فلتراً يبحث عن كلمة 'SELECT' لن يتعرف عليه.",
    },
    danger: {
      en: "Bypasses WAFs and filters that rely on simple string matching. The split keyword is invisible to naive scanners but executes normally.",
      ar: "يتخطى جدران الحماية والفلاتر التي تعتمد على مطابقة النصوص البسيطة. الكلمة المفككة غير مرئية للماسحات البسيطة لكنها تُنفَّذ بشكل طبيعي.",
    },
    sql_note: {
      en: "The database ignores /**/ and evaluates ad/**/min as just a string — but the OR 1=1 still bypasses authentication.",
      ar: "قاعدة البيانات تتجاهل /**/ وتُقيّم ad/**/min كنص عادي — لكن OR 1=1 لا يزال يتخطى المصادقة.",
    },
    payload:     "ad/**/min' OR 1=1 --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = 'ad/**/min'\n   OR 1=1\n-- '`,
    waf_pattern: "SQL comment injection (-- or #)",
  },
  {
    category:    { en: 'File System',                 ar: 'الوصول لنظام الملفات' },
    color:       'var(--green)',
    colorDim:    'var(--green-dim)',
    icon:        '📁',
    name:        { en: 'LOAD_FILE() — Read Server Files', ar: 'LOAD_FILE() — قراءة ملفات الخادم' },
    what: {
      en: "Uses MySQL's LOAD_FILE() function to read any file on the server that the database process has permission to access — including /etc/passwd, config files, and application source code.",
      ar: "يستخدم دالة LOAD_FILE() في MySQL لقراءة أي ملف على الخادم يملك عملية قاعدة البيانات صلاحية الوصول إليه — بما في ذلك /etc/passwd وملفات الإعداد والكود المصدري للتطبيق.",
    },
    how: {
      en: "LOAD_FILE('/etc/passwd') reads the file and returns its contents as a string. Combined with UNION SELECT, the attacker receives the file contents in the HTTP response.",
      ar: "LOAD_FILE('/etc/passwd') يقرأ الملف ويُعيد محتواه كنص. مقترناً بـ UNION SELECT، يتلقى المهاجم محتوى الملف مباشرةً في استجابة HTTP.",
    },
    danger: {
      en: "Exposes server configuration files, application secrets, API keys, database credentials, and system user accounts.",
      ar: "يكشف ملفات إعداد الخادم، والأسرار الحساسة للتطبيق، ومفاتيح API، وبيانات اعتماد قاعدة البيانات، وحسابات مستخدمي النظام.",
    },
    sql_note: {
      en: "The response contains the contents of /etc/passwd — a list of all system users. The attacker can then read database config files to get credentials.",
      ar: "تحتوي الاستجابة على محتوى /etc/passwd — قائمة بجميع مستخدمي النظام. يمكن للمهاجم بعدها قراءة ملفات إعداد قاعدة البيانات للحصول على بيانات الاعتماد.",
    },
    payload:     "' UNION SELECT LOAD_FILE('/etc/passwd'), 2 --",
    sql_before:  `SELECT id, name FROM products\nWHERE category = '[INPUT]'`,
    sql_after:   `SELECT id, name FROM products\nWHERE category = ''\nUNION\nSELECT LOAD_FILE('/etc/passwd'), 2\n-- '`,
    waf_pattern: "File I/O attack (LOAD_FILE/OUTFILE)",
  },
  {
    category:    { en: 'Stored Procedure',            ar: 'الإجراءات المخزّنة' },
    color:       'var(--accent)',
    colorDim:    'var(--accent-dim)',
    icon:        '⚙️',
    name:        { en: 'EXEC / xp_cmdshell (MSSQL)',  ar: 'EXEC / xp_cmdshell — تنفيذ أوامر النظام' },
    what: {
      en: "On Microsoft SQL Server, the xp_cmdshell stored procedure executes operating system commands with the privileges of the SQL Server service account. This is Remote Code Execution (RCE) — the most severe possible outcome.",
      ar: "في SQL Server من مايكروسوفت، الإجراء المخزّن xp_cmdshell يُنفّذ أوامر نظام التشغيل بصلاحيات حساب خدمة SQL Server. هذا تنفيذ كود عن بُعد (RCE) — أشد نتيجة ممكنة من حيث الخطورة.",
    },
    how: {
      en: "EXEC xp_cmdshell('whoami') runs an OS command. If the SQL Server service runs as Administrator (common in poorly configured systems), the attacker has full control of the server.",
      ar: "EXEC xp_cmdshell('whoami') يُشغّل أمر نظام تشغيل. إذا كانت خدمة SQL Server تعمل بصلاحيات المدير (شائع في الأنظمة سيئة الإعداد)، يمتلك المهاجم تحكماً كاملاً في الخادم.",
    },
    danger: {
      en: "Complete server takeover. The attacker can install backdoors, exfiltrate all data, pivot to other internal systems, or destroy everything.",
      ar: "السيطرة الكاملة على الخادم. المهاجم يستطيع تثبيت أبواب خلفية، سرقة جميع البيانات، الانتقال لأنظمة داخلية أخرى، أو تدمير كل شيء.",
    },
    sql_note: {
      en: "This executes the OS command 'whoami' on the server and returns the result. With xp_cmdshell enabled, an attacker can run any OS command — create files, download malware, open ports.",
      ar: "يُنفَّذ أمر 'whoami' على الخادم وتُعاد نتيجته. مع تفعيل xp_cmdshell، يستطيع المهاجم تشغيل أي أمر نظام — إنشاء ملفات، تنزيل برمجيات خبيثة، فتح منافذ شبكية.",
    },
    payload:     "'; EXEC xp_cmdshell('whoami'); --",
    sql_before:  `SELECT * FROM users\nWHERE username = '[INPUT]'`,
    sql_after:   `SELECT * FROM users\nWHERE username = '';\n\nEXEC xp_cmdshell('whoami');\n-- '`,
    waf_pattern: "EXEC / stored procedure call",
  },
];

const CATEGORY_COLORS = {
  'Authentication Bypass':   'var(--red)',
  'تجاوز المصادقة':          'var(--red)',
  'Data Extraction':         'var(--accent)',
  'سرقة البيانات':           'var(--accent)',
  'Destructive':             'var(--red)',
  'هجمات تدمير البيانات':    'var(--red)',
  'Blind — Time Based':      'var(--yellow)',
  'الحقن الأعمى — الزمني':   'var(--yellow)',
  'Blind — Boolean':         'var(--yellow)',
  'الحقن الأعمى — المنطقي':  'var(--yellow)',
  'Obfuscation / Bypass':    'var(--purple)',
  'التمويه والتحايل على الفلاتر': 'var(--purple)',
  'File System':             'var(--green)',
  'الوصول لنظام الملفات':    'var(--green)',
  'Stored Procedure':        'var(--accent)',
  'الإجراءات المخزّنة':      'var(--accent)',
};

// نصوص الواجهة الثابتة بالعربية والإنجليزية
const UI = {
  en: {
    attackRef:      "SQL Injection Attack Reference",
    attackCount:    (n) => `${n} attacks`,
    attackDesc:     "Every attack type the WAF detects — explained with examples, SQL before/after, real impact, and the exact pattern that catches it. Click any attack to expand full details.",
    searchPlaceholder: "Search attacks...",
    expandAll:      "Expand all",
    collapseAll:    "Collapse all",
    noResults:      "No attacks match your search.",
    whatItDoes:     "What it does",
    howItWorks:     "How it works",
    impactLabel:    "Impact if not blocked",
    sqlBefore:      "Original SQL query (safe)",
    sqlAfter:       "After injection (dangerous)",
    wafCatches:     "WAF pattern that catches this",
    testPayload:    "Test payload (try in login)",
    all:            "All",
    overview:       "This graduation project demonstrates a complete Web Application Firewall (WAF) built from scratch using Django and React. The primary goal is to showcase SQL injection detection, blocking, and audit logging in a realistic web application context.",
    overviewP2:     "The system uses a Django middleware layer to inspect every incoming HTTP request before it reaches any view. Suspicious payloads are matched against 15+ compiled regex patterns covering all major SQLi attack categories.",
    steps: [
      { title: 'Request arrives',           desc: 'Browser or API client sends an HTTP request to any endpoint.' },
      { title: 'WAF Middleware intercepts', desc: 'SQLInjectionFirewallMiddleware.process_request() is called before any view logic.' },
      { title: 'Input extraction',          desc: 'All user-controlled input is collected: GET params, POST fields, JSON body values.' },
      { title: 'Pattern matching',          desc: 'Each input value is tested against 15+ compiled SQLi regex patterns.' },
      { title: 'Block or pass',             desc: 'Match found → log to AttackLog, return HTTP 403. No match → request continues normally.' },
      { title: 'Django ORM handles data',   desc: 'All views use Django ORM (parameterized queries) — no raw SQL anywhere.' },
      { title: 'Audit trail',               desc: 'Admin and authorized users can review every blocked attempt in the Attack Logs page.' },
    ],
    secFeatures: [
      '✅ Django ORM only — no raw SQL',
      '✅ PBKDF2+SHA256 password hashing',
      '✅ JWT access + refresh tokens',
      '✅ CSRF protection enabled',
      '✅ Rate limiting (30 req/min anon)',
      '✅ Role-based access control',
      '✅ X-Frame-Options: DENY',
      '✅ XSS filter header enabled',
      '✅ 15+ SQLi detection patterns',
      '✅ Full attack audit logging',
      '✅ Bilingual blocked messages',
    ],
    secFeatTitle: "Security Features",
  },
  ar: {
    attackRef:      "مرجع هجمات حقن SQL",
    attackCount:    (n) => `${n} هجوماً`,
    attackDesc:     "جميع أنواع الهجمات التي يكتشفها جدار الحماية — مشروحة بأمثلة، وبالاستعلام قبل الحقن وبعده، وتأثيرها الحقيقي، والنمط الذي يصطادها بالضبط. اضغط على أي هجوم لعرض التفاصيل الكاملة.",
    searchPlaceholder: "ابحث عن هجوم...",
    expandAll:      "توسيع الكل",
    collapseAll:    "طي الكل",
    noResults:      "لا توجد هجمات تطابق بحثك.",
    whatItDoes:     "ماذا يفعل؟",
    howItWorks:     "كيف يعمل؟",
    impactLabel:    "الأثر إن لم يُوقَف",
    sqlBefore:      "الاستعلام الأصلي (آمن)",
    sqlAfter:       "بعد الحقن (خطير)",
    wafCatches:     "النمط الذي يصطاده جدار الحماية",
    testPayload:    "حمولة الاختبار (جرّبها في تسجيل الدخول)",
    all:            "الكل",
    overview:       "هذا المشروع التخرجي يُقدّم نموذجاً عملياً لجدار حماية تطبيقات ويب (WAF) مبني من الصفر باستخدام Django وReact. الهدف الرئيسي هو إثبات قدرة النظام على كشف هجمات حقن SQL وصدّها وتوثيقها في سياق تطبيق ويب واقعي.",
    overviewP2:     "يعتمد النظام على طبقة وسيطة في Django تفحص كل طلب HTTP وارد قبل أن يصل إلى أي مسار. تُقابَل الحمولات المشبوهة بأكثر من 15 نمطاً مُجمَّعاً يغطي جميع فئات هجمات حقن SQL الرئيسية.",
    steps: [
      { title: 'وصول الطلب',               desc: 'المتصفح أو عميل API يرسل طلب HTTP إلى أي نقطة وصول.' },
      { title: 'اعتراض الطبقة الوسيطة',    desc: 'تُستدعى SQLInjectionFirewallMiddleware.process_request() قبل أي منطق للمسار.' },
      { title: 'استخراج المدخلات',          desc: 'تُجمع جميع مدخلات المستخدم: معاملات GET وحقول POST وقيم جسم JSON.' },
      { title: 'مطابقة الأنماط',            desc: 'تُختبر كل قيمة مدخلة بأكثر من 15 نمطاً لاكتشاف حقن SQL.' },
      { title: 'الحجب أو التمرير',          desc: 'تطابق موجود ← تسجيل في AttackLog وإعادة HTTP 403. لا تطابق ← الطلب يُكمل مساره.' },
      { title: 'Django ORM يعالج البيانات', desc: 'جميع المسارات تستخدم Django ORM (استعلامات مُعلَّمة) — لا SQL خام في أي مكان.' },
      { title: 'سجل التدقيق',               desc: 'المدير والمستخدمون المخوّلون يستطيعون مراجعة كل محاولة محجوبة في صفحة سجلات الهجمات.' },
    ],
    secFeatures: [
      '✅ Django ORM حصراً — لا SQL خام',
      '✅ تشفير كلمات المرور بـ PBKDF2+SHA256',
      '✅ رموز JWT للوصول والتحديث',
      '✅ حماية CSRF مُفعَّلة',
      '✅ تقييد المعدل (30 طلباً/دقيقة للزوار)',
      '✅ تحكم بالوصول حسب الدور',
      '✅ X-Frame-Options: DENY',
      '✅ ترويسة فلتر XSS مُفعَّلة',
      '✅ أكثر من 15 نمط كشف لحقن SQL',
      '✅ تسجيل كامل للهجمات المحجوبة',
      '✅ رسائل الحجب بلغتين',
    ],
    secFeatTitle: "مميزات الأمان",
  },
};

function SqlBlock({ label, code, note, color = 'var(--text-secondary)' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
      <pre style={{
        background: 'var(--bg-primary)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '10px 14px', margin: 0,
        fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color,
        overflowX: 'auto', whiteSpace: 'pre', lineHeight: 1.7,
        direction: 'ltr', textAlign: 'left',
      }}>{code}</pre>
      {note && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 5, fontStyle: 'italic' }}>↑ {note}</div>}
    </div>
  );
}

function ExpandableAttackCard({ attack, forceOpen, lang }) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = forceOpen || localOpen;
  const ui = UI[lang];

  const catLabel = typeof attack.category === 'object' ? attack.category[lang] : attack.category;
  const name     = typeof attack.name     === 'object' ? attack.name[lang]     : attack.name;
  const what     = typeof attack.what     === 'object' ? attack.what[lang]     : attack.what;
  const how      = typeof attack.how      === 'object' ? attack.how[lang]      : attack.how;
  const danger   = typeof attack.danger   === 'object' ? attack.danger[lang]   : attack.danger;
  const sqlNote  = typeof attack.sql_note === 'object' ? attack.sql_note[lang] : attack.sql_note;

  return (
    <div style={{
      border: `1px solid ${open ? attack.color : 'var(--border)'}`,
      borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s', marginBottom: 10,
    }}>
      <button
        onClick={() => setLocalOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: open ? 'rgba(0,0,0,0.25)' : 'var(--bg-card)',
          border: 'none', cursor: 'pointer', textAlign: lang === 'ar' ? 'right' : 'left',
          transition: 'background 0.2s',
        }}
      >
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{attack.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{name}</span>
            <span style={{
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
              background: attack.colorDim, color: attack.color,
              border: `1px solid ${attack.color}33`, fontWeight: 600,
            }}>{catLabel}</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 3, fontFamily: 'var(--font-mono)', direction: 'ltr', textAlign: 'left' }}>
            {attack.payload.slice(0, 70)}{attack.payload.length > 70 ? '…' : ''}
          </div>
        </div>
        <div style={{ color: attack.color, flexShrink: 0 }}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 18px 20px', background: 'rgba(0,0,0,0.15)', borderTop: `1px solid ${attack.color}33` }}>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>{ui.whatItDoes}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.8, margin: 0 }}>{what}</p>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>{ui.howItWorks}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.8, margin: 0 }}>{how}</p>
            </div>
          </div>

          <div style={{ margin: '14px 0', padding: '10px 14px', background: 'rgba(255,56,96,0.08)', border: '1px solid rgba(255,56,96,0.2)', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={15} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--red)', marginBottom: 3 }}>{ui.impactLabel}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{danger}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <SqlBlock label={ui.sqlBefore} code={attack.sql_before} color="var(--green)" />
            <SqlBlock label={ui.sqlAfter}  code={attack.sql_after}  note={sqlNote}        color="var(--red)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>{ui.wafCatches}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 6, padding: '8px 12px', direction: 'ltr' }}>
                {attack.waf_pattern}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>{ui.testPayload}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--yellow)', background: 'var(--yellow-dim)', border: '1px solid rgba(255,214,0,0.2)', borderRadius: 6, padding: '8px 12px', wordBreak: 'break-all', direction: 'ltr' }}>
                {attack.payload}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function About() {
  const { lang } = useApp();
  const t  = translations[lang];
  const ui = UI[lang];

  const [filter,    setFilter]    = useState('all');
  const [expandAll, setExpandAll] = useState(false);
  const [search,    setSearch]    = useState('');

  const categories = [...new Set(ATTACKS.map(a =>
    typeof a.category === 'object' ? a.category[lang] : a.category
  ))];

  const filtered = ATTACKS.filter(a => {
    const cat  = typeof a.category === 'object' ? a.category[lang] : a.category;
    const name = typeof a.name     === 'object' ? a.name[lang]     : a.name;
    const matchCat    = filter === 'all' || cat === filter;
    const matchSearch = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      a.payload.toLowerCase().includes(search.toLowerCase()) ||
      cat.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      <div className="page-header">
        <h1><BookOpen size={22} style={{ color: 'var(--accent)' }} />{t.aboutTitle}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div>
          {/* نظرة عامة */}
          <div className="card about-section">
            <h2><BookOpen size={18} />{t.projectOverview}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
              {ui.overview.split('Web Application Firewall (WAF)').length > 1
                ? <>{ui.overview.split('Web Application Firewall (WAF)')[0]}<strong style={{ color: 'var(--accent)' }}>Web Application Firewall (WAF)</strong>{ui.overview.split('Web Application Firewall (WAF)')[1]}</>
                : ui.overview.split('جدار حماية تطبيقات ويب (WAF)').length > 1
                  ? <>{ui.overview.split('جدار حماية تطبيقات ويب (WAF)')[0]}<strong style={{ color: 'var(--accent)' }}>جدار حماية تطبيقات ويب (WAF)</strong>{ui.overview.split('جدار حماية تطبيقات ويب (WAF)')[1]}</>
                  : ui.overview}
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              {ui.overviewP2.includes('Django middleware')
                ? <>{ui.overviewP2.split('Django middleware')[0]}<strong style={{ color: 'var(--accent)' }}>Django middleware</strong>{ui.overviewP2.split('Django middleware')[1]}</>
                : ui.overviewP2.includes('طبقة وسيطة في Django')
                  ? <>{ui.overviewP2.split('طبقة وسيطة في Django')[0]}<strong style={{ color: 'var(--accent)' }}>طبقة وسيطة في Django</strong>{ui.overviewP2.split('طبقة وسيطة في Django')[1]}</>
                  : ui.overviewP2}
            </p>
          </div>

          {/* كيف يعمل */}
          <div className="card about-section">
            <h2><Zap size={18} />{t.howItWorks}</h2>
            <div className="steps">
              {ui.steps.map(s => (
                <div className="step" key={s.title}>
                  <div><h4>{s.title}</h4><p>{s.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* التقنيات */}
          <div className="card about-section">
            <h2><Layers size={18} />{t.techStack}</h2>
            {[
              { label: lang === 'ar' ? 'الخلفية' : 'Backend',   items: ['Django 5', 'Django REST Framework', 'SimpleJWT', 'django-cors-headers', 'SQLite / PostgreSQL'] },
              { label: lang === 'ar' ? 'الواجهة' : 'Frontend',  items: ['React 18', 'React Router v6', 'Axios', 'Recharts', 'Lucide Icons'] },
              { label: lang === 'ar' ? 'الأمان'  : 'Security',  items: ['JWT Auth', 'PBKDF2 Hashing', 'CSRF Protection', 'Rate Limiting', 'WAF Middleware', 'RBAC'] },
            ].map(g => (
              <div key={g.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1 }}>{g.label}</div>
                <div className="tech-chips">{g.items.map(i => <span key={i} className="tech-chip">{i}</span>)}</div>
              </div>
            ))}
          </div>

          {/* مميزات الأمان */}
          <div className="card about-section">
            <h2><Code size={18} />{ui.secFeatTitle}</h2>
            {ui.secFeatures.map(f => (
              <div key={f} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '5px 0', borderBottom: '1px solid rgba(26,58,92,0.4)' }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════ مرجع الهجمات ═══════════════════ */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <AlertTriangle size={18} style={{ color: 'var(--red)' }} />
              {ui.attackRef}
              <span style={{ fontSize: '0.75rem', background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,56,96,0.3)', padding: '2px 8px', borderRadius: 12 }}>
                {ui.attackCount(ATTACKS.length)}
              </span>
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpandAll(e => !e)}>
              {expandAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expandAll ? ui.collapseAll : ui.expandAll}
            </button>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>{ui.attackDesc}</p>

          {/* بحث وفلاتر */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: lang === 'ar' ? 'auto' : 10, right: lang === 'ar' ? 10 : 'auto', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="filter-input"
                style={{ paddingLeft: lang === 'ar' ? 14 : 32, paddingRight: lang === 'ar' ? 32 : 14, width: '100%' }}
                placeholder={ui.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilter('all')}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: '1px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                  background: filter === 'all' ? 'var(--accent)' : 'transparent',
                  color:      filter === 'all' ? '#000'          : 'var(--text-secondary)',
                  borderColor: filter === 'all' ? 'var(--accent)' : 'var(--border)',
                }}
              >{ui.all}</button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, border: '1px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    background:  filter === cat ? (CATEGORY_COLORS[cat] || 'var(--accent)') : 'transparent',
                    color:       filter === cat ? '#fff' : 'var(--text-secondary)',
                    borderColor: filter === cat ? (CATEGORY_COLORS[cat] || 'var(--accent)') : 'var(--border)',
                    transition: '0.15s',
                  }}
                >{cat}</button>
              ))}
            </div>
          </div>
        </div>

        {/* بطاقات الهجمات */}
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{ui.noResults}</div>
          : filtered.map(attack => (
              <ExpandableAttackCard key={attack.payload} attack={attack} forceOpen={expandAll} lang={lang} />
            ))
        }
      </div>
    </div>
  );
}
