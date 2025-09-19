class SharedCodeClipboard {
    constructor() {
        this.snippets = this.loadSnippets(); // personal snippets in localStorage
        this.currentTab = 'create';
        this.apiBaseUrl = 'https://YOUR_BACKEND_DOMAIN'; // update to your deployed backend URL
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

    async saveAndShareSnippet() {
        const title = document.getElementById('snippet-title').value.trim();
        const code = document.getElementById('code-input').value.trim();
        const language = document.getElementById('language-select').value;
        if (!code) {
            alert('Please enter some code!');
            return;
        }
        try {
            const response = await fetch(`${this.apiBaseUrl}/snippets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, code, language })
            });
            if (!response.ok) {
                alert('Failed to share snippet. Please try again.');
                return;
            }
            const data = await response.json();
            const shareCode = data.shareCode;

            // Save personal snippet locally
            const snippet = {
                id: Date.now(),
                shareCode: shareCode,
                title: title || `Shared ${new Date().toLocaleString()}`,
                code: code,
                language: language,
                timestamp: new Date().toISOString(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000,
                isShared: true
            };
            this.snippets.unshift(snippet);
            this.saveSnippets();
            this.renderSnippets();
            this.clearForm();
            this.showShareResult(shareCode);
            this.showNotification('Snippet shared successfully!', 'success');
        } catch (error) {
            console.error('Error sharing snippet:', error);
            alert('Error sharing snippet. See console for details.');
        }
    }

    async retrieveSnippet() {
        const code = document.getElementById('retrieve-code').value.trim();
        if (!code || code.length !== 4) {
            this.showRetrieveError('Please enter a valid 4-digit code.');
            return;
        }
        try {
            const response = await fetch(`${this.apiBaseUrl}/snippets/${code}`);
            if (!response.ok) {
                this.showRetrieveError('Snippet not found or expired.');
                return;
            }
            const snippet = await response.json();
            this.displayRetrievedSnippet(snippet);
        } catch (error) {
            console.error('Error fetching snippet:', error);
            this.showRetrieveError('Failed to retrieve snippet. Please try again.');
        }
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
        // Find snippet in local personal snippets or add new from displayed snippet content
        const snippetIndex = this.snippets.findIndex(s => s.shareCode === code);
        if (snippetIndex >= 0) {
            this.showNotification('Snippet already saved to your collection!', 'info');
            this.switchTab('create');
            return;
        }
        const snippet = {
            id: Date.now(),
            shareCode: code,
            title: document.getElementById('retrieved-title').textContent,
            language: document.getElementById('retrieved-language').textContent,
            code: document.getElementById('retrieved-code-content').textContent,
            timestamp: new Date().toISOString(),
            isShared: false
        };
        this.snippets.unshift(snippet);
        this.saveSnippets();
        this.renderSnippets();
        this.showNotification('Snippet saved to your collection!', 'success');
        this.switchTab('create');
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
