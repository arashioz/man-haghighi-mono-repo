import * as fs from 'fs';
import * as path from 'path';

type Primitive = string | number | boolean | null | undefined;

interface LegacyUserInfo {
  [key: string]: Primitive;
  id?: string | null;
  user_login?: string | null;
  user_pass?: string | null;
  user_nicename?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  display_name?: string | null;
  user_registered?: string | null;
  user_status?: string | null;
  sms?: string | null;
  phone?: string | null;
  education?: string | null;
  univercity?: string | null;
  job?: string | null;
  state?: string | null;
  gender?: string | null;
  uToken?: string | null;
}

interface LegacyProduct {
  product_id?: string | null;
  product_name?: string | null;
  product_category?: string | null;
}

interface LegacyUserRecord {
  user_info: LegacyUserInfo;
  products?: LegacyProduct[];
}

interface LegacyMergedFile {
  metadata?: Record<string, Primitive>;
  users: Record<string, LegacyUserRecord>;
}

interface SanitizeStats {
  totalUsers: number;
  emailsCleared: number;
  phonesDetected: number;
  phoneFromEmail: number;
  normalizedStrings: number;
}

const INPUT_PATH = path.resolve(__dirname, '../moc-old-data/final_merged_data.json');

function ensureFileExists(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

function normalizeRawString(value: Primitive): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const strValue = String(value)
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ');

  let cleaned = strValue.replace(/^"+|"+$/g, '').trim();
  cleaned = cleaned.replace(/^[,;:]+/, '').replace(/[,:;]+$/, '').trim();

  if (!cleaned || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'undefined') {
    return null;
  }

  return cleaned;
}

function normalizeEmail(rawEmail: Primitive): string | null {
  const normalized = normalizeRawString(rawEmail);
  if (!normalized) {
    return null;
  }

  const email = normalized.toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return null;
  }

  return email;
}

function normalizePhone(rawPhone?: Primitive): string | null {
  const normalized = normalizeRawString(rawPhone);
  if (!normalized) {
    return null;
  }

  let digitsOnly = normalized.replace(/[^\d+]/g, '');

  if (!digitsOnly) {
    return null;
  }

  if (digitsOnly.startsWith('+98')) {
    digitsOnly = '0' + digitsOnly.slice(3);
  } else if (digitsOnly.startsWith('98') && digitsOnly.length >= 12) {
    digitsOnly = '0' + digitsOnly.slice(2);
  } else if (!digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    digitsOnly = '0' + digitsOnly;
  }

  if (digitsOnly.length > 11) {
    digitsOnly = digitsOnly.startsWith('0')
      ? digitsOnly.slice(0, 11)
      : digitsOnly.slice(-11);
  }

  if (!/^0\d{9,10}$/.test(digitsOnly)) {
    return null;
  }

  return digitsOnly;
}

function extractPhoneFromEmail(email: string | null): string | null {
  if (!email) {
    return null;
  }

  const [localPart] = email.split('@');
  if (!localPart) {
    return null;
  }

  if (!/^\+?\d{10,14}$/.test(localPart)) {
    return null;
  }

  return normalizePhone(localPart);
}

function detectPhone(info: LegacyUserInfo): { phone: string | null; source: string | null } {
  const candidates: Array<{ value: Primitive; source: string }> = [
    { value: info.phone, source: 'phone' },
    { value: info.sms, source: 'sms' },
    { value: info.user_login, source: 'user_login' },
    { value: info.user_nicename, source: 'user_nicename' },
    { value: info.display_name, source: 'display_name' },
  ];

  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate.value);
    if (normalized) {
      return { phone: normalized, source: candidate.source };
    }
  }

  const emailPhone = extractPhoneFromEmail(info.user_email ? String(info.user_email) : null);
  if (emailPhone) {
    return { phone: emailPhone, source: 'user_email' };
  }

  return { phone: null, source: null };
}

function hasAlphabeticCharacter(value: string): boolean {
  return /[A-Za-z\u0600-\u06FF]/.test(value);
}

