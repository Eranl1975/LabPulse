# הוראות שימוש והפעלה - מערכת משתמשים וסיסמאות בـ LabPulse

## 📋 תקציר כללי
LabPulse משתמשת ב-**Supabase** לניהול אימות משתמשים. המערכת תומכת בהרשמה, התחברות, שחזור סיסמה, וניהול תפקידים (תפקידי משתמש).

---

## 🚀 הפעלת האפליקציה

### 1️⃣ הגדרת משתנים סביבה (Environment Variables)

יוצרים קובץ `.env.local` בשורש התיקייה `LabPulse/`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Auth Secret (ליצירה: openssl rand -base64 32)
AUTH_SECRET=your-random-secret-here

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**איפה להשיג את המפתחות?**
- יוצרים חשבון ב-[supabase.com](https://supabase.com)
- יוצרים פרויקט חדש
- בהגדרות → API → עותקים את `Project URL` ו-`anon public key`

### 2️⃣ התקנת חבילות

```bash
npm install
```

### 3️⃣ הרצת האפליקציה

```bash
npm run dev
```

האפליקציה תופעל ב-`http://localhost:3000`

---

## 👤 ספריית משתמשים

### תפקידי משתמשים (Roles)

| תפקיד | הסברה | גישה |
|------|------|------|
| **trial_user** | משתמש בתקופת ניסיון (14 ימים) | גישה מלאה + הודעה להשדרוג |
| **paid_user** | משתמש עם מנוי פעיל | גישה מלאה |
| **admin** | מנהל המערכת | גישה מלאה + דשבורד ניהול |
| **blocked_user** | משתמש חסום | אין גישה |

---

## 🔐 זרימות אימות

### 1. **הרשמה (Registration)**

**URL:** `http://localhost:3000/register`

**שדות נדרשים:**
- ✉️ **אימייל** (email)
- 👤 **שם מלא** (full name)
- 🔑 **סיסמה** (password)

**דרישות סיסמה:**
- לפחות 8 תווים
- לפחות אות גדולה (A-Z)
- לפחות מספר (0-9)

**תהליך:**
1. מוזנים הפרטים
2. לוחצים "הרשמה"
3. דוא"ל אישור נשלח לאימייל שהזנתם
4. לוחצים על הקישור בדוא"ל
5. תקופת ניסיון של 14 ימים מתחילה
6. בהתחברות - תפקיד `trial_user`

**דוגמה:**
```
אימייל: user@example.com
שם: יוסי כהן
סיסמה: MyPass123
```

---

### 2. **התחברות (Login)**

**URL:** `http://localhost:3000/login`

**שדות:**
- ✉️ אימייל
- 🔑 סיסמה

**תהליך:**
1. מוזנים אימייל וסיסמה
2. לוחצים "התחברות"
3. אם הנתונים נכונים → הדף מעביר אתכם לעמוד הבית
4. אם סיסמה שגויה → הודעת שגיאה

**הגבלות:**
- 10 ניסיונות התחברות כושלים בחלון 60 שניות → חסימה זמנית
- אחרי חסימה, חובה להמתין 15 דקות

---

### 3. **שחזור סיסמה (Forgot Password)**

**URL:** `http://localhost:3000/forgot-password`

**תהליך:**
1. מזינים אימייל
2. מקבלים קישור לשחזור בדוא"ל
3. לוחצים על הקישור
4. מזינים סיסמה חדשה
5. השחזור מתבצע

---

### 4. **שינוי סיסמה (Reset Password)**

**URL:** `http://localhost:3000/reset-password`

**הערה:** זה מופיע אחרי לחיצה על קישור בדוא"ל של שחזור

---

## 📊 נתוני משתמש (ממסד הנתונים)

כל משתמש מאוחסן ב-**Supabase** עם הנתונים הבאים:

| שדה | סוג | הערה |
|-----|-----|------|
| `id` | UUID | מזהה ייחודי |
| `email` | string | אימייל ייחודי |
| `full_name` | string | שם מלא |
| `role` | enum | trial_user / paid_user / admin / blocked_user |
| `subscription_status` | string | active / expired / cancelled |
| `trial_ends_at` | timestamp | תאריך סיום התקופה |
| `login_count` | number | כמות התחברויות |
| `last_login_at` | timestamp | ההתחברות האחרונה |
| `locked_until` | timestamp | חסימה זמנית (אחרי כשלים) |

---

## 🛡️ הגנות אבטחה

### ✅ מה מוגן?

1. **סיסמאות**
   - מוצפנות על ידי Supabase
   - 8+ תווים עם ספרות ואותיות גדולות

2. **מפתח חיבור (Session)**
   - JWT Token חתום
   - מתחדש בכל בקשה
   - מאוחסן ב-Cookies בטוחים

3. **גישה למסלולים (Routes)**
   - ✅ כל משתמש authenticated יכול להשתמש בתפקוד הבסיס
   - ✅ admin בלבד ל-`/admin/*`
   - ❌ משתמשים חסומים לא יכולים להתחבר
   - ❌ משתמשי trial שיצא להם הזמן יופנו ל-`/upgrade`

4. **Rate Limiting** (הגבלת קצב)
   - מקסימום 10 בקשות כל 60 שניות לכל IP ל-`/api/auth/*`

---

## 🧪 בדיקה מהירה - דוגמה מעשית

### שלב 1: הרשמה
1. פותחים `http://localhost:3000/register`
2. מזינים:
   - אימייל: `test@example.com`
   - שם: `טסט יוזר`
   - סיסמה: `TestPass123`
3. לוחצים "הרשמה"

### שלב 2: אימות דוא"ל
1. בודקים את ה-Supabase Dashboard או סימולציה מקומית
2. קופיצים את קישור האישור
3. נעשים `trial_user` עם 14 ימים גישה

### שלב 3: התחברות
1. פותחים `http://localhost:3000/login`
2. מזינים: `test@example.com` + `TestPass123`
3. לוחצים "התחברות"
4. הדף מעביר אתכם לעמוד הבית

### שלב 4: שחזור סיסמה (אופציונלי)
1. בעמוד login לוחצים "שכחתי סיסמה"
2. מזינים את האימייל
3. משימים את הקישור מהדוא"ל
4. מזינים סיסמה חדשה

---

## ⚙️ קבצי התצורה (Configuration Files)

### `.env.local` - משתנים סביבה
מאוחסן בשורש התיקייה, לא מוגרם ל-Git

### `middleware.ts` - הגנה על מסלולים
- בודק אימות בכל בקשה
- מחזיר חוקים של גישה
- משדר מחדש משתמשים לא מורשים

### `lib/auth.ts` - עזרים אימות
- `getUser()` - קבלת משתמש נוכחי
- `getProfile()` - קבלת פרטי פרופיל
- `isAdmin()` - בדיקה אם admin

### `app/(auth)/` - עמודי אימות
- `login/` - עמוד התחברות
- `register/` - עמוד הרשמה
- `forgot-password/` - שחזור סיסמה
- `reset-password/` - שינוי סיסמה חדשה

---

## 🔧 פעולות ניהול

### קבלת דיוק משתמש (בעמוד מוגן)

```typescript
import { getProfile } from '@/lib/auth';

export default async function Page() {
  const profile = await getProfile();
  
  console.log(profile.email);      // אימייל
  console.log(profile.role);        // תפקיד
  console.log(profile.trial_ends_at); // סיום ניסיון
}
```

### בדיקה אם admin

```typescript
import { isAdmin } from '@/lib/auth';

const admin = await isAdmin();
if (admin) {
  // הצג דשבורד ניהול
}
```

### בדיקה אם יש גישה לאפליקציה

```typescript
import { hasAppAccess } from '@/lib/auth';

const hasAccess = await hasAppAccess();
if (!hasAccess) {
  // הפנה להשדרוג
}
```

---

## ⚠️ בעיות נפוצות ופתרונות

### ❌ "Invalid login credentials"
**סיבה:** אימייל או סיסמה שגויים
**פתרון:** בדוק כתיב, כנס אות גדולה בסיסמה

### ❌ "Email not confirmed"
**סיבה:** לא לחצת על הקישור בדוא"ל
**פתרון:** בדוק את תיקיית SPAM, בקש דוא"ל חדש

### ❌ "Account locked"
**סיבה:** יותר מ-10 ניסיונות שגויים
**פתרון:** חכה 15 דקות או בשימוש "שכחתי סיסמה"

### ❌ "Trial expired"
**סיבה:** עברו 14 ימים מההרשמה
**פתרון:** עדכון למנוי בעמוד `/upgrade`

### ❌ "User is blocked"
**סיבה:** ניהול חסם את החשבון
**פתרון:** צור קשר עם ניהול

---

## 📞 עזרה נוספת

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Auth:** https://nextjs.org/docs/app/building-your-application/authentication
- **קוד אימות:** [app/(auth)/](app/(auth)/)
- **Library עזרים:** [lib/auth.ts](lib/auth.ts)

---

**עודכן:** מאי 2026
