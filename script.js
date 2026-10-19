// State Management & Constants
const STORAGE_KEY = 'WS_KAS_DATA_V2';
const GAS_URL_KEY = 'WS_KAS_GAS_URL';

// 12 Nama Anggota WS Kas
const INITIAL_MEMBERS = [
    "Aldi", "Andi", "Anweri", "Aqiqi", 
    "Febrian", "Huda", "Muiz", "Prahan", 
    "Rayhan", "Rizal", "Saka", "Soedar"
];

let appState = {
    members: [],
    transactions: [],
    gasUrl: ''
};

let deferredPrompt = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initUI();
    renderAll();
    setupPWA();
    checkNetwork();
});

// Load State from LocalStorage
function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appState = JSON.parse(saved);
    } else {
        appState.members = [...INITIAL_MEMBERS];
        saveState();
    }
    appState.gasUrl = localStorage.getItem(GAS_URL_KEY) || '';
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

// UI Initializers & Event Listeners
function initUI() {
    // Set default datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('form-date').value = now.toISOString().slice(0, 16);

    // Form Type Selector
    const typeBtns = document.querySelectorAll('.type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('form-type').value = btn.dataset.type;
        });
    });

    // Form Submit
    document.getElementById('trx-form').addEventListener('submit', handleAddTrx);

    // Modals
    document.getElementById('btn-settings').addEventListener('click', () => openModal('modal-settings'));
    document.getElementById('btn-manage-members').addEventListener('click', () => openModal('modal-members'));
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // Settings actions
    document.getElementById('btn-save-gas').addEventListener('click', () => {
        const url = document.getElementById('gas-url').value.trim();
        localStorage.setItem(GAS_URL_KEY, url);
        appState.gasUrl = url;
        showToast('URL Google Apps Script disimpan!');
        closeModal('modal-settings');
    });

    document.getElementById('btn-copy-gas').addEventListener('click', copyGASCode);
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-print-report').addEventListener('click', () => window.print());
    document.getElementById('btn-clear-data').addEventListener('click', clearData);
    document.getElementById('btn-add-member').addEventListener('click', handleAddMember);

    // Sync button
    document.getElementById('btn-sync').addEventListener('click', syncToGAS);

    // Filter & Search
    document.getElementById('filter-type').addEventListener('change', renderHistory);
    document.getElementById('search-input').addEventListener('input', renderHistory);

    // Network Status
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
}

// Render Functions
function renderAll() {
    renderMemberSelect();
    renderMemberPills();
    renderMemberManageList();
    renderDashboard();
    renderHistory();
    renderChart();
}

function renderMemberSelect() {
    const select = document.getElementById('form-member');
    select.innerHTML = '<option value="">-- Pilih Anggota --</option>';
    appState.members.forEach(m => {
        select.innerHTML += `<option value="${m}">${m}</option>`;
    });
}

function renderMemberPills() {
    const grid = document.getElementById('members-pills');
    grid.innerHTML = '';
    appState.members.forEach(m => {
        grid.innerHTML += `<div class="member-pill">${m}</div>`;
    });
}

function renderMemberManageList() {
    const list = document.getElementById('member-manage-list');
    list.innerHTML = '';
    appState.members.forEach((m, idx) => {
        list.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05)">
                <span>${m}</span>
                <button onclick="removeMember(${idx})" class="btn-icon-bg" style="color:var(--expense)"><i class="fa-solid fa-trash"></i></button>
            </li>
        `;
    });
}

function renderDashboard() {
    let income = 0, expense = 0, bon = 0;

    appState.transactions.forEach(t => {
        const amt = parseFloat(t.amount);
        if (t.type === 'pemasukan') income += amt;
        if (t.type === 'pengeluaran') expense += amt;
        if (t.type === 'kasbon') bon += amt;
    });

    const balance = income - expense;

    document.getElementById('total-balance').textContent = formatRp(balance);
    document.getElementById('total-income').textContent = formatRp(income);
    document.getElementById('total-expense').textContent = formatRp(expense);
    document.getElementById('total-bon').textContent = formatRp(bon);
}

function renderHistory() {
    const list = document.getElementById('trx-list');
    const filter = document.getElementById('filter-type').value;
    const query = document.getElementById('search-input').value.toLowerCase();

    list.innerHTML = '';

    const filtered = appState.transactions.filter(t => {
        const matchType = filter === 'all' || t.type === filter;
        const matchQuery = t.member.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query);
        return matchType && matchQuery;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:0.8rem; padding: 20px;">Belum ada riwayat transaksi.</p>`;
        return;
    }

    filtered.slice().reverse().forEach((t) => {
        const iconMap = {
            pemasukan: 'fa-arrow-down-left',
            pengeluaran: 'fa-arrow-up-right',
            kasbon: 'fa-handshake'
        };

        const prefix = t.type === 'pemasukan' ? '+' : '-';

        list.innerHTML += `
            <div class="trx-item ${t.type}">
                <div class="trx-info">
                    <div class="trx-icon">
                        <i class="fa-solid ${iconMap[t.type]}"></i>
                    </div>
                    <div class="trx-details">
                        <strong>${t.desc}</strong>
                        <span>${t.member} • ${formatDate(t.date)}</span>
                    </div>
                </div>
                <div class="trx-amount">
                    ${prefix}${formatRp(t.amount)}
                </div>
            </div>
        `;
    });
}

