class SharedCodeClipboard {
    constructor() {
        this.snippets = this.loadSnippets();
        this.sharedSnippets = this.loadSharedSnippets();
        this.currentTab = 'create';
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderSnippets();
        this.setupTabs();
    }

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('save-btn').addEventListener('click', () => this.saveAndShareSnippet());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearForm());
        document.getElementById('retrieve-btn').addEventListener('click', () => this.retrieveSnippet());
        document.getElementById('retrieve-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
        });
        document.getElementById('retrieve-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.retrieveSnippet();
            }
        });
        document.getElementById('code-input').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.saveAndShareSnippet();
            }
        });
    }

    setupTabs() {
        this.switchTab('create');
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        this.currentTab = tabName;
        if (tabName === 'retrieve') {
            this.clearRetrieveForm();
        }
    }

    generateShareCode() {
        let code;
        do {
            code = Math.floor(1000 + Math.random() * 9000).toString();
        } while (this.sharedSnippets && this.sharedSnippets[code]);
        return code;
    }

    saveAndShareSnippet() {
        const title = document.getElementById('snippet-title').value.trim();
        const code = document.getElementById('code-input').value.trim();
        const language = document.getElementById('language-select').value;
        if (!code) {
            alert('Please enter some code!');
            return;
        }
        const shareCode = this.generateShareCode();
        const snippet = {
            id: Date.now(),
            shareCode: shareCode,
            title: title || `Shared ${new Date().toLocaleString()}`,
            code: code,
            language: language,
            timestamp: new Date().toISOString(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        this.sharedSnippets[shareCode] = snippet;
        this.saveSharedSnippets();
        this.snippets.unshift({ ...snippet, isShared: true });
        this.saveSnippets();
        this.renderSnippets();
        this.clearForm();
        this.showShareResult(shareCode);
        this.showNotification('Snippet shared successfully!', 'success');
    }

    showShareResult(shareCode) {
        const shareResult = document.getElementById('share-result');
        const shareIdDisplay = document.getElementById('share-id');
        shareIdDisplay.textContent = shareCode;
        shareResult.style.display = 'block';
        setTimeout(() => {
            shareResult.style.display = 'none';
        }, 10000);
    }

    retrieveSnippet() {
        const code = document.getElementById('retrieve-code').value.trim();
        if (!code || code.length !== 4) {
            this.showRetrieveError('Please enter a valid 4-digit code.');
            return;
        }
        this.cleanupExpiredSnippets();
        const snippet = this.sharedSnippets ? this.sharedSnippets[code] : null;
        if (!snippet) {
            this.showRetrieveError('Snippet not found or expired.');
            return;
        }
        this.displayRetrievedSnippet(snippet);
    }

    displayRetrievedSnippet(snippet) {
        const resultDiv = document.getElementById('retrieve-result');
        const errorDiv = document.getElementById('retrieve-error');
        errorDiv.style.display = 'none';
        document.getElementById('retrieved-title').textContent = snippet.title;
        document.getElementById('retrieved-language').textContent = snippet.language;
        const codeElem = document.getElementById('retrieved-code-content');
        if (codeElem) {
            codeElem.textContent = snippet.code;
            codeElem.className = `language-${snippet.language}`;
            Prism.highlightElement(codeElem);
        }
        resultDiv.style.display = 'block';
    }

    saveRetrievedSnippet() {
        const code = document.getElementById('retrieve-code').value.trim();
        const snippet = this.sharedSnippets ? this.sharedSnippets[code] : null;
        if (snippet) {
            this.snippets.unshift({
                ...snippet,
                id: Date.now(),
                isShared: false
            });
            this.saveSnippets();
            this.renderSnippets();
            this.showNotification('Snippet saved to your collection!', 'success');
            this.switchTab('create');
        }
    }

    clearRetrieveForm() {
        document.getElementById('retrieve-code').value = '';
        document.getElementById('retrieve-result').style.display = 'none';
        document.getElementById('retrieve-error').style.display = 'none';
    }

    showRetrieveError(message) {
        const errorDiv = document.getElementById('retrieve-error');
        const resultDiv = document.getElementById('retrieve-result');
        resultDiv.style.display = 'none';
        errorDiv.querySelector('.error-message').textContent = message;
        errorDiv.style.display = 'block';
    }

    cleanupExpiredSnippets() {
        const now = Date.now();
        let hasChanges = false;
        const sharedObj = this.sharedSnippets || {};
        for (const [code, snippet] of Object.entries(sharedObj)) {
            if (!snippet || !snippet.expiresAt || snippet.expiresAt < now) {
                delete sharedObj[code];
                hasChanges = true;
            }
        }
        if (hasChanges) {
            this.saveSharedSnippets();
        }
        this.sharedSnippets = sharedObj;
    }

    clearForm() {
        document.getElementById('snippet-title').value = '';
        document.getElementById('code-input').value = '';
        document.getElementById('language-select').value = 'javascript';
        document.getElementById('share-result').style.display = 'none';
    }

    deleteSnippet(id) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            this.snippets = this.snippets.filter(s => s.id !== id);
            this.saveSnippets();
            this.renderSnippets();
            this.showNotification('Snippet deleted!', 'info');
        }
    }

    copySnippet(code) {
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification('Code copied to clipboard!', 'success');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Code copied to clipboard!', 'success');
        });
    }

    renderSnippets() {
        const container = document.getElementById('snippets-container');
        if (!this.snippets || this.snippets.length === 0) {
            container.innerHTML = '<p class="empty-state">No snippets saved yet. Add your first code snippet above!</p>';
            return;
        }
        container.innerHTML = this.snippets.map(snippet => `
            <div class="snippet-card" data-id="${snippet.id}">
                <div class="snippet-header">
                    <span class="snippet-title">${this.escapeHtml(snippet.title)}</span>
                    <span class="snippet-language">${snippet.language}</span>
                </div>
                ${snippet.isShared ? `<div style="margin-bottom: 10px; color: #28a745; font-weight: bold;">🔗 Shared Code: ${snippet.shareCode}</div>` : ''}
                <div class="snippet-actions">
                    <button class="snippet-btn copy-btn" onclick="clipboard.copySnippet(${JSON.stringify(snippet.code).replace(/"/g, '&quot;')})">
                        📋 Copy
                    </button>
                    ${snippet.isShared ? `<button class="snippet-btn secondary-btn" onclick="clipboard.shareExistingSnippet('${snippet.shareCode}')">
                        🔗 Share
                    </button>` : ''}
                    <button class="snippet-btn delete-btn" onclick="clipboard.deleteSnippet(${snippet.id})">
                        🗑️ Delete
                    </button>
                </div>
                <div class="snippet-content">
                    <pre><code class="language-${snippet.language}">${this.escapeHtml(snippet.code)}</code></pre>
                </div>
            </div>
        `).join('');
        Prism.highlightAll();
    }

    shareExistingSnippet(shareCode) {
        this.showShareResult(shareCode);
        this.showNotification(`Sharing code: ${shareCode}`, 'info');
    }

    loadSnippets() {
        try {
            const stored = localStorage.getItem('codeClipboard');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading snippets:', error);
            return [];
        }
    }

    saveSnippets() {
        try {
            localStorage.setItem('codeClipboard', JSON.stringify(this.snippets));
        } catch (error) {
            console.error('Error saving snippets:', error);
            alert('Error saving snippet. Please check your browser storage settings.');
        }
    }

    loadSharedSnippets() {
        try {
            const stored = localStorage.getItem('sharedSnippets');
            const snippets = stored ? JSON.parse(stored) : {};
            if (typeof snippets !== 'object' || snippets === null) return {};
            return snippets;
        } catch (error) {
            console.error('Error loading shared snippets:', error);
            return {};
        }
    }

    saveSharedSnippets() {
        try {
            localStorage.setItem('sharedSnippets', JSON.stringify(this.sharedSnippets));
        } catch (error) {
            console.error('Error saving shared snippets:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        const colors = {
            success: '#28a745',
            info: '#17a2b8',
            error: '#dc3545'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick handlers
function copyShareCode() {
    const shareCode = document.getElementById('share-id').textContent;
    navigator.clipboard.writeText(shareCode).then(() => {
        clipboard.showNotification('Share code copied!', 'success');
    });
}

function copyRetrievedCode() {
    const codeElem = document.getElementById('retrieved-code-content');
    const code = codeElem ? codeElem.textContent : '';
    navigator.clipboard.writeText(code).then(() => {
        clipboard.showNotification('Code copied to clipboard!', 'success');
    });
}

// Initialize the clipboard
const clipboard = new SharedCodeClipboard();

// For Save to My Snippets button
function saveRetrievedSnippet() {
    clipboard.saveRetrievedSnippet();
}
