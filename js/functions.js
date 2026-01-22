const CONSTANTS = {
    MAX_BRANCH_LENGTH: 40,
    TOAST_DISPLAY_DURATION: 2500,
    TOAST_HIDE_ANIMATION: 300,
    THEME_STORAGE_KEY: 'theme',
    DEFAULT_THEME: 'light'
};

const elements = {
    form: document.getElementById('branchForm'),
    taskId: document.getElementById('taskId'),
    branchName: document.getElementById('branchName'),
    resultInput: document.getElementById('resultInput'),
    copyBtn: document.getElementById('copyBtn'),
    lengthInfo: document.getElementById('lengthInfo'),
    errors: {
        taskId: document.getElementById('taskIdError'),
        branchName: document.getElementById('branchNameError')
    }
};

const errorUtils = {
    getErrorElement(input) {
        if (!input?.id) return null;
        return elements.errors[input.id] || null;
    },
    
    clear(input) {
        if (!input) return;
        input.classList.remove('error');
        input.setAttribute('aria-invalid', 'false');
        const errorElement = this.getErrorElement(input);
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
    },

    show(input, message) {
        if (!input) return;
        input.classList.add('error');
        input.setAttribute('aria-invalid', 'true');
        const errorElement = this.getErrorElement(input);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }
};

const showToast = (message, type = 'success') => {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    if (type === 'success') {
        icon.textContent = '✓';
    } else if (type === 'error') {
        icon.textContent = '✕';
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(messageEl);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, CONSTANTS.TOAST_HIDE_ANIMATION);
    }, CONSTANTS.TOAST_DISPLAY_DURATION);
};

const validators = {
    isValidBranchName(str) {
        if (!str || typeof str !== 'string') return false;
        const trimmed = str.trim();
        if (trimmed.length === 0) return false;
        const allowedPattern = /^[a-zA-Z0-9\s_-]+$/;
        return allowedPattern.test(trimmed);
    },
    
    extractTaskId(input) {
        if (!input || typeof input !== 'string') return '';
        const match = input.match(/([A-Z]{2,}-\d+)/i);
        return match ? match[1].toUpperCase() : '';
    },
    
    normalizeBranchName(name) {
        if (!name || typeof name !== 'string') return '';
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s_-]/g, '')
            .replace(/[\s-]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
};

const applyTheme = (theme) => {
    const html = document.documentElement;
    html.className = html.className.replace(/theme-\w+/g, '');
    if (theme) {
        html.classList.add(`theme-${theme}`);
    }
    try {
        localStorage.setItem(CONSTANTS.THEME_STORAGE_KEY, theme || CONSTANTS.DEFAULT_THEME);
    } catch (e) {
        console.warn('Не удалось сохранить тему в localStorage:', e);
    }
};

const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('theme-dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
};

const updateResultLength = () => {
    if (!elements.resultInput || !elements.lengthInfo) return;

    const length = elements.resultInput.value.length;
    const isValid = length <= CONSTANTS.MAX_BRANCH_LENGTH;
    elements.lengthInfo.className = `length-info ${isValid ? 'valid' : 'invalid'}`;

    if (isValid) {
        elements.lengthInfo.textContent = `Длина: ${length} символов ✓`;
    } else {
        const warningText = document.createTextNode(`Длина: ${length} символов ⚠`);
        const breakLine = document.createElement('br');
        const errorText = document.createTextNode(`Превышает максимальную длину (${CONSTANTS.MAX_BRANCH_LENGTH} символов)`);
        elements.lengthInfo.textContent = '';
        elements.lengthInfo.appendChild(warningText);
        elements.lengthInfo.appendChild(breakLine);
        elements.lengthInfo.appendChild(errorText);
    }
};

