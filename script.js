let userData = JSON.parse(localStorage.getItem('erp_user')) || null;
let products = JSON.parse(localStorage.getItem('erp_products')) || [];
let deletedProducts = JSON.parse(localStorage.getItem('erp_deleted')) || [];
let invoices = JSON.parse(localStorage.getItem('erp_invoices')) || [];
let purchases = JSON.parse(localStorage.getItem('erp_purchases')) || [];
let salesReturns = JSON.parse(localStorage.getItem('erp_sales_returns')) || [];
let purchaseReturns = JSON.parse(localStorage.getItem('erp_purchase_returns')) || [];
let employees = JSON.parse(localStorage.getItem('erp_employees')) || [];
let attendanceDB = JSON.parse(localStorage.getItem('erp_attendance')) || {};
let treasuryDB = JSON.parse(localStorage.getItem('erp_treasury')) || { balance: 0, transactions: [] };
let editingInvoiceIndex = -1;
let editingPurchaseIndex = -1;
let editingEmployeeId = null;
let currentSection = 'dashboard';
let charts = {};
let purchaseItems = [];
let saleItems = [];
let selectedSaleProduct = null;
function formatNumber(num) {
if (num === null || num === undefined || isNaN(num)) return '0.00';
return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function renderLoginUI() {
const container = document.getElementById('loginContainer');
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
loginPage.style.display = 'flex';
mainApp.classList.remove('visible');
setTimeout(() => { mainApp.style.display = 'none'; }, 500);
const isRegistered = userData && userData.username && userData.password;
if (isRegistered) {
container.innerHTML = `
<h2>تسجيل الدخول</h2>
<div class="profile-preview"><img src="${userData.image || ''}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-user\\'></i>'" /></div>
<input type="text" id="loginUser" class="login-input" value="${userData.username}" readonly />
<input type="password" id="loginPass" class="login-input" placeholder="كلمة المرور" />
<button id="btnLogin" class="login-btn">دخول</button>
<p id="loginMsg" class="login-msg"></p>
`;
document.getElementById('btnLogin').onclick = () => {
const pass = document.getElementById('loginPass').value;
const msg = document.getElementById('loginMsg');
if (!pass) { msg.textContent = "أدخل كلمة المرور"; msg.style.display = 'block'; return; }
if (pass === userData.password) enterApp();
else { msg.textContent = "كلمة المرور غير صحيحة!"; msg.style.display = 'block'; }
};
} else {
container.innerHTML = `
<h2>إنشاء حساب جديد</h2>
<div class="profile-preview" id="regPreview"><i class="fas fa-user"></i></div>
<input type="text" id="regUser" class="login-input" placeholder="اسم المستخدم" />
<input type="password" id="regPass" class="login-input" placeholder="كلمة المرور" />
<input type="password" id="regConfirmPass" class="login-input" placeholder="تأكيد كلمة المرور" />
<input type="file" id="regImage" class="login-input" accept="image/*" />
<button id="btnRegister" class="login-btn">تسجيل</button>
<p id="regMsg" class="login-msg"></p>
`;
document.getElementById('regImage').addEventListener('change', function(e) {
const file = e.target.files[0];
if (file) {
const reader = new FileReader();
reader.onload = (evt) => { document.getElementById('regPreview').innerHTML = `<img src="${evt.target.result}" />`; };
reader.readAsDataURL(file);
}
});
document.getElementById('btnRegister').onclick = () => {
const user = document.getElementById('regUser').value.trim();
const pass = document.getElementById('regPass').value;
const confirmPass = document.getElementById('regConfirmPass').value;
const msg = document.getElementById('regMsg');
if (!user) { msg.textContent = "أدخل اسم المستخدم"; msg.style.display = 'block'; return; }
if (!pass) { msg.textContent = "أدخل كلمة المرور"; msg.style.display = 'block'; return; }
if (pass !== confirmPass) { msg.textContent = "كلمة المرور غير متطابقة"; msg.style.display = 'block'; return; }
const imgInput = document.getElementById('regImage');
if (imgInput.files && imgInput.files[0]) {
const reader = new FileReader();
reader.onload = (evt) => {
userData = { username: user, password: pass, image: evt.target.result };
localStorage.setItem('erp_user', JSON.stringify(userData));
enterApp();
};
reader.readAsDataURL(imgInput.files[0]);
} else {
userData = { username: user, password: pass, image: '' };
localStorage.setItem('erp_user', JSON.stringify(userData));
enterApp();
}
};
}
}
function enterApp() {
document.getElementById('loginPage').style.display = 'none';
const mainApp = document.getElementById('mainApp');
mainApp.style.display = 'flex';
void mainApp.offsetWidth;
mainApp.classList.add('visible');
initApp();
}
function initApp() {
document.getElementById('menuUsername').textContent = formatName(userData.username);
document.getElementById('settingsUsername').textContent = formatName(userData.username);
if (userData.image) {
document.getElementById('menuProfileImg').src = userData.image;
document.getElementById('settingsProfileImg').src = userData.image;
}
const today = new Date().toISOString().split('T')[0];
document.getElementById('purchaseInvoiceDate').value = today;
document.getElementById('invoiceDate').value = today;
renderAll();
loadReturnProducts();
renderEmployees();
renderInventory();
renderTreasury();
const now = new Date();
document.getElementById('attYear').value = now.getFullYear();
document.getElementById('attMonth').value = now.getMonth();
setTimeout(() => { updateDashboardCharts(); }, 100);
}
function formatName(name) {
if (!name) return '';
return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
document.querySelectorAll('.menu a[data-section]').forEach(link => {
link.addEventListener('click', function(e) {
e.preventDefault();
document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
this.classList.add('active');
const sectionId = this.getAttribute('data-section');
document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
const target = document.getElementById(sectionId);
if (target) {
target.classList.add('active');
currentSection = sectionId;
if (sectionId === 'treasury') renderTreasury();
else if (sectionId === 'dashboard') { renderDashboardStats(); updateDashboardCharts(); }
else if (sectionId === 'inventory') renderInventory();
else if (sectionId === 'employees') renderEmployees();
else if (sectionId === 'attendance') loadAttendanceGrid();
}
});
});
document.getElementById('logoutBtn').addEventListener('click', e => {
e.preventDefault();
renderLoginUI();
});
function switchTab(section, tabName) {
document.querySelectorAll(`#${section} .sub-tab`).forEach(b => b.classList.remove('active'));
document.querySelectorAll(`#${section} .sub-content`).forEach(c => c.classList.remove('active'));
event.target.classList.add('active');
document.getElementById(`${section}-${tabName}`).classList.add('active');
}
function openIncomeModal() {
document.getElementById('incomeModal').classList.add('active');
['incomeAmount', 'incomeDesc', 'incomePayer', 'incomeReceiver'].forEach(id => document.getElementById(id).value = '');
document.getElementById('incomeAmount').focus();
}
function closeIncomeModal() { document.getElementById('incomeModal').classList.remove('active'); }
function openExpenseModal() {
document.getElementById('expenseModal').classList.add('active');
['expenseAmount', 'expenseDesc', 'expensePayer', 'expenseReceiver'].forEach(id => document.getElementById(id).value = '');
document.getElementById('expenseAmount').focus();
}
function closeExpenseModal() { document.getElementById('expenseModal').classList.remove('active'); }
function submitIncome(e) {
e.preventDefault();
const amount = parseFloat(document.getElementById('incomeAmount').value);
const desc = document.getElementById('incomeDesc').value.trim();
const payer = document.getElementById('incomePayer').value.trim();
const receiver = document.getElementById('incomeReceiver').value.trim();
if (isNaN(amount) || amount <= 0) { alert('مبلغ غير صحيح'); return; }
addTreasuryTransaction('in', amount, desc || 'إيداع', payer || '-', receiver || '-', 'وارد عام', true);
closeIncomeModal();
showSuccessMessage('وارد', amount, treasuryDB.balance);
renderTreasury();
renderDashboardStats();
updateDashboardCharts();
}
function submitExpense(e) {
e.preventDefault();
const amount = parseFloat(document.getElementById('expenseAmount').value);
const desc = document.getElementById('expenseDesc').value.trim();
const payer = document.getElementById('expensePayer').value.trim();
const receiver = document.getElementById('expenseReceiver').value.trim();
const category = document.querySelector('input[name="expenseCategory"]:checked').value;
if (isNaN(amount) || amount <= 0) { alert('مبلغ غير صحيح'); return; }
if (treasuryDB.balance < amount) { alert(`رصيد غير كافي (${formatNumber(treasuryDB.balance)})`); return; }
addTreasuryTransaction('out', amount, desc || 'سحب', payer || '-', receiver || '-', category, true);
closeExpenseModal();
showSuccessMessage('صادر', amount, treasuryDB.balance);
renderTreasury();
renderDashboardStats();
updateDashboardCharts();
}
function showSuccessMessage(type, amount, balance) {
const msg = document.getElementById('successMessage');
document.getElementById('successTitle').textContent = type === 'وارد' ? 'تم الإيداع' : 'تم الصرف';
document.getElementById('successText').textContent = type === 'وارد' ? 'تمت الإضافة للخزينة' : 'تم الخصم من الخزينة';
document.getElementById('successAmount').textContent = formatNumber(amount) + ' ج.م';
document.getElementById('successBalance').textContent = 'الرصيد: ' + formatNumber(balance) + ' ج.م';
msg.classList.add('active');
setTimeout(() => msg.classList.remove('active'), 2500);
}
document.getElementById('incomeModal').addEventListener('click', e => { if (e.target.id === 'incomeModal') closeIncomeModal(); });
document.getElementById('expenseModal').addEventListener('click', e => { if (e.target.id === 'expenseModal') closeExpenseModal(); });
function addTreasuryTransaction(type, amount, desc, payer, receiver, category, auto = false) {
const now = new Date().toLocaleDateString('ar-EG');
const isIncome = type === 'in';
if (isIncome) treasuryDB.balance += amount; else treasuryDB.balance -= amount;
treasuryDB.transactions.unshift({
date: now, type: isIncome ? 'وارد' : 'صادر', desc: desc || 'حركة يدوية',
category: category || 'عام', payer: payer || '-', receiver: receiver || '-', amount: amount, balance: treasuryDB.balance
});
saveData();
return true;
}
function renderTreasury() {
document.getElementById('treasuryBalanceBig').innerText = formatNumber(treasuryDB.balance);
document.getElementById('dashTreasury').innerText = formatNumber(treasuryDB.balance);
let income = 0, expense = 0;
const tbody = document.getElementById('treasuryLog');
tbody.innerHTML = '';
treasuryDB.transactions.forEach(log => {
if (log.type === 'وارد') income += log.amount; else expense += log.amount;
const row = `<tr>
<td>${log.date}</td>
<td style="color:${log.type==='وارد'?'var(--success)':'var(--danger)'};font-weight:bold;"><i class="fas fa-${log.type==='وارد'?'arrow-down':'arrow-up'}"></i> ${log.type}</td>
<td>${log.desc}</td><td>${log.category || 'عام'}</td><td>${log.payer}</td><td>${log.receiver}</td>
<td style="color:${log.type==='وارد'?'var(--success)':'var(--danger)'};font-weight:bold;">${log.type==='وارد'?'+':'-'}${formatNumber(log.amount)}</td>
<td>${formatNumber(log.balance)}</td></tr>`;
tbody.innerHTML += row;
});
document.getElementById('treasuryIncome').innerText = formatNumber(income);
document.getElementById('treasuryExpense').innerText = formatNumber(expense);
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
document.getElementById('loadAttendanceBtn').addEventListener('click', loadAttendanceGrid);
function loadAttendanceGrid() {
const year = parseInt(document.getElementById('attYear').value);
const month = parseInt(document.getElementById('attMonth').value);
const days = getDaysInMonth(year, month);
let headHTML = '<tr><th>#</th><th>الموظف</th>';
for (let i = 1; i <= days; i++) { headHTML += `<th>${i}</th>`; }
headHTML += '<th>خصم</th><th>الراتب</th></tr>';
document.getElementById('attHead').innerHTML = headHTML;
const tbody = document.getElementById('attBody');
tbody.innerHTML = '';
employees.forEach((emp, idx) => {
const key = `${emp.id}_${year}_${month}`;
const record = attendanceDB[key] || { days: [], deduction: 0, paid: false, finalSalary: 0 };
let rowHTML = `<tr><td>${idx + 1}</td><td style="text-align:right; font-weight:600;">${emp.name}</td>`;
for (let i = 1; i <= days; i++) {
const status = record.days[i];
let cls = 'day-cell';
if (status === 'present') cls += ' present'; else if (status === 'absent') cls += ' absent';
rowHTML += `<td class="${cls}" onclick="toggleAttendance(${emp.id},${year},${month},${i})">${i}</td>`;
}
rowHTML += `
<td><input type="number" class="month-deduction-input" id="ded_${emp.id}" value="${record.deduction}" ${record.paid ? 'disabled' : ''}></td>
<td class="month-action-cell">
<button class="pay-btn" onclick="deliverSalary(${emp.id},${year},${month})" ${record.paid ? 'disabled' : ''}>
${record.paid ? 'تم التسليم' : '<i class="fas fa-hand-holding-usd"></i> تسليم'}
</button>
</td></tr>`;
tbody.innerHTML += rowHTML;
});
}
function toggleAttendance(empId, year, month, day) {
const key = `${empId}_${year}_${month}`;
if (!attendanceDB[key]) attendanceDB[key] = { days: [], deduction: 0, paid: false, finalSalary: 0 };
const current = attendanceDB[key].days[day];
if (current === 'present') attendanceDB[key].days[day] = 'absent';
else if (current === 'absent') attendanceDB[key].days[day] = null;
else attendanceDB[key].days[day] = 'present';
localStorage.setItem('erp_attendance', JSON.stringify(attendanceDB));
loadAttendanceGrid();
}
function deliverSalary(empId, year, month) {
const emp = employees.find(e => e.id === empId);
if (!emp) return;
const key = `${empId}_${year}_${month}`;
const deduction = parseFloat(document.getElementById(`ded_${empId}`).value) || 0;
const addons = (emp.incentives || 0) + (emp.allowances || 0) + (emp.bonuses || 0);
const net = emp.salary + addons - deduction;
if (treasuryDB.balance < net) { alert('رصيد غير كافي'); return; }
addTreasuryTransaction('out', net, `راتب: ${emp.name}`, 'الإدارة', emp.name, 'مرتبات', true);
if (!attendanceDB[key]) attendanceDB[key] = { days: [], deduction: 0, paid: false };
attendanceDB[key].deduction = deduction;
attendanceDB[key].paid = true;
attendanceDB[key].finalSalary = net;
localStorage.setItem('erp_attendance', JSON.stringify(attendanceDB));
renderTreasury();
renderDashboardStats();
updateDashboardCharts();
loadAttendanceGrid();
alert(`تم صرف راتب ${emp.name}: ${formatNumber(net)} ج.م`);
}
function addPurchaseItem() {
const code = document.getElementById('newPurchaseProductCode').value.trim();
const name = document.getElementById('newPurchaseProductName').value.trim();
const unit = document.getElementById('newPurchaseUnit').value.trim();
const price = parseFloat(document.getElementById('newPurchasePrice').value);
const salePrice = parseFloat(document.getElementById('newPurchaseSalePrice').value);
const quantity = parseFloat(document.getElementById('newPurchaseQuantity').value);
const category = document.getElementById('newPurchaseCategory').value.trim();
if (!name || isNaN(price) || isNaN(salePrice) || !quantity || quantity <= 0) {
alert('بيانات المنتج غير مكتملة');
return;
}
purchaseItems.push({
id: Date.now(),
productCode: code,
title: name,
unit: unit || 'قطعة',
purchasePrice: price,
salePrice: salePrice,
quantity: quantity,
value: price * quantity,
category: category
});
renderPurchaseItems();
clearPurchaseItemForm();
}
function renderPurchaseItems() {
const tbody = document.getElementById('purchaseItemsList');
tbody.innerHTML = '';
let total = 0;
purchaseItems.forEach((item, index) => {
total += item.value;
tbody.innerHTML += `<tr>
<td>${item.productCode || '—'}</td>
<td>${item.title}</td>
<td>${item.unit}</td>
<td>${formatNumber(item.purchasePrice)}</td>
<td>${formatNumber(item.salePrice)}</td>
<td>${item.quantity}</td>
<td>${formatNumber(item.value)}</td>
<td><button class="action-btn btn-delete" onclick="removePurchaseItem(${index})"><i class="fas fa-trash"></i></button></td>
</tr>`;
});
document.getElementById('purTotalPreview').innerText = formatNumber(total);
}
function removePurchaseItem(index) {
purchaseItems.splice(index, 1);
renderPurchaseItems();
}
function clearPurchaseItemForm() {
['newPurchaseProductCode', 'newPurchaseProductName', 'newPurchaseUnit', 'newPurchasePrice', 'newPurchaseSalePrice', 'newPurchaseQuantity', 'newPurchaseCategory'].forEach(id => {
document.getElementById(id).value = '';
});
}
function onSaleProductChange() {
const select = document.getElementById('saleProductSelect');
const productId = select.value;
if (!productId) {
document.getElementById('invoiceProductCodeDisplay').value = '';
document.getElementById('invoiceSalePrice').value = '';
document.getElementById('invoiceQuantity').value = '1';
return;
}
const product = products.find(p => p.id == productId);
if (product) {
document.getElementById('invoiceProductCodeDisplay').value = product.productCode || '';
document.getElementById('invoiceSalePrice').value = product.salePrice || 0;
document.getElementById('invoiceQuantity').value = '1';
document.getElementById('invoiceQuantity').max = product.count || 9999;
}
}
function addSaleItem() {
const select = document.getElementById('saleProductSelect');
const productId = select.value;
const name = select.options[select.selectedIndex]?.text || '';
const code = document.getElementById('invoiceProductCodeDisplay').value.trim();
const price = parseFloat(document.getElementById('invoiceSalePrice').value);
const quantity = parseFloat(document.getElementById('invoiceQuantity').value);
if (!productId || isNaN(price) || !quantity || quantity <= 0) {
alert('بيانات المنتج غير مكتملة');
return;
}
const product = products.find(p => p.id == productId);
if (!product || product.count < quantity) {
alert('الكمية غير متاحة في المخزون');
return;
}
saleItems.push({
id: Date.now(),
productId: product.id,
productCode: code,
title: product.title,
unit: product.unit || 'قطعة',
salePrice: price,
purchasePrice: product.purchasePrice,
quantity: quantity,
value: price * quantity,
cogs: product.purchasePrice * quantity
});
renderSaleItems();
clearSaleItemForm();
}
function renderSaleItems() {
const tbody = document.getElementById('saleItemsList');
tbody.innerHTML = '';
let total = 0;
saleItems.forEach((item, index) => {
total += item.value;
tbody.innerHTML += `<tr>
<td>${item.productCode || '—'}</td>
<td>${item.title}</td>
<td>${item.unit}</td>
<td>${formatNumber(item.salePrice)}</td>
<td>${item.quantity}</td>
<td>${formatNumber(item.value)}</td>
<td>${formatNumber(item.cogs)}</td>
<td><button class="action-btn btn-delete" onclick="removeSaleItem(${index})"><i class="fas fa-trash"></i></button></td>
</tr>`;
});
document.getElementById('saleTotalPreview').innerText = formatNumber(total);
}
function removeSaleItem(index) {
saleItems.splice(index, 1);
renderSaleItems();
}
function clearSaleItemForm() {
document.getElementById('saleProductSelect').value = '';
document.getElementById('invoiceProductCodeDisplay').value = '';
document.getElementById('invoiceSalePrice').value = '';
document.getElementById('invoiceQuantity').value = '1';
selectedSaleProduct = null;
}
function onPurchaseReturnProductChange() {
const select = document.getElementById('returnPurchaseProductSelect');
const productId = select.value;
if (!productId) {
document.getElementById('returnPurchasePrice').value = '';
document.getElementById('returnPurchaseQuantity').value = '';
document.getElementById('purchaseReturnTotalBox').style.display = 'none';
return;
}
const product = products.find(p => p.id == productId);
if (product) {
document.getElementById('returnPurchasePrice').value = product.purchasePrice || 0;
document.getElementById('returnPurchaseQuantity').value = '';
document.getElementById('returnPurchaseQuantity').max = product.count || 9999;
document.getElementById('returnPurchasePrice').removeAttribute('readonly');
calculatePurchaseReturnTotal();
}
}
function calculatePurchaseReturnTotal() {
const price = parseFloat(document.getElementById('returnPurchasePrice').value) || 0;
const quantity = parseFloat(document.getElementById('returnPurchaseQuantity').value) || 0;
const total = price * quantity;
if (total > 0) {
document.getElementById('purchaseReturnTotalAmount').textContent = formatNumber(total);
document.getElementById('purchaseReturnTotalBox').style.display = 'block';
} else {
document.getElementById('purchaseReturnTotalBox').style.display = 'none';
}
}
function savePurchaseReturn() {
const productId = document.getElementById('returnPurchaseProductSelect').value;
const returnPrice = parseFloat(document.getElementById('returnPurchasePrice').value);
const quantity = parseFloat(document.getElementById('returnPurchaseQuantity').value);
if (!productId) { alert('يجب اختيار منتج'); return; }
if (isNaN(returnPrice) || returnPrice <= 0) { alert('يجب إدخال سعر صحيح'); return; }
if (isNaN(quantity) || quantity <= 0) { alert('يجب إدخال كمية صحيحة'); return; }
const product = products.find(p => p.id == productId);
if (!product) { alert('منتج غير موجود'); return; }
if (quantity > product.count) { alert(`الكمية المرتجعة (${quantity}) أكبر من المتاح في المخزون (${product.count})`); return; }
product.count -= quantity;
const refund = returnPrice * quantity;
addTreasuryTransaction('in', refund, `مردود مشتريات: ${product.title}`, 'المورد', 'الخزينة', 'مردودات مشتريات', true);
purchaseReturns.push({ id: Date.now(), productId: product.id, productName: product.title, productCode: product.productCode, unit: product.unit, returnPrice, quantity, date: new Date().toLocaleDateString('ar-EG') });
saveData();
renderAll();
renderTreasury();
renderDashboardStats();
updateDashboardCharts();
document.getElementById('returnPurchaseProductSelect').value = '';
document.getElementById('returnPurchasePrice').value = '';
document.getElementById('returnPurchaseQuantity').value = '';
document.getElementById('purchaseReturnTotalBox').style.display = 'none';
alert(`تم الإرجاع وإضافة ${formatNumber(refund)} للخزينة`);
}
function onSaleReturnProductChange() {
const select = document.getElementById('returnSaleProductSelect');
const productId = select.value;
if (!productId) {
document.getElementById('returnSalePrice').value = '';
document.getElementById('returnSaleQuantity').value = '';
document.getElementById('saleReturnTotalBox').style.display = 'none';
return;
}
const option = select.options[select.selectedIndex];
const salePrice = parseFloat(option.getAttribute('data-sale-price')) || 0;
const availableQty = parseFloat(option.getAttribute('data-available')) || 0;
if (salePrice) {
document.getElementById('returnSalePrice').value = salePrice;
document.getElementById('returnSaleQuantity').value = '';
document.getElementById('returnSaleQuantity').max = availableQty;
document.getElementById('returnSalePrice').removeAttribute('readonly');
calculateSaleReturnTotal();
}
}
function calculateSaleReturnTotal() {
const price = parseFloat(document.getElementById('returnSalePrice').value) || 0;
const quantity = parseFloat(document.getElementById('returnSaleQuantity').value) || 0;
const total = price * quantity;
if (total > 0) {
document.getElementById('saleReturnTotalAmount').textContent = formatNumber(total);
document.getElementById('saleReturnTotalBox').style.display = 'flex';
} else {
document.getElementById('saleReturnTotalBox').style.display = 'none';
}
}
function saveSalesReturn() {
const productId = document.getElementById('returnSaleProductSelect').value;
const returnPrice = parseFloat(document.getElementById('returnSalePrice').value);
const quantity = parseFloat(document.getElementById('returnSaleQuantity').value);
if (!productId) { alert('يجب اختيار منتج'); return; }
if (isNaN(returnPrice) || returnPrice <= 0) { alert('يجب إدخال سعر صحيح'); return; }
if (isNaN(quantity) || quantity <= 0) { alert('يجب إدخال كمية صحيحة'); return; }
const product = products.find(p => p.id == productId);
if (!product) { alert('منتج غير موجود'); return; }
product.count += quantity;
const refund = returnPrice * quantity;
addTreasuryTransaction('out', refund, `مردود مبيعات: ${product.title}`, 'الخزينة', 'العميل', 'مردودات مبيعات', true);
salesReturns.push({ id: Date.now(), productId: product.id, productName: product.title, productCode: product.productCode, unit: product.unit, returnPrice, quantity, date: new Date().toLocaleDateString('ar-EG') });
saveData();
renderAll();
renderTreasury();
renderDashboardStats();
updateDashboardCharts();
document.getElementById('returnSaleProductSelect').value = '';
document.getElementById('returnSalePrice').value = '';
document.getElementById('returnSaleQuantity').value = '';
document.getElementById('saleReturnTotalBox').style.display = 'none';
alert(`تم الإرجاع وخصم ${formatNumber(refund)} من الخزينة`);
}
function createPurchase() {
const supplierName = document.getElementById('purchaseSupplierName').value.trim();
const supplierPhone = document.getElementById('purchaseSupplierPhone').value.trim();
const invoiceDate = document.getElementById('purchaseInvoiceDate').value;
if (!supplierName || purchaseItems.length === 0) {
alert('يجب إدخال اسم المورد وإضافة منتج واحد على الأقل');
return;
}
let totalInvoice = 0;
purchaseItems.forEach(item => {
totalInvoice += item.value;
let existing = products.find(p => p.productCode === item.productCode || p.title === item.title);
if (existing) {
existing.count += item.quantity;
existing.purchasePrice = item.purchasePrice;
existing.salePrice = item.salePrice;
if (item.unit) existing.unit = item.unit;
if (item.category) existing.category = item.category;
} else {
products.push({
id: Date.now() + Math.random(),
title: item.title,
productCode: item.productCode,
purchasePrice: item.purchasePrice,
salePrice: item.salePrice,
unit: item.unit,
count: item.quantity,
category: item.category,
createdAt: new Date().toLocaleDateString('ar-EG')
});
}
purchases.push({
id: Date.now() + Math.random(),
productId: existing ? existing.id : products[products.length - 1].id,
title: item.title,
productCode: item.productCode,
category: item.category,
unit: item.unit,
purchasePrice: item.purchasePrice,
salePrice: item.salePrice,
count: item.quantity,
total: item.value,
supplier: supplierName,
supplierPhone: supplierPhone,
date: invoiceDate || new Date().toLocaleDateString('ar-EG')
});
});
addTreasuryTransaction('out', totalInvoice, `شراء من ${supplierName}`, 'الخزينة', supplierName, 'سداد فواتير مشتريات', true);
saveData();
renderAll();
renderTreasury();
renderDashboardStats();
updateDashboardCharts();
purchaseItems = [];
renderPurchaseItems();
document.getElementById('purchaseSupplierName').value = '';
document.getElementById('purchaseSupplierPhone').value = '';
document.getElementById('purchaseInvoiceDate').value = new Date().toISOString().split('T')[0];
alert(`تم حفظ فاتورة المشتريات بقيمة ${formatNumber(totalInvoice)} جنيه`);
}
function saveInvoice() {
const customerName = document.getElementById('invoiceCustomerName').value.trim();
const customerPhone = document.getElementById('invoiceCustomerPhone').value.trim();
const invoiceDate = document.getElementById('invoiceDate').value;
if (!customerName || saleItems.length === 0) {
alert('يجب إدخال اسم العميل وإضافة منتج واحد على الأقل');
return;
}
let totalInvoice = 0;
let totalCOGS = 0;
saleItems.forEach(item => {
totalInvoice += item.value;
totalCOGS += item.cogs;
const product = products.find(p => p.id === item.productId);
if (product) {
product.count -= item.quantity;
}
invoices.push({
id: Date.now() + Math.random(),
customerName: customerName,
customerPhone: customerPhone,
productId: item.productId,
productName: item.title,
productCode: item.productCode,
unit: item.unit,
salePrice: item.salePrice,
purchasePrice: item.purchasePrice,
quantity: item.quantity,
total: item.value,
cogs: item.cogs,
date: invoiceDate || new Date().toLocaleDateString('ar-EG')
});
});
addTreasuryTransaction('in', totalInvoice, `مبيعات للعميل ${customerName}`, customerName, 'الخزينة', 'مبيعات', true);
saveData();
renderAll();
renderTreasury();
renderDashboardStats();
updateDashboardCharts();
saleItems = [];
renderSaleItems();
['invoiceCustomerName', 'invoiceCustomerPhone'].forEach(id => document.getElementById(id).value = '');
document.getElementById('invoiceDate').value = new Date().toISOString().split('T')[0];
alert(`تم حفظ فاتورة المبيعات بقيمة ${formatNumber(totalInvoice)} جنيه`);
}
function loadReturnProducts() {
const saleSelect = document.getElementById('returnSaleProductSelect');
saleSelect.innerHTML = '<option value="">-- اختر منتج --</option>';
const soldMap = new Map();
invoices.forEach(inv => {
const key = `${inv.productId}-${inv.salePrice}`;
if (soldMap.has(key)) soldMap.get(key).quantity += inv.quantity;
else soldMap.set(key, { id: inv.productId, title: inv.productName, salePrice: inv.salePrice, quantity: inv.quantity, productCode: inv.productCode, unit: inv.unit });
});
const soldItems = Array.from(soldMap.values());
soldItems.forEach(item => {
const opt = document.createElement('option');
opt.value = item.id;
opt.setAttribute('data-sale-price', item.salePrice);
opt.setAttribute('data-available', item.quantity);
opt.setAttribute('data-code', item.productCode || '');
opt.setAttribute('data-unit', item.unit || '');
opt.textContent = `${item.title} [${item.productCode || '—'}] - بيع: ${formatNumber(item.salePrice)} - الكمية: ${item.quantity}`;
saleSelect.appendChild(opt);
});
const purchaseSelect = document.getElementById('returnPurchaseProductSelect');
purchaseSelect.innerHTML = '<option value="">-- اختر منتج --</option>';
const availableProducts = products.filter(p => p.count > 0);
availableProducts.forEach(p => {
const opt = document.createElement('option');
opt.value = p.id;
opt.setAttribute('data-price', p.purchasePrice);
opt.setAttribute('data-count', p.count);
opt.setAttribute('data-code', p.productCode || '');
opt.textContent = `${p.title} [${p.productCode || '—'}] - شراء: ${formatNumber(p.purchasePrice)} - الكمية: ${p.count}`;
purchaseSelect.appendChild(opt);
});
const saleProductSelect = document.getElementById('saleProductSelect');
saleProductSelect.innerHTML = '<option value="">-- اختر منتج --</option>';
availableProducts.forEach(p => {
const opt = document.createElement('option');
opt.value = p.id;
opt.textContent = `${p.title} [${p.productCode || '—'}] - متاح: ${p.count}`;
saleProductSelect.appendChild(opt);
});
}
function saveEmployee() {
const name = document.getElementById('empName').value.trim();
const nationalId = document.getElementById('empNationalId').value.trim();
const phone = document.getElementById('empPhone').value.trim();
const job = document.getElementById('empJob').value.trim();
const salary = parseFloat(document.getElementById('empSalary').value) || 0;
const incentives = parseFloat(document.getElementById('empIncentives').value) || 0;
const allowances = parseFloat(document.getElementById('empAllowances').value) || 0;
const bonuses = parseFloat(document.getElementById('empBonuses').value) || 0;
if (!name || !nationalId || !phone || !job) { alert('بيانات ناقصة'); return; }
const netSalary = salary + incentives + allowances + bonuses;
if (editingEmployeeId) {
const empIndex = employees.findIndex(e => e.id === editingEmployeeId);
if (empIndex !== -1) {
employees[empIndex] = { ...employees[empIndex], name, nationalId, phone, job, salary, incentives, allowances, bonuses, netSalary };
alert(`تم تحديث بيانات الموظف: ${name}`);
}
editingEmployeeId = null;
resetEmployeeForm();
} else {
employees.push({ id: Date.now(), name, nationalId, phone, job, salary, incentives, allowances, bonuses, netSalary, createdAt: new Date().toLocaleDateString('ar-EG') });
alert(`تم إضافة الموظف: ${name}`);
}
saveData();
renderEmployees();
renderDashboardStats();
updateDashboardCharts();
resetEmployeeForm();
}
function editEmployee(id) {
const emp = employees.find(e => e.id === id);
if (!emp) return;
document.getElementById('empName').value = emp.name;
document.getElementById('empNationalId').value = emp.nationalId;
document.getElementById('empPhone').value = emp.phone;
document.getElementById('empJob').value = emp.job;
document.getElementById('empSalary').value = emp.salary;
document.getElementById('empIncentives').value = emp.incentives || 0;
document.getElementById('empAllowances').value = emp.allowances || 0;
document.getElementById('empBonuses').value = emp.bonuses || 0;
editingEmployeeId = id;
document.getElementById('employeeFormTitle').innerHTML = '<i class="fas fa-user-edit"></i> تعديل بيانات الموظف';
document.getElementById('saveEmployeeBtnText').textContent = 'تحديث البيانات';
document.getElementById('saveEmployeeBtn').classList.add('btn-warning');
document.getElementById('cancelEditBtn').style.display = 'block';
document.querySelector('#employees .form-container').scrollIntoView({ behavior: 'smooth' });
}
function deleteEmployee(id) {
const emp = employees.find(e => e.id === id);
if (!emp) return;
if (confirm(`هل أنت متأكد من حذف الموظف "${emp.name}"؟`)) {
employees = employees.filter(e => e.id !== id);
saveData();
renderEmployees();
renderDashboardStats();
updateDashboardCharts();
alert(`تم حذف الموظف: ${emp.name}`);
}
}
function resetEmployeeForm() {
editingEmployeeId = null;
document.getElementById('empName').value = '';
document.getElementById('empNationalId').value = '';
document.getElementById('empPhone').value = '';
document.getElementById('empJob').value = '';
document.getElementById('empSalary').value = '';
document.getElementById('empIncentives').value = '';
document.getElementById('empAllowances').value = '';
document.getElementById('empBonuses').value = '';
document.getElementById('employeeFormTitle').innerHTML = '<i class="fas fa-user-plus"></i> إضافة موظف';
document.getElementById('saveEmployeeBtnText').textContent = 'حفظ الموظف';
document.getElementById('saveEmployeeBtn').classList.remove('btn-warning');
document.getElementById('cancelEditBtn').style.display = 'none';
}
function renderEmployees() {
const tbody = document.getElementById('employeesList');
tbody.innerHTML = '';
employees.forEach((emp, idx) => {
tbody.innerHTML += `<tr>
<td>${idx + 1}</td><td>${emp.name}</td><td>${emp.nationalId}</td><td>${emp.phone}</td><td>${emp.job}</td>
<td><span class="price">${formatNumber(emp.netSalary)}</span></td>
<td class="actions-cell">
<button class="action-btn btn-edit" onclick="editEmployee(${emp.id})" title="تعديل"><i class="fas fa-edit"></i></button>
<button class="action-btn btn-delete" onclick="deleteEmployee(${emp.id})" title="حذف"><i class="fas fa-trash"></i></button>
</td></tr>`;
});
}
document.getElementById('cancelEditBtn').addEventListener('click', resetEmployeeForm);
// ✅ تم تعديل دالة عرض المخزن لتشمل الأعمدة الجديدة مع الحفاظ على عمود القيمة
function renderInventory() {
const tbody = document.getElementById('inventoryList');
tbody.innerHTML = '';
products.forEach(p => {
// حساب الوارد (إجمالي المشتريات لهذا المنتج)
const totalIn = purchases
.filter(item => item.productId === p.id)
.reduce((sum, item) => sum + (item.count || 0), 0);
// حساب المنصرف (إجمالي المبيعات لهذا المنتج)
const totalOut = invoices
.filter(item => item.productId === p.id)
.reduce((sum, item) => sum + (item.quantity || 0), 0);
// المتاح هو الكمية الحالية في المخزن
const available = p.count || 0;
// القيمة = المتاح × سعر الشراء
const totalValue = available * p.purchasePrice;
tbody.innerHTML += `<tr>
<td>${p.productCode || p.id}</td>
<td>${p.title}</td>
<td>${p.unit || 'قطعة'}</td>
<td>${formatNumber(p.purchasePrice)}</td>
<td>${formatNumber(p.salePrice)}</td>
<td style="color: var(--income); font-weight:bold;">${totalIn}</td>
<td style="color: var(--expense); font-weight:bold;">${totalOut}</td>
<td style="color: var(--success); font-weight:bold;">${available}</td>
<td style="color: var(--warning); font-weight:bold;">${formatNumber(totalValue)}</td>
</tr>`;
});
}
function renderSales() {
const tbody = document.getElementById('salesList');
tbody.innerHTML = '';
invoices.forEach((inv, idx) => {
tbody.innerHTML += `<tr>
<td>${idx + 1}</td>
<td>${inv.productCode || '—'}</td>
<td>${inv.productName}</td>
<td>${inv.customerName}</td>
<td>${inv.customerPhone}</td>
<td>${inv.quantity}</td>
<td><span class="price">${formatNumber(inv.total)}</span></td>
<td>${inv.date}</td>
</tr>`;
});
}
function renderPurchases() {
const tbody = document.getElementById('purchasesList');
tbody.innerHTML = '';
purchases.forEach((pur, idx) => {
tbody.innerHTML += `<tr>
<td>${idx + 1}</td>
<td>${pur.productCode || '—'}</td>
<td>${pur.title}</td>
<td>${formatNumber(pur.purchasePrice)}</td>
<td>${formatNumber(pur.salePrice)}</td>
<td>${pur.count}</td>
<td><span class="price">${formatNumber(pur.total)}</span></td>
<td>${pur.supplier || '—'}</td>
<td>${pur.supplierPhone || '—'}</td>
<td>${pur.date}</td>
</tr>`;
});
}
function renderSalesReturns() {
const tbody = document.getElementById('salesReturnsList');
tbody.innerHTML = '';
salesReturns.forEach((ret, idx) => {
tbody.innerHTML += `<tr>
<td>${idx + 1}</td>
<td>${ret.productName}</td>
<td>${ret.productCode || '—'}</td>
<td>${ret.unit || '—'}</td>
<td>${formatNumber(ret.returnPrice)}</td>
<td>${ret.quantity}</td>
<td>${ret.date}</td>
</tr>`;
});
}
function renderPurchaseReturns() {
const tbody = document.getElementById('purchaseReturnsList');
tbody.innerHTML = '';
purchaseReturns.forEach((ret, idx) => {
tbody.innerHTML += `<tr>
<td>${idx + 1}</td>
<td>${ret.productName}</td>
<td>${ret.productCode || '—'}</td>
<td>${ret.unit || '—'}</td>
<td>${formatNumber(ret.returnPrice)}</td>
<td>${ret.quantity}</td>
<td>${ret.date}</td>
</tr>`;
});
}
function renderDashboardStats() {
const totalSales = invoices.reduce((s, i) => s + i.total, 0);
const totalSalesReturns = salesReturns.reduce((s, r) => s + r.returnPrice * r.quantity, 0);
const netSales = totalSales - totalSalesReturns;
const totalPurchases = purchases.reduce((s, p) => s + p.total, 0);
const totalPurchaseReturns = purchaseReturns.reduce((s, r) => s + r.returnPrice * r.quantity, 0);
const netPurchases = totalPurchases - totalPurchaseReturns;
const totalCOGS = invoices.reduce((s, i) => s + (i.cogs || (i.quantity * i.purchasePrice)), 0);
const totalExpenses = treasuryDB.transactions
.filter(t => t.type === 'صادر' && t.category !== 'سداد فواتير مشتريات')
.reduce((s, t) => s + t.amount, 0);
const grossProfit = netSales - totalCOGS;
const netProfit = grossProfit - totalExpenses;
document.getElementById('totalSales').textContent = formatNumber(netSales);
document.getElementById('cogs').textContent = formatNumber(totalCOGS);
document.getElementById('totalPurchases').textContent = formatNumber(netPurchases);
document.getElementById('grossProfit').textContent = formatNumber(grossProfit);
document.getElementById('totalExpenses').textContent = formatNumber(totalExpenses);
document.getElementById('netProfit').textContent = formatNumber(netProfit);
document.getElementById('dashTreasury').textContent = formatNumber(treasuryDB.balance);
}
function renderAll() {
renderDashboardStats();
renderSales();
renderSalesReturns();
renderPurchases();
renderPurchaseReturns();
renderInventory();
renderEmployees();
loadReturnProducts();
}
function saveData() {
localStorage.setItem('erp_products', JSON.stringify(products));
localStorage.setItem('erp_deleted', JSON.stringify(deletedProducts));
localStorage.setItem('erp_invoices', JSON.stringify(invoices));
localStorage.setItem('erp_purchases', JSON.stringify(purchases));
localStorage.setItem('erp_sales_returns', JSON.stringify(salesReturns));
localStorage.setItem('erp_purchase_returns', JSON.stringify(purchaseReturns));
localStorage.setItem('erp_employees', JSON.stringify(employees));
localStorage.setItem('erp_attendance', JSON.stringify(attendanceDB));
localStorage.setItem('erp_treasury', JSON.stringify(treasuryDB));
}
function updateDashboardCharts() {
const totalSales = invoices.reduce((s, i) => s + i.total, 0);
const totalSalesReturns = salesReturns.reduce((s, r) => s + r.returnPrice * r.quantity, 0);
const netSales = totalSales - totalSalesReturns;
const totalPurchases = purchases.reduce((s, p) => s + p.total, 0);
const totalCOGS = invoices.reduce((s, i) => s + (i.cogs || (i.quantity * i.purchasePrice)), 0);
const totalExpenses = treasuryDB.transactions
.filter(t => t.type === 'صادر' && t.category !== 'سداد فواتير مشتريات')
.reduce((s, t) => s + t.amount, 0);
const grossProfit = netSales - totalCOGS;
const netProfit = grossProfit - totalExpenses;
// ✅ ترتيب الألوان مطابق للترتيب الجديد (7 ألوان)
const chartColors = [
'#f59e0b', // 1. الخزينة - ذهبي
'#10b981', // 2. المبيعات - أخضر
'#64748b', // 3. تكلفة البضاعة - رمادي
'#ef4444', // 4. المشتريات - أحمر
'#8b5cf6', // 5. المصاريف - بنفسجي
'#0ea5e9', // 6. مجمل الربح - أزرق سماوي
'#059669'  // 7. صافي الربح - أخضر غامق
];
// ✅ ترتيب العناوين حسب الطلب
const chartLabels = [
'رصيد الخزينة',
'المبيعات',
'تكلفة البضاعة',
'المشتريات',
'المصاريف',
'مجمل الربح',
'صافي الربح'
];
// ✅ ترتيب البيانات مطابق للعناوين
const chartDataValues = [
treasuryDB.balance,
netSales,
totalCOGS,
totalPurchases,
totalExpenses,
grossProfit,
netProfit
];
const ctx1 = document.getElementById('mainStatsBarChart').getContext('2d');
if (charts.mainBar) charts.mainBar.destroy();
charts.mainBar = new Chart(ctx1, {
type: 'bar',
data: {
labels: chartLabels,
datasets: [{
label: 'الأداء المالي',
data: chartDataValues,
backgroundColor: chartColors,
borderRadius: 8,
borderWidth: 0
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: { display: false },
tooltip: {
callbacks: {
label: function(context) {
return context.label + ': ' + formatNumber(context.raw) + ' جنيه';
}
}
}
},
scales: {
y: {
grid: { color: 'rgba(255,255,255,0.05)' },
ticks: { color: '#94a3b8', callback: function(value) { return formatNumber(value); } }
},
x: {
grid: { display: false },
ticks: { color: '#94a3b8', font: { size: 11, weight: 'bold' } }
}
}
}
});
const ctx2 = document.getElementById('mainStatsDoughnutChart').getContext('2d');
if (charts.mainDoughnut) charts.mainDoughnut.destroy();
const allValues = chartDataValues.filter(v => v > 0);
const allLabels = chartLabels.filter((_, i) => chartDataValues[i] > 0);
const allColors = chartColors.filter((_, i) => chartDataValues[i] > 0);
charts.mainDoughnut = new Chart(ctx2, {
type: 'doughnut',
data: {
labels: allLabels,
datasets: [{
data: allValues,
backgroundColor: allColors,
borderWidth: 0,
hoverOffset: 10
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: {
position: 'bottom',
labels: { color: '#94a3b8', padding: 10, font: { size: 11 } }
}
},
cutout: '55%'
}
});
}
function printCurrentSection() {
updateDashboardCharts();
setTimeout(() => {
window.print();
}, 500);
}
function sumByName() {
const searchTerm = prompt('أدخل اسم المنتج للبحث:');
if (!searchTerm) return;
const term = searchTerm.trim().toLowerCase();
let results = [];
let msg = '';
if (currentSection === 'sales') {
results = invoices.filter(inv => inv.productName.toLowerCase().includes(term));
if (results.length === 0) { alert('لا توجد نتائج'); return; }
const totalQty = results.reduce((s, i) => s + i.quantity, 0);
const totalAmount = results.reduce((s, i) => s + i.total, 0);
msg = `نتائج البحث في المبيعات عن: "${searchTerm}"
عدد الفواتير: ${results.length}
إجمالي الكمية: ${totalQty}
إجمالي المبلغ: ${formatNumber(totalAmount)}`;
} else if (currentSection === 'purchases') {
results = purchases.filter(p => p.title.toLowerCase().includes(term));
if (results.length === 0) { alert('لا توجد نتائج'); return; }
const totalQty = results.reduce((s, p) => s + p.count, 0);
const totalAmount = results.reduce((s, p) => s + p.total, 0);
msg = `نتائج البحث في المشتريات عن: "${searchTerm}"
عدد الفواتير: ${results.length}
إجمالي الكمية: ${totalQty}
إجمالي المبلغ: ${formatNumber(totalAmount)}`;
} else if (currentSection === 'inventory') {
results = products.filter(p => p.title.toLowerCase().includes(term));
if (results.length === 0) { alert('لا توجد نتائج'); return; }
const totalQty = results.reduce((s, p) => s + p.count, 0);
msg = `نتائج البحث في المخزون عن: "${searchTerm}"
عدد المنتجات: ${results.length}
إجمالي الكمية: ${totalQty}`;
} else { alert('هذه الميزة متاحة في: المبيعات، المشتريات، المخزون'); return; }
alert(msg);
}
function sumByCategory() {
const searchTerm = prompt('أدخل اسم الفئة للبحث:');
if (!searchTerm) return;
const term = searchTerm.trim().toLowerCase();
let results = [];
let msg = '';
if (currentSection === 'purchases') {
results = purchases.filter(p => p.category && p.category.toLowerCase().includes(term));
if (results.length === 0) { alert('لا توجد نتائج'); return; }
const totalQty = results.reduce((s, p) => s + p.count, 0);
const totalAmount = results.reduce((s, p) => s + p.total, 0);
msg = `نتائج البحث في المشتريات عن الفئة: "${searchTerm}"
عدد الفواتير: ${results.length}
إجمالي الكمية: ${totalQty}
إجمالي المبلغ: ${formatNumber(totalAmount)}`;
} else if (currentSection === 'inventory') {
results = products.filter(p => p.category && p.category.toLowerCase().includes(term));
if (results.length === 0) { alert('لا توجد نتائج'); return; }
const totalQty = results.reduce((s, p) => s + p.count, 0);
const totalValue = results.reduce((s, p) => s + p.purchasePrice * p.count, 0);
msg = `نتائج البحث في المخزون عن الفئة: "${searchTerm}"
عدد المنتجات: ${results.length}
إجمالي الكمية: ${totalQty}
القيمة: ${formatNumber(totalValue)}`;
} else { alert('هذه الميزة متاحة في: المشتريات، المخزون'); return; }
alert(msg);
}
function openInquiryModal() {
document.getElementById('inquiryModal').classList.add('active');
document.querySelectorAll('.inquiry-form').forEach(f => f.classList.remove('active'));
document.getElementById('inquiryResult').classList.remove('active');
document.getElementById('inquiryFormTreasury').classList.add('active');
}
function closeInquiryModal() { document.getElementById('inquiryModal').classList.remove('active'); }
function showInquiryForm(type) {
document.querySelectorAll('.inquiry-form').forEach(f => f.classList.remove('active'));
document.getElementById('inquiryResult').classList.remove('active');
document.getElementById(`inquiryForm${type.charAt(0).toUpperCase() + type.slice(1)}`).classList.add('active');
}
function executeEmployeeInquiry() {
const name = document.getElementById('inquiryEmpName').value.trim().toLowerCase();
const month = parseInt(document.getElementById('inquiryEmpMonth').value);
const year = parseInt(document.getElementById('inquiryEmpYear').value) || new Date().getFullYear();
if (!name) { alert('أدخل اسم الموظف'); return; }
const emp = employees.find(e => e.name.toLowerCase().includes(name));
if (!emp) { document.getElementById('inquiryResult').innerHTML = '<p>لم يتم العثور على الموظف</p>'; document.getElementById('inquiryResult').classList.add('active'); return; }
const key = `${emp.id}_${year}_${month - 1}`;
const record = attendanceDB[key] || { days: [], deduction: 0, paid: false, finalSalary: 0 };
const daysInMonth = getDaysInMonth(year, month - 1);
let presentCount = 0, absentCount = 0;
for (let i = 1; i <= daysInMonth; i++) { if (record.days[i] === 'present') presentCount++; if (record.days[i] === 'absent') absentCount++; }
const result = `<p><strong>اسم الموظف:</strong> ${emp.name}</p><p><strong>الرقم القومي:</strong> ${emp.nationalId}</p><p><strong>الوظيفة:</strong> ${emp.job}</p><p><strong>المرتب الأساسي:</strong> ${formatNumber(emp.salary)} ج.م</p><p><strong>أيام الحضور:</strong> <span style="color:var(--success)">${presentCount}</span></p><p><strong>أيام الغياب:</strong> <span style="color:var(--danger)">${absentCount}</span></p><p><strong>الخصم:</strong> ${formatNumber(record.deduction)} ج.م</p><p><strong>حالة الراتب:</strong> ${record.paid ? 'تم الصرف' : 'لم يُصرف'}</p><p><strong>الصافي المستحق:</strong> ${record.paid ? formatNumber(record.finalSalary) : 'غير محسوب'} ج.م</p>`;
document.getElementById('inquiryResult').innerHTML = result;
document.getElementById('inquiryResult').classList.add('active');
}
function executeClientInquiry() {
const name = document.getElementById('inquiryClientName').value.trim().toLowerCase();
if (!name) { alert('أدخل اسم العميل'); return; }
const clientInvoices = invoices.filter(inv => inv.customerName.toLowerCase().includes(name));
if (clientInvoices.length === 0) { document.getElementById('inquiryResult').innerHTML = '<p>لم يتم العثور على هذا العميل</p>'; document.getElementById('inquiryResult').classList.add('active'); return; }
const totalAmount = clientInvoices.reduce((s, i) => s + i.total, 0);
const totalQty = clientInvoices.reduce((s, i) => s + i.quantity, 0);
const phone = clientInvoices[0].customerPhone;
const result = `<p><strong>اسم العميل:</strong> ${clientInvoices[0].customerName}</p><p><strong>رقم الهاتف:</strong> ${phone}</p><p><strong>عدد الفواتير:</strong> ${clientInvoices.length}</p><p><strong>إجمالي الكميات:</strong> ${totalQty}</p><p><strong>إجمالي المبالغ:</strong> ${formatNumber(totalAmount)} ج.م</p>`;
document.getElementById('inquiryResult').innerHTML = result;
document.getElementById('inquiryResult').classList.add('active');
}
function executeProductInquiry() {
const name = document.getElementById('inquiryProductName').value.trim().toLowerCase();
if (!name) { alert('أدخل اسم المنتج أو الكود'); return; }
const matchingProducts = products.filter(p => p.title.toLowerCase().includes(name) || (p.productCode && p.productCode.toLowerCase().includes(name)));
if (matchingProducts.length === 0) { document.getElementById('inquiryResult').innerHTML = '<p>لم يتم العثور على هذا المنتج</p>'; document.getElementById('inquiryResult').classList.add('active'); return; }
let result = '';
matchingProducts.forEach(p => {
const soldQty = invoices.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
result += `<p><strong>المنتج:</strong> ${p.title}</p><p><strong>الكود:</strong> ${p.productCode || '—'}</p><p><strong>الفئة:</strong> ${p.category || '—'}</p><p><strong>الكمية المتاحة:</strong> ${p.count}</p><p><strong>سعر الشراء:</strong> ${formatNumber(p.purchasePrice)} ج.م</p><p><strong>سعر البيع:</strong> ${formatNumber(p.salePrice)} ج.م</p><p><strong>الكمية المباعة:</strong> ${soldQty}</p><hr style="border-color:var(--border);margin:10px 0;">`;
});
document.getElementById('inquiryResult').innerHTML = result;
document.getElementById('inquiryResult').classList.add('active');
}
function executeTreasuryInquiry() {
const income = treasuryDB.transactions.filter(t => t.type === 'وارد').reduce((s, t) => s + t.amount, 0);
const expense = treasuryDB.transactions.filter(t => t.type === 'صادر').reduce((s, t) => s + t.amount, 0);
let result = `
<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom:20px;">
<div style="background:rgba(245,158,11,0.1); padding:15px; border-radius:10px; text-align:center; border:1px solid var(--treasury);">
<p style="color:var(--text-muted); font-size:12px; margin-bottom:5px;">الرصيد الحالي</p>
<span style="font-size:24px; font-weight:bold; color:var(--treasury);">${formatNumber(treasuryDB.balance)} ج.م</span>
</div>
<div style="background:rgba(16,185,129,0.1); padding:15px; border-radius:10px; text-align:center; border:1px solid var(--income);">
<p style="color:var(--text-muted); font-size:12px; margin-bottom:5px;">إجمالي الوارد</p>
<span style="font-size:24px; font-weight:bold; color:var(--income);">${formatNumber(income)} ج.م</span>
</div>
<div style="background:rgba(239,68,68,0.1); padding:15px; border-radius:10px; text-align:center; border:1px solid var(--expense);">
<p style="color:var(--text-muted); font-size:12px; margin-bottom:5px;">إجمالي الصادر</p>
<span style="font-size:24px; font-weight:bold; color:var(--expense);">${formatNumber(expense)} ج.م</span>
</div>
</div>
<h4 style="color:var(--accent); margin-bottom:15px;"><i class="fas fa-history"></i> سجل جميع الحركات:</h4>
`;
if (treasuryDB.transactions.length > 0) {
result += `<table class="inquiry-table"><thead><tr><th>التاريخ</th><th>النوع</th><th>البيان</th><th>التصنيف</th><th>المسلم</th><th>المستلم</th><th>المبلغ</th><th>الرصيد</th></tr></thead><tbody>`;
treasuryDB.transactions.forEach(t => {
const color = t.type === 'وارد' ? 'var(--income)' : 'var(--expense)';
const sign = t.type === 'وارد' ? '+' : '-';
result += `<tr><td>${t.date}</td><td style="color:${color}; font-weight:bold;">${t.type}</td><td>${t.desc}</td><td>${t.category || 'عام'}</td><td>${t.payer}</td><td>${t.receiver}</td><td style="color:${color}; font-weight:bold;">${sign}${formatNumber(t.amount)}</td><td>${formatNumber(t.balance)}</td></tr>`;
});
result += `</tbody></table>`;
} else { result += `<p style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد حركات في الخزينة</p>`; }
document.getElementById('inquiryResult').innerHTML = result;
document.getElementById('inquiryResult').classList.add('active');
}
function executeInvoiceInquiry() {
const name = document.getElementById('inquiryInvoiceName').value.trim().toLowerCase();
if (!name) { alert('أدخل اسم الفاتورة أو العميل'); return; }
const matchingInvoices = invoices.filter(inv => inv.customerName.toLowerCase().includes(name));
if (matchingInvoices.length === 0) { document.getElementById('inquiryResult').innerHTML = '<p>لم يتم العثور على فواتير</p>'; document.getElementById('inquiryResult').classList.add('active'); return; }
let result = '';
let totalAll = 0;
matchingInvoices.forEach((inv, idx) => {
totalAll += inv.total;
result += `<p><strong>فاتورة #${idx + 1}:</strong> ${inv.customerName}</p><p>العميل: ${inv.customerName} | الهاتف: ${inv.customerPhone}</p><p>المنتج: ${inv.productName} | الكمية: ${inv.quantity}</p><p>الإجمالي: ${formatNumber(inv.total)} ج.م | التاريخ: ${inv.date}</p><hr style="border-color:var(--border);margin:10px 0;">`;
});
result += `<p><strong>إجمالي كل الفواتير:</strong> ${formatNumber(totalAll)} ج.م</p>`;
document.getElementById('inquiryResult').innerHTML = result;
document.getElementById('inquiryResult').classList.add('active');
}
// ✅ ✅ ✅ دالة التصدير المعدلة - تشمل كل البيانات ما عدا الباسورد ✅ ✅ ✅
function exportData() {
// إنشاء نسخة من userData بدون الباسورد للأمان
const userDataForExport = { ...userData };
delete userDataForExport.password; // حذف الباسورد قبل التصدير
const data = {
user: userDataForExport,  // ✅ بيانات المستخدم (بدون باسورد)
products,
invoices,
purchases,
salesReturns,
purchaseReturns,
employees,
attendance: attendanceDB,
treasury: treasuryDB,
deletedProducts,
version: "7.0",
exportDate: new Date().toISOString()
};
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
a.click();
URL.revokeObjectURL(a.href);
}
// ✅ ✅ ✅ دالة الاستيراد المعدلة - تقبل ملفات متعددة ✅ ✅ ✅
function importData(e) {
const files = e.target.files;
if (!files || files.length === 0) return;
let filesProcessed = 0;
let totalFiles = files.length;
// معالجة كل ملف على حدة
for (let i = 0; i < files.length; i++) {
const file = files[i];
const reader = new FileReader();
reader.onload = (evt) => {
try {
const data = JSON.parse(evt.target.result);
// استيراد بيانات المستخدم (إذا موجودة في الملف)
if (data.user) {
// نحتفظ بالباسورد الحالي ولا نستورده من الملف للأمان
const importedUser = data.user;
if (userData && userData.password) {
importedUser.password = userData.password; // نحتفظ بالباسورد الحالي
}
userData = importedUser;
localStorage.setItem('erp_user', JSON.stringify(userData));
}
// استيراد جميع البيانات الأخرى
if (data.products) products = data.products;
if (data.invoices) invoices = data.invoices;
if (data.purchases) purchases = data.purchases;
if (data.salesReturns) salesReturns = data.salesReturns;
if (data.purchaseReturns) purchaseReturns = data.purchaseReturns;
if (data.employees) employees = data.employees;
if (data.attendance) attendanceDB = data.attendance;
if (data.treasury) treasuryDB = data.treasury;
if (data.deletedProducts) deletedProducts = data.deletedProducts;
saveData();
filesProcessed++;
// إذا تم معالجة كل الملفات
if (filesProcessed === totalFiles) {
alert(`✅ تم استيراد ${totalFiles} ملف بنجاح!`);
renderLoginUI();
}
} catch (err) {
console.error('خطأ في الملف:', file.name, err);
filesProcessed++;
if (filesProcessed === totalFiles) {
alert('⚠️ حدث خطأ في بعض الملفات');
}
}
};
reader.onerror = () => {
filesProcessed++;
if (filesProcessed === totalFiles) {
alert('⚠️ فشل قراءة بعض الملفات');
}
};
reader.readAsText(file);
}
// إعادة تعيين input للسماح بإعادة اختيار نفس الملفات
e.target.value = '';
}
document.getElementById('createPurchaseBtn').addEventListener('click', createPurchase);
document.getElementById('savePurchaseReturnBtn').addEventListener('click', savePurchaseReturn);
document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoice);
document.getElementById('saveSalesReturnBtn').addEventListener('click', saveSalesReturn);
document.getElementById('saveEmployeeBtn').addEventListener('click', saveEmployee);
document.getElementById('clearDataBtn').addEventListener('click', () => { if (confirm('مسح كل البيانات؟')) { localStorage.clear(); location.reload(); } });
document.getElementById('printCurrentBtn').addEventListener('click', printCurrentSection);
document.getElementById('sumByNameBtn').addEventListener('click', sumByName);
document.getElementById('sumByCategoryBtn').addEventListener('click', sumByCategory);
document.getElementById('inquiryBtn').addEventListener('click', openInquiryModal);
document.getElementById('exportDataBtn').addEventListener('click', exportData);
document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', importData);
document.getElementById('inquiryModal').addEventListener('click', e => { if (e.target.id === 'inquiryModal') closeInquiryModal(); });
renderLoginUI();