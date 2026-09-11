/**
 * MUTIKUKWAMA SAÚDE - Password Security, Email Authenticity & Phone Validation Engine
 * Implements password policy checks, email verification & disposable domain rejection,
 * international dialing codes and strict 9-digit phone formatting.
 */

export interface PasswordStrengthResult {
  score: number; // 0 to 5
  level: 'fraca' | 'media' | 'forte';
  label: string;
  colorClass: string;
  barColor: string;
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

/**
 * Validates password strength according to security rules:
 * - Minimum 8 characters
 * - At least one uppercase letter (OBRIGATÓRIO)
 * - At least one special character (OBRIGATÓRIO)
 * - At least one lowercase letter
 * - At least one number
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpperCase) score++;
  if (hasLowerCase) score++;
  if (hasNumber) score++;
  if (hasSpecialChar) score++;

  let level: 'fraca' | 'media' | 'forte' = 'fraca';
  let label = 'Fraca';
  let colorClass = 'text-rose-600';
  let barColor = 'bg-rose-500';

  if (score >= 5) {
    level = 'forte';
    label = 'Forte';
    colorClass = 'text-emerald-600';
    barColor = 'bg-emerald-500';
  } else if (score >= 3) {
    level = 'media';
    label = 'Média';
    colorClass = 'text-amber-600';
    barColor = 'bg-amber-500';
  } else {
    level = 'fraca';
    label = 'Fraca';
    colorClass = 'text-rose-600';
    barColor = 'bg-rose-500';
  }

  // Strict validation: must have 8+ chars, at least 1 uppercase, and at least 1 special char
  const isValid = hasMinLength && hasUpperCase && hasSpecialChar;

  return {
    score,
    level,
    label,
    colorClass,
    barColor,
    hasMinLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
    isValid,
  };
}

/**
 * Known disposable, fake, or temporary email domains that must be rejected.
 */
const DISPOSABLE_OR_FAKE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'sharklasers.com',
  'dispostable.com',
  'getnada.com',
  'fake.com',
  'test.com',
  'teste.com',
  'exemplo.com',
  'example.com',
  'example.org',
  'example.net',
  'asdf.com',
  'xyz.com',
  'nada.com',
  'qualquer.com',
  'naoexiste.com',
  'fakemail.com',
  'spam4.me',
  'discard.email',
  'generator.email',
  'tempail.com',
  'emailfake.com',
  'crazymailing.com',
  'mohmal.com',
  'mytemp.email',
]);

/**
 * Popular typos in email domains to help user correct them.
 */
const DOMAIN_TYPOS: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloock.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahuo.com': 'yahoo.com',
};

