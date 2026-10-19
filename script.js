/* ==========================================================================
   1. INITIAL STATE & CONSTANTS (12 DEFAULT MEMBERS)
   ========================================================================== */
const DEFAULT_MEMBERS = [
    "Andi", "Budi", "Citra", "Dewi", "Eko", "Farhan",
    "Gita", "Hendra", "Indah", "Joko", "Kartika", "Lukman"
];

let state = {
    members: [],
    transactions: [],
    settings: {
        scriptUrl: ""
    }
};

let deferredPWAInstallPrompt = null;

/* ==========================================================================
   2. APP INITIALIZATION & LOCALSTORAGE
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    loadState();
    initPWA();
    initIcons();
    setDefaultDates();
    renderAll();
});

function loadState() {
    const savedMembers = localStorage.getItem('kasflow_members');
    if (savedMembers) {
        state.members = JSON.parse(savedMembers);
    } else {
        state.members = [...DEFAULT_MEMBERS];
        saveMembersState();
    }

    const savedTx = localStorage.getItem('kasflow_transactions');
    if (savedTx) {
        state.transactions = JSON.parse(savedTx);
    } else {
        // Initial Sample Transactions
        state.transactions = [
            {
                id: 'TX-' + Date.now() + '-1',
                date: new Date().toISOString().split('T')[0],
                type: 'IURAN',
                member: 'Andi',
                amount: 50000,
                description: 'Iuran Kas Rutin Bulan Ini',
                image: null
            },
            {
                id: 'TX-' + Date.now() + '-2',
                date: new Date().toISOString().split('T')[0],
                type: 'MASUK',
                member: 'Budi',
                amount: 250000,
                description: 'Sponsor Kegiatan Kantor',
                image: null
            }
        ];
        saveTxState();
    }

    const savedSettings = localStorage.getItem('kasflow_settings');
    if (savedSettings) {
        state.settings = JSON.parse(savedSettings);
        document.getElementById('settingScriptUrl').value = state.settings.scriptUrl || '';
    }
}

function saveMembersState() {
    localStorage.setItem('kasflow_members', JSON.stringify(state.members));
}

function saveTxState() {
    localStorage.setItem('kasflow_transactions', JSON.stringify(state.transactions));
}

function saveSettingsState() {
    localStorage.setItem('kasflow_settings', JSON.stringify(state.settings));
}

function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('txDate').value = today;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('filterMonth').value = currentMonth;

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('iuranMonthLabel').innerText = monthNames[new Date().getMonth()] + ' ' + new Date().getFullYear();
}

/* ==========================================================================
   3. CORE RENDERING ENGINE
   ========================================================================== */
function renderAll() {
    renderMemberDropdowns();
    renderIuranTracker();
    renderTransactions();
    calculateAndRenderStats();
    renderChart();
    initIcons();
}