function sanitizeLegacyProduct(
  product: LegacyProduct | undefined,
  legacyId: string,
  index: number,
  stats: SanitizeStats,
): LegacyProduct {
  const source = product ?? {};

  const normalizedId = normalizeRawString(source.product_id) || `legacy-no-id-${legacyId}-${index + 1}`;
  if (source.product_id !== normalizedId) {
    stats.normalizedStrings++;
  }

  const normalizedCategory = normalizeRawString(source.product_category) || 'unknown';
  if (source.product_category !== normalizedCategory) {
    stats.normalizedStrings++;
  }

  const rawName = normalizeRawString(source.product_name);
  let normalizedName: string;
  if (!rawName || !hasAlphabeticCharacter(rawName)) {
    normalizedName = `محصول قدیمی (${normalizedId})`;
    if (source.product_name !== normalizedName) {
      stats.normalizedStrings++;
    }
  } else {
    normalizedName = rawName;
    if (source.product_name !== normalizedName) {
      stats.normalizedStrings++;
    }
  }

  return {
    product_id: normalizedId,
    product_name: normalizedName,
    product_category: normalizedCategory,
  };
}

function sanitizeUserInfo(info: LegacyUserInfo, stats: SanitizeStats): LegacyUserInfo {
  const sanitized: LegacyUserInfo = {};

  for (const [key, value] of Object.entries(info)) {
    if (typeof value === 'string' || value === null || value === undefined) {
      const normalized = normalizeRawString(value);
      sanitized[key] = normalized;
      if (typeof value === 'string' && normalized !== value.trim()) {
        stats.normalizedStrings++;
      } else if (value === null && normalized !== null) {
        stats.normalizedStrings++;
      }
    } else {
      sanitized[key] = value;
    }
  }

  const rawEmail = sanitized.user_email ?? null;
  const normalizedEmail = normalizeEmail(rawEmail);
  if (rawEmail && !normalizedEmail) {
    stats.emailsCleared++;
  }

  const { phone, source } = detectPhone({
    ...sanitized,
    user_email: rawEmail,
  });
  if (phone) {
    sanitized.user_phone = phone;
    sanitized.phone = phone;
    stats.phonesDetected++;
    if (source === 'user_email') {
      stats.phoneFromEmail++;
    }
  } else {
    sanitized.user_phone = null;
    sanitized.phone = null;
  }

  const phoneDerivedFromEmail = extractPhoneFromEmail(rawEmail);
  if (phoneDerivedFromEmail) {
    sanitized.user_email = null;
    stats.emailsCleared++;
  } else {
    sanitized.user_email = normalizedEmail;
  }

  if (!sanitized.user_email) {
    sanitized.user_email = null;
  }

  return sanitized;
}

function sanitizeMergedFile(data: LegacyMergedFile): { sanitized: LegacyMergedFile; stats: SanitizeStats } {
  const stats: SanitizeStats = {
    totalUsers: 0,
    emailsCleared: 0,
    phonesDetected: 0,
    phoneFromEmail: 0,
    normalizedStrings: 0,
  };

  const sanitizedUsers: Record<string, LegacyUserRecord> = {};

  const entries = Object.entries(data.users || {});
  stats.totalUsers = entries.length;

  entries.forEach(([legacyId, record]) => {
    const sanitizedInfo = sanitizeUserInfo(record.user_info ?? {}, stats);
    sanitizedUsers[legacyId] = {
      user_info: sanitizedInfo,
      products: (record.products ?? []).map((product, index) =>
        sanitizeLegacyProduct(product, legacyId, index, stats),
      ),
    };
  });

  const sanitizedData: LegacyMergedFile = {
    metadata: data.metadata ?? {},
    users: sanitizedUsers,
  };

  return { sanitized: sanitizedData, stats };
}

function main() {
  ensureFileExists(INPUT_PATH);

  const rawJson = fs.readFileSync(INPUT_PATH, 'utf-8');
  const parsed = JSON.parse(rawJson) as LegacyMergedFile;

  const { sanitized, stats } = sanitizeMergedFile(parsed);

  fs.writeFileSync(INPUT_PATH, JSON.stringify(sanitized, null, 2), 'utf-8');

  console.log('✅ Legacy merged data normalized successfully.');
  console.log(`   • Users processed: ${stats.totalUsers}`);
  console.log(`   • Phones detected: ${stats.phonesDetected} (from email: ${stats.phoneFromEmail})`);
  console.log(`   • Emails cleared: ${stats.emailsCleared}`);
  console.log(`   • Fields normalized: ${stats.normalizedStrings}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Failed to normalize merged data:', (error as Error).message);
    process.exit(1);
  }
}

