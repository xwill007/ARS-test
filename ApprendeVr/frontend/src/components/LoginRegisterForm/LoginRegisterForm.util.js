export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

export function isValidAge(age) {
  const n = Number(age);
  return age !== '' && age !== null && age !== undefined && Number.isInteger(n) && n > 0 && n <= 120;
}

export function validateRegisterForm({ name, email, password, confirmPassword, age }) {
  const errors = {};
  if (!name?.trim()) errors.name = 'required';
  if (!email?.trim()) errors.email = 'required';
  else if (!isValidEmail(email)) errors.email = 'invalidEmail';
  if (!password) errors.password = 'required';
  else if (!isValidPassword(password)) errors.password = 'passwordTooShort';
  if (!confirmPassword) errors.confirmPassword = 'required';
  else if (confirmPassword !== password) errors.confirmPassword = 'passwordsDontMatch';
  if (age === '' || age === null || age === undefined) errors.age = 'required';
  else if (!isValidAge(age)) errors.age = 'invalidAge';
  return errors;
}

export function validateLoginForm({ email, password }) {
  const errors = {};
  if (!email?.trim()) errors.email = 'required';
  else if (!isValidEmail(email)) errors.email = 'invalidEmail';
  if (!password) errors.password = 'required';
  return errors;
}