function renderMemberDropdowns() {
    const txMemberSelect = document.getElementById('txMember');
    const filterMemberSelect = document.getElementById('filterMember');

    const currentTxMember = txMemberSelect.value;
    const currentFilterMember = filterMemberSelect.value;

    txMemberSelect.innerHTML = state.members.map(m => `<option value="${m}">${m}</option>`).join('');
    
    filterMemberSelect.innerHTML = '<option value="ALL">Semua Anggota Tim</option>' + 
        state.members.map(m => `<option value="${m}">${m}</option>`).join('');

    if (currentTxMember && state.members.includes(currentTxMember)) txMemberSelect.value = currentTxMember;
    if (currentFilterMember) filterMemberSelect.value = currentFilterMember;

    // Render Members Manager List
    const membersListContainer = document.getElementById('membersManagerList');
    membersListContainer.innerHTML = state.members.map((m, idx) => `
        <div class="flex items-center justify-between p-2 rounded-xl glass-card text-xs">
            <span class="font-medium text-white">${idx + 1}. ${m}</span>
            <button onclick="handleDeleteMember('${m}')" class="text-rose-400 hover:text-rose-300 p-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');
}

/* Calculate Monthly Iuran Paid for 12 Members */
function renderIuranTracker() {
    const selectedMonth = document.getElementById('filterMonth').value || new Date().toISOString().slice(0, 7);
    
    // Find all IURAN transactions in selected month
    const monthIuranTx = state.transactions.filter(t => t.type === 'IURAN' && t.date.startsWith(selectedMonth));
    
    const paidMembersMap = {};
    monthIuranTx.forEach(t => {
        paidMembersMap[t.member] = true;
    });

    const gridContainer = document.getElementById('gridMembersIuran');
    let paidCount = 0;

    gridContainer.innerHTML = state.members.map(member => {
        const isPaid = paidMembersMap[member];
        if (isPaid) paidCount++;

        return `
            <div onclick="quickPayIuran('${member}')" class="p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                isPaid 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-neon-emerald' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-indigo-500/40'
            }">
                <div class="truncate">
                    <div class="text-xs font-semibold truncate text-white">${member}</div>
                    <div class="text-[10px] ${isPaid ? 'text-emerald-400 font-medium' : 'text-rose-400'}">
                        ${isPaid ? 'Lunas' : 'Belum Bayar'}
                    </div>
                </div>
                <div class="p-1 rounded-lg ${isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}">
                    <i data-lucide="${isPaid ? 'check-circle' : 'clock'}" class="w-3.5 h-3.5"></i>
                </div>
            </div>
        `;
    }).join('');

    // Update Progress Bar
    const totalMembers = state.members.length;
    const percentage = totalMembers > 0 ? Math.round((paidCount / totalMembers) * 100) : 0;
    
    document.getElementById('iuranProgressCount').innerText = `${paidCount}/${totalMembers} Lunas (${percentage}%)`;
    document.getElementById('iuranProgressBar').style.width = `${percentage}%`;
}

/* Calculate Financial Totals */
function calculateAndRenderStats() {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBonActive = 0;
    let activeBonCount = 0;

    state.transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'MASUK' || t.type === 'IURAN') {
            totalIncome += amt;
        } else if (t.type === 'KELUAR') {
            totalExpense += amt;
        } else if (t.type === 'KAS_BON') {
            if (!t.settled) {
                totalBonActive += (amt - (Number(t.settledAmount) || 0));
                activeBonCount++;
            }
        }
    });

    const netBalance = (totalIncome - totalExpense - totalBonActive);

    document.getElementById('statTotalBalance').innerText = formatRupiah(netBalance);
    document.getElementById('statTotalIncome').innerText = formatRupiah(totalIncome);
    document.getElementById('statTotalExpense').innerText = formatRupiah(totalExpense);
    document.getElementById('statTotalBon').innerText = formatRupiah(totalBonActive);
    document.getElementById('statBonCountBadge').innerText = `${activeBonCount} Aktif`;
    document.getElementById('chartCenterBalance').innerText = formatRupiah(netBalance);
}

/* Render Transactions Table */
function renderTransactions() {
    const filterSearch = document.getElementById('filterSearch').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;
    const filterMember = document.getElementById('filterMember').value;
    const filterMonth = document.getElementById('filterMonth').value;

    let filtered = state.transactions.filter(t => {
        const matchSearch = t.description.toLowerCase().includes(filterSearch) || (t.member && t.member.toLowerCase().includes(filterSearch));
        const matchType = (filterType === 'ALL') || (t.type === filterType);
        const matchMember = (filterMember === 'ALL') || (t.member === filterMember);
        const matchMonth = !filterMonth || t.date.startsWith(filterMonth);

        return matchSearch && matchType && matchMember && matchMonth;
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('transactionTableBody');
    const emptyState = document.getElementById('emptyTransactionsState');

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = filtered.map(t => {
        let typeBadge = '';
        let amountClass = '';
        let amountPrefix = '';

        if (t.type === 'IURAN') {
            typeBadge = `<span class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">Iuran</span>`;
            amountClass = 'text-emerald-400 font-bold';
            amountPrefix = '+';
        } else if (t.type === 'MASUK') {
            typeBadge = `<span class="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">Kas Masuk</span>`;
            amountClass = 'text-emerald-400 font-bold';
            amountPrefix = '+';
        } else if (t.type === 'KELUAR') {
            typeBadge = `<span class="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">Kas Keluar</span>`;
            amountClass = 'text-rose-400 font-bold';
            amountPrefix = '-';
        } else if (t.type === 'KAS_BON') {
            const isSettled = t.settled;
            typeBadge = `<span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">Kas Bon</span>`;
            amountClass = isSettled ? 'text-gray-400 line-through' : 'text-amber-400 font-bold';
            amountPrefix = '•';
        }

        const hasImage = !!t.image;

        return `
            <tr class="hover:bg-white/5 transition">
                <td class="p-3 font-mono text-gray-300 whitespace-nowrap">${formatDateShort(t.date)}</td>
                <td class="p-3">${typeBadge}</td>
                <td class="p-3 font-semibold text-white">${t.member || '-'}</td>
                <td class="p-3 text-gray-300 max-w-xs truncate" title="${t.description}">${t.description}</td>
                <td class="p-3 text-right ${amountClass} whitespace-nowrap">${amountPrefix} ${formatRupiah(t.amount)}</td>
                <td class="p-3 text-center whitespace-nowrap">
                    ${t.type === 'KAS_BON' ? `
                        <button onclick="openBonSettlementModal('${t.id}')" class="px-2 py-1 rounded-lg ${t.settled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'} text-[10px] font-semibold">
                            ${t.settled ? 'Lunas' : 'Cicil / Bayar'}
                        </button>
                    ` : (hasImage ? `
                        <button onclick="viewImage('${t.id}')" class="p-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30" title="Lihat Nota">
                            <i data-lucide="image" class="w-3.5 h-3.5 inline"></i>
                        </button>
                    ` : '<span class="text-gray-600">-</span>')}
                </td>
                <td class="p-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="openEditTransaction('${t.id}')" class="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10" title="Edit">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteTransaction('${t.id}')" class="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" title="Hapus">
                            <i data-lucide="trash" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    initIcons();
}

/* Canvas Custom Donut Chart Render */
function renderChart() {
    const canvas = document.getElementById('chartCashFlow');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = 200;
    canvas.height = 200;

    let totalIuran = 0, totalMasuk = 0, totalKeluar = 0, totalBon = 0;
    state.transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'IURAN') totalIuran += amt;
        else if (t.type === 'MASUK') totalMasuk += amt;
        else if (t.type === 'KELUAR') totalKeluar += amt;
        else if (t.type === 'KAS_BON' && !t.settled) totalBon += (amt - (Number(t.settledAmount) || 0));
    });

    const data = [totalIuran, totalMasuk, totalKeluar, totalBon];
    const colors = ['#6366f1', '#34d399', '#fb7185', '#fbbf24'];
    const totalSum = data.reduce((a, b) => a + b, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 75;

    if (totalSum === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 18;
        ctx.stroke();
        return;
    }

    let startAngle = -Math.PI / 2;

    data.forEach((val, idx) => {
        if (val <= 0) return;
        const sliceAngle = (val / totalSum) * 2 * Math.PI;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.strokeStyle = colors[idx];
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.stroke();

        startAngle += sliceAngle;
    });
}

/* ==========================================================================
   4. TRANSACTION HANDLERS
   ========================================================================== */
function toggleFormFieldsBasedOnType() {
    const type = document.getElementById('txType').value;
    const memberContainer = document.getElementById('containerMemberSelect');
    if (type === 'MASUK') {
        memberContainer.style.opacity = '0.5';
    } else {
        memberContainer.style.opacity = '1';
    }
}

function handleSaveTransaction(e) {
    e.preventDefault();

    const id = document.getElementById('txId').value;
    const type = document.getElementById('txType').value;
    const amount = Number(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value;
    const member = document.getElementById('txMember').value;
    const description = document.getElementById('txDescription').value;
    const image = document.getElementById('txImageData').value || null;

    if (id) {
        const idx = state.transactions.findIndex(t => t.id === id);
        if (idx !== -1) {
            state.transactions[idx] = {
                ...state.transactions[idx],
                type, amount, date, member, description, image
            };
        }
    } else {
        const newTx = {
            id: 'TX-' + Date.now(),
            date,
            type,
            member,
            amount,
            description,
            image,
            settled: false,
            settledAmount: 0
        };
        state.transactions.unshift(newTx);
    }

    saveTxState();
    closeModal('modalAddTransaction');
    renderAll();
    
    if (state.settings.scriptUrl) {
        triggerSheetSync();
    }
}

function openEditTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    document.getElementById('txId').value = tx.id;
    document.getElementById('txType').value = tx.type;
    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txDate').value = tx.date;
    document.getElementById('txMember').value = tx.member;
    document.getElementById('txDescription').value = tx.description;
    document.getElementById('txImageData').value = tx.image || '';

    if (tx.image) {
        document.getElementById('imagePreview').src = tx.image;
        document.getElementById('imagePreviewContainer').classList.remove('hidden');
    } else {
        removeImagePreview();
    }

    document.getElementById('modalAddTitle').innerText = 'Edit Transaksi Kas';
    openModal('modalAddTransaction');
}

function deleteTransaction(id) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveTxState();
        renderAll();
    }
}

function quickPayIuran(memberName) {
    const selectedMonth = document.getElementById('filterMonth').value || new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().split('T')[0];

    const existing = state.transactions.find(t => t.type === 'IURAN' && t.member === memberName && t.date.startsWith(selectedMonth));
    
    if (existing) {
        alert(`Iuran ${memberName} untuk bulan ini sudah terbayar.`);
        return;
    }

    const amountInput = prompt(`Input nominal Iuran Kas untuk ${memberName}:`, "50000");
    if (!amountInput) return;

    const newTx = {
        id: 'TX-' + Date.now(),
        date: today,
        type: 'IURAN',
        member: memberName,
        amount: Number(amountInput) || 50000,
        description: `Iuran Rutin Kas Bulan ${selectedMonth}`,
        image: null
    };

    state.transactions.unshift(newTx);
    saveTxState();
    renderAll();

    if (state.settings.scriptUrl) triggerSheetSync();
}

function openBonSettlementModal(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    const remaining = tx.amount - (Number(tx.settledAmount) || 0);

    document.getElementById('bonTxId').value = tx.id;
    document.getElementById('bonMemberName').innerText = `Anggota: ${tx.member}`;
    document.getElementById('bonRemainingAmount').innerText = formatRupiah(remaining);
    document.getElementById('bonDetailDesc').innerText = tx.description;
    document.getElementById('settlementAmount').value = remaining;
    
    openModal('modalBonSettlement');
}

function handleSaveSettlement(e) {
    e.preventDefault();
    const id = document.getElementById('bonTxId').value;
    const payAmount = Number(document.getElementById('settlementAmount').value);
    const note = document.getElementById('settlementNote').value;

    const txIdx = state.transactions.findIndex(t => t.id === id);
    if (txIdx !== -1) {
        const tx = state.transactions[txIdx];
        const currentSettled = Number(tx.settledAmount) || 0;
        const newSettled = currentSettled + payAmount;

        tx.settledAmount = newSettled;
        if (newSettled >= tx.amount) {
            tx.settled = true;
        }

        state.transactions.unshift({
            id: 'TX-' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            type: 'MASUK',
            member: tx.member,
            amount: payAmount,
            description: `Pelunasan Bon: ${note} (${tx.description})`,
            image: null
        });

        saveTxState();
        closeModal('modalBonSettlement');
        renderAll();
    }
}

/* ==========================================================================
   5. GOOGLE APPS SCRIPT SPREADSHEET INTEGRATION
   ========================================================================== */
async function triggerSheetSync() {
    const url = state.settings.scriptUrl;
    if (!url) {
        alert('Silakan masukkan URL Google Apps Script pada menu Pengaturan terlebih dahulu.');
        openModal('modalSettings');
        return;
    }

    const iconSync = document.getElementById('iconSyncHeader');
    if (iconSync) iconSync.classList.add('animate-spin');

    document.getElementById('syncStatusText').innerText = 'Syncing...';

    try {
        const payload = {
            transactions: state.transactions,
            members: state.members,
            timestamp: new Date().toISOString()
        };

        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        document.getElementById('syncStatusText').innerText = 'Synced to Sheet';
        document.getElementById('syncStatusBadge').className = 'inline-block w-2 h-2 rounded-full bg-emerald-400';
    } catch (err) {
        console.error('Sync Error:', err);
        document.getElementById('syncStatusText').innerText = 'Sync Offline';
        document.getElementById('syncStatusBadge').className = 'inline-block w-2 h-2 rounded-full bg-rose-400';
    } font-medium {
        if (iconSync) iconSync.classList.remove('animate-spin');
    }
}

function saveSettings() {
    const url = document.getElementById('settingScriptUrl').value.trim();
    state.settings.scriptUrl = url;
    saveSettingsState();
    closeModal('modalSettings');
    alert('Pengaturan Google Apps Script berhasil disimpan!');
}

function copyGASScript() {
    const scriptCode = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var transactions = data.transactions;
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID Transaksi", "Tanggal", "Jenis", "Anggota", "Nominal", "Keterangan", "Status Bon"]);
    }
    
    sheet.getRange(2, 1, sheet.getLastRow() + 1, 7).clearContent();
    
    transactions.forEach(function(t) {
      sheet.appendRow([
        t.id,
        t.date,
        t.type,
        t.member || '-',
        t.amount,
        t.description,
        t.settled ? "Lunas" : "Aktif"
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
    
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = scriptCode;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextArea);
    
    alert('Script Code.gs berhasil dicopy ke clipboard!');
}

/* ==========================================================================
   6. MEMBER MANAGEMENT
   ========================================================================== */
function handleAddMember(e) {
    e.preventDefault();
    const input = document.getElementById('newMemberName');
    const name = input.value.trim();

    if (name && !state.members.includes(name)) {
        state.members.push(name);
        saveMembersState();
        input.value = '';
        renderAll();
    }
}

function handleDeleteMember(name) {
    if (confirm(`Hapus ${name} dari daftar anggota tim?`)) {
        state.members = state.members.filter(m => m !== name);
        saveMembersState();
        renderAll();
    }
}

/* ==========================================================================
   7. EXPORT TO CSV & BACKUP/RESTORE
   ========================================================================== */
function exportToCSV() {
    if (state.transactions.length === 0) {
        alert('Tidak ada data transaksi untuk diekspor.');
        return;
    }

    let csv = 'ID,Tanggal,Jenis,Anggota,Nominal,Keterangan,Status_Bon\n';
    state.transactions.forEach(t => {
        const desc = `"${t.description.replace(/"/g, '""')}"`;
        csv += `${t.id},${t.date},${t.type},"${t.member || '-'}",${t.amount},${desc},${t.settled ? 'Lunas' : 'Belum Lunas'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `KasFlow_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportJSONBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `KasFlow_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importJSONBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (imported.members && imported.transactions) {
                state = imported;
                saveMembersState();
                saveTxState();
                if (imported.settings) saveSettingsState();
                renderAll();
                alert('Data Kas berhasil dipulihkan dari file JSON!');
            } else {
                alert('Format file JSON backup tidak valid.');
            }
        } catch(err) {
            alert('Gagal membaca file JSON: ' + err.message);
        }
    };
    reader.readAsText(file);
}

/* ==========================================================================
   8. IMAGE HANDLING & PREVIEW
   ========================================================================== */
function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        document.getElementById('txImageData').value = evt.target.result;
        document.getElementById('imagePreview').src = evt.target.result;
        document.getElementById('imagePreviewContainer').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImagePreview() {
    document.getElementById('txImageData').value = '';
    document.getElementById('txImageInput').value = '';
    document.getElementById('imagePreviewContainer').classList.add('hidden');
}

function viewImage(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (tx && tx.image) {
        document.getElementById('fullSizeImage').src = tx.image;
        openModal('modalViewImage');
    }
}

/* ==========================================================================
   9. PWA SERVICE WORKER & MANIFEST REGISTER
   ========================================================================== */
function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker Registered:', reg))
            .catch(err => console.error('SW Register Failed:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPWAInstallPrompt = e;
        document.getElementById('pwaInstallBanner').classList.remove('hidden');
    });
}

function installPWAApp() {
    if (deferredPWAInstallPrompt) {
        deferredPWAInstallPrompt.prompt();
        deferredPWAInstallPrompt.userChoice.then(() => {
            deferredPWAInstallPrompt = null;
            document.getElementById('pwaInstallBanner').classList.add('hidden');
        });
    }
}

function dismissPWAInstall() {
    document.getElementById('pwaInstallBanner').classList.add('hidden');
}

/* ==========================================================================
   10. UTILITIES & MODALS
   ========================================================================== */
function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
}

function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
    }
    return dateStr;
}

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    if (modalId === 'modalAddTransaction' && !document.getElementById('txId').value) {
        document.getElementById('formTransaction').reset();
        document.getElementById('txId').value = '';
        document.getElementById('modalAddTitle').innerText = 'Catat Transaksi Uang Kas';
        setDefaultDates();
        removeImagePreview();
        toggleFormFieldsBasedOnType();
    }
    initIcons();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}