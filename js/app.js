/* ============================================
   Omah Sop - Main Application Logic
   ============================================ */

class OmahSopApp {
    constructor() {
        this.charts = {};
        this.currentType = null;
        this.sortState = {};
        this.init();
    }

    init() {
        // Initialize database
        DB.init();

        // Hide loading screen
        this.hideLoadingScreen();

        // Register service worker
        this.registerServiceWorker();

        // Setup navigation
        this.setupNavigation();

        // Setup modal
        this.setupModal();

        // Setup export / import
        this.setupExport();
        this.setupImport();

        // Setup Supabase
        this.setupSupabase();

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Setup offline detection
        this.setupOfflineDetection();

        // Load initial data
        this.loadPage('dashboard');
        this.updateEntryCount();

        // Setup mobile menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });

        // Close sidebar on page click (mobile)
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const toggle = document.getElementById('menuToggle');
            if (window.innerWidth <= 992 && 
                sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !toggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });

        // Auto-update overdue receivables
        this.updateOverdueStatus();

        // Setup notifications
        this.setupNotifications();

        // Setup fingerprint / biometric login
        this.setupFingerprintLogin();

        // Setup PIN & Account login
        this.setupLogin();

        // Welcome message
        this.showToast('Selamat datang di Omah Sop! Data tersimpan secara lokal.', 'success');
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 600);
            }, 800);
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then((registration) => {
                console.log('Omah Sop: Service Worker terdaftar');
            }).catch((error) => {
                console.warn('Omah Sop: Service Worker gagal:', error);
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const activePage = document.querySelector('.nav-item.active');
                if (activePage) {
                    const searchId = `${activePage.dataset.page}Search`;
                    const searchInput = document.getElementById(searchId);
                    if (searchInput) searchInput.focus();
                }
            }
            if (e.key === 'Escape') {
                this.closeModal();
            }
            if ((e.key === 'n' || e.key === 'N') && !document.getElementById('modal').classList.contains('show')) {
                const activePage = document.querySelector('.nav-item.active');
                if (activePage && activePage.dataset.page !== 'dashboard') {
                    this.openModal(activePage.dataset.page === 'expenses' ? 'expense' : 
                                  activePage.dataset.page === 'receivables' ? 'receivable' : 'income');
                }
            }
        });
    }

    setupOfflineDetection() {
        const offlineIndicator = document.getElementById('offline-indicator');
        
        function updateOnlineStatus() {
            if (navigator.onLine) {
                offlineIndicator.style.display = 'none';
            } else {
                offlineIndicator.style.display = 'flex';
            }
        }

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    // ============ Supabase ============
    setupSupabase() {
        document.getElementById('supabaseSaveBtn').addEventListener('click', async () => {
            try {
                const btn = document.getElementById('supabaseSaveBtn');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                await DB.saveToSupabase();
                this.showToast('Data berhasil disimpan ke cloud! ☁️', 'success');
            } catch (error) {
                this.showToast('Gagal menyimpan: ' + error.message, 'error');
            } finally {
                const btn = document.getElementById('supabaseSaveBtn');
                btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
                btn.disabled = false;
            }
        });

        document.getElementById('supabaseLoadBtn').addEventListener('click', async () => {
            try {
                const btn = document.getElementById('supabaseLoadBtn');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                await DB.loadFromSupabase();
                this.showToast('Data berhasil dimuat dari cloud! ☁️', 'success');
                
                const activePage = document.querySelector('.nav-item.active');
                if (activePage) this.loadPage(activePage.dataset.page);
                this.updateEntryCount();
            } catch (error) {
                this.showToast('Gagal memuat: ' + error.message, 'error');
            } finally {
                const btn = document.getElementById('supabaseLoadBtn');
                btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i>';
                btn.disabled = false;
            }
        });
    }

    // ============ Navigation ============
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
                if (window.innerWidth <= 992) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });
    }

    switchPage(page) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');
        this.loadPage(page);
    }

    loadPage(page) {
        switch(page) {
            case 'dashboard': this.renderDashboard(); break;
            case 'income': this.renderTable('income'); break;
            case 'expenses': this.renderTable('expense'); break;
            case 'receivables': this.renderTable('receivable'); break;
            case 'budget': this.renderBudget(); break;
        }
    }

    // ============ Dashboard ============
    renderDashboard() {
        const data = DB.getDashboardData();

        document.getElementById('totalBalance').textContent = DB.formatCurrency(data.totalBalance);
        document.getElementById('totalIncome').textContent = DB.formatCurrency(data.totalIncome);
        document.getElementById('totalExpenses').textContent = DB.formatCurrency(data.totalExpenses);
        document.getElementById('totalReceivables').textContent = DB.formatCurrency(data.pendingReceivables);

        Object.values(this.charts).forEach(c => {
            if (c) c.destroy();
        });
        this.charts = {};

        this.charts.incomeExpense = this.createBarChart('incomeExpenseChart', 
            ['Pemasukan', 'Pengeluaran'], 
            [data.totalIncome, data.totalExpenses],
            ['#00ff88', '#ff4757']
        );

        const categories = Object.keys(data.expenseByCategory);
        const amounts = Object.values(data.expenseByCategory);
        if (categories.length > 0) {
            this.charts.expenseCategory = this.createPieChart('expenseCategoryChart', categories, amounts);
        }

        const overdueAmount = this.getOverdueAmount();
        this.charts.receivablesStatus = this.createDoughnutChart('receivablesStatusChart',
            ['Lunas', 'Tertunda', 'Jatuh Tempo'],
            [data.paidReceivables, data.pendingReceivables - overdueAmount, overdueAmount],
            ['#00ff88', '#ffa502', '#ff4757']
        );

        this.renderRecentActivity(data.recentActivity);

        setTimeout(() => {
            this.drawSparklines();
        }, 100);
    }

    getOverdueAmount() {
        const receivables = DB.getReceivables();
        return receivables.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0);
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="text-muted">Belum ada aktivitas</p>';
            return;
        }

        container.innerHTML = activities.map(a => {
            const type = a.type;
            const icon = type === 'income' ? 'fa-circle-dollar' : type === 'expense' ? 'fa-receipt' : 'fa-hand-holding-dollar';
            const sign = type === 'income' ? 'positive' : type === 'expense' ? 'negative' : 'positive';
            const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : '+';
            const desc = type === 'receivable' ? `${a.client} - ${a.description}` : a.description;
            const meta = type === 'receivable' ? `Jatuh tempo: ${a.dueDate} · ${this.statusLabel(a.status)}` : 
                         `${a.date || ''} · ${a.source || a.category || ''}`;

            return `
                <div class="activity-item">
                    <div class="activity-icon ${type}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-details">
                        <div class="activity-desc">${this.escapeHtml(desc)}</div>
                        <div class="activity-meta">${this.escapeHtml(meta)}</div>
                    </div>
                    <div class="activity-amount ${sign}">${prefix}${DB.formatCurrency(a.amount)}</div>
                </div>
            `;
        }).join('');
    }

    statusLabel(status) {
        const labels = { pending: 'Tertunda', paid: 'Lunas', overdue: 'Jatuh Tempo' };
        return labels[status] || status;
    }

    drawSparklines() {
        const income = DB.getIncome();
        const expenses = DB.getExpenses();
        
        const balanceData = [];
        let balance = 0;
        const allTransactions = [
            ...income.map(i => ({ amount: i.amount, date: i.date })),
            ...expenses.map(e => ({ amount: -e.amount, date: e.date }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        allTransactions.forEach(t => {
            balance += t.amount;
            balanceData.push(balance);
        });

        if (balanceData.length > 1) {
            new Sparkline('balanceSpark', balanceData, '#00d4ff');
        }
    }

    // ============ Charts ============
    createBarChart(canvasId, labels, data, colors) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.map(c => c + '80'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 6,
                    barThickness: 50
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            callback: v => 'Rp ' + v.toLocaleString('id-ID')
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.7)' },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    createPieChart(canvasId, labels, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const colors = ['#00d4ff', '#7c5cfc', '#00ff88', '#ffa502', '#ff4757', '#ff6b6b', '#a29bfe'];
        const ctx = canvas.getContext('2d');
        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length).map(c => c + 'CC'),
                    borderColor: 'rgba(10,10,26,0.8)',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'rgba(255,255,255,0.7)',
                            padding: 12,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    createDoughnutChart(canvasId, labels, data, colors) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        const filteredLabels = labels.filter((_, i) => data[i] > 0);
        const filteredData = data.filter(d => d > 0);
        const filteredColors = colors.filter((_, i) => data[i] > 0);

        if (filteredData.length === 0) return null;

        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: filteredLabels,
                datasets: [{
                    data: filteredData,
                    backgroundColor: filteredColors.map(c => c + 'CC'),
                    borderColor: 'rgba(10,10,26,0.8)',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'rgba(255,255,255,0.7)',
                            padding: 12,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    // ============ Table Rendering ============
    renderTable(type) {
        let data, columns;
        
        switch(type) {
            case 'income':
                data = DB.getIncome();
                columns = [
                    { key: 'date', label: 'Tanggal' },
                    { key: 'description', label: 'Deskripsi' },
                    { key: 'source', label: 'Sumber' },
                    { key: 'amount', label: 'Jumlah', format: v => `<span class="amount-positive">${DB.formatCurrency(v)}</span>` }
                ];
                this.populateFilterOptions('incomeSourceFilter', DB.INCOME_SOURCES, data.map(d => d.source));
                break;
            case 'expense':
                data = DB.getExpenses();
                columns = [
                    { key: 'date', label: 'Tanggal' },
                    { key: 'description', label: 'Deskripsi' },
                    { key: 'category', label: 'Kategori' },
                    { key: 'amount', label: 'Jumlah', format: v => `<span class="amount-negative">-${DB.formatCurrency(v)}</span>` }
                ];
                this.populateFilterOptions('expenseCategoryFilter', DB.EXPENSE_CATEGORIES, data.map(d => d.category));
                break;
            case 'receivable':
                data = DB.getReceivables();
                columns = [
                    { key: 'client', label: 'Peminjam' },
                    { key: 'description', label: 'Deskripsi' },
                    { key: 'amount', label: 'Jumlah', format: v => `<span class="amount-positive">${DB.formatCurrency(v)}</span>` },
                    { key: 'dueDate', label: 'Jatuh Tempo' },
                    { key: 'status', label: 'Status', format: v => `<span class="status-badge ${v}">${this.statusLabel(v)}</span>` }
                ];
                break;
        }

        this.renderTableData(type, data, columns);
    }

    populateFilterOptions(selectId, defaults, existing) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        const options = new Set([...defaults, ...existing]);
        select.innerHTML = '<option value="">Semua</option>' + 
            Array.from(options).sort().map(o => `<option value="${o}">${o}</option>`).join('');
        select.value = currentValue;
    }

    renderTableData(type, data, columns) {
        const tbody = document.getElementById(`${type}TableBody`);
        const empty = document.getElementById(`${type}Empty`);
        
        if (!tbody) return;

        const searchInput = document.getElementById(`${type}Search`);
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        let filterValue = '';
        if (type === 'income') {
            const filter = document.getElementById('incomeSourceFilter');
            filterValue = filter ? filter.value : '';
        } else if (type === 'expense') {
            const filter = document.getElementById('expenseCategoryFilter');
            filterValue = filter ? filter.value : '';
        } else if (type === 'receivable') {
            const filter = document.getElementById('receivableStatusFilter');
            filterValue = filter ? filter.value : '';
        }

        let filtered = data;
        if (searchTerm) {
            filtered = filtered.filter(item => 
                Object.values(item).some(v => 
                    String(v).toLowerCase().includes(searchTerm)
                )
            );
        }
        if (filterValue) {
            const filterKey = type === 'income' ? 'source' : type === 'expense' ? 'category' : 'status';
            filtered = filtered.filter(item => item[filterKey] === filterValue);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }

        if (empty) empty.style.display = 'none';

        const getActions = (item) => {
            let btns = `
                <button class="action-btn edit" onclick="app.editEntry('${type}', '${item.id}')" title="Edit">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="action-btn delete" onclick="app.deleteEntry('${type}', '${item.id}')" title="Hapus">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            if (type === 'receivable' && item.status !== 'paid') {
                btns += `
                    <button class="action-btn pay" onclick="app.markAsPaid('${item.id}')" title="Tandai Lunas">
                        <i class="fas fa-check"></i>
                    </button>
                `;
            }
            return btns;
        };

        tbody.innerHTML = filtered.map(item => `
            <tr>
                ${columns.map(col => `
                    <td>${col.format ? col.format(item[col.key]) : this.escapeHtml(String(item[col.key] || ''))}</td>
                `).join('')}
                <td>
                    <div class="action-btns">
                        ${getActions(item)}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // ============ CRUD Operations ============
    openModal(type, editData = null) {
        this.currentType = type;
        const modal = document.getElementById('modal');
        const form = document.getElementById('modalForm');
        const title = document.getElementById('modalTitle');
        const submitBtn = document.getElementById('submitBtn');
        const editId = document.getElementById('editId');
        const formType = document.getElementById('formType');

        form.reset();
        editId.value = '';
        formType.value = type;
        
        document.getElementById('formDate').value = new Date().toISOString().split('T')[0];

        const clientGroup = document.getElementById('clientGroup');
        const sourceGroup = document.getElementById('sourceGroup');
        const dueDateGroup = document.getElementById('dueDateGroup');
        const paymentGroup = document.getElementById('paymentGroup');
        const statusGroup = document.getElementById('statusGroup');
        const sourceSelect = document.getElementById('formSource');

        clientGroup.style.display = 'none';
        sourceGroup.style.display = 'block';
        dueDateGroup.style.display = 'none';
        paymentGroup.style.display = 'none';
        statusGroup.style.display = 'none';

        if (type === 'income') {
            title.textContent = editData ? 'Edit Pemasukan' : 'Tambah Pemasukan';
            submitBtn.textContent = editData ? 'Perbarui' : 'Tambah Pemasukan';
            sourceSelect.innerHTML = DB.INCOME_SOURCES.map(s => `<option value="${s}">${s}</option>`).join('');
            document.getElementById('formAmount').step = '0.01';
            paymentGroup.style.display = 'block';
            document.querySelector('#formAmount').placeholder = 'Masukkan jumlah';
        } else if (type === 'expense') {
            title.textContent = editData ? 'Edit Pengeluaran' : 'Tambah Pengeluaran';
            submitBtn.textContent = editData ? 'Perbarui' : 'Tambah Pengeluaran';
            sourceSelect.innerHTML = DB.EXPENSE_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
            document.getElementById('formAmount').step = '0.01';
            paymentGroup.style.display = 'block';
            document.querySelector('#formAmount').placeholder = 'Masukkan jumlah';
        } else if (type === 'receivable') {
            title.textContent = editData ? 'Edit Piutang' : 'Tambah Piutang';
            submitBtn.textContent = editData ? 'Perbarui' : 'Tambah Piutang';
            clientGroup.style.display = 'block';
            sourceSelect.innerHTML = '<option value="pinjaman">Pinjaman</option><option value="jasa">Jasa</option><option value="produk">Produk</option><option value="lainnya">Lainnya</option>';
            dueDateGroup.style.display = 'block';
            statusGroup.style.display = 'block';
            document.getElementById('formDueDate').value = new Date(Date.now() + 30*86400000).toISOString().split('T')[0];
            document.getElementById('formPaymentMethod').value = 'bank';
        }

        if (editData) {
            editId.value = editData.id;
            document.getElementById('formDescription').value = editData.description || '';
            document.getElementById('formAmount').value = editData.amount || '';
            document.getElementById('formDate').value = editData.date || '';
            
            if (type === 'income' || type === 'expense') {
                const sourceKey = type === 'income' ? 'source' : 'category';
                if (sourceSelect.querySelector(`option[value="${editData[sourceKey]}"]`)) {
                    sourceSelect.value = editData[sourceKey];
                }
                document.getElementById('formPaymentMethod').value = editData.paymentMethod || 'bank';
            } else if (type === 'receivable') {
                document.getElementById('formClient').value = editData.client || '';
                sourceSelect.value = editData.source || 'pinjaman';
                document.getElementById('formDueDate').value = editData.dueDate || '';
                document.getElementById('formStatus').value = editData.status || 'pending';
            }
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    handleFormSubmit(event) {
        event.preventDefault();
        const type = document.getElementById('formType').value;
        const editId = document.getElementById('editId').value;

        const data = {
            description: document.getElementById('formDescription').value.trim(),
            amount: parseFloat(document.getElementById('formAmount').value),
            date: document.getElementById('formDate').value,
        };

        if (type === 'income' || type === 'expense') {
            const sourceKey = type === 'income' ? 'source' : 'category';
            data[sourceKey] = document.getElementById('formSource').value;
            data.paymentMethod = document.getElementById('formPaymentMethod').value;
        } else if (type === 'receivable') {
            data.client = document.getElementById('formClient').value.trim();
            data.source = document.getElementById('formSource').value;
            data.dueDate = document.getElementById('formDueDate').value;
            data.status = editId ? document.getElementById('formStatus').value : 'pending';
        }

        if (!data.description || !data.amount || data.amount <= 0) {
            this.showToast('Harap isi semua kolom dengan benar.', 'error');
            return;
        }

        try {
            if (editId) {
                const method = type === 'income' ? 'updateIncome' : type === 'expense' ? 'updateExpense' : 'updateReceivable';
                DB[method](editId, data);
                this.showToast('Data berhasil diperbarui!', 'success');
            } else {
                const method = type === 'income' ? 'addIncome' : type === 'expense' ? 'addExpense' : 'addReceivable';
                DB[method](data);
                this.showToast('Data berhasil ditambahkan!', 'success');
            }

            this.closeModal();
            
            const activePage = document.querySelector('.nav-item.active');
            if (activePage) {
                this.loadPage(activePage.dataset.page);
            }
            this.updateEntryCount();

        } catch (error) {
            this.showToast('Gagal menyimpan data. Coba lagi.', 'error');
            console.error(error);
        }
    }

    editEntry(type, id) {
        let data;
        switch(type) {
            case 'income': data = DB.getIncome().find(e => e.id === id); break;
            case 'expense': data = DB.getExpenses().find(e => e.id === id); break;
            case 'receivable': data = DB.getReceivables().find(e => e.id === id); break;
        }
        if (data) {
            this.openModal(type, data);
        }
    }

    deleteEntry(type, id) {
        if (!confirm('Yakin ingin menghapus data ini?')) return;

        try {
            switch(type) {
                case 'income': DB.deleteIncome(id); break;
                case 'expense': DB.deleteExpense(id); break;
                case 'receivable': DB.deleteReceivable(id); break;
            }
            this.showToast('Data berhasil dihapus!', 'success');
            
            const activePage = document.querySelector('.nav-item.active');
            if (activePage) {
                this.loadPage(activePage.dataset.page);
            }
            this.updateEntryCount();
        } catch (error) {
            this.showToast('Gagal menghapus data.', 'error');
        }
    }

    markAsPaid(id) {
        try {
            DB.markAsPaid(id);
            this.showToast('Ditandai sebagai Lunas!', 'success');
            this.loadPage('receivables');
            this.updateEntryCount();
        } catch (error) {
            this.showToast('Gagal menandai.', 'error');
        }
    }

    // ============ Filter & Search ============
    filterTable(type) {
        this.renderTable(type);
    }

    // ============ Sorting ============
    sortTable(type, key) {
        const stateKey = `${type}_${key}`;
        const currentDir = this.sortState[stateKey] || 'asc';
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';
        this.sortState[stateKey] = newDir;

        let data;
        switch(type) {
            case 'income': data = DB.getIncome(); break;
            case 'expense': data = DB.getExpenses(); break;
            case 'receivable': data = DB.getReceivables(); break;
        }

        data.sort((a, b) => {
            let valA = a[key], valB = b[key];
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = (valB || '').toLowerCase();
            }
            if (valA < valB) return newDir === 'asc' ? -1 : 1;
            if (valA > valB) return newDir === 'asc' ? 1 : -1;
            return 0;
        });

        const columns = this.getColumnsForType(type);
        this.renderTableData(type, data, columns);
    }

    getColumnsForType(type) {
        switch(type) {
            case 'income':
                return [
                    { key: 'date', label: 'Tanggal' },
                    { key: 'description', label: 'Deskripsi' },
                    { key: 'source', label: 'Sumber' },
                    { key: 'amount', label: 'Jumlah', format: v => `<span class="amount-positive">${DB.formatCurrency(v)}</span>` }
                ];
            case 'expense':
                return [
                    { key: 'date', label: 'Tanggal' },
                    { key: 'description', label: 'Deskripsi' },
                    { key: 'category', label: 'Kategori' },
                    { key: 'amount', label: 'Jumlah', format: v => `<span class="amount-negative">-${DB.formatCurrency(v)}</span>` }
                ];
            case 'receivable':
                return [
                    { key: 'client', label: 'Peminjam' },
                    { key: 'description', label: 'Deskripsi' },
                    { key: 'amount', label: 'Jumlah', format: v => `<span class="amount-positive">${DB.formatCurrency(v)}</span>` },
                    { key: 'dueDate', label: 'Jatuh Tempo' },
                    { key: 'status', label: 'Status', format: v => `<span class="status-badge ${v}">${this.statusLabel(v)}</span>` }
                ];
        }
    }

    // ============ Budget Page ============
    renderBudget() {
        const expenses = DB.getExpenses();
        const budgets = DB.getBudgets();
        const categories = DB.EXPENSE_CATEGORIES;

        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        const monthlyExpenses = {};
        expenses.forEach(e => {
            if (e.date && e.date.startsWith(currentMonth)) {
                monthlyExpenses[e.category] = (monthlyExpenses[e.category] || 0) + e.amount;
            }
        });

        let totalBudget = 0, totalSpent = 0;
        budgets.forEach(b => {
            totalBudget += b.amount;
            totalSpent += monthlyExpenses[b.category] || 0;
        });
        categories.forEach(cat => {
            if (!budgets.find(b => b.category === cat) && monthlyExpenses[cat]) {
                totalSpent += monthlyExpenses[cat];
            }
        });

        document.getElementById('budgetTotal').textContent = DB.formatCurrency(totalBudget);
        document.getElementById('budgetSpent').textContent = DB.formatCurrency(totalSpent);
        document.getElementById('budgetRemaining').textContent = DB.formatCurrency(totalBudget - totalSpent);
        document.getElementById('budgetRemaining').style.color = (totalBudget - totalSpent) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

        const grid = document.getElementById('budgetGrid');
        const colors = ['#00d4ff', '#7c5cfc', '#00ff88', '#ffa502', '#ff4757', '#ff6b6b', '#a29bfe', '#00d4ff'];

        grid.innerHTML = categories.map((cat, i) => {
            const budget = budgets.find(b => b.category === cat);
            const budgetAmount = budget ? budget.amount : 0;
            const spent = monthlyExpenses[cat] || 0;
            const percent = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
            const barClass = percent > 90 ? 'danger' : percent > 70 ? 'warning' : '';
            const remaining = budgetAmount - spent;

            return `
                <div class="budget-item glass">
                    <div class="budget-item-header">
                        <span class="budget-item-category">${cat}</span>
                        <span class="budget-item-amounts">
                            ${DB.formatCurrency(spent)} / ${DB.formatCurrency(budgetAmount)}
                        </span>
                    </div>
                    <div class="budget-bar">
                        <div class="budget-bar-fill ${barClass}" style="width:${percent}%; background:${colors[i % colors.length]}"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)">
                        <span>${percent.toFixed(0)}% terpakai</span>
                        <span style="color:${remaining >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${DB.formatCurrency(remaining)} sisa</span>
                    </div>
                    <div class="budget-item-actions">
                        <button class="budget-edit-btn" onclick="app.setBudgetPrompt('${cat}')">
                            ${budgetAmount > 0 ? '<i class="fas fa-pen"></i> Edit' : '<i class="fas fa-plus"></i> Atur Anggaran'}
                        </button>
                        ${budgetAmount > 0 ? `<button class="budget-edit-btn" onclick="app.removeBudget('${cat}')" style="color:var(--accent-red)"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    setBudgetPrompt(category) {
        const budgets = DB.getBudgets();
        const existing = budgets.find(b => b.category === category);
        const current = existing ? existing.amount : 0;
        const amount = prompt(`Atur anggaran bulanan untuk "${category}":`, current || '');
        if (amount !== null) {
            const num = parseFloat(amount);
            if (!isNaN(num) && num >= 0) {
                DB.setBudget(category, num);
                this.showToast(`Anggaran ${category} tersimpan`, 'success');
                this.renderBudget();
            } else {
                this.showToast('Masukkan jumlah yang valid.', 'error');
            }
        }
    }

    removeBudget(category) {
        if (confirm(`Hapus anggaran untuk "${category}"?`)) {
            DB.removeBudget(category);
            this.showToast('Anggaran dihapus.', 'success');
            this.renderBudget();
        }
    }

    // ============ Import ============
    setupImport() {
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    DB.importData(data);
                    this.showToast('Data berhasil diimpor!', 'success');
                    const activePage = document.querySelector('.nav-item.active');
                    if (activePage) this.loadPage(activePage.dataset.page);
                    this.updateEntryCount();
                } catch (err) {
                    this.showToast('File JSON tidak valid.', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    // ============ Modal Setup ============
    setupModal() {
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
    }

    // ============ Export ============
    setupExport() {
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('exportBtnMobile').addEventListener('click', () => this.exportData());
    }

    exportData() {
        const data = DB.exportAllData();

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omahsop-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Data berhasil diekspor!', 'success');
    }

    // ============ Overdue Status ============
    updateOverdueStatus() {
        const receivables = DB.getReceivables();
        let updated = false;
        receivables.forEach(r => {
            if (r.status === 'pending' && new Date(r.dueDate) < new Date()) {
                r.status = 'overdue';
                updated = true;
            }
        });
        if (updated) {
            DB.setData(DB.KEYS.RECEIVABLES, receivables);
        }
    }

    // ============ Entry Count ============
    updateEntryCount() {
        const total = DB.getIncome().length + DB.getExpenses().length + DB.getReceivables().length;
        document.getElementById('entry-count').textContent = `${total} entri`;
    }

    // ============ Helpers ============
    // ============ Print Struk (Receipt) ============
    printStruk(type) {
        let data, title, items;

        switch(type) {
            case 'income':
                data = DB.getIncome();
                title = 'STRUK PEMASUKAN';
                items = data.map(d => ({
                    left: d.date,
                    center: d.description,
                    right: DB.formatCurrency(d.amount),
                    source: d.source
                }));
                break;
            case 'expense':
                data = DB.getExpenses();
                title = 'STRUK PENGELUARAN';
                items = data.map(d => ({
                    left: d.date,
                    center: d.description,
                    right: DB.formatCurrency(d.amount),
                    source: d.category
                }));
                break;
            case 'receivable':
                data = DB.getReceivables();
                title = 'STRUK PIUTANG';
                items = data.map(d => ({
                    left: d.client,
                    center: d.description,
                    right: DB.formatCurrency(d.amount),
                    source: d.status
                }));
                break;
            default:
                this.showToast('Tipe tidak valid', 'error');
                return;
        }

        if (items.length === 0) {
            this.showToast('Tidak ada data untuk dicetak', 'error');
            return;
        }

        // Build receipt HTML in a new window
        const receiptWindow = window.open('', '_blank', 'width=320,height=600');
        const total = data.reduce((sum, d) => sum + d.amount, 0);

        receiptWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <style>
                    @page { margin: 0; size: 80mm auto; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        width: 80mm;
                        padding: 8mm 4mm;
                        color: #000;
                        background: #fff;
                    }
                    .header { text-align: center; margin-bottom: 12px; }
                    .header h2 { font-size: 16px; font-weight: 800; letter-spacing: 1px; }
                    .header .sub { font-size: 10px; color: #555; margin-top: 2px; }
                    .divider { border-top: 1px dashed #333; margin: 8px 0; }
                    .item { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
                    .item-desc { font-size: 10px; color: #555; margin-bottom: 4px; }
                    .total { display: flex; justify-content: space-between; font-weight: 800; font-size: 14px; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
                    .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #555; }
                    .date { text-align: center; font-size: 10px; color: #888; margin-bottom: 8px; }
                    .no-print { display: none; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>${title}</h2>
                    <div class="sub">Omah Sop - Pembukuan 3D</div>
                </div>
                <div class="date">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div class="divider"></div>
                ${items.map(item => `
                    <div class="item"><span>${this.escapeHtml(item.left)}</span><span>${item.right}</span></div>
                    <div class="item-desc">${this.escapeHtml(item.center)} (${this.escapeHtml(item.source)})</div>
                `).join('')}
                <div class="divider"></div>
                <div class="total"><span>TOTAL</span><span>${DB.formatCurrency(total)}</span></div>
                <div class="divider"></div>
                <div class="footer">
                    Terima kasih<br>
                    Data disimpan secara lokal<br>
                    <small>Omah Sop v2.0</small>
                </div>
                <div class="no-print">
                    <br>
                    <button onclick="window.print()" style="padding:8px 24px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;">Cetak Struk</button>
                    <button onclick="window.close()" style="padding:8px 24px;background:#ddd;color:#000;border:none;border-radius:4px;cursor:pointer;font-size:14px;margin-left:8px;">Tutup</button>
                </div>
                <script>
                    // Auto print after load
                    setTimeout(() => window.print(), 500);
                <\/script>
            </body>
            </html>
        `);
        receiptWindow.document.close();

        this.showToast('Struk siap dicetak', 'success');
    }

    // ============ Print Full Report ============
    printReport() {
        const data = DB.getDashboardData();

        const reportWindow = window.open('', '_blank', 'width=800,height=600');
        reportWindow.document.write(`
            <html>
            <head>
                <title>Laporan Keuangan - Omah Sop</title>
                <style>
                    @page { margin: 15mm; }
                    body { font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #222; padding: 20px; }
                    h1 { font-size: 24px; margin-bottom: 4px; }
                    .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
                    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
                    .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
                    .card-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
                    .card-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd; }
                    td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
                    .positive { color: #00a854; font-weight: 600; }
                    .negative { color: #e53935; font-weight: 600; }
                    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Omah Sop</h1>
                <div class="sub">Laporan Keuangan — ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

                <div class="summary">
                    <div class="card"><div class="card-label">Total Saldo</div><div class="card-value" style="color:#00d4ff">${DB.formatCurrency(data.totalBalance)}</div></div>
                    <div class="card"><div class="card-label">Total Pemasukan</div><div class="card-value" style="color:#00a854">${DB.formatCurrency(data.totalIncome)}</div></div>
                    <div class="card"><div class="card-label">Total Pengeluaran</div><div class="card-value" style="color:#e53935">${DB.formatCurrency(data.totalExpenses)}</div></div>
                    <div class="card"><div class="card-label">Piutang Tertunda</div><div class="card-value" style="color:#ffa502">${DB.formatCurrency(data.pendingReceivables)}</div></div>
                </div>

                <h3 style="margin-top:20px;">Aktivitas Terbaru</h3>
                <table>
                    <thead><tr><th>Tipe</th><th>Deskripsi</th><th>Tanggal</th><th>Jumlah</th></tr></thead>
                    <tbody>
                        ${data.recentActivity.slice(0, 20).map(a => `
                            <tr>
                                <td>${a.type === 'income' ? 'Pemasukan' : a.type === 'expense' ? 'Pengeluaran' : 'Piutang'}</td>
                                <td>${this.escapeHtml(a.description || a.client || '')}</td>
                                <td>${a.date || a.dueDate || '-'}</td>
                                <td class="${a.type === 'expense' ? 'negative' : 'positive'}">${DB.formatCurrency(a.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    Laporan ini digenerate otomatis oleh Omah Sop v2.0<br>
                    Data disimpan secara lokal di perangkat Anda.
                </div>
                <div class="no-print" style="text-align:center;margin-top:24px;">
                    <button onclick="window.print()" style="padding:10px 32px;background:#000;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px;">Cetak Laporan</button>
                    <button onclick="window.close()" style="padding:10px 32px;background:#ddd;color:#000;border:none;border-radius:6px;cursor:pointer;font-size:15px;margin-left:12px;">Tutup</button>
                </div>
                <script>
                    setTimeout(() => window.print(), 500);
                <\/script>
            </body>
            </html>
        `);
        reportWindow.document.close();

        this.showToast('Laporan siap dicetak', 'success');
    }

    // ============ Download Laporan (PDF/CSV/Excel) ============
    downloadLaporan(format = 'pdf') {
        const data = DB.getDashboardData();
        const income = DB.getIncome();
        const expenses = DB.getExpenses();
        const receivables = DB.getReceivables();

        switch(format) {
            case 'pdf':
                this.downloadPDF(data, income, expenses, receivables);
                break;
            case 'csv':
                this.downloadCSV(income, expenses, receivables);
                break;
            case 'excel':
                this.downloadExcel(income, expenses, receivables);
                break;
            default:
                this.downloadPDF(data, income, expenses, receivables);
        }
    }

    downloadPDF(data, income, expenses, receivables) {
        if (typeof jspdf === 'undefined') {
            this.showToast('Library PDF belum dimuat. Coba refresh halaman.', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            // Colors
            const cyan = [0, 212, 255];
            const green = [0, 255, 136];
            const red = [255, 71, 87];
            const orange = [255, 165, 2];
            const darkBg = [10, 10, 26];
            const gray = [100, 100, 100];

            // Header
            doc.setFillColor(...darkBg);
            doc.rect(0, 0, pageWidth, 45, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.setTextColor(...cyan);
            doc.text('Omah Sop', 20, 22);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('Laporan Keuangan', 20, 32);

            // Date
            const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            doc.setFontSize(9);
            doc.text(dateStr, pageWidth - 20, 22, { align: 'right' });

            // Summary Cards
            doc.setFontSize(18);
            doc.setTextColor(50, 50, 50);
            doc.text('Ringkasan', 20, 60);

            const cards = [
                { label: 'Saldo', value: DB.formatCurrency(data.totalBalance), color: cyan },
                { label: 'Pemasukan', value: DB.formatCurrency(data.totalIncome), color: green },
                { label: 'Pengeluaran', value: DB.formatCurrency(data.totalExpenses), color: red },
                { label: 'Piutang', value: DB.formatCurrency(data.pendingReceivables), color: orange }
            ];

            let cardX = 20;
            cards.forEach(card => {
                doc.setFillColor(245, 245, 250);
                doc.roundedRect(cardX, 65, 42, 25, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(...card.color);
                doc.text(card.value, cardX + 3, 78);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(...gray);
                doc.text(card.label, cardX + 3, 68);
                cardX += 47;
            });

            // Recent Activity Table
            let yPos = 105;
            doc.setFontSize(14);
            doc.setTextColor(50, 50, 50);
            doc.text('Aktivitas Terbaru', 20, yPos);
            yPos += 10;

            // Table header
            doc.setFillColor(240, 240, 245);
            doc.rect(20, yPos, pageWidth - 40, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            const col1 = 22, col2 = 60, col3 = 120, col4 = 160;
            doc.text('Tipe', col1, yPos + 5);
            doc.text('Deskripsi', col2, yPos + 5);
            doc.text('Tanggal', col3, yPos + 5);
            doc.text('Jumlah', col4, yPos + 5);
            yPos += 12;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            data.recentActivity.slice(0, 25).forEach((a, i) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setTextColor(50, 50, 50);
                doc.text(a.type === 'income' ? 'Pemasukan' : a.type === 'expense' ? 'Pengeluaran' : 'Piutang', col1, yPos);
                doc.text((a.description || a.client || '').substring(0, 30), col2, yPos);
                doc.text(a.date || a.dueDate || '-', col3, yPos);

                if (a.type === 'expense') {
                    doc.setTextColor(...red);
                } else {
                    doc.setTextColor(...green);
                }
                doc.text(DB.formatCurrency(a.amount), col4, yPos);
                yPos += 8;
            });

            // Summary text
            yPos = Math.max(yPos + 10, 240);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...gray);
            doc.text(`Total Pemasukan: ${DB.formatCurrency(data.totalIncome)} | Total Pengeluaran: ${DB.formatCurrency(data.totalExpenses)} | Piutang: ${DB.formatCurrency(data.pendingReceivables)}`, 20, yPos);
            yPos += 6;
            doc.text(`Saldo Bersih: ${DB.formatCurrency(data.totalBalance)}`, 20, yPos);

            // Footer
            doc.setFontSize(7);
            doc.setTextColor(180, 180, 180);
            doc.text('Dibuat oleh Omah Sop v2.0 — Data disimpan secara lokal', 20, 285);
            doc.text('Halaman ' + doc.internal.getNumberOfPages(), pageWidth - 20, 285, { align: 'right' });

            // Save
            doc.save(`omahsop-laporan-${new Date().toISOString().split('T')[0]}.pdf`);
            this.showToast('Laporan PDF berhasil diunduh!', 'success');

        } catch (err) {
            console.error('PDF error:', err);
            this.showToast('Gagal membuat PDF: ' + err.message, 'error');
        }
    }

    downloadCSV(income, expenses, receivables) {
        // Income CSV
        let csv = 'TIPE,DESKRIPSI,SUMBER/KATEGORI,TANGGAL,JUMLAH\n';
        income.forEach(i => {
            csv += `Pemasukan,${this.escapeCsv(i.description)},${this.escapeCsv(i.source)},${i.date},${i.amount}\n`;
        });
        expenses.forEach(e => {
            csv += `Pengeluaran,${this.escapeCsv(e.description)},${this.escapeCsv(e.category)},${e.date},${e.amount}\n`;
        });
        receivables.forEach(r => {
            csv += `Piutang,${this.escapeCsv(r.description)} (${this.escapeCsv(r.client)}),${r.status},${r.dueDate},${r.amount}\n`;
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omahsop-laporan-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Laporan CSV berhasil diunduh!', 'success');
    }

    downloadExcel(income, expenses, receivables) {
        if (typeof XLSX === 'undefined') {
            this.showToast('Library Excel belum dimuat. Coba refresh halaman.', 'error');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Income sheet
            const incomeData = income.map(i => ({
                Tipe: 'Pemasukan',
                Deskripsi: i.description,
                Sumber: i.source,
                Tanggal: i.date,
                Jumlah: i.amount
            }));
            const ws1 = XLSX.utils.json_to_sheet(incomeData);
            XLSX.utils.book_append_sheet(wb, ws1, 'Pemasukan');

            // Expenses sheet
            const expenseData = expenses.map(e => ({
                Tipe: 'Pengeluaran',
                Deskripsi: e.description,
                Kategori: e.category,
                Tanggal: e.date,
                Jumlah: e.amount
            }));
            const ws2 = XLSX.utils.json_to_sheet(expenseData);
            XLSX.utils.book_append_sheet(wb, ws2, 'Pengeluaran');

            // Receivables sheet
            const receivableData = receivables.map(r => ({
                Tipe: 'Piutang',
                Deskripsi: r.description,
                Peminjam: r.client,
                JatuhTempo: r.dueDate,
                Status: r.status,
                Jumlah: r.amount
            }));
            const ws3 = XLSX.utils.json_to_sheet(receivableData);
            XLSX.utils.book_append_sheet(wb, ws3, 'Piutang');

            // Summary sheet
            const dashboard = DB.getDashboardData();
            const summaryData = [
                { Metrik: 'Total Pemasukan', Nilai: dashboard.totalIncome },
                { Metrik: 'Total Pengeluaran', Nilai: dashboard.totalExpenses },
                { Metrik: 'Total Saldo', Nilai: dashboard.totalBalance },
                { Metrik: 'Piutang Tertunda', Nilai: dashboard.pendingReceivables },
                { Metrik: 'Piutang Lunas', Nilai: dashboard.paidReceivables },
                { Metrik: 'Total Data Pemasukan', Nilai: income.length },
                { Metrik: 'Total Data Pengeluaran', Nilai: expenses.length },
                { Metrik: 'Total Data Piutang', Nilai: receivables.length }
            ];
            const ws4 = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, ws4, 'Ringkasan');

            // Auto-fit column widths
            [ws1, ws2, ws3, ws4].forEach(ws => {
                const colWidths = [];
                const range = XLSX.utils.decode_range(ws['!ref']);
                for (let C = range.s.c; C <= range.e.c; C++) {
                    let max = 10;
                    for (let R = range.s.r; R <= range.e.r; R++) {
                        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                        if (cell && cell.v) {
                            max = Math.max(max, String(cell.v).length + 2);
                        }
                    }
                    colWidths.push({ wch: Math.min(max, 40) });
                }
                ws['!cols'] = colWidths;
            });

            XLSX.writeFile(wb, `omahsop-laporan-${new Date().toISOString().split('T')[0]}.xlsx`);
            this.showToast('Laporan Excel berhasil diunduh!', 'success');

        } catch (err) {
            console.error('Excel error:', err);
            this.showToast('Gagal membuat Excel: ' + err.message, 'error');
        }
    }

    escapeCsv(str) {
        if (!str) return '';
        str = String(str);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    // ============ Notifications ============
    setupNotifications() {
        const notifBtn = document.getElementById('notificationBtn');

        notifBtn.addEventListener('click', () => {
            this.showNotificationPanel();
        });

        // Check permission on init
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                this.scheduleReminderCheck();
            }
        }
    }

    requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Browser kamu tidak mendukung notifikasi', 'error');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.scheduleReminderCheck();
            this.showToast('Notifikasi sudah aktif', 'success');
            return true;
        }

        if (Notification.permission === 'denied') {
            this.showToast('Izin notifikasi ditolak. Aktifkan di pengaturan browser.', 'error');
            return false;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                this.scheduleReminderCheck();
                this.showToast('Notifikasi berhasil diaktifkan! 🔔', 'success');
                // Send test notification
                this.sendNotification('Omah Sop', 'Notifikasi berhasil diaktifkan! Kami akan mengingatkan piutang yang jatuh tempo.');
                return true;
            } else {
                this.showToast('Izin notifikasi ditolak', 'error');
                return false;
            }
        });
    }

    sendNotification(title, body, icon = 'icons/icon-192.png') {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        try {
            const notif = new Notification(title, {
                body: body,
                icon: icon,
                badge: 'icons/icon-72.png',
                vibrate: [200, 100, 200],
                tag: 'omahsop-notification',
                renotify: true,
                silent: false
            });

            notif.onclick = () => {
                window.focus();
                if (this.currentPage !== 'receivables') {
                    this.switchPage('receivables');
                }
                notif.close();
            };

            setTimeout(() => notif.close(), 8000);
            return notif;
        } catch (err) {
            console.warn('Notification error:', err);
        }
    }

    scheduleReminderCheck() {
        // Check every 5 minutes for overdue reminders
        this.checkReminders();
        setInterval(() => this.checkReminders(), 5 * 60 * 1000);
    }

    checkReminders() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const receivables = DB.getReceivables();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Check overdue
        const overdue = receivables.filter(r => r.status === 'overdue');
        if (overdue.length > 0) {
            const total = overdue.reduce((s, r) => s + r.amount, 0);
            this.sendNotification(
                '⚠️ Piutang Jatuh Tempo',
                `${overdue.length} piutang menunggak! Total: ${DB.formatCurrency(total)}. Segera tagih!`
            );
        }

        // Check due today
        const dueToday = receivables.filter(r => r.dueDate === todayStr && r.status === 'pending');
        if (dueToday.length > 0) {
            const total = dueToday.reduce((s, r) => s + r.amount, 0);
            this.sendNotification(
                '📅 Piutang Jatuh Tempo Hari Ini',
                `${dueToday.length} piutang jatuh tempo hari ini! Total: ${DB.formatCurrency(total)}`
            );
        }

        // Daily summary (check if already sent today)
        const lastSummary = localStorage.getItem('omahsop_last_summary');
        if (lastSummary !== todayStr) {
            const income = DB.getIncome();
            const expenses = DB.getExpenses();
            const todayIncome = income.filter(i => i.date === todayStr).reduce((s, r) => s + r.amount, 0);
            const todayExpenses = expenses.filter(e => e.date === todayStr).reduce((s, r) => s + r.amount, 0);

            if (todayIncome > 0 || todayExpenses > 0 || overdue.length > 0) {
                this.sendNotification(
                    '📊 Ringkasan Hari Ini',
                    `Pemasukan: ${DB.formatCurrency(todayIncome)} | Pengeluaran: ${DB.formatCurrency(todayExpenses)}${overdue.length > 0 ? ` | ${overdue.length} piutang menunggak` : ''}`
                );
                localStorage.setItem('omahsop_last_summary', todayStr);
            }
        }
    }

    showNotificationPanel() {
        // Request permission first if not granted
        if (!('Notification' in window)) {
            this.showToast('Browser tidak mendukung notifikasi', 'error');
            return;
        }

        if (Notification.permission === 'default') {
            this.requestNotificationPermission();
            return;
        }

        if (Notification.permission === 'denied') {
            this.showToast('Izin notifikasi ditolak. Aktifkan di pengaturan browser.', 'error');
            return;
        }

        // Show notification status
        const receivables = DB.getReceivables();
        const overdue = receivables.filter(r => r.status === 'overdue');
        const pending = receivables.filter(r => r.status === 'pending');

        let message = '🔔 Notifikasi Aktif\n\n';
        if (overdue.length > 0) {
            message += `⚠️ ${overdue.length} piutang jatuh tempo (${DB.formatCurrency(overdue.reduce((s,r) => s + r.amount, 0))})\n`;
        }
        if (pending.length > 0) {
            message += `📅 ${pending.length} piutang tertunda\n`;
        }
        message += `\nKami akan mengingatkan Anda secara otomatis.`;

        this.showToast(message, 'success');
    }

    // ============ Fingerprint / Biometric Login (WebAuthn) ============
    setupFingerprintLogin() {
        const bioBtn = document.getElementById('bioLoginBtn');
        const bioStatus = document.getElementById('bioStatus');
        const bioPanel = document.getElementById('login-bio');

        if (!bioBtn) return;

        // Check if WebAuthn is supported
        const isWebAuthnSupported = () => {
            return window.PublicKeyCredential !== undefined &&
                   typeof window.PublicKeyCredential === 'function';
        };

        if (!isWebAuthnSupported()) {
            bioStatus.textContent = 'Fingerprint tidak didukung di browser ini';
            bioBtn.disabled = true;
            return;
        }

        bioBtn.addEventListener('click', async () => {
            bioBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memeriksa...';
            bioBtn.disabled = true;

            try {
                // Check if we have a stored credential
                const storedCredentialId = localStorage.getItem('omahsop_webauthn_cred');

                if (!storedCredentialId) {
                    // Register new biometric credential
                    bioStatus.textContent = 'Daftarkan fingerprint...';
                    
                    const challenge = new Uint8Array(32);
                    window.crypto.getRandomValues(challenge);

                    const publicKeyCredentialCreationOptions = {
                        challenge: challenge,
                        rp: { name: 'Omah Sop', id: window.location.hostname },
                        user: {
                            id: new Uint8Array([1, 2, 3, 4]),
                            name: 'user@omahsop',
                            displayName: 'Omah Sop User'
                        },
                        pubKeyCredParams: [
                            { type: 'public-key', alg: -7 },
                            { type: 'public-key', alg: -257 }
                        ],
                        authenticatorSelection: {
                            authenticatorAttachment: 'platform',
                            userVerification: 'required',
                            residentKey: 'required'
                        },
                        timeout: 60000,
                        attestation: 'none'
                    };

                    const credential = await navigator.credentials.create({
                        publicKey: publicKeyCredentialCreationOptions
                    });

                    // Store credential ID
                    localStorage.setItem('omahsop_webauthn_cred', 
                        btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
                    localStorage.setItem('omahsop_webauthn_registered', 'true');

                    bioStatus.textContent = '✅ Fingerprint berhasil didaftarkan!';
                    this.showToast('Fingerprint berhasil didaftarkan! 🎉', 'success');

                    // Auto-login
                    setTimeout(() => this.completeLogin(), 1000);

                } else {
                    // Authenticate with existing credential
                    bioStatus.textContent = 'Sentuh sensor fingerprint...';

                    const challenge = new Uint8Array(32);
                    window.crypto.getRandomValues(challenge);

                    const credentialId = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));

                    const publicKeyCredentialRequestOptions = {
                        challenge: challenge,
                        allowCredentials: [{
                            id: credentialId,
                            type: 'public-key',
                            transports: ['internal', 'hybrid']
                        }],
                        userVerification: 'required',
                        timeout: 60000
                    };

                    const assertion = await navigator.credentials.get({
                        publicKey: publicKeyCredentialRequestOptions
                    });

                    if (assertion) {
                        bioStatus.textContent = '✅ Fingerprint terverifikasi!';
                        this.showToast('Fingerprint berhasil! Selamat datang! 👋', 'success');
                        setTimeout(() => this.completeLogin(), 800);
                    }
                }
            } catch (err) {
                console.warn('WebAuthn error:', err);
                bioStatus.textContent = '❌ Gagal: ' + (err.message || 'Perangkat tidak mendukung');
                this.showToast('Gagal verifikasi fingerprint: ' + (err.message || 'Coba lagi'), 'error');
            } finally {
                bioBtn.innerHTML = '<i class="fas fa-fingerprint"></i> Mulai Fingerprint';
                bioBtn.disabled = false;
            }
        });

        // Check if already registered
        if (localStorage.getItem('omahsop_webauthn_registered') === 'true') {
            bioStatus.textContent = 'Fingerprint sudah terdaftar. Sentuh sensor untuk masuk.';
            // Auto-trigger biometric login if they have it
            setTimeout(() => bioBtn.click(), 500);
        }
    }

    // ============ PIN & Account Login ============
    setupLogin() {
        const loginScreen = document.getElementById('login-screen');
        const registerScreen = document.getElementById('register-screen');
        
        // If hasSkippedLogin or has completed login before, hide login screen
        if (localStorage.getItem('omahsop_logged_in') === 'true' || 
            localStorage.getItem('omahsop_skip_login') === 'true') {
            loginScreen.style.display = 'none';
            return;
        }

        loginScreen.style.display = 'flex';

        // Login tabs switching
        document.querySelectorAll('.login-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.login-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`login-${tab.dataset.tab}`).classList.add('active');
                document.getElementById('loginError').textContent = '';
            });
        });

        // PIN Keypad
        let pinValue = '';
        const pinDots = document.querySelectorAll('.pin-dot');

        document.querySelectorAll('.pin-key').forEach(key => {
            key.addEventListener('click', () => {
                const val = key.dataset.value;
                
                if (val === 'clear') {
                    pinValue = pinValue.slice(0, -1);
                } else if (val === 'ok') {
                    if (pinValue.length === 6) {
                        this.verifyPIN(pinValue);
                    } else {
                        document.getElementById('loginError').textContent = 'PIN harus 6 digit';
                    }
                    return;
                } else {
                    if (pinValue.length < 6) {
                        pinValue += val;
                    }
                }

                // Update dots
                pinDots.forEach((dot, i) => {
                    dot.classList.toggle('filled', i < pinValue.length);
                });
                document.getElementById('loginError').textContent = '';
            });
        });

        // PIN Setup
        document.getElementById('pinSetupBtn').addEventListener('click', () => {
            const newPin = prompt('Masukkan PIN baru (6 digit):');
            if (newPin && newPin.length === 6 && /^\d{6}$/.test(newPin)) {
                localStorage.setItem('omahsop_pin', newPin);
                this.showToast('PIN berhasil diatur! 🔐', 'success');
            } else if (newPin) {
                this.showToast('PIN harus 6 digit angka', 'error');
            }
        });

        // Register link
        document.getElementById('registerBtn').addEventListener('click', () => {
            loginScreen.style.display = 'none';
            registerScreen.style.display = 'flex';
        });

        // Back to login
        document.getElementById('backToLoginBtn').addEventListener('click', () => {
            registerScreen.style.display = 'none';
            loginScreen.style.display = 'flex';
        });

        // Skip login
        document.getElementById('skipLoginBtn').addEventListener('click', () => {
            localStorage.setItem('omahsop_skip_login', 'true');
            this.completeLogin();
        });

        // Auto-login if PIN is set
        const storedPin = localStorage.getItem('omahsop_pin');
        if (storedPin) {
            document.querySelector('.login-desc').textContent = 'Masukkan PIN untuk membuka aplikasi';
        }
    }

    verifyPIN(enteredPin) {
        const storedPin = localStorage.getItem('omahsop_pin');
        
        if (!storedPin) {
            // First time - set this as the PIN
            localStorage.setItem('omahsop_pin', enteredPin);
            this.showToast('PIN berhasil dibuat! 🔐', 'success');
            this.completeLogin();
            return;
        }

        if (enteredPin === storedPin) {
            this.showToast('Selamat datang kembali! 👋', 'success');
            this.completeLogin();
        } else {
            document.getElementById('loginError').textContent = 'PIN salah! Coba lagi.';
            // Reset dots
            document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('filled'));
            pinValue = '';
        }
    }

    completeLogin() {
        localStorage.setItem('omahsop_logged_in', 'true');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('register-screen').style.display = 'none';
        document.body.style.overflow = '';
        
        // Request notification permission after login
        setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'default') {
                this.requestNotificationPermission();
            }
        }, 2000);
    }

    // ============ Account Login Handler (Supabase) ============
    handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!supabaseClient) {
            initSupabase();
        }

        if (supabaseClient) {
            supabaseClient.auth.signInWithPassword({ email, password })
                .then(({ data, error }) => {
                    if (error) {
                        document.getElementById('loginError').textContent = 'Gagal masuk: ' + error.message;
                    } else {
                        this.showToast('Berhasil masuk! 👋', 'success');
                        localStorage.setItem('omahsop_supabase_user', JSON.stringify(data.user));
                        this.completeLogin();
                    }
                });
        } else {
            document.getElementById('loginError').textContent = 'Koneksi ke server gagal. Coba lagi nanti.';
        }
    }

    handleRegister(event) {
        event.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        if (!supabaseClient) {
            initSupabase();
        }

        if (supabaseClient) {
            supabaseClient.auth.signUp({ email, password, options: { data: { full_name: name } } })
                .then(({ data, error }) => {
                    if (error) {
                        document.getElementById('registerError').textContent = 'Gagal daftar: ' + error.message;
                    } else {
                        this.showToast('Pendaftaran berhasil! Silakan cek email untuk verifikasi.', 'success');
                        document.getElementById('register-screen').style.display = 'none';
                        document.getElementById('login-screen').style.display = 'flex';
                    }
                });
        } else {
            document.getElementById('registerError').textContent = 'Koneksi ke server gagal. Coba lagi nanti.';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
const app = new OmahSopApp();
window.app = app;

// Expose functions for HTML onclick handlers
window.openModal = (type) => app.openModal(type);
window.closeModal = () => app.closeModal();
window.handleFormSubmit = (e) => app.handleFormSubmit(e);
window.filterTable = (type) => app.filterTable(type);
window.sortTable = (type, key) => app.sortTable(type, key);
window.handleLogin = (e) => app.handleLogin(e);
window.handleRegister = (e) => app.handleRegister(e);
