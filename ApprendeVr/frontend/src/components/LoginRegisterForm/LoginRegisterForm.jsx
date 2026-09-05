import { useState } from 'react';
import Formulario from '../Formulario';
import Input from '../Input';
import Select from '../Select';
import Boton from '../Boton';
import { useVRLanguage } from '../VRConfig/VRLanguageContext';
import { validateRegisterForm, validateLoginForm } from './LoginRegisterForm.util';

const initialValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  age: '',
  englishLevel: 'basico',
  nativeLanguage: 'es',
  targetLanguage: 'en',
};

const LoginRegisterForm = ({ defaultMode = 'register', onSubmitRegister, onSubmitLogin }) => {
  const { t } = useVRLanguage();
  const [mode, setMode] = useState(defaultMode);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'register' ? 'login' : 'register'));
    setErrors({});
  };

  const handleSubmit = () => {
    const validate = mode === 'register' ? validateRegisterForm : validateLoginForm;
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (mode === 'register') {
      onSubmitRegister?.({
        name: values.name,
        email: values.email,
        password: values.password,
        age: values.age,
        englishLevel: values.englishLevel,
        nativeLanguage: values.nativeLanguage,
        targetLanguage: values.targetLanguage,
      });
    } else {
      onSubmitLogin?.({ email: values.email, password: values.password });
    }
  };

  const errorText = (field) => (errors[field] ? t(`auth.errors.${errors[field]}`) : undefined);

  const englishLevelOptions = ['basico', 'intermedio', 'avanzado'].map((value) => ({
    value,
    label: t(`auth.englishLevelOptions.${value}`),
  }));
  const languageOptions = ['es', 'en', 'pt'].map((value) => ({
    value,
    label: t(`auth.languageOptions.${value}`),
  }));

  return (
    <Formulario
      title={mode === 'register' ? t('auth.registerTitle') : t('auth.loginTitle')}
      onSubmit={handleSubmit}
    >
      {mode === 'register' && (
        <Input
          type="text"
          name="name"
          label={t('auth.name')}
          placeholder={t('auth.namePlaceholder')}
          value={values.name}
          onChange={handleChange}
          error={errorText('name')}
        />
      )}
      <Input
        type="email"
        name="email"
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        value={values.email}
        onChange={handleChange}
        error={errorText('email')}
      />
      <Input
        type="password"
        name="password"
        label={t('auth.password')}
        placeholder={t('auth.passwordPlaceholder')}
        value={values.password}
        onChange={handleChange}
        error={errorText('password')}
      />
      {mode === 'register' && (
        <Input
          type="password"
          name="confirmPassword"
          label={t('auth.confirmPassword')}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          value={values.confirmPassword}
          onChange={handleChange}
          error={errorText('confirmPassword')}
        />
      )}
      {mode === 'register' && (
        <Input
          type="number"
          name="age"
          label={t('auth.age')}
          placeholder={t('auth.agePlaceholder')}
          value={values.age}
          onChange={handleChange}
          error={errorText('age')}
        />
      )}
      {mode === 'register' && (
        <Select
          name="englishLevel"
          label={t('auth.englishLevel')}
          value={values.englishLevel}
          onChange={handleChange}
          options={englishLevelOptions}
        />
      )}
      {mode === 'register' && (
        <Select
          name="nativeLanguage"
          label={t('auth.nativeLanguage')}
          value={values.nativeLanguage}
          onChange={handleChange}
          options={languageOptions}
        />
      )}
      {mode === 'register' && (
        <Select
          name="targetLanguage"
          label={t('auth.targetLanguage')}
          value={values.targetLanguage}
          onChange={handleChange}
          options={languageOptions}
        />
      )}
      <Boton type="submit" label={mode === 'register' ? t('auth.submitRegister') : t('auth.submitLogin')} />
      <Boton
        type="button"
        variant="link"
        onClick={switchMode}
        label={mode === 'register' ? t('auth.switchToLogin') : t('auth.switchToRegister')}
      />
    </Formulario>
  );
};

export default LoginRegisterForm;
