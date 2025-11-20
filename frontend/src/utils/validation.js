export const USERNAME_MAX_LENGTH = 30;

export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._@]{0,29})$/;

export const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const sanitizeUsernameInput = (input = "") =>
  input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._@]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);

export const canonicalizeUsername = (input = "") =>
  sanitizeUsernameInput(input).toLowerCase();

export const isStrongPassword = (password = "") =>
  STRONG_PASSWORD_PATTERN.test(password);