// Simple HTML5 Canvas Donut Chart
function renderChart() {
    const canvas = document.getElementById('kas-donut-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let income = 0, expense = 0, bon = 0;
    appState.transactions.forEach(t => {
        const amt = parseFloat(t.amount);
        if (t.type === 'pemasukan') income += amt;
        if (t.type === 'pengeluaran') expense += amt;
        if (t.type === 'kasbon') bon += amt;
    });

    const total = income + expense + bon;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
        ctx.beginPath();
        ctx.arc(110, 110, 80, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 20;
        ctx.stroke();
        return;
    }

    const slices = [
        { value: income, color: '#10b981' },
        { value: expense, color: '#ef4444' },
        { value: bon, color: '#f59e0b' }
    ];

    let startAngle = -0.5 * Math.PI;

    slices.forEach(slice => {
        if (slice.value === 0) return;
        const sliceAngle = (slice.value / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(110, 110, 75, startAngle, startAngle + sliceAngle);
        ctx.strokeStyle = slice.color;
        ctx.lineWidth = 22;
        ctx.stroke();
        startAngle += sliceAngle;
    });
}

// Handlers
function handleAddTrx(e) {
    e.preventDefault();
    const type = document.getElementById('form-type').value;
    const member = document.getElementById('form-member').value;
    const amount = parseFloat(document.getElementById('form-amount').value);
    const desc = document.getElementById('form-desc').value.trim();
    const date = document.getElementById('form-date').value;

    if (!member || !amount || !desc) {
        showToast('Isi semua formulir dengan benar!');
        return;
    }

    const newTrx = {
        id: 'TRX-' + Date.now(),
        type,
        member,
        amount,
        desc,
        date
    };

    appState.transactions.push(newTrx);
    saveState();
    renderAll();

    // Reset Form
    document.getElementById('form-amount').value = '';
    document.getElementById('form-desc').value = '';
    showToast('Transaksi berhasil disimpan!');

    // Auto Sync if GAS URL is set
    if (appState.gasUrl) {
        syncToGAS();
    }
}

function handleAddMember() {
    const input = document.getElementById('new-member-name');
    const name = input.value.trim();
    if (name && !appState.members.includes(name)) {
        appState.members.push(name);
        saveState();
        renderAll();
        input.value = '';
        showToast(`Anggota ${name} ditambahkan!`);
    }
}

function removeMember(idx) {
    const name = appState.members[idx];
    if (confirm(`Hapus ${name} dari daftar anggota?`)) {
        appState.members.splice(idx, 1);
        saveState();
        renderAll();
        showToast(`Anggota ${name} dihapus.`);
    }
}

// Utilities
function formatRp(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// PWA Setup
function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(() => {
            console.log('Service Worker Registered');
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('pwa-install-banner').classList.remove('hidden');
    });

    document.getElementById('btn-install-pwa').addEventListener('click', () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => {
                deferredPrompt = null;
                document.getElementById('pwa-install-banner').classList.add('hidden');
            });
        }
    });

    document.getElementById('btn-dismiss-pwa').addEventListener('click', () => {
        document.getElementById('pwa-install-banner').classList.add('hidden');
    });
}

function checkNetwork() {
    updateNetworkStatus();
}

function updateNetworkStatus() {
    const badge = document.getElementById('net-status');
    const text = document.getElementById('net-text');
    if (navigator.onLine) {
        badge.className = 'status-badge online';
        text.textContent = 'Online';
    } else {
        badge.className = 'status-badge offline';
        text.textContent = 'Offline';
    }
}

// Sync with Google Spreadsheet
function syncToGAS() {
    if (!appState.gasUrl) {
        showToast('Atur URL Google Apps Script di Pengaturan dulu!');
        openModal('modal-settings');
        return;
    }

    showToast('Mengirim data ke Google Sheets...');
    fetch(appState.gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState)
    })
    .then(() => {
        showToast('Selesai! Data disinkronkan ke Spreadsheet.');
    })
    .catch(err => {
        console.error(err);
        showToast('Gagal sinkron. Cek koneksi!');
    });
}

// Copy GAS Apps Script Code
function copyGASCode() {
    const code = `
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  // Clear and rewrite headers
  sheet.clear();
  sheet.appendRow(["ID Transaksi", "Jenis", "Anggota", "Jumlah (Rp)", "Keterangan", "Tanggal"]);
  
  data.transactions.forEach(function(t) {
    sheet.appendRow([t.id, t.type, t.member, t.amount, t.desc, t.date]);
  });
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
    `.trim();

    navigator.clipboard.writeText(code);
    showToast('Kode Google Apps Script berhasil disalin!');
}

// Export CSV
function exportCSV() {
    let csv = 'ID,Jenis,Anggota,Jumlah,Keterangan,Tanggal\n';
    appState.transactions.forEach(t => {
        csv += `"${t.id}","${t.type}","${t.member}",${t.amount},"${t.desc}","${t.date}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WS_Kas_Report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

function clearData() {
    if (confirm('Apakah Anda yakin ingin mereset semua data lokal?')) {
        localStorage.removeItem(STORAGE_KEY);
        appState.members = [...INITIAL_MEMBERS];
        appState.transactions = [];
        saveState();
        renderAll();
        showToast('Data berhasil di-reset!');
        closeModal('modal-settings');
    }
}