export interface EmailVerificationResult {
  isValid: boolean;
  isFakeOrDisposable: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * Validates email authenticity and format:
 * - RFC compliant syntax
 * - Rejection of fake, disposable, or test domains
 * - Detection of invalid characters, double dots or missing TLDs
 * - Typo suggestion for common domains
 */
export function verifyEmailAuthenticity(email: string): EmailVerificationResult {
  if (!email || !email.trim()) {
    return {
      isValid: false,
      isFakeOrDisposable: false,
      reason: 'O endereço de e-mail é obrigatório.',
    };
  }

  const clean = email.toLowerCase().trim();

  // Basic structure check
  if (!clean.includes('@')) {
    return {
      isValid: false,
      isFakeOrDisposable: false,
      reason: 'O e-mail deve conter o símbolo "@" (ex: utente@gmail.com).',
    };
  }

  const parts = clean.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      isFakeOrDisposable: false,
      reason: 'Formato de e-mail inválido (múltiplos símbolos "@").',
    };
  }

  const [username, domain] = parts;

  // Validate username
  if (!username || username.length < 2) {
    return {
      isValid: false,
      isFakeOrDisposable: true,
      reason: 'O nome de utilizador do e-mail é demasiado curto ou inválido.',
    };
  }

  if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
    return {
      isValid: false,
      isFakeOrDisposable: true,
      reason: 'O e-mail contém pontos consecutivos ou inválidos.',
    };
  }

  // Detect obviously fake usernames
  const fakeUsernames = ['teste', 'test', 'fake', 'asdf', 'aaaaa', '12345', 'naotenho', 'sememail'];
  if (fakeUsernames.includes(username)) {
    return {
      isValid: false,
      isFakeOrDisposable: true,
      reason: 'Endereço de e-mail de teste ou fictício não permitido. Use o seu e-mail autêntico.',
    };
  }

  // Validate domain
  if (!domain || !domain.includes('.')) {
    return {
      isValid: false,
      isFakeOrDisposable: true,
      reason: 'O domínio do e-mail está incompleto (falta o ponto e a terminação, ex: .com ou .ao).',
    };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return {
      isValid: false,
      isFakeOrDisposable: true,
      reason: 'Extensão de domínio do e-mail inválida (ex: .ao, .com, .net).',
    };
  }

  // Check for disposable or temporary email providers
  if (DISPOSABLE_OR_FAKE_DOMAINS.has(domain)) {
    return {
      isValid: false,
      isFakeOrDisposable: true,
      reason: 'Domínio de e-mail temporário ou descartável detectado. Por razões de segurança sanitária, use um e-mail verdadeiro.',
    };
  }

  // Check common typos
  if (DOMAIN_TYPOS[domain]) {
    return {
      isValid: false,
      isFakeOrDisposable: false,
      reason: `Parece haver um erro no domínio. Quis dizer "${username}@${DOMAIN_TYPOS[domain]}"?`,
      suggestion: `${username}@${DOMAIN_TYPOS[domain]}`,
    };
  }

  // Full standard regex check
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(clean)) {
    return {
      isValid: false,
      isFakeOrDisposable: false,
      reason: 'Formato de e-mail inválido. Verifique caracteres especiais.',
    };
  }

  return {
    isValid: true,
    isFakeOrDisposable: false,
  };
}

/**
 * Backward compatible isValidEmail function
 */
export function isValidEmail(email: string): boolean {
  return verifyEmailAuthenticity(email).isValid;
}

/**
 * Checks if passwords match exactly
 */
export function doPasswordsMatch(password: string, confirmPassword: string): boolean {
  if (!password && !confirmPassword) return false;
  return password === confirmPassword;
}

/**
 * Supported Country Dialing Codes with flags and national metadata.
 */
export interface CountryDialingCode {
  country: string;
  code: string;
  flag: string;
  maxDigits: number;
}

export const COUNTRY_DIALING_CODES: CountryDialingCode[] = [
  { country: 'Angola', code: '+244', flag: '🇦🇴', maxDigits: 9 },
  { country: 'Portugal', code: '+351', flag: '🇵🇹', maxDigits: 9 },
  { country: 'Brasil', code: '+55', flag: '🇧🇷', maxDigits: 11 },
  { country: 'Moçambique', code: '+258', flag: '🇲🇿', maxDigits: 9 },
  { country: 'Cabo Verde', code: '+238', flag: '🇨🇻', maxDigits: 7 },
  { country: 'São Tomé e Príncipe', code: '+239', flag: '🇸🇹', maxDigits: 7 },
  { country: 'África do Sul', code: '+27', flag: '🇿🇦', maxDigits: 9 },
  { country: 'Namíbia', code: '+264', flag: '🇳🇦', maxDigits: 9 },
  { country: 'RD Congo', code: '+243', flag: '🇨🇩', maxDigits: 9 },
  { country: 'Congo', code: '+242', flag: '🇨🇬', maxDigits: 9 },
  { country: 'França', code: '+33', flag: '🇫🇷', maxDigits: 9 },
  { country: 'Reino Unido', code: '+44', flag: '🇬🇧', maxDigits: 10 },
  { country: 'Estados Unidos', code: '+1', flag: '🇺🇸', maxDigits: 10 },
];

/**
 * Sanitizes phone input: strictly extracts digits and caps at 9 digits as required.
 */
export function sanitizePhoneDigits(raw: string, max: number = 9): string {
  return (raw || '').replace(/\D/g, '').slice(0, max);
}