const copyToClipboard = async (text) => {
    if (!text) return false;

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error('Ошибка при копировании:', err);
        return false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const html = document.documentElement;
    const hasTheme = html.classList.contains('theme-dark') || html.classList.contains('theme-light');
    if (!hasTheme) {
        try {
            const savedTheme = localStorage.getItem(CONSTANTS.THEME_STORAGE_KEY) || CONSTANTS.DEFAULT_THEME;
            applyTheme(savedTheme);
        } catch (e) {
            console.warn('Не удалось прочитать тему из localStorage:', e);
            applyTheme(CONSTANTS.DEFAULT_THEME);
        }
    }

    document.querySelectorAll('input[name="branchType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isHotfix = e.target.value === 'hotfix';
            if (elements.taskId) {
                elements.taskId.disabled = isHotfix;
                if (isHotfix) {
                    elements.taskId.removeAttribute('required');
                } else {
                    elements.taskId.setAttribute('required', '');
                }
                errorUtils.clear(elements.taskId);
            }
            errorUtils.clear(elements.branchName);
        });
    });

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        themeToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    if (elements.branchName) {
        elements.branchName.addEventListener('input', () => {
            errorUtils.clear(elements.branchName);
        });
    }
    if (elements.taskId) {
        elements.taskId.addEventListener('input', () => {
            errorUtils.clear(elements.taskId);
        });
    }

    if (elements.form) {
        elements.form.addEventListener('submit', (e) => {
            e.preventDefault();

            const branchTypeRadio = document.querySelector('input[name="branchType"]:checked');
            if (!branchTypeRadio) return;

            const branchType = branchTypeRadio.value;
            const taskIdValue = elements.taskId?.value.trim() || '';
            const branchNameValue = elements.branchName?.value.trim() || '';

            errorUtils.clear(elements.taskId);
            errorUtils.clear(elements.branchName);

            if (branchType === 'feature') {
                if (!taskIdValue) {
                    errorUtils.show(elements.taskId, 'Пожалуйста, заполните ID задачи');
                    return;
                }

                const isUrl = /^https?:\/\//i.test(taskIdValue);
                if (!isUrl && !validators.isValidBranchName(taskIdValue)) {
                    errorUtils.show(elements.taskId, 'Используйте только латинские буквы, цифры и дефисы');
                    return;
                }

                const extractedTaskId = validators.extractTaskId(taskIdValue);
                if (!extractedTaskId) {
                    errorUtils.show(elements.taskId, 'Неверный формат ID (ожидается PROJECT-123)');
                    return;
                }
            }

            if (!branchNameValue) {
                errorUtils.show(elements.branchName, 'Пожалуйста, заполните это поле');
                return;
            }

            if (!validators.isValidBranchName(branchNameValue)) {
                errorUtils.show(elements.branchName, 'Используйте только латинские буквы, цифры и дефисы');
                return;
            }

            const normalized = validators.normalizeBranchName(branchNameValue);
            if (!normalized) {
                errorUtils.show(elements.branchName, 'Название ветки не может быть пустым');
                return;
            }

            let result = '';

            if (branchType === 'hotfix') {
                result = `feature/hotfix-${normalized}`;
            } else {
                const taskId = validators.extractTaskId(taskIdValue);
                result = `${branchType}/${taskId}-${normalized}`;
            }

            if (elements.resultInput) {
                elements.resultInput.value = result;
                elements.resultInput.disabled = false;
            }
            if (elements.copyBtn) {
                elements.copyBtn.disabled = false;
            }

            updateResultLength();
        });
    }

    let copyBtnStateTimeoutId = null;
    if (elements.copyBtn && elements.resultInput) {
        elements.copyBtn.addEventListener('click', async () => {
            const textToCopy = elements.resultInput?.value;
            if (!textToCopy) return;

            if (copyBtnStateTimeoutId) clearTimeout(copyBtnStateTimeoutId);
            elements.copyBtn.classList.remove('copied', 'error');
            const success = await copyToClipboard(textToCopy);
            if (success) {
                elements.copyBtn.classList.add('copied');
                showToast('Скопировано!', 'success');
            } else {
                elements.copyBtn.classList.add('error');
                showToast('Ошибка при копировании', 'error');
            }
            copyBtnStateTimeoutId = setTimeout(() => {
                elements.copyBtn.classList.remove('copied', 'error');
                copyBtnStateTimeoutId = null;
            }, CONSTANTS.TOAST_DISPLAY_DURATION + CONSTANTS.TOAST_HIDE_ANIMATION);
        });
    }
});
