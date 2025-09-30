// modules/I18nManager.js - Internationalization manager for multi-language support
import { logger } from './Logger.js';

export class I18nManager {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.fallbackTranslations = {};
    this.availableLanguages = ['en', 'es', 'fr'];
    this.isLoading = false;
    this.loadPromise = null;

    // Language metadata
    this.languageInfo = {
      en: { name: 'English', flag: '🇺🇸', rtl: false },
      es: { name: 'Español', flag: '🇪🇸', rtl: false },
      fr: { name: 'Français', flag: '🇫🇷', rtl: false },
      de: { name: 'Deutsch', flag: '🇩🇪', rtl: false },
      ja: { name: '日本語', flag: '🇯🇵', rtl: false },
      zh: { name: '中文', flag: '🇨🇳', rtl: false },
      ar: { name: 'العربية', flag: '🇸🇦', rtl: true }
    };
  }

  /**
   * Initialize the i18n system
   * @param {string} defaultLanguage - Default language code
   */
  async init(defaultLanguage = 'en') {
    // Load English as fallback
    await this.loadLanguage('en', true);
    this.fallbackTranslations = { ...this.translations };

    // Detect user's preferred language
    const detectedLanguage = this.detectLanguage(defaultLanguage);

    if (detectedLanguage !== 'en') {
      await this.setLanguage(detectedLanguage);
    } else {
      this.currentLanguage = 'en';
    }

    // Set up HTML lang attribute
    document.documentElement.lang = this.currentLanguage;

    return this.currentLanguage;
  }

  /**
   * Detect user's preferred language
   * @param {string} defaultLanguage - Fallback language
   * @returns {string} Detected language code
   */
  detectLanguage(defaultLanguage = 'en') {
    // 1. Check localStorage for saved preference
    const savedLanguage = localStorage.getItem('calmmaze_language');
    if (savedLanguage && this.availableLanguages.includes(savedLanguage)) {
      return savedLanguage;
    }

    // 2. Check browser language
    const browserLanguages = [
      navigator.language,
      ...(navigator.languages || [])
    ];

    for (const browserLang of browserLanguages) {
      // Extract language code (e.g., 'en-US' -> 'en')
      const langCode = browserLang.split('-')[0].toLowerCase();
      if (this.availableLanguages.includes(langCode)) {
        return langCode;
      }
    }

    // 3. Return default
    return defaultLanguage;
  }

  /**
   * Load a language file
   * @param {string} languageCode - Language code to load
   * @param {boolean} isFallback - Whether this is the fallback language
   */
  async loadLanguage(languageCode, isFallback = false) {
    if (this.isLoading && !isFallback) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this._loadLanguageFile(languageCode);

    try {
      const translations = await this.loadPromise;
      this.translations = translations;
      return translations;
    } catch (error) {
      logger.error(`Failed to load language ${languageCode}:`, error);
      if (!isFallback) {
        // Fallback to English if loading fails
        return this.loadLanguage('en', true);
      }
      throw error;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal method to load language file
   * @param {string} languageCode - Language code
   * @returns {Promise<Object>} Translation object
   */
  async _loadLanguageFile(languageCode) {
    const response = await fetch(`./locales/${languageCode}.json`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Set the current language
   * @param {string} languageCode - Language code to set
   */
  async setLanguage(languageCode) {
    if (!this.availableLanguages.includes(languageCode)) {
      logger.warn(`Language ${languageCode} not available, falling back to English`);
      languageCode = 'en';
    }

    // Always load the language (including English when switching back to it)
    if (languageCode !== 'en' || this.currentLanguage !== 'en') {
      await this.loadLanguage(languageCode);
    }

    this.currentLanguage = languageCode;

    // Save preference
    localStorage.setItem('calmmaze_language', languageCode);

    // Update HTML attributes
    document.documentElement.lang = languageCode;
    const isRTL = this.languageInfo[languageCode]?.rtl || false;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

    // Trigger re-render of internationalized content
    this.updateDOM();
  }

  /**
   * Get current language code
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get available languages
   * @returns {Array} Array of available language codes
   */
  getAvailableLanguages() {
    return [...this.availableLanguages];
  }

  /**
   * Get language information
   * @param {string} languageCode - Language code
   * @returns {Object} Language info object
   */
  getLanguageInfo(languageCode) {
    return this.languageInfo[languageCode] || this.languageInfo.en;
  }

  /**
   * Translate a key with optional interpolation
   * @param {string} key - Translation key (dot notation)
   * @param {Object} params - Parameters for interpolation
   * @returns {string} Translated string
   */
  t(key, params = {}) {
    const translation = this.getTranslation(key);
    return this.interpolate(translation, params);
  }

  /**
   * Get raw translation without interpolation
   * @param {string} key - Translation key
   * @returns {string} Raw translation
   */
  getTranslation(key) {
    const keys = key.split('.');
    let translation = this.getNestedValue(this.translations, keys);

    // Fallback to English if translation not found
    if (translation === undefined && this.currentLanguage !== 'en') {
      translation = this.getNestedValue(this.fallbackTranslations, keys);
    }

    // Return key if no translation found (for debugging)
    if (translation === undefined) {
      logger.warn(`Translation missing for key: ${key}`);
      return `[${key}]`;
    }

    return translation;
  }

  /**
   * Get nested value from object using array of keys
   * @param {Object} obj - Object to search
   * @param {Array} keys - Array of keys
   * @returns {*} Found value or undefined
   */
  getNestedValue(obj, keys) {
    return keys.reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Interpolate parameters into translation string
   * @param {string} translation - Translation string with placeholders
   * @param {Object} params - Parameters to interpolate
   * @returns {string} Interpolated string
   */
  interpolate(translation, params) {
    if (typeof translation !== 'string') {
      return translation;
    }

    return translation.replace(/{{(\w+)}}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * Handle plural forms
   * @param {string} key - Translation key
   * @param {number} count - Count for plural rules
   * @param {Object} params - Additional parameters
   * @returns {string} Pluralized translation
   */
  plural(key, count, params = {}) {
    const pluralKey = this.getPluralKey(count);
    const fullKey = `${key}.${pluralKey}`;

    return this.t(fullKey, { count, ...params });
  }

  /**
   * Get plural key based on count
   * @param {number} count - Count value
   * @returns {string} Plural key (zero, one, other)
   */
  getPluralKey(count) {
    // Simple English plural rules
    if (count === 0) return 'zero';
    if (count === 1) return 'one';
    return 'other';
  }

  /**
   * Update DOM elements with data-i18n attributes
   */
  updateDOM() {
    // Select elements with either data-i18n or data-i18n-html attributes
    const elements = document.querySelectorAll('[data-i18n], [data-i18n-html]');

    elements.forEach(element => {
      // Check which attribute is present
      const key = element.getAttribute('data-i18n') || element.getAttribute('data-i18n-html');
      const params = this.parseDataParams(element);

      // Check if we should update innerHTML (for HTML content) or textContent
      const useHTML = element.hasAttribute('data-i18n-html');
      const translation = this.t(key, params);

      if (useHTML) {
        element.innerHTML = translation;
      } else {
        element.textContent = translation;
      }
    });
  }

  /**
   * Parse data-i18n-* attributes for parameters
   * @param {Element} element - DOM element
   * @returns {Object} Parameters object
   */
  parseDataParams(element) {
    const params = {};

    // Get all data-i18n-param-* attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('data-i18n-param-')) {
        const paramName = attr.name.substring('data-i18n-param-'.length);
        params[paramName] = attr.value;
      }
    });

    return params;
  }

  /**
   * Format numbers according to current locale
   * @param {number} number - Number to format
   * @param {Object} options - Intl.NumberFormat options
   * @returns {string} Formatted number
   */
  formatNumber(number, options = {}) {
    try {
      return new Intl.NumberFormat(this.currentLanguage, options).format(number);
    } catch (e) {
      return number.toString();
    }
  }

  /**
   * Format dates according to current locale
   * @param {Date} date - Date to format
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date
   */
  formatDate(date, options = {}) {
    try {
      return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
    } catch (e) {
      return date.toString();
    }
  }

  /**
   * Check if current language is RTL
   * @returns {boolean} True if RTL
   */
  isRTL() {
    return this.languageInfo[this.currentLanguage]?.rtl || false;
  }
}