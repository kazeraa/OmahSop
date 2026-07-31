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
