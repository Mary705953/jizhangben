/* ============================================================
 * 私人记账本 V4.0 - 纯前端单页应用
 * 多账本隔离 + 树形分类 + 树形账户 + 多维度图表分析
 * 数据全部保存在浏览器 LocalStorage，不联网、不登录、无广告
 * ============================================================ */

/* ==================== 一、数据层 ==================== */
const STORE = { LEDGERS:'private_ledgers', SETTINGS:'private_settings' };
function dataKey(type, ledgerId){ return `private_${type}_${ledgerId}`; }

const DEFAULT_LEDGER = { id:'ledger-default', name:'默认账本', icon:'📒', createdAt:Date.now(), isDefault:true };

const DEFAULT_CATS = {
  expense: [
    { name:'食品酒水', children:['三餐正餐','水果零食','饮料酒水','买菜','柴米调味','伙食费','营养保健'] },
    { name:'购物消费', children:['衣裤鞋帽','洗护用品','美妆护肤','厨房用品','家用纺织','家用清洁','家居饰品','书报杂志','电子数码','家具家电','汽车用品','宠物用品','办公用品','珠宝首饰'] },
    { name:'居家生活', children:['水','电','气','物业','维修','有线电视'] },
    { name:'行车交通', children:['公交地铁','打车租车','加油','停车','保养','违章罚款','驾照','自行车'] },
    { name:'交流通讯', children:['手机话费','网费月费'] },
    { name:'休闲娱乐', children:['运动','聚会','影音娱乐'] },
    { name:'人情费用', children:['孝敬长辈','生日寿辰','红包','白事','婚嫁','满月','乔迁','开学升学','礼物'] },
    { name:'出差旅游', children:['长途交通','住宿','餐饮','门票'] },
    { name:'教育', children:['学费','培训费','书本费'] },
    { name:'医疗', children:['药品','治疗','住院','护理','检查'] },
    { name:'装修费用', children:['装修材料','装修大件','装修人工'] },
    { name:'金融保险', children:['车贷','房贷','首付','税费','保险'] },
    { name:'其他', children:[] }
  ],
  income: [
    { name:'职业收入', children:['工资','奖金','津贴补贴','年终奖'] },
    { name:'兼职副业', children:['劳务报酬','自由职业','稿费','顾问费'] },
    { name:'理财收益', children:['利息','股息分红','基金收益','买卖差价'] },
    { name:'报销返还', children:['差旅报销','医疗报销','垫付返还'] },
    { name:'人情收入', children:['红包','礼金','转账赠予'] },
    { name:'租赁收入', children:['房租收入','其他租赁'] },
    { name:'投资回款', children:['本金收回','退出分红'] },
    { name:'其他收入', children:[] }
  ]
};

const DEFAULT_ACCOUNTS = [
  { id:'acct-l1-cash', groupId:'grp-cash', name:'现金账户', code:'', icon:'💵', iconBg:'#ff9f40', balance:0, isAsset:1, accountType:'asset', children:[] },
  { id:'acct-l1-bank', groupId:'grp-finance', name:'银行账户', code:'', icon:'🏦', iconBg:'#4f7cff', balance:0, isAsset:1, accountType:'asset', children:[] },
  { id:'acct-l1-ecard', groupId:'grp-virtual', name:'电子账户', code:'', icon:'💎', iconBg:'#af52de', balance:0, isAsset:1, accountType:'asset', children:[] }
];

// 账户分组(预置5类)
const DEFAULT_GROUPS = [
  { id:'grp-cash', name:'现金账户', icon:'💵', order:1 },
  { id:'grp-finance', name:'金融账户', icon:'🏦', order:2 },
  { id:'grp-virtual', name:'虚拟账户', icon:'💎', order:3 },
  { id:'grp-invest', name:'投资账户', icon:'📈', order:4 },
  { id:'grp-liability', name:'负债账户', icon:'⚠️', order:5 }
];

// 账户图标候选(扩充去重，共36个)
const ACCT_ICONS = ['💵','🏦','💎','💳','📈','💰','🏠','🚗','📱','🎁','⚠️','💼','🏷️','🎰','💸','📊','🌐','🔗','🏺','🪙','🐷','🍰','☕','🛒','🎮','📚','💊','🔨','✈️','🚀','🏆','🎯','📦','🔒','🔑'];
// 账户图标背景色候选(扩充，共18个)
const ACCT_ICON_BGS = ['#4f7cff','#ff5b5b','#34c759','#ff9f40','#af52de','#00c7be','#ff2d55','#5ac8fa','#ffd60a','#64d2eb','#8e8e93','#bf5af2','#5856d6','#f4533a','#3a8ee6','#ff3b30','#ff9500','#ac8cc3'];

const L1_ICONS = {
  '食品酒水':'🍚','购物消费':'🛍','居家生活':'🏠','行车交通':'🚗','交流通讯':'📱','休闲娱乐':'🎮','人情费用':'🎁','出差旅游':'✈️','教育':'📚','医疗':'💊','装修费用':'🔨','金融保险':'🏦','其他':'💸',
  '职业收入':'💰','兼职副业':'💼','理财收益':'📈','报销返还':'📝','人情收入':'🎀','租赁收入':'🏘','投资回款':'💵','其他收入':'➕'
};

const OLD_TO_NEW_L1 = {
  '餐饮':'食品酒水','交通':'行车交通','购物':'购物消费','娱乐':'休闲娱乐','居住':'居家生活','医疗':'医疗','教育':'教育','通讯':'交流通讯','日用':'购物消费','宠物':'购物消费','旅行':'出差旅游','其他支出':'其他',
  '工资':'职业收入','奖金':'职业收入','投资收益':'理财收益','兼职':'兼职副业','礼金':'人情收入','报销':'报销返还','其他收入':'其他收入'
};

function loadData(key, defVal){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : defVal; }
  catch(e){ console.error('读取失败', key, e); return defVal; }
}
function saveData(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch(e){ console.error('保存失败', key, e); toast('数据保存失败，存储空间可能已满'); return false; }
}

// 账本管理
function getLedgers(){
  let ledgers = loadData(STORE.LEDGERS, null);
  if(!ledgers){
    migrateOldDataToDefaultLedger();
    saveData(STORE.LEDGERS, [DEFAULT_LEDGER]);
    return [DEFAULT_LEDGER];
  }
  return ledgers;
}
function setLedgers(ledgers){ return saveData(STORE.LEDGERS, ledgers); }
function getCurrentLedgerId(){
  const s = getSettings();
  if(s.currentLedgerId && getLedgers().some(l=>l.id===s.currentLedgerId)) return s.currentLedgerId;
  return getLedgers()[0].id;
}
function setCurrentLedgerId(id){ const s = getSettings(); s.currentLedgerId = id; setSettings(s); }

// 旧数据迁移到默认账本
function migrateOldDataToDefaultLedger(){
  const ledgerId = DEFAULT_LEDGER.id;
  const oldCats = loadData('private_categories', null);
  if(oldCats){
    if(oldCats.income && oldCats.income.length && typeof oldCats.income[0] === 'string'){
      Object.assign(oldCats, migrateCatsFromFlat(oldCats));
    }
    saveData(dataKey('categories', ledgerId), oldCats);
  }
  const oldAccts = loadData('private_accounts', null);
  if(oldAccts) saveData(dataKey('accounts', ledgerId), oldAccts);
  const oldBills = loadData('private_bills', []);
  if(oldBills && oldBills.length){
    oldBills.forEach(b=>{
      if(b.categoryL1 === undefined){ b.categoryL1 = OLD_TO_NEW_L1[b.category] || (b.type==='income' ? '其他收入' : '其他'); b.categoryL2 = ''; }
      if(b.accountId === undefined) b.accountId = '';
      if(b.merchant === undefined) b.merchant = '';
      if(b.project === undefined) b.project = '';
      if(b.fromAccountId === undefined) b.fromAccountId = '';
      if(b.toAccountId === undefined) b.toAccountId = '';
      b.ledgerId = ledgerId;
    });
    saveData(dataKey('bills', ledgerId), oldBills);
  }
}

function migrateCatsFromFlat(oldCats){
  const result = { income:[], expense:[] };
  ['income','expense'].forEach(type=>{
    const seen = {};
    (oldCats[type]||[]).forEach(name=>{
      const l1Name = OLD_TO_NEW_L1[name] || name;
      if(!seen[l1Name]){ seen[l1Name] = result[type].length; result[type].push({ name:l1Name, children:[] }); }
      if(OLD_TO_NEW_L1[name]) result[type][seen[l1Name]].children.push(name);
    });
  });
  return result;
}

// 分类(按账本)
function getCats(ledgerId){
  ledgerId = ledgerId || getCurrentLedgerId();
  let cats = loadData(dataKey('categories', ledgerId), null);
  if(!cats){
    saveData(dataKey('categories', ledgerId), DEFAULT_CATS);
    return JSON.parse(JSON.stringify(DEFAULT_CATS));
  }
  if(cats.income && cats.income.length && typeof cats.income[0] === 'string'){
    cats = migrateCatsFromFlat(cats);
    saveData(dataKey('categories', ledgerId), cats);
  }
  ['income','expense'].forEach(t=>{
    if(!Array.isArray(cats[t])) cats[t] = [];
    cats[t].forEach(l1=>{ if(!Array.isArray(l1.children)) l1.children = []; });
  });
  return cats;
}
function setCats(cats, ledgerId){ ledgerId = ledgerId || getCurrentLedgerId(); return saveData(dataKey('categories', ledgerId), cats); }

// 账户(按账本)
function getAccounts(ledgerId){
  ledgerId = ledgerId || getCurrentLedgerId();
  let accts = loadData(dataKey('accounts', ledgerId), null);
  if(!accts){
    saveData(dataKey('accounts', ledgerId), DEFAULT_ACCOUNTS);
    return JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }
  // V5 字段兼容：旧账户补全字段（递归处理多层子账户）
  const groups = getGroups(ledgerId);
  const firstGroupId = groups[0] ? groups[0].id : 'grp-cash';
  function normalize(node, parentGroupId, parentIconBg){
    if(!Array.isArray(node.children)) node.children = [];
    if(typeof node.isAsset !== 'number') node.isAsset = 1;
    if(typeof node.balance !== 'number') node.balance = 0;
    if(!node.accountType) node.accountType = 'asset';
    if(!node.id) node.id = genId();
    if(!node.groupId) node.groupId = parentGroupId || firstGroupId;
    if(!node.icon) node.icon = '💳';
    if(!node.iconBg) node.iconBg = parentIconBg || '#4f7cff';
    node.children.forEach(c=> normalize(c, node.groupId, node.iconBg));
  }
  accts.forEach(a=> normalize(a));
  return accts;
}
function setAccounts(accts, ledgerId){ ledgerId = ledgerId || getCurrentLedgerId(); return saveData(dataKey('accounts', ledgerId), accts); }

// 账户分组(按账本)
function getGroups(ledgerId){
  ledgerId = ledgerId || getCurrentLedgerId();
  let groups = loadData(dataKey('groups', ledgerId), null);
  if(!groups){
    saveData(dataKey('groups', ledgerId), DEFAULT_GROUPS);
    return JSON.parse(JSON.stringify(DEFAULT_GROUPS));
  }
  // 兼容旧数据：补 order 字段
  groups.forEach((g, i)=>{ if(typeof g.order !== 'number') g.order = i + 1; });
  return groups;
}
function setGroups(groups, ledgerId){ ledgerId = ledgerId || getCurrentLedgerId(); return saveData(dataKey('groups', ledgerId), groups); }

// 账单(按账本)
function getBills(ledgerId){
  ledgerId = ledgerId || getCurrentLedgerId();
  let bills = loadData(dataKey('bills', ledgerId), []);
  let dirty = false;
  bills.forEach(b=>{
    if(b.categoryL1 === undefined){ b.categoryL1 = OLD_TO_NEW_L1[b.category] || (b.type==='income' ? '其他收入' : '其他'); b.categoryL2 = ''; dirty = true; }
    if(b.accountId === undefined){ b.accountId = ''; dirty = true; }
    if(b.merchant === undefined){ b.merchant = ''; dirty = true; }
    if(b.project === undefined){ b.project = ''; dirty = true; }
    if(b.fromAccountId === undefined){ b.fromAccountId = ''; dirty = true; }
    if(b.toAccountId === undefined){ b.toAccountId = ''; dirty = true; }
  });
  if(dirty) saveData(dataKey('bills', ledgerId), bills);
  return bills;
}
function setBills(bills, ledgerId){ ledgerId = ledgerId || getCurrentLedgerId(); return saveData(dataKey('bills', ledgerId), bills); }

// 预算(按账本)
function getBudgets(ledgerId){ ledgerId = ledgerId || getCurrentLedgerId(); return loadData(dataKey('budgets', ledgerId), {}); }
function setBudgets(budgets, ledgerId){ ledgerId = ledgerId || getCurrentLedgerId(); return saveData(dataKey('budgets', ledgerId), budgets); }
function getBudget(month, ledgerId){ const all = getBudgets(ledgerId); return all[month] || { total:0, byCategory:{} }; }
function setBudget(month, budget, ledgerId){ const all = getBudgets(ledgerId); all[month] = budget; setBudgets(all, ledgerId); }

// 设置(全局)
function getSettings(){
  let s = loadData(STORE.SETTINGS, {theme:'light'});
  if(!s.merchants) s.merchants = {};
  if(!s.projects) s.projects = {};
  if(typeof s.hideAmount !== 'boolean') s.hideAmount = false;
  if(typeof s.bannerIndex !== 'number') s.bannerIndex = 0;
  return s;
}
function setSettings(s){ return saveData(STORE.SETTINGS, s); }
function getHistory(ledgerId, field){ ledgerId = ledgerId || getCurrentLedgerId(); const s = getSettings(); return (s[field] && s[field][ledgerId]) || []; }
function addHistory(ledgerId, field, value){
  if(!value) return;
  ledgerId = ledgerId || getCurrentLedgerId();
  const s = getSettings();
  if(!s[field]) s[field] = {};
  if(!s[field][ledgerId]) s[field][ledgerId] = [];
  if(!s[field][ledgerId].includes(value)){
    s[field][ledgerId].push(value);
    if(s[field][ledgerId].length > 50) s[field][ledgerId].shift();
    setSettings(s);
  }
}

/* ==================== 二、应用状态 ==================== */
let editingId = null;
let currentType = 'expense';
let currentTags = [];
let homeChartType = 'pie';
let acctFlowId = null;
let statTab = 'expense';
let statSubTab = 'category';
let statRange = 'thisMonth';
let statStart = '';
let statEnd = '';
let statChartType = 'pie';
let drillState = {};
let acctModalSelectedIcon = '💳';
let acctModalSelectedIconBg = '#4f7cff';

/* ==================== 三、工具函数 ==================== */
function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function fmtMoney(n){ const num = Number(n) || 0; return num.toLocaleString('zh-CN',{minimumFractionDigits:2, maximumFractionDigits:2}); }
// 脱敏金额：根据设置决定是否显示星号
function fmtMoneyMask(n){
  const s = getSettings();
  if(s.hideAmount) return '****.**';
  return fmtMoney(n);
}
// 按分组扁平化账户（递归多层子账户，带 parentId/level/parentName）
function flattenAccountsByGroup(ledgerId){
  const accts = getAccounts(ledgerId);
  const list = [];
  function walk(node, parentId, level, parentName){
    list.push({...node, parentId, level, hasChildren:(node.children||[]).length>0, parentName});
    (node.children||[]).forEach(c=> walk(c, node.id, level+1, node.name));
  }
  accts.forEach(a=> walk(a, null, 1, null));
  return list;
}
function fmtDate(d){ const dt = d instanceof Date ? d : new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; }
function monthLabel(d){ const dt = new Date(d); return `${dt.getFullYear()}年${dt.getMonth()+1}月`; }
function monthKey(d){ const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`; }
function isThisMonth(dateStr){ const dt = new Date(dateStr); const now = new Date(); return dt.getFullYear()===now.getFullYear() && dt.getMonth()===now.getMonth(); }
function friendlyDate(dateStr){
  const today = fmtDate(new Date());
  const yest = fmtDate(new Date(Date.now()-86400000));
  if(dateStr === today) return '今天';
  if(dateStr === yest) return '昨天';
  return dateStr;
}
function catIcon(l1){ return (l1 && L1_ICONS[l1]) || '📌'; }
function catText(bill){ if(bill.type==='transfer') return '账户转账'; return bill.categoryL2 ? `${bill.categoryL1} · ${bill.categoryL2}` : (bill.categoryL1 || '未分类'); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

let toastTimer = null;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 1800);
}
function confirmBox(msg){
  return new Promise(resolve=>{
    const mask = document.getElementById('confirmMask');
    document.getElementById('confirmMsg').textContent = msg;
    mask.classList.add('show');
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    const cleanup = (val)=>{ mask.classList.remove('show'); ok.onclick=null; cancel.onclick=null; resolve(val); };
    ok.onclick = ()=>cleanup(true);
    cancel.onclick = ()=>cleanup(false);
  });
}
function getCssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#ffffff'; }

// 时间范围
function getTimeRange(){
  const now = new Date();
  let start, end;
  if(statRange === 'thisMonth'){ start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
  else if(statRange === 'lastMonth'){ start = new Date(now.getFullYear(), now.getMonth()-1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
  else if(statRange === 'last3'){ start = new Date(now.getFullYear(), now.getMonth()-2, 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
  else if(statRange === 'thisYear'){ start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); }
  else if(statRange === 'lastYear'){ start = new Date(now.getFullYear()-1, 0, 1); end = new Date(now.getFullYear()-1, 11, 31); }
  else if(statRange === 'custom'){ start = statStart ? new Date(statStart) : null; end = statEnd ? new Date(statEnd) : null; }
  return { start: start?fmtDate(start):'', end: end?fmtDate(end):'' };
}

function findAccountById(id, ledgerId, accts){
  // 若传入 accts 则复用（保证修改能写回同一对象树），否则自行获取
  const list = accts || getAccounts(ledgerId);
  // 递归查找（支持多层嵌套）
  function search(nodes, parent){
    for(const node of nodes){
      if(node.id===id) return { node, parent, list:nodes };
      if(node.children && node.children.length){
        const r = search(node.children, node);
        if(r) return r;
      }
    }
    return null;
  }
  return search(list, null) || { node:null, parent:null, list:null };
}
function accountName(id, ledgerId){
  if(!id) return '未指定';
  const { node } = findAccountById(id, ledgerId);
  if(!node) return '已删除账户';
  return node.code ? `${node.name}(${node.code})` : node.name;
}

/* ==================== 四、页面导航 ==================== */
const PAGE_TITLES = { home:'私人记账本', add:'记一笔', list:'账单列表', categories:'分类管理', accounts:'账户管理', backup:'备份与设置', acctflow:'账户流水', stats:'统计分析', budget:'预算管理', ledgers:'账本管理' };
const SUB_PAGES = ['acctflow'];

function goPage(pageName){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+pageName).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.page===pageName));
  document.getElementById('pageTitle').textContent = PAGE_TITLES[pageName] || '';
  document.getElementById('backBtn').classList.toggle('show', SUB_PAGES.includes(pageName));
  document.querySelector('.app-content').scrollTop = 0;
  if(pageName==='add' && !editingId) resetAddForm();
  if(pageName==='home') renderHome();
  if(pageName==='list') renderList();
  if(pageName==='categories') renderCategories();
  if(pageName==='accounts') renderAccounts();
  if(pageName==='backup') renderBackup();
  if(pageName==='stats') renderStats();
  if(pageName==='budget') renderBudget();
  if(pageName==='ledgers') renderLedgers();
  if(pageName==='add'){ renderCategoryCascade(); renderAccountSelects(); }
  if(pageName==='acctflow') renderAcctFlow();
}

/* ==================== 五、首页 ==================== */
function renderHome(){
  const ledgerId = getCurrentLedgerId();
  const bills = getBills(ledgerId);
  const monthBills = bills.filter(b=>isThisMonth(b.date) && b.type!=='transfer');
  let income = 0, expense = 0;
  const expenseByL1 = {};
  monthBills.forEach(b=>{
    if(b.type==='income') income += Number(b.amount);
    else if(b.type==='expense'){ expense += Number(b.amount); const l1 = b.categoryL1 || '其他'; expenseByL1[l1] = (expenseByL1[l1]||0) + Number(b.amount); }
  });
  const balance = income - expense;
  document.getElementById('homeMonth').textContent = monthLabel(new Date()) + ' · 本月结余';
  document.getElementById('homeBalance').textContent = (balance>=0? '' : '-') + fmtMoney(Math.abs(balance));
  document.getElementById('homeBalance').style.color = balance<0 ? '#ffd0d0' : '#fff';
  document.getElementById('homeIncome').textContent = fmtMoney(income);
  document.getElementById('homeExpense').textContent = fmtMoney(expense);
  renderAssetsSummary(ledgerId);
  const wrap = document.getElementById('homeChartWrap');
  if(homeChartType==='pie') renderPieChart(wrap, expenseByL1, expense, '总支出', ()=>goPage('stats'));
  else renderBarChart(wrap, expenseByL1, expense, ()=>goPage('stats'));
  const recent = [...bills].sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  renderBillItems('homeRecent', recent, ledgerId);
  if(recent.length===0) document.getElementById('homeRecent').innerHTML = '<div class="empty-tip">还没有账单，点"记一笔"开始记录吧</div>';
}

function renderAssetsSummary(ledgerId){
  const accts = getAccounts(ledgerId);
  let totalAsset = 0, totalLiability = 0;
  const chips = [];
  // 递归遍历所有账户层级
  function walk(node){
    const bal = Number(node.balance)||0;
    if(node.accountType==='liability'){ if(node.isAsset) totalLiability += Math.abs(bal); }
    else { if(node.isAsset) totalAsset += bal; }
    chips.push({ id:node.id, name:node.name, bal, isAsset:node.isAsset, type:node.accountType });
    (node.children||[]).forEach(walk);
  }
  accts.forEach(walk);
  document.getElementById('homeAssetsTotal').textContent = fmtMoney(totalAsset - totalLiability);
  const showChips = chips.filter(c=>c.isAsset);
  document.getElementById('homeAssetsList').innerHTML = showChips.map(c=>`
    <div class="chip"><div class="n">${escapeHtml(c.name)}</div><div class="v" style="color:${c.type==='liability'?'var(--liability)':'var(--text)'}">¥${fmtMoney(c.bal)}</div></div>
  `).join('') || '<div class="empty-tip" style="padding:6px 0;">暂无计入资产的账户</div>';
}

/* ==================== 六、图表绘制 ==================== */
function renderPieChart(container, data, total, centerLabel, onItemClick){
  let html = `<div class="pie-wrap"><div class="pie-canvas-box"><canvas width="280" height="280"></canvas><div class="pie-center"><div class="lbl">${centerLabel||'总计'}</div><div class="val">¥${fmtMoney(total)}</div></div></div><div class="pie-legend"></div></div>`;
  container.innerHTML = html;
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const cx = W/2, cy = H/2;
  const r = Math.min(W,H)/2 - 8;
  const legend = container.querySelector('.pie-legend');
  if(total<=0 || Object.keys(data).length===0){
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.lineWidth = 28; ctx.strokeStyle = getCssVar('--input-bg'); ctx.stroke();
    legend.innerHTML = '<div class="empty-tip">暂无数据</div>';
    return;
  }
  const colors = ['#4f7cff','#ff5b5b','#34c759','#ff9f40','#af52de','#00c7be','#ff2d55','#5ac8fa','#ffd60a','#ff6482','#64d2eb','#bf5af2'];
  const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  let startAngle = -Math.PI/2;
  const sectors = [];
  const legendHtml = [];
  sorted.forEach(([key, amt], i)=>{
    const color = colors[i % colors.length];
    const angle = (amt/total) * Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle+angle);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    sectors.push({ key, color, startAngle, endAngle: startAngle+angle });
    startAngle += angle;
    const pct = (amt/total*100).toFixed(1);
    legendHtml.push(`<div class="li" data-key="${escapeHtml(key)}"><div class="left"><span class="dot" style="background:${color}"></span>${escapeHtml(key)} <span style="color:var(--text-sub);font-size:11px;">${pct}%</span></div><span class="amt">¥${fmtMoney(amt)}</span></div>`);
  });
  legend.innerHTML = legendHtml.join('');
  ctx.beginPath(); ctx.arc(cx, cy, r-14, 0, Math.PI*2);
  ctx.fillStyle = getCssVar('--card'); ctx.fill();
  if(onItemClick){
    canvas.onclick = (e)=>{
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (W/rect.width);
      const y = (e.clientY - rect.top) * (H/rect.height);
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist > r || dist < r-14) return;
      let ang = Math.atan2(dy, dx);
      if(ang < -Math.PI/2) ang += Math.PI*2;
      for(const s of sectors){ if(ang >= s.startAngle && ang <= s.endAngle){ onItemClick(s.key); return; } }
    };
    legend.querySelectorAll('.li').forEach(li=>{ li.onclick = ()=>onItemClick(li.dataset.key); });
  }
}

function renderBarChart(container, data, total, onItemClick){
  const sorted = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  if(sorted.length===0 || total<=0){ container.innerHTML = '<div class="empty-tip">暂无数据</div>'; return; }
  const maxVal = sorted[0][1];
  const colors = ['#4f7cff','#ff5b5b','#34c759','#ff9f40','#af52de','#00c7be','#ff2d55','#5ac8fa','#ffd60a','#ff6482','#64d2eb','#bf5af2'];
  let html = '<div class="bar-list">';
  sorted.forEach(([key, amt], i)=>{
    const pct = (amt/maxVal*100).toFixed(1);
    const color = colors[i % colors.length];
    const amtPct = (amt/total*100).toFixed(1);
    html += `<div class="bar-item" data-key="${escapeHtml(key)}" style="margin-bottom:8px;cursor:pointer;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>${escapeHtml(key)}</span><span style="color:var(--text-sub)">¥${fmtMoney(amt)} · ${amtPct}%</span></div>
      <div style="height:8px;background:var(--input-bg);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div></div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
  if(onItemClick) container.querySelectorAll('.bar-item').forEach(el=>{ el.onclick = ()=>onItemClick(el.dataset.key); });
}

function renderTrendChart(container, months, values, color, label){
  const maxVal = Math.max(...values, 1);
  let html = '<div class="bar-list">';
  months.forEach((m, i)=>{
    const pct = (values[i]/maxVal*100).toFixed(1);
    html += `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span>${m}</span><span style="color:var(--text-sub)">¥${fmtMoney(values[i])}</span></div>
      <div style="height:8px;background:var(--input-bg);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div></div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderCompareChart(container, months, incomeArr, expenseArr){
  const maxVal = Math.max(...incomeArr, ...expenseArr, 1);
  let html = '<div class="bar-list">';
  months.forEach((m, i)=>{
    const inPct = (incomeArr[i]/maxVal*100).toFixed(1);
    const outPct = (expenseArr[i]/maxVal*100).toFixed(1);
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:12px;color:var(--text-sub);margin-bottom:3px;">${m}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <span style="font-size:11px;width:32px;color:var(--income)">收入</span>
        <div style="flex:1;height:8px;background:var(--input-bg);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${inPct}%;background:var(--income);border-radius:4px;"></div></div>
        <span style="font-size:11px;color:var(--text-sub);width:60px;text-align:right;">¥${fmtMoney(incomeArr[i])}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:11px;width:32px;color:var(--expense)">支出</span>
        <div style="flex:1;height:8px;background:var(--input-bg);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${outPct}%;background:var(--expense);border-radius:4px;"></div></div>
        <span style="font-size:11px;color:var(--text-sub);width:60px;text-align:right;">¥${fmtMoney(expenseArr[i])}</span>
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// 渲染账单条目
function renderBillItems(containerId, bills, ledgerId){
  const el = document.getElementById(containerId);
  if(bills.length===0){ el.innerHTML = '<div class="empty-tip">暂无账单记录</div>'; return; }
  const groups = {};
  bills.forEach(b=>{ if(!groups[b.date]) groups[b.date] = []; groups[b.date].push(b); });
  const dates = Object.keys(groups).sort((a,b)=>a<b?1:-1);
  let html = '';
  dates.forEach(date=>{
    let dayIn=0, dayOut=0;
    groups[date].forEach(b=>{ if(b.type==='income') dayIn += Number(b.amount); else if(b.type==='expense') dayOut += Number(b.amount); });
    let daySum = '';
    if(dayIn>0) daySum += `<span style="color:var(--income)">+¥${fmtMoney(dayIn)}</span> `;
    if(dayOut>0) daySum += `<span style="color:var(--expense)">-¥${fmtMoney(dayOut)}</span>`;
    html += `<div class="list-group-title"><span>${friendlyDate(date)}</span><span>${daySum}</span></div>`;
    groups[date].forEach(b=>{
      let prefix, cls, icon, info;
      if(b.type==='transfer'){ prefix = ''; cls = 'transfer'; icon = '🔄'; info = `${accountName(b.fromAccountId, ledgerId)} → ${accountName(b.toAccountId, ledgerId)}`; }
      else { prefix = b.type==='income' ? '+' : '-'; cls = b.type==='income' ? 'income' : 'expense'; icon = catIcon(b.categoryL1); info = catText(b); }
      const tags = (b.tags||[]).map(t=>`<span class="tag" style="color:var(--tag-text)">#${t}</span>`).join('');
      const acctSuffix = b.type==='transfer' ? '' : ` · ${accountName(b.accountId, ledgerId)}`;
      const merchSuffix = b.merchant ? ` · ${b.merchant}` : '';
      html += `<div class="bill-item" data-id="${b.id}">
        <div class="icon">${icon}</div>
        <div class="info">
          <div class="cat">${info}${merchSuffix}</div>
          <div class="meta">${friendlyDate(b.date)}${b.remark?' · '+b.remark:''}${acctSuffix}${b.project?' · 项目:'+b.project:''}${tags}</div>
        </div>
        <div class="amt ${cls}">${prefix}¥${fmtMoney(b.amount)}</div>
      </div>`;
    });
  });
  el.innerHTML = html;
  el.querySelectorAll('.bill-item').forEach(item=>{ item.addEventListener('click', ()=>startEdit(item.dataset.id)); });
}

/* ==================== 七、新增/编辑账单 ==================== */
function resetAddForm(){
  editingId = null;
  currentType = 'expense';
  currentTags = [];
  document.querySelectorAll('#typeSwitch button').forEach(b=>b.classList.toggle('active', b.dataset.type==='expense'));
  document.getElementById('amountInput').value = '';
  document.getElementById('amountInput').className = 'amount-input expense';
  document.getElementById('remarkInput').value = '';
  document.getElementById('dateInput').value = fmtDate(new Date());
  document.getElementById('tagInput').value = '';
  document.getElementById('merchantInput').value = '';
  document.getElementById('projectInput').value = '';
  renderTags();
  document.getElementById('saveBtn').textContent = '保存账单';
  const actions = document.getElementById('addActions');
  const del = actions.querySelector('.btn-danger');
  if(del) del.remove();
  applyTypeUI();
  renderCategoryCascade();
  renderAccountSelects();
}

function applyTypeUI(){
  const isTransfer = currentType === 'transfer';
  document.getElementById('acctPairField').style.display = isTransfer ? '' : 'none';
  document.getElementById('accountField').style.display = isTransfer ? 'none' : '';
  document.getElementById('categoryField').style.display = isTransfer ? 'none' : '';
  document.getElementById('merchantField').style.display = isTransfer ? 'none' : '';
  document.getElementById('projectField').style.display = isTransfer ? 'none' : '';
  document.getElementById('amountInput').className = 'amount-input ' + currentType;
  if(!isTransfer) renderCategoryCascade();
}

function renderTags(){
  const wrap = document.getElementById('tagWrap');
  wrap.querySelectorAll('.tag-chip').forEach(el=>el.remove());
  const input = document.getElementById('tagInput');
  currentTags.forEach(t=>{
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `#${t}<span class="x" data-tag="${t}">×</span>`;
    chip.querySelector('.x').onclick = ()=>{ currentTags = currentTags.filter(x=>x!==t); renderTags(); };
    wrap.insertBefore(chip, input);
  });
}

function switchType(type){
  currentType = type;
  document.querySelectorAll('#typeSwitch button').forEach(b=>b.classList.toggle('active', b.dataset.type===type));
  applyTypeUI();
}

function renderAccountSelects(){
  const ledgerId = getCurrentLedgerId();
  const accts = getAccounts(ledgerId);
  const acctSel = document.getElementById('accountSelect');
  const fromSel = document.getElementById('fromAccountSelect');
  const toSel = document.getElementById('toAccountSelect');
  const prevAcct = editingId ? '' : (acctSel.dataset.val || '');
  const prevFrom = editingId ? '' : (fromSel.dataset.val || '');
  const prevTo = editingId ? '' : (toSel.dataset.val || '');
  const optHtml = (function build(list, prefix){
    return list.map(a=>{
      const code = a.code ? ' ('+escapeHtml(a.code)+')' : '';
      const kids = a.children && a.children.length ? build(a.children, prefix+'　├ ') : '';
      return `<option value="${a.id}">${prefix}${escapeHtml(a.name)}${code}</option>${kids}`;
    }).join('');
  })(accts, '');
  acctSel.innerHTML = '<option value="">请选择账户</option>' + optHtml;
  fromSel.innerHTML = '<option value="">源账户</option>' + optHtml;
  toSel.innerHTML = '<option value="">目标账户</option>' + optHtml;
  if(prevAcct) acctSel.value = prevAcct;
  if(prevFrom) fromSel.value = prevFrom;
  if(prevTo) toSel.value = prevTo;
}

function renderCategoryCascade(){
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  const type = currentType==='income' ? 'income' : 'expense';
  const list = cats[type] || [];
  const l1Sel = document.getElementById('categoryL1');
  const l2Sel = document.getElementById('categoryL2');
  const prevL1 = l1Sel.dataset.val || '';
  l1Sel.innerHTML = list.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
  if(prevL1 && list.some(c=>c.name===prevL1)) l1Sel.value = prevL1;
  refreshL2Options(l1Sel.value, l2Sel);
  l1Sel.onchange = ()=>refreshL2Options(l1Sel.value, l2Sel);
}

function refreshL2Options(l1Name, l2Sel){
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  const type = currentType==='income' ? 'income' : 'expense';
  const l1 = (cats[type]||[]).find(c=>c.name===l1Name);
  const children = (l1 && l1.children) || [];
  l2Sel.innerHTML = '<option value="">不选二级</option>' + children.map(c=>`<option value="${c}">${c}</option>`).join('');
  l2Sel.disabled = children.length===0;
  const prevL2 = l2Sel.dataset.val || '';
  if(prevL2 && children.includes(prevL2)) l2Sel.value = prevL2;
}

function setupSuggest(inputId, suggestId, field){
  const input = document.getElementById(inputId);
  const suggest = document.getElementById(suggestId);
  input.addEventListener('input', ()=>{
    const kw = input.value.trim().toLowerCase();
    const history = getHistory(getCurrentLedgerId(), field);
    if(!kw){ suggest.classList.remove('show'); return; }
    const matches = history.filter(h=>h.toLowerCase().includes(kw)).slice(0,8);
    if(matches.length===0){ suggest.classList.remove('show'); return; }
    suggest.innerHTML = matches.map(m=>`<div class="item">${escapeHtml(m)}</div>`).join('');
    suggest.classList.add('show');
    suggest.querySelectorAll('.item').forEach(item=>{ item.onclick = ()=>{ input.value = item.textContent; suggest.classList.remove('show'); }; });
  });
  input.addEventListener('blur', ()=>setTimeout(()=>suggest.classList.remove('show'), 200));
}

async function saveBill(){
  const ledgerId = getCurrentLedgerId();
  const amount = parseFloat(document.getElementById('amountInput').value);
  const date = document.getElementById('dateInput').value;
  const remark = document.getElementById('remarkInput').value.trim();
  if(!amount || amount<=0){ toast('请输入有效金额'); return; }
  if(!date){ toast('请选择日期'); return; }
  const merchant = document.getElementById('merchantInput').value.trim();
  const project = document.getElementById('projectInput').value.trim();
  const bills = getBills(ledgerId);
  if(currentType==='transfer'){
    const fromId = document.getElementById('fromAccountSelect').value;
    const toId = document.getElementById('toAccountSelect').value;
    if(!fromId || !toId){ toast('请选择源账户和目标账户'); return; }
    if(fromId===toId){ toast('源账户和目标账户不能相同'); return; }
    if(editingId){
      const old = bills.find(b=>b.id===editingId);
      if(old && old.type==='transfer') applyTransferToAccounts(old.fromAccountId, old.toAccountId, -Number(old.amount), ledgerId);
      else if(old) applyBillToAccount(old, -1, ledgerId);
      applyTransferToAccounts(fromId, toId, amount, ledgerId);
      const idx = bills.findIndex(b=>b.id===editingId);
      bills[idx] = {...bills[idx], ledgerId, type:'transfer', amount, fromAccountId:fromId, toAccountId:toId, categoryL1:'', categoryL2:'', accountId:'', merchant:'', project:'', date, remark, tags:[...currentTags]};
      setBills(bills, ledgerId);
      toast('已更新');
      editingId = null;
    } else {
      applyTransferToAccounts(fromId, toId, amount, ledgerId);
      bills.push({ id:genId(), ledgerId, type:'transfer', amount, fromAccountId:fromId, toAccountId:toId, categoryL1:'', categoryL2:'', accountId:'', merchant:'', project:'', tags:[...currentTags], date, remark, createdAt:Date.now() });
      setBills(bills, ledgerId);
      toast('已保存');
    }
    resetAddForm();
    goPage('home');
    return;
  }
  const categoryL1 = document.getElementById('categoryL1').value;
  const categoryL2 = document.getElementById('categoryL2').value;
  const accountId = document.getElementById('accountSelect').value;
  if(!categoryL1){ toast('请选择一级分类'); return; }
  if(!accountId){ toast('请选择归属账户'); return; }
  if(merchant) addHistory(ledgerId, 'merchants', merchant);
  if(project) addHistory(ledgerId, 'projects', project);
  if(editingId){
    const old = bills.find(b=>b.id===editingId);
    if(old){
      if(old.type==='transfer') applyTransferToAccounts(old.fromAccountId, old.toAccountId, -Number(old.amount), ledgerId);
      else applyBillToAccount(old, -1, ledgerId);
    }
    const idx = bills.findIndex(b=>b.id===editingId);
    bills[idx] = {...bills[idx], ledgerId, type:currentType, amount, categoryL1, categoryL2, accountId, fromAccountId:'', toAccountId:'', merchant, project, date, remark, tags:[...currentTags]};
    applyBillToAccount(bills[idx], 1, ledgerId);
    setBills(bills, ledgerId);
    toast('已更新');
    editingId = null;
  } else {
    const newBill = { id:genId(), ledgerId, type:currentType, amount, categoryL1, categoryL2, accountId, fromAccountId:'', toAccountId:'', merchant, project, tags:[...currentTags], date, remark, createdAt:Date.now() };
    applyBillToAccount(newBill, 1, ledgerId);
    bills.push(newBill);
    setBills(bills, ledgerId);
    toast('已保存');
  }
  resetAddForm();
  goPage('home');
}

function applyBillToAccount(bill, sign, ledgerId){
  if(!bill.accountId) return;
  const { node } = findAccountById(bill.accountId, ledgerId);
  if(!node) return;
  const amt = Number(bill.amount) * sign;
  if(bill.type==='income') node.balance = Number(node.balance) + amt;
  else if(bill.type==='expense') node.balance = Number(node.balance) - amt;
  saveAccountsAfterEdit(bill.accountId, node, ledgerId);
}
function applyTransferToAccounts(fromId, toId, amount, ledgerId){
  const amt = Number(amount);
  const { node:fromNode } = findAccountById(fromId, ledgerId);
  const { node:toNode } = findAccountById(toId, ledgerId);
  if(fromNode){ fromNode.balance = Number(fromNode.balance) - amt; saveAccountsAfterEdit(fromId, fromNode, ledgerId); }
  if(toNode){ toNode.balance = Number(toNode.balance) + amt; saveAccountsAfterEdit(toId, toNode, ledgerId); }
}
function saveAccountsAfterEdit(id, node, ledgerId){
  const accts = getAccounts(ledgerId);
  function update(list){
    for(const n of list){
      if(n.id===id){ Object.assign(n, node); return true; }
      if(n.children && n.children.length && update(n.children)) return true;
    }
    return false;
  }
  update(accts);
  setAccounts(accts, ledgerId);
}

function startEdit(id){
  const ledgerId = getCurrentLedgerId();
  const bills = getBills(ledgerId);
  const bill = bills.find(b=>b.id===id);
  if(!bill) return;
  editingId = id;
  goPage('add');
  switchType(bill.type);
  document.getElementById('amountInput').value = bill.amount;
  if(bill.type==='transfer'){
    document.getElementById('fromAccountSelect').dataset.val = bill.fromAccountId || '';
    document.getElementById('toAccountSelect').dataset.val = bill.toAccountId || '';
  } else {
    document.getElementById('categoryL1').dataset.val = bill.categoryL1 || '';
    document.getElementById('categoryL2').dataset.val = bill.categoryL2 || '';
    document.getElementById('accountSelect').dataset.val = bill.accountId || '';
    document.getElementById('merchantInput').value = bill.merchant || '';
    document.getElementById('projectInput').value = bill.project || '';
  }
  renderAccountSelects();
  renderCategoryCascade();
  document.getElementById('dateInput').value = bill.date;
  document.getElementById('remarkInput').value = bill.remark || '';
  currentTags = [...(bill.tags||[])];
  renderTags();
  document.getElementById('saveBtn').textContent = '更新账单';
  const actions = document.getElementById('addActions');
  if(!actions.querySelector('.btn-danger')){
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = '删除';
    delBtn.onclick = async ()=>{
      if(await confirmBox('确认删除这条账单？\n删除后账户余额会自动回退。')){
        const all = getBills(ledgerId);
        const target = all.find(b=>b.id===editingId);
        if(target){
          if(target.type==='transfer') applyTransferToAccounts(target.fromAccountId, target.toAccountId, -target.amount, ledgerId);
          else applyBillToAccount(target, -1, ledgerId);
        }
        setBills(all.filter(b=>b.id!==editingId), ledgerId);
        toast('已删除');
        resetAddForm();
        goPage('home');
      }
    };
    actions.appendChild(delBtn);
  }
}

/* ==================== 八、账单列表 ==================== */
function renderList(){
  const ledgerId = getCurrentLedgerId();
  refreshFilterCascade(ledgerId);
  const bills = getBills(ledgerId);
  const kw = document.getElementById('searchInput').value.trim().toLowerCase();
  const start = document.getElementById('filterStart').value;
  const end = document.getElementById('filterEnd').value;
  const ftype = document.getElementById('filterType').value;
  const fAcct = document.getElementById('filterAccount').value;
  const fL1 = document.getElementById('filterL1').value;
  const fL2 = document.getElementById('filterL2').value;
  const fMerch = document.getElementById('filterMerchant').value;
  const fProj = document.getElementById('filterProject').value;
  let filtered = bills.filter(b=>{
    if(kw){
      const text = (b.remark||'') + ' ' + (b.categoryL1||'') + ' ' + (b.categoryL2||'') + ' ' + (b.tags||[]).join(' ') + ' ' + (b.merchant||'') + ' ' + (b.project||'') + ' ' + accountName(b.accountId, ledgerId) + ' ' + accountName(b.fromAccountId, ledgerId) + ' ' + accountName(b.toAccountId, ledgerId);
      if(!text.toLowerCase().includes(kw)) return false;
    }
    if(start && b.date < start) return false;
    if(end && b.date > end) return false;
    if(ftype && b.type!==ftype) return false;
    if(fAcct && b.accountId!==fAcct && b.fromAccountId!==fAcct && b.toAccountId!==fAcct) return false;
    if(fL1 && b.categoryL1!==fL1) return false;
    if(fL2 && b.categoryL2!==fL2) return false;
    if(fMerch && b.merchant!==fMerch) return false;
    if(fProj && b.project!==fProj) return false;
    return true;
  });
  filtered.sort((a,b)=> a.date<b.date ? 1 : (a.date>b.date?-1:(b.createdAt-a.createdAt)));
  renderBillItems('billList', filtered, ledgerId);
  if(filtered.length===0) document.getElementById('billList').innerHTML = '<div class="empty-tip">没有符合条件的账单</div>';
}

function refreshFilterCascade(ledgerId){
  const cats = getCats(ledgerId);
  const allL1 = [...(cats.income||[]).map(c=>c.name), ...(cats.expense||[]).map(c=>c.name)];
  const l1Sel = document.getElementById('filterL1');
  const l2Sel = document.getElementById('filterL2');
  const prevL1 = l1Sel.value;
  l1Sel.innerHTML = '<option value="">一级分类</option>' + allL1.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(allL1.includes(prevL1)) l1Sel.value = prevL1;
  const l1Name = l1Sel.value;
  let children = [];
  ['income','expense'].forEach(t=>{ const found = (cats[t]||[]).find(c=>c.name===l1Name); if(found) children = found.children || []; });
  const prevL2 = l2Sel.value;
  l2Sel.innerHTML = '<option value="">二级分类</option>' + children.map(c=>`<option value="${c}">${c}</option>`).join('');
  l2Sel.disabled = children.length===0;
  if(children.includes(prevL2)) l2Sel.value = prevL2;
  l1Sel.onchange = ()=>{ document.getElementById('filterL2').value=''; renderList(); };
  const acctSel = document.getElementById('filterAccount');
  const prevAcct = acctSel.value;
  const accts = getAccounts(ledgerId);
  let acctHtml = '<option value="">全部账户</option>';
  function buildOpts(list, prefix){
    list.forEach(a=>{
      acctHtml += `<option value="${a.id}">${prefix}${escapeHtml(a.name)}</option>`;
      if(a.children && a.children.length) buildOpts(a.children, prefix + '　├ ');
    });
  }
  buildOpts(accts, '');
  acctSel.innerHTML = acctHtml;
  if(prevAcct) acctSel.value = prevAcct;
  const merchants = getHistory(ledgerId, 'merchants');
  const projects = getHistory(ledgerId, 'projects');
  const merchSel = document.getElementById('filterMerchant');
  const projSel = document.getElementById('filterProject');
  const prevM = merchSel.value, prevP = projSel.value;
  merchSel.innerHTML = '<option value="">全部商家</option>' + merchants.map(m=>`<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  projSel.innerHTML = '<option value="">全部项目</option>' + projects.map(p=>`<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  if(prevM) merchSel.value = prevM;
  if(prevP) projSel.value = prevP;
}

function clearFilters(){
  ['searchInput','filterStart','filterEnd','filterType','filterL1','filterL2','filterAccount','filterMerchant','filterProject'].forEach(id=>{ document.getElementById(id).value = ''; });
  renderList();
}

/* ==================== 九、统计分析 ==================== */
function renderStats(){
  const ledgerId = getCurrentLedgerId();
  const bills = getBills(ledgerId);
  const { start, end } = getTimeRange();
  document.getElementById('statStart').value = start;
  document.getElementById('statEnd').value = end;
  const rangeBills = bills.filter(b=> (!start || b.date >= start) && (!end || b.date <= end));
  const content = document.getElementById('statContent');
  if(statTab === 'expense') renderStatExpense(content, rangeBills, ledgerId);
  else if(statTab === 'income') renderStatIncome(content, rangeBills, ledgerId);
  else if(statTab === 'asset') renderStatAsset(content, ledgerId);
  else if(statTab === 'monthly') renderStatMonthly(content, bills, ledgerId);
  else if(statTab === 'yearly') renderStatYearly(content, bills, ledgerId);
}

function renderStatSection(title, subtitle, data, total, drillKey){
  const isDrill = drillKey && drillState[statTab] && drillState[statTab].l1;
  let html = `<div class="card chart-card">
    <div class="chart-head"><div><div class="ttl">${title}</div>${subtitle?`<div class="total">${subtitle}</div>`:''}</div>
      <div class="chart-toggle"><button class="${statChartType==='pie'?'active':''}" data-ct="pie">饼图</button><button class="${statChartType==='bar'?'active':''}" data-ct="bar">条形</button></div></div>`;
  if(isDrill) html += `<div class="drill-back" id="drillBack">‹ 返回${drillState[statTab].l1} 全部</div>`;
  html += `<div id="chartContainer"></div></div>`;
  return html;
}

function renderStatExpense(content, bills, ledgerId){
  const expenseBills = bills.filter(b=>b.type==='expense');
  const subTabs = [{id:'category',name:'分类支出'},{id:'l2',name:'二级支出'},{id:'account',name:'账户支出'},{id:'merchant',name:'商家支出'},{id:'project',name:'项目支出'},{id:'member',name:'成员支出'}];
  let html = `<div class="stat-sub-tabs">` + subTabs.map(t=>`<button class="${statSubTab===t.id?'active':''}" data-sub="${t.id}">${t.name}</button>`).join('') + `</div>`;
  const drillL1 = drillState.expense && drillState.expense.l1;
  if(statSubTab === 'category'){
    const byL1 = {};
    expenseBills.forEach(b=>{ const l1 = b.categoryL1 || '其他'; byL1[l1] = (byL1[l1]||0) + Number(b.amount); });
    const total = Object.values(byL1).reduce((s,v)=>s+v,0);
    if(drillL1){
      const l2Data = {};
      expenseBills.filter(b=>b.categoryL1===drillL1).forEach(b=>{ const l2 = b.categoryL2 || '未分类'; l2Data[l2] = (l2Data[l2]||0) + Number(b.amount); });
      const l2Total = Object.values(l2Data).reduce((s,v)=>s+v,0);
      html += renderStatSection(`${drillL1} › 二级分类`, `共 ¥${fmtMoney(l2Total)}`, l2Data, l2Total, true);
    } else {
      html += renderStatSection('一级分类支出', `共 ¥${fmtMoney(total)}`, byL1, total, false);
    }
  } else if(statSubTab === 'l2'){
    const byL2 = {};
    expenseBills.forEach(b=>{ const l2 = b.categoryL2 || '未分类'; byL2[l2] = (byL2[l2]||0) + Number(b.amount); });
    const total = Object.values(byL2).reduce((s,v)=>s+v,0);
    html += renderStatSection('全部二级支出', `共 ¥${fmtMoney(total)}`, byL2, total, false);
  } else if(statSubTab === 'account'){
    const byAcct = {};
    expenseBills.forEach(b=>{ const name = accountName(b.accountId, ledgerId); byAcct[name] = (byAcct[name]||0) + Number(b.amount); });
    const total = Object.values(byAcct).reduce((s,v)=>s+v,0);
    html += renderStatSection('账户支出', `共 ¥${fmtMoney(total)}`, byAcct, total, false);
  } else if(statSubTab === 'merchant'){
    const byMerch = {};
    expenseBills.forEach(b=>{ const m = b.merchant || '未填商家'; byMerch[m] = (byMerch[m]||0) + Number(b.amount); });
    const total = Object.values(byMerch).reduce((s,v)=>s+v,0);
    html += renderStatSection('商家支出', `共 ¥${fmtMoney(total)}`, byMerch, total, false);
  } else if(statSubTab === 'project'){
    const byProj = {};
    expenseBills.forEach(b=>{ const p = b.project || '未填项目'; byProj[p] = (byProj[p]||0) + Number(b.amount); });
    const total = Object.values(byProj).reduce((s,v)=>s+v,0);
    html += renderStatSection('项目支出', `共 ¥${fmtMoney(total)}`, byProj, total, false);
  } else if(statSubTab === 'member'){
    const byMember = { '本人': expenseBills.reduce((s,b)=>s+Number(b.amount),0) };
    const total = byMember['本人'];
    html += renderStatSection('成员支出', `共 ¥${fmtMoney(total)}`, byMember, total, false);
  }
  content.innerHTML = html;
  bindStatEvents(content);
  renderCurrentChart(content, expenseBills, ledgerId);
}

function renderStatIncome(content, bills, ledgerId){
  const incomeBills = bills.filter(b=>b.type==='income');
  const subTabs = [{id:'category',name:'分类收入'},{id:'l2',name:'二级收入'},{id:'account',name:'账户收入'},{id:'project',name:'项目收入'},{id:'member',name:'成员收入'}];
  let html = `<div class="stat-sub-tabs">` + subTabs.map(t=>`<button class="${statSubTab===t.id?'active':''}" data-sub="${t.id}">${t.name}</button>`).join('') + `</div>`;
  const drillL1 = drillState.income && drillState.income.l1;
  if(statSubTab === 'category'){
    const byL1 = {};
    incomeBills.forEach(b=>{ const l1 = b.categoryL1 || '其他'; byL1[l1] = (byL1[l1]||0) + Number(b.amount); });
    const total = Object.values(byL1).reduce((s,v)=>s+v,0);
    if(drillL1){
      const l2Data = {};
      incomeBills.filter(b=>b.categoryL1===drillL1).forEach(b=>{ const l2 = b.categoryL2 || '未分类'; l2Data[l2] = (l2Data[l2]||0) + Number(b.amount); });
      const l2Total = Object.values(l2Data).reduce((s,v)=>s+v,0);
      html += renderStatSection(`${drillL1} › 二级分类`, `共 ¥${fmtMoney(l2Total)}`, l2Data, l2Total, true);
    } else {
      html += renderStatSection('一级分类收入', `共 ¥${fmtMoney(total)}`, byL1, total, false);
    }
  } else if(statSubTab === 'l2'){
    const byL2 = {};
    incomeBills.forEach(b=>{ const l2 = b.categoryL2 || '未分类'; byL2[l2] = (byL2[l2]||0) + Number(b.amount); });
    const total = Object.values(byL2).reduce((s,v)=>s+v,0);
    html += renderStatSection('全部二级收入', `共 ¥${fmtMoney(total)}`, byL2, total, false);
  } else if(statSubTab === 'account'){
    const byAcct = {};
    incomeBills.forEach(b=>{ const name = accountName(b.accountId, ledgerId); byAcct[name] = (byAcct[name]||0) + Number(b.amount); });
    const total = Object.values(byAcct).reduce((s,v)=>s+v,0);
    html += renderStatSection('账户收入', `共 ¥${fmtMoney(total)}`, byAcct, total, false);
  } else if(statSubTab === 'project'){
    const byProj = {};
    incomeBills.forEach(b=>{ const p = b.project || '未填项目'; byProj[p] = (byProj[p]||0) + Number(b.amount); });
    const total = Object.values(byProj).reduce((s,v)=>s+v,0);
    html += renderStatSection('项目收入', `共 ¥${fmtMoney(total)}`, byProj, total, false);
  } else if(statSubTab === 'member'){
    const byMember = { '本人': incomeBills.reduce((s,b)=>s+Number(b.amount),0) };
    const total = byMember['本人'];
    html += renderStatSection('成员收入', `共 ¥${fmtMoney(total)}`, byMember, total, false);
  }
  content.innerHTML = html;
  bindStatEvents(content);
  renderCurrentChart(content, incomeBills, ledgerId);
}

function renderStatAsset(content, ledgerId){
  const accts = getAccounts(ledgerId);
  let totalAsset = 0, totalLiability = 0;
  const assetData = {}, liabilityData = {};
  // 递归遍历所有账户层级
  function walk(node){
    const bal = Number(node.balance)||0;
    if(node.accountType==='liability'){ if(node.isAsset){ totalLiability += Math.abs(bal); liabilityData[node.name] = Math.abs(bal); } }
    else { if(node.isAsset){ totalAsset += bal; assetData[node.name] = bal; } }
    (node.children||[]).forEach(walk);
  }
  accts.forEach(walk);
  let html = `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">资产汇总</div><div class="total">资产合计 ¥${fmtMoney(totalAsset)} · 负债合计 ¥${fmtMoney(totalLiability)} · 净资产 ¥${fmtMoney(totalAsset-totalLiability)}</div></div></div><div id="assetChart"></div></div>`;
  if(totalLiability > 0) html += `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">负债汇总</div><div class="total">共 ¥${fmtMoney(totalLiability)}</div></div></div><div id="liabilityChart"></div></div>`;
  content.innerHTML = html;
  renderBarChart(document.getElementById('assetChart'), assetData, totalAsset, ()=>{});
  if(totalLiability > 0) renderBarChart(document.getElementById('liabilityChart'), liabilityData, totalLiability, ()=>{});
}

function renderStatMonthly(content, bills, ledgerId){
  const now = new Date();
  const months = [], monthKeys = [];
  for(let i=5; i>=0; i--){ const d = new Date(now.getFullYear(), now.getMonth()-i, 1); months.push(`${d.getMonth()+1}月`); monthKeys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }
  const incomeArr = new Array(6).fill(0), expenseArr = new Array(6).fill(0);
  bills.forEach(b=>{
    if(b.type==='transfer') return;
    const mk = monthKey(b.date);
    const idx = monthKeys.indexOf(mk);
    if(idx < 0) return;
    if(b.type==='income') incomeArr[idx] += Number(b.amount);
    else if(b.type==='expense') expenseArr[idx] += Number(b.amount);
  });
  const thisMonthKey = monthKey(new Date());
  const budget = getBudget(thisMonthKey, ledgerId);
  const budgetTotal = budget.total || 0;
  const budgetUsed = expenseArr[5];
  let html = `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">月度收入趋势</div></div></div><div id="incomeTrend"></div></div>
    <div class="card chart-card"><div class="chart-head"><div><div class="ttl">月度支出趋势</div></div></div><div id="expenseTrend"></div></div>
    <div class="card chart-card"><div class="chart-head"><div><div class="ttl">收支对比</div></div></div><div id="compareChart"></div></div>`;
  if(budgetTotal > 0){
    html += `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">预算执行（本月）</div></div></div>
      <div class="total">预算 ¥${fmtMoney(budgetTotal)} · 已支出 ¥${fmtMoney(budgetUsed)} · 剩余 ¥${fmtMoney(budgetTotal-budgetUsed)}</div>
      <div style="height:12px;background:var(--input-bg);border-radius:6px;overflow:hidden;margin-top:8px;">
        <div style="height:100%;width:${Math.min(100,budgetUsed/budgetTotal*100).toFixed(1)}%;background:${budgetUsed>budgetTotal?'var(--expense)':'var(--asset)'};border-radius:6px;transition:width .3s;"></div>
      </div>
      <div style="font-size:12px;color:var(--text-sub);margin-top:6px;">执行进度 ${(budgetUsed/budgetTotal*100).toFixed(1)}%</div></div>`;
  }
  content.innerHTML = html;
  renderTrendChart(document.getElementById('incomeTrend'), months, incomeArr, 'var(--income)', '收入');
  renderTrendChart(document.getElementById('expenseTrend'), months, expenseArr, 'var(--expense)', '支出');
  renderCompareChart(document.getElementById('compareChart'), months, incomeArr, expenseArr);
}

// 年度分析：按所选时间范围统计年度收支趋势、分类汇总、账户收支
function renderStatYearly(content, bills, ledgerId){
  const { start, end } = getTimeRange();
  const rangeBills = bills.filter(b=> (!start || b.date >= start) && (!end || b.date <= end) && b.type !== 'transfer');
  // 确定年度分析的年份和月份范围
  let year = new Date().getFullYear();
  if(start) year = new Date(start).getFullYear();
  const months = [], monthKeys = [];
  for(let i=0; i<12; i++){
    const d = new Date(year, i, 1);
    months.push(`${i+1}月`);
    monthKeys.push(`${year}-${String(i+1).padStart(2,'0')}`);
  }
  const incomeArr = new Array(12).fill(0), expenseArr = new Array(12).fill(0);
  let totalIncome = 0, totalExpense = 0;
  const byL1Expense = {}, byL1Income = {}, byAcctExpense = {}, byAcctIncome = {};
  rangeBills.forEach(b=>{
    const mk = monthKey(b.date);
    const idx = monthKeys.indexOf(mk);
    const amt = Number(b.amount);
    if(b.type==='income'){
      totalIncome += amt;
      if(idx>=0) incomeArr[idx] += amt;
      const l1 = b.categoryL1 || '未分类';
      byL1Income[l1] = (byL1Income[l1]||0) + amt;
      if(b.accountId){ const an = accountName(b.accountId, ledgerId); byAcctIncome[an] = (byAcctIncome[an]||0) + amt; }
    } else if(b.type==='expense'){
      totalExpense += amt;
      if(idx>=0) expenseArr[idx] += amt;
      const l1 = b.categoryL1 || '未分类';
      byL1Expense[l1] = (byL1Expense[l1]||0) + amt;
      if(b.accountId){ const an = accountName(b.accountId, ledgerId); byAcctExpense[an] = (byAcctExpense[an]||0) + amt; }
    }
  });
  const net = totalIncome - totalExpense;
  const avgIncome = totalIncome / 12, avgExpense = totalExpense / 12;
  // 年度收支总览卡片
  let html = `<div class="card" style="background:linear-gradient(135deg,var(--primary),#6b8fff);color:#fff;border-radius:16px;padding:18px;margin-bottom:14px;">
    <div style="font-size:13px;opacity:.85;">${year} 年度收支概览</div>
    <div style="font-size:28px;font-weight:700;margin:8px 0;">¥${fmtMoney(net)}</div>
    <div style="font-size:13px;opacity:.9;">结余（收入 - 支出）</div>
    <div style="display:flex;gap:12px;margin-top:14px;">
      <div style="flex:1;background:rgba(255,255,255,.15);border-radius:10px;padding:10px;">
        <div style="font-size:12px;opacity:.85;">总收入</div>
        <div style="font-size:17px;font-weight:600;margin-top:2px;">¥${fmtMoney(totalIncome)}</div>
        <div style="font-size:11px;opacity:.8;margin-top:2px;">月均 ¥${fmtMoney(avgIncome)}</div>
      </div>
      <div style="flex:1;background:rgba(255,255,255,.15);border-radius:10px;padding:10px;">
        <div style="font-size:12px;opacity:.85;">总支出</div>
        <div style="font-size:17px;font-weight:600;margin-top:2px;">¥${fmtMoney(totalExpense)}</div>
        <div style="font-size:11px;opacity:.8;margin-top:2px;">月均 ¥${fmtMoney(avgExpense)}</div>
      </div>
    </div>
  </div>`;
  // 月度收支对比趋势
  html += `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">${year}年月度收支对比</div><div class="total">收入 ¥${fmtMoney(totalIncome)} · 支出 ¥${fmtMoney(totalExpense)}</div></div></div><div id="yearlyCompare"></div></div>`;
  // 年度支出分类
  const expTotal = Object.values(byL1Expense).reduce((s,v)=>s+v,0);
  html += `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">年度支出分类</div><div class="total">共 ¥${fmtMoney(expTotal)}</div></div>
    <div class="chart-toggle"><button class="${statChartType==='pie'?'active':''}" data-ct="pie">饼图</button><button class="${statChartType==='bar'?'active':''}" data-ct="bar">条形</button></div></div><div id="yExpCat"></div></div>`;
  // 年度收入分类
  const incTotal = Object.values(byL1Income).reduce((s,v)=>s+v,0);
  html += `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">年度收入分类</div><div class="total">共 ¥${fmtMoney(incTotal)}</div></div>
    <div class="chart-toggle"><button class="${statChartType==='pie'?'active':''}" data-ct="pie">饼图</button><button class="${statChartType==='bar'?'active':''}" data-ct="bar">条形</button></div></div><div id="yIncCat"></div></div>`;
  // 年度账户支出
  const acctExpTotal = Object.values(byAcctExpense).reduce((s,v)=>s+v,0);
  html += `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">年度账户支出</div><div class="total">共 ¥${fmtMoney(acctExpTotal)}</div></div>
    <div class="chart-toggle"><button class="${statChartType==='pie'?'active':''}" data-ct="pie">饼图</button><button class="${statChartType==='bar'?'active':''}" data-ct="bar">条形</button></div></div><div id="yExpAcct"></div></div>`;
  // 年度账户收入
  const acctIncTotal = Object.values(byAcctIncome).reduce((s,v)=>s+v,0);
  html += `<div class="card chart-card"><div class="chart-head"><div><div class="ttl">年度账户收入</div><div class="total">共 ¥${fmtMoney(acctIncTotal)}</div></div>
    <div class="chart-toggle"><button class="${statChartType==='pie'?'active':''}" data-ct="pie">饼图</button><button class="${statChartType==='bar'?'active':''}" data-ct="bar">条形</button></div></div><div id="yIncAcct"></div></div>`;
  content.innerHTML = html;
  renderCompareChart(document.getElementById('yearlyCompare'), months, incomeArr, expenseArr);
  const renderChart = (el, data, total)=>{ if(!el) return; if(statChartType==='pie') renderPieChart(el, data, total, '总计', null); else renderBarChart(el, data, total, null); };
  renderChart(document.getElementById('yExpCat'), byL1Expense, expTotal);
  renderChart(document.getElementById('yIncCat'), byL1Income, incTotal);
  renderChart(document.getElementById('yExpAcct'), byAcctExpense, acctExpTotal);
  renderChart(document.getElementById('yIncAcct'), byAcctIncome, acctIncTotal);
  bindStatEvents(content);
}

function bindStatEvents(content){
  content.querySelectorAll('.chart-toggle button').forEach(btn=>{ btn.onclick = ()=>{ statChartType = btn.dataset.ct; renderStats(); }; });
  const drillBack = content.querySelector('#drillBack');
  if(drillBack) drillBack.onclick = ()=>{ delete drillState[statTab]; renderStats(); };
  content.querySelectorAll('.stat-sub-tabs button').forEach(btn=>{ btn.onclick = ()=>{ statSubTab = btn.dataset.sub; delete drillState[statTab]; renderStats(); }; });
}

function renderCurrentChart(content, bills, ledgerId){
  const container = content.querySelector('#chartContainer');
  if(!container) return;
  const type = statTab;
  const targetBills = bills.filter(b=>b.type===type);
  let data = {}, total = 0;
  const drillL1 = drillState[type] && drillState[type].l1;
  if(statSubTab === 'category'){
    if(drillL1) targetBills.filter(b=>b.categoryL1===drillL1).forEach(b=>{ const l2 = b.categoryL2 || '未分类'; data[l2] = (data[l2]||0) + Number(b.amount); });
    else targetBills.forEach(b=>{ const l1 = b.categoryL1 || '其他'; data[l1] = (data[l1]||0) + Number(b.amount); });
  } else if(statSubTab === 'l2') targetBills.forEach(b=>{ const l2 = b.categoryL2 || '未分类'; data[l2] = (data[l2]||0) + Number(b.amount); });
  else if(statSubTab === 'account') targetBills.forEach(b=>{ const name = accountName(b.accountId, ledgerId); data[name] = (data[name]||0) + Number(b.amount); });
  else if(statSubTab === 'merchant') targetBills.forEach(b=>{ const m = b.merchant || '未填商家'; data[m] = (data[m]||0) + Number(b.amount); });
  else if(statSubTab === 'project') targetBills.forEach(b=>{ const p = b.project || '未填项目'; data[p] = (data[p]||0) + Number(b.amount); });
  else if(statSubTab === 'member') data = { '本人': targetBills.reduce((s,b)=>s+Number(b.amount),0) };
  total = Object.values(data).reduce((s,v)=>s+v,0);
  const onItemClick = (key)=>{
    if(statSubTab === 'category' && !drillL1){ drillState[type] = { l1: key }; renderStats(); }
    else toast(`「${key}」明细可到账单列表筛选查看`);
  };
  if(statChartType === 'pie') renderPieChart(container, data, total, '总计', onItemClick);
  else renderBarChart(container, data, total, onItemClick);
}

/* ==================== 十、分类管理 ==================== */
function renderCategories(){
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  const incomeKw = document.getElementById('incomeCatSearch').value.trim();
  const expenseKw = document.getElementById('expenseCatSearch').value.trim();
  renderCatList('incomeCatList', cats.income || [], 'income', incomeKw, ledgerId);
  renderCatList('expenseCatList', cats.expense || [], 'expense', expenseKw, ledgerId);
  document.getElementById('incomeCatCount').textContent = `共 ${cats.income.length} 个一级`;
  document.getElementById('expenseCatCount').textContent = `共 ${cats.expense.length} 个一级`;
}

function renderCatList(containerId, list, type, kw, ledgerId){
  const el = document.getElementById(containerId);
  if(list.length===0){ el.innerHTML = '<div class="empty-tip">暂无分类</div>'; return; }
  const filterText = (kw || '').trim().toLowerCase();
  const hasFilter = filterText.length > 0;
  const items = list.map((l1, idx)=>{
    const allChildren = l1.children || [];
    const l1Match = !hasFilter || l1.name.toLowerCase().includes(filterText);
    let childrenToShow;
    if(!hasFilter) childrenToShow = allChildren;
    else if(l1Match) childrenToShow = allChildren;
    else childrenToShow = allChildren.filter(c => c.toLowerCase().includes(filterText));
    return { l1, idx, l1Match, childrenToShow, show: l1Match || childrenToShow.length > 0 };
  });
  if(hasFilter && items.every(it => !it.show)){ el.innerHTML = `<div class="empty-tip">没有匹配「${escapeHtml(kw)}」的分类</div>`; return; }
  let html = '';
  if(hasFilter){
    const totalL1 = items.filter(it => it.show).length;
    const totalL2 = items.reduce((s, it) => s + it.childrenToShow.length, 0);
    html += `<div class="cat-filter-tip"><span>匹配 ${totalL1} 个一级 / ${totalL2} 个二级</span><span class="clear-link" data-act="clear-search">清除筛选 ✕</span></div>`;
  }
  items.filter(it => it.show).forEach(({ l1, idx, l1Match, childrenToShow }) => {
    const icon = catIcon(l1.name);
    const allChildCount = (l1.children||[]).length;
    let countLabel = '';
    if(allChildCount > 0){
      if(hasFilter && !l1Match) countLabel = ` <span style="color:var(--primary);font-size:11px;font-weight:400;">(匹配 ${childrenToShow.length}/${allChildCount})</span>`;
      else countLabel = ` <span style="color:var(--text-sub);font-size:11px;font-weight:400;">(${allChildCount})</span>`;
    }
    html += `<div class="cat-l1-block" data-type="${type}" data-l1-idx="${idx}">
      <div class="cat-l1-row"><span class="name">${icon} ${highlightText(l1.name, filterText)}${countLabel}</span>
        <div class="ops"><button class="op edit" data-act="edit-l1">✏️</button><button class="op add-l2" data-act="add-l2">+二级</button><button class="op del" data-act="del-l1">🗑</button></div>
      </div><div class="cat-l2-list">`;
    if(childrenToShow.length === 0) html += '<div class="cat-l2-empty">（暂无二级分类）</div>';
    else {
      childrenToShow.forEach(c => {
        const l2Idx = l1.children.indexOf(c);
        html += `<div class="cat-l2-row" data-l2-idx="${l2Idx}"><span class="name">${highlightText(c, filterText)}</span><div class="ops"><button class="op edit" data-act="edit-l2">✏️</button><button class="op del" data-act="del-l2">🗑</button></div></div>`;
      });
    }
    html += `</div></div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if(act === 'clear-search'){ document.getElementById(type==='income'?'incomeCatSearch':'expenseCatSearch').value = ''; renderCategories(); return; }
      const block = btn.closest('.cat-l1-block');
      const t = block.dataset.type;
      const l1Idx = parseInt(block.dataset.l1Idx);
      const l2Row = btn.closest('.cat-l2-row');
      const l2Idx = l2Row ? parseInt(l2Row.dataset.l2Idx) : -1;
      if(act==='edit-l1') startEditL1(t, l1Idx, block);
      else if(act==='del-l1') deleteL1(t, l1Idx);
      else if(act==='add-l2') startAddL2(t, l1Idx, block);
      else if(act==='edit-l2') startEditL2(t, l1Idx, l2Idx, l2Row);
      else if(act==='del-l2') deleteL2(t, l1Idx, l2Idx);
    };
  });
}

function highlightText(text, filterText){
  const safe = escapeHtml(text);
  if(!filterText) return safe;
  const lower = text.toLowerCase();
  const fl = filterText.toLowerCase();
  let result = '';
  let i = 0;
  while(i < text.length){
    const pos = lower.indexOf(fl, i);
    if(pos === -1){ result += escapeHtml(text.slice(i)); break; }
    if(pos > i) result += escapeHtml(text.slice(i, pos));
    result += `<span class="cat-hit">${escapeHtml(text.slice(pos, pos + fl.length))}</span>`;
    i = pos + fl.length;
  }
  return result;
}

function startEditL1(type, l1Idx, block){
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  const oldName = cats[type][l1Idx].name;
  if(block.querySelector('.inline-edit.l1-edit')) return;
  const row = block.querySelector('.cat-l1-row');
  row.style.display = 'none';
  const editBox = document.createElement('div');
  editBox.className = 'inline-edit l1-edit';
  editBox.innerHTML = `<input type="text" value="${escapeHtml(oldName)}"><button class="ok">保存</button><button class="no">取消</button>`;
  row.after(editBox);
  const input = editBox.querySelector('input');
  input.focus(); input.select();
  editBox.querySelector('.ok').onclick = ()=>{
    const newName = input.value.trim();
    if(!newName){ toast('名称不能为空'); return; }
    if(newName!==oldName && cats[type].some(c=>c.name===newName)){ toast('该一级分类已存在'); return; }
    const bills = getBills(ledgerId);
    let changed = false;
    bills.forEach(b=>{ if(b.type===type && b.categoryL1===oldName){ b.categoryL1 = newName; changed = true; } });
    if(changed) setBills(bills, ledgerId);
    cats[type][l1Idx].name = newName;
    setCats(cats, ledgerId);
    toast('已更新');
    renderCategories();
  };
  editBox.querySelector('.no').onclick = ()=>{ renderCategories(); };
  input.onkeydown = (e)=>{ if(e.key==='Enter') editBox.querySelector('.ok').click(); };
}

async function deleteL1(type, l1Idx){
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  const l1 = cats[type][l1Idx];
  const children = l1.children || [];
  const bills = getBills(ledgerId);
  const used = bills.filter(b=>b.type===type && b.categoryL1===l1.name).length;
  if(used>0){ toast(`有 ${used} 条账单使用此分类，无法删除`); return; }
  const childTip = children.length>0 ? `（含 ${children.length} 个二级分类）` : '';
  if(!await confirmBox(`确认删除一级分类「${l1.name}」${childTip}？`)) return;
  cats[type].splice(l1Idx, 1);
  setCats(cats, ledgerId);
  toast('已删除');
  renderCategories();
}

function startAddL2(type, l1Idx, block){
  if(block.querySelector('.inline-edit.l2-add')) return;
  const l2List = block.querySelector('.cat-l2-list');
  const addBox = document.createElement('div');
  addBox.className = 'inline-edit l2-add';
  addBox.innerHTML = `<input type="text" placeholder="二级分类名称"><button class="ok">添加</button><button class="no">取消</button>`;
  l2List.appendChild(addBox);
  const input = addBox.querySelector('input');
  input.focus();
  addBox.querySelector('.ok').onclick = ()=>{
    const name = input.value.trim();
    if(!name){ toast('名称不能为空'); return; }
    const ledgerId = getCurrentLedgerId();
    const cats = getCats(ledgerId);
    if(cats[type][l1Idx].children.includes(name)){ toast('该二级分类已存在'); return; }
    cats[type][l1Idx].children.push(name);
    setCats(cats, ledgerId);
    toast('已添加');
    renderCategories();
  };
  addBox.querySelector('.no').onclick = ()=>{ renderCategories(); };
  input.onkeydown = (e)=>{ if(e.key==='Enter') addBox.querySelector('.ok').click(); };
}

function startEditL2(type, l1Idx, l2Idx, l2Row){
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  const oldName = cats[type][l1Idx].children[l2Idx];
  l2Row.style.display = 'none';
  const editBox = document.createElement('div');
  editBox.className = 'inline-edit l2-edit';
  editBox.innerHTML = `<input type="text" value="${escapeHtml(oldName)}"><button class="ok">保存</button><button class="no">取消</button>`;
  l2Row.after(editBox);
  const input = editBox.querySelector('input');
  input.focus(); input.select();
  editBox.querySelector('.ok').onclick = ()=>{
    const newName = input.value.trim();
    if(!newName){ toast('名称不能为空'); return; }
    if(newName!==oldName && cats[type][l1Idx].children.includes(newName)){ toast('该二级分类已存在'); return; }
    const bills = getBills(ledgerId);
    let changed = false;
    bills.forEach(b=>{ if(b.type===type && b.categoryL1===cats[type][l1Idx].name && b.categoryL2===oldName){ b.categoryL2 = newName; changed = true; } });
    if(changed) setBills(bills, ledgerId);
    cats[type][l1Idx].children[l2Idx] = newName;
    setCats(cats, ledgerId);
    toast('已更新');
    renderCategories();
  };
  editBox.querySelector('.no').onclick = ()=>{ renderCategories(); };
  input.onkeydown = (e)=>{ if(e.key==='Enter') editBox.querySelector('.ok').click(); };
}

async function deleteL2(type, l1Idx, l2Idx){
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  const l1 = cats[type][l1Idx];
  const name = l1.children[l2Idx];
  const bills = getBills(ledgerId);
  const used = bills.filter(b=>b.type===type && b.categoryL1===l1.name && b.categoryL2===name).length;
  if(used>0){ toast(`有 ${used} 条账单使用此二级分类，无法删除`); return; }
  if(!await confirmBox(`确认删除二级分类「${name}」？`)) return;
  cats[type][l1Idx].children.splice(l2Idx, 1);
  setCats(cats, ledgerId);
  toast('已删除');
  renderCategories();
}

function addL1(type){
  const inputId = type==='income' ? 'newIncomeL1' : 'newExpenseL1';
  const input = document.getElementById(inputId);
  const name = input.value.trim();
  if(!name){ toast('请输入分类名称'); return; }
  const ledgerId = getCurrentLedgerId();
  const cats = getCats(ledgerId);
  if(cats[type].some(c=>c.name===name)){ toast('该一级分类已存在'); return; }
  cats[type].push({ name, children:[] });
  setCats(cats, ledgerId);
  input.value = '';
  toast('已添加');
  renderCategories();
}

/* ==================== 十一、账户管理 V5（分组卡片 + 顶部横幅） ==================== */
// 计算账户结余（一级含子账户）
function acctBalance(a){
  let bal = Number(a.balance)||0;
  (a.children||[]).forEach(c=>{ bal += acctBalance(c); }); // 递归计算所有下级子账户
  return bal;
}
// 顶部横幅：净资产 / 资产 / 负债 + 皮肤切换 + 脱敏
function renderAcctBanner(ledgerId){
  const accts = getAccounts(ledgerId);
  let totalAsset = 0, totalLiability = 0;
  // 递归遍历所有账户（含多层子账户），按各自 accountType 计入
  function walk(node){
    const bal = Number(node.balance)||0;
    if(node.accountType==='liability'){ if(node.isAsset) totalLiability += Math.abs(bal); }
    else { if(node.isAsset) totalAsset += bal; }
    (node.children||[]).forEach(walk);
  }
  accts.forEach(walk);
  const net = totalAsset - totalLiability;
  document.getElementById('acctNetAmount').textContent = (net<0?'-':'') + fmtMoneyMask(Math.abs(net));
  document.getElementById('acctAssetAmount').textContent = fmtMoneyMask(totalAsset);
  document.getElementById('acctLiabilityAmount').textContent = fmtMoneyMask(totalLiability);
  // 皮肤切换
  const s = getSettings();
  const idx = s.bannerIndex || 0;
  const bg = document.getElementById('acctBannerBg');
  bg.className = 'acct-banner-bg skin-' + (idx % 3);
  // 圆点
  const dots = document.getElementById('acctBannerDots');
  let dh = '';
  for(let i=0;i<3;i++){ dh += `<span class="dot ${i===idx?'active':''}" data-skin="${i}"></span>`; }
  dots.innerHTML = dh;
}

// 折叠状态：存储已展开的分组ID和账户ID（默认全部折叠）
const expandedNodes = new Set();

// 渲染账户页（多层折叠树形结构）
function renderAccounts(){
  const ledgerId = getCurrentLedgerId();
  const accts = getAccounts(ledgerId);
  const groups = getGroups(ledgerId);
  // 顶部横幅
  renderAcctBanner(ledgerId);
  // 按 order 排序分组
  const sortedGroups = [...groups].sort((a,b)=>(a.order||0)-(b.order||0));
  const el = document.getElementById('acctGroupList');
  if(accts.length===0 && sortedGroups.length>0){
    el.innerHTML = `<div class="acct-group-empty">暂无账户，点击右上角 + 新增账户</div>`;
    return;
  }
  let html = '';
  // 遍历分组
  sortedGroups.forEach(g=>{
    const list = accts.filter(a=> a.groupId === g.id);
    if(list.length===0) return; // 空分组不展示
    // 分组余额合计
    let gTotal = 0;
    list.forEach(a=>{ const b = acctBalance(a); gTotal += (a.accountType==='liability' ? -Math.abs(b) : b); });
    const isOpen = expandedNodes.has('grp:'+g.id);
    const hasAccts = list.length > 0;
    html += `<div class="acct-group-card" data-gid="${g.id}">
      <div class="acct-group-head">
        <span class="fold-arrow ${hasAccts?'':'no-child'}" data-act="toggle" data-nid="grp:${g.id}">${isOpen?'▼':'▶'}</span>
        <span class="gname" data-act="grp-edit" data-gid="${g.id}" title="点击编辑分组"><span class="gicon">${g.icon||'📁'}</span>${escapeHtml(g.name)}</span>
        <span class="gtotal">合计 ¥${fmtMoneyMask(gTotal)}</span>
        <span class="gops">
          <button class="gop add" data-act="grp-add-acct" data-gid="${g.id}">+账户</button>
          <button class="gop edit" data-act="grp-edit" data-gid="${g.id}">编辑</button>
          <button class="gop del" data-act="grp-del" data-gid="${g.id}">删除</button>
        </span>
      </div>
      <div class="acct-group-body" style="${isOpen?'':'display:none;'}">
        ${list.map(a=>renderAccountNode(a, 0)).join('')}
      </div>
    </div>`;
  });
  // 未分组账户兜底
  const ungrouped = accts.filter(a=> !sortedGroups.some(g=>g.id===a.groupId));
  if(ungrouped.length>0){
    const uTotal = ungrouped.reduce((s,a)=>s+acctBalance(a),0);
    const isOpen = expandedNodes.has('grp:');
    html += `<div class="acct-group-card" data-gid="">
      <div class="acct-group-head">
        <span class="fold-arrow" data-act="toggle" data-nid="grp:">${isOpen?'▼':'▶'}</span>
        <span class="gname"><span class="gicon">📁</span>未分组</span>
        <span class="gtotal">合计 ¥${fmtMoneyMask(uTotal)}</span>
        <div class="gops"><button class="gop add" data-act="grp-add-acct" data-gid="">+账户</button></div>
      </div>
      <div class="acct-group-body" style="${isOpen?'':'display:none;'}">
        ${ungrouped.map(a=>renderAccountNode(a, 0)).join('')}
      </div>
    </div>`;
  }
  if(!html) html = '<div class="acct-group-empty">暂无账户，点击右上角 + 新增账户</div>';
  el.innerHTML = html;
  bindAcctEvents();
}

// 递归渲染单个账户节点（含子账户树）
function renderAccountNode(a, depth){
  const bal = acctBalance(a);
  const hasChildren = (a.children||[]).length > 0;
  const balClass = a.accountType==='liability' ? 'ai-bal liability' : 'ai-bal asset';
  const grpTag = hasChildren ? '<span class="grp-tag">组</span>' : '';
  const nid = 'acct:'+a.id;
  const isOpen = expandedNodes.has(nid);
  const indent = depth * 18; // 每层缩进
  // 折叠箭头：有子账户才显示
  const arrow = hasChildren
    ? `<span class="fold-arrow" data-act="toggle" data-nid="${nid}">${isOpen?'▼':'▶'}</span>`
    : `<span class="fold-arrow no-child"></span>`;
  // 账户条目
  // 只有一级账户(depth===0)才能添加子账户；子账户(depth>0)不再支持下级
  const subBtn = depth === 0
    ? `<button class="ai-sub-btn" data-act="add-sub" data-pid="${a.id}">+ 子账户</button>`
    : '';
  let html = `<div class="acct-item" data-aid="${a.id}" style="padding-left:${10+indent}px;">
    ${arrow}
    <div class="ai-icon" style="background:${a.iconBg||'#4f7cff'};${depth>0?'width:32px;height:32px;font-size:16px;border-radius:10px;':''}">${a.icon||'💳'}</div>
    <div class="ai-info">
      <div class="ai-name">${escapeHtml(a.name)} ${grpTag}</div>
      <div class="ai-code">${a.code ? '尾号 ' + escapeHtml(a.code) : (hasChildren ? `${a.children.length} 个子账户` : '点击查看流水')}</div>
      <div class="ai-actions">
        ${subBtn}
        <button class="ai-act-btn" data-act="edit-acct" data-aid="${a.id}" title="编辑">✏️</button>
        <button class="ai-act-btn del" data-act="del-acct" data-aid="${a.id}" title="删除">🗑</button>
      </div>
    </div>
    <div class="${balClass}">¥${fmtMoneyMask(bal)}</div>
    <div class="ai-arrow">›</div>
  </div>`;
  // 递归渲染子账户（仅当展开时）
  if(hasChildren && isOpen){
    html += a.children.map(c=>renderAccountNode(c, depth+1)).join('');
  }
  return html;
}

// 账户页事件绑定
function bindAcctEvents(){
  const el = document.getElementById('acctGroupList');
  // 折叠箭头：切换展开/收起
  el.querySelectorAll('.fold-arrow[data-act="toggle"]').forEach(arrow=>{
    arrow.onclick = (e)=>{
      e.stopPropagation();
      const nid = arrow.dataset.nid;
      if(expandedNodes.has(nid)) expandedNodes.delete(nid);
      else expandedNodes.add(nid);
      renderAccounts();
    };
  });
  // 点击账户条目进入流水页（排除按钮和箭头区域）
  el.querySelectorAll('.acct-item').forEach(item=>{
    item.onclick = (e)=>{
      // 如果点击的是箭头或按钮，不触发
      if(e.target.closest('.fold-arrow, .ai-actions, .ai-act-btn, .ai-sub-btn')) return;
      openAcctFlow(item.dataset.aid);
    };
  });
  // 子账户按钮
  el.querySelectorAll('.ai-sub-btn').forEach(btn=>{
    btn.onclick = (e)=>{ e.stopPropagation(); openAcctModal(null, btn.dataset.pid); };
  });
  // 账户编辑/删除
  el.querySelectorAll('.ai-act-btn').forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      const act = btn.dataset.act, aid = btn.dataset.aid;
      if(act==='edit-acct') openAcctModal(aid);
      else if(act==='del-acct') deleteAccount(aid);
    };
  });
  // 分组操作按钮 + 分组名称点击编辑
  el.querySelectorAll('.gop, .gname[data-act]').forEach(btn=>{
    btn.onclick = (e)=>{
      e.stopPropagation();
      const act = btn.dataset.act, gid = btn.dataset.gid;
      if(act==='grp-add-acct') openAcctModal(null, null, gid);
      else if(act==='grp-edit') openGroupModal(gid);
      else if(act==='grp-del') deleteGroup(gid);
    };
  });
}

function openAcctModal(editId, parentId, presetGroupId){
  const ledgerId = getCurrentLedgerId();
  const mask = document.getElementById('modalMask');
  const box = document.getElementById('modalBox');
  const groups = getGroups(ledgerId);
  let title, nameVal='', codeVal='', balanceVal='', isAsset=1, accountType='asset';
  let groupIdVal = (presetGroupId !== undefined && presetGroupId !== null) ? presetGroupId : (groups[0]?groups[0].id:'');
  let iconVal = '💳', iconBgVal = '#4f7cff';
  if(editId){
    const { node, parent } = findAccountById(editId, ledgerId);
    if(!node) return;
    title = '编辑账户';
    nameVal = node.name; codeVal = node.code || '';
    balanceVal = node.balance || 0; // 填充当前余额，允许修改
    isAsset = node.isAsset; accountType = node.accountType || 'asset';
    groupIdVal = node.groupId || groupIdVal;
    iconVal = node.icon || iconVal; iconBgVal = node.iconBg || iconBgVal;
    balanceDisabled = false; // 编辑时也显示余额字段
  } else {
    title = parentId ? '新增子账户' : '新增账户';
    // 子账户继承父账户分组/图标
    if(parentId){
      const { node: p } = findAccountById(parentId, ledgerId);
      if(p){ groupIdVal = p.groupId || groupIdVal; iconVal = p.icon || iconVal; iconBgVal = p.iconBg || iconBgVal; }
    }
  }
  // 分组下拉选项（含"未分组"选项）
  const groupOpts = `<option value="" ${groupIdVal===''?'selected':''}>📁 未分组</option>` + groups.map(g=>`<option value="${g.id}" ${g.id===groupIdVal?'selected':''}>${g.icon||''} ${escapeHtml(g.name)}</option>`).join('');
  // 图标候选 + 自定义输入
  const iconHtml = ACCT_ICONS.map(ic=>`<span class="${ic===iconVal?'active':''}" data-ic="${ic}">${ic}</span>`).join('');
  // 颜色候选 + 自定义颜色选择器
  const colorHtml = ACCT_ICON_BGS.map(c=>`<span class="${c===iconBgVal?'active':''}" data-c="${c}" style="background:${c}"></span>`).join('');
  // 是否在预置图标中
  const hasPresetIcon = ACCT_ICONS.includes(iconVal);
  // 仅新增子账户时隐藏分组选择(继承父账户)；编辑子账户时仍显示，允许调整分组
  const groupField = parentId ? '' : `<div class="field"><label>所属分组</label>
    <select id="amGroup" style="width:100%;padding:8px 10px;background:var(--input-bg);border:1px solid var(--border);border-radius:8px;">
      ${groupOpts}
    </select></div>`;
  // 余额字段标签：新增时为"初始余额"，编辑时为"账户余额"
  const balanceLabel = editId ? '账户余额' : '初始余额';
  box.innerHTML = `<h3>${title}</h3>
    <input type="hidden" id="amEditId" value="${editId||''}">
    <input type="hidden" id="amEditParent" value="${parentId||''}">
    ${groupField}
    <div class="field"><label>账户名称</label><input type="text" id="amName" value="${escapeHtml(nameVal)}" placeholder="如：招商储蓄卡"></div>
    <div class="field"><label>账户编号（可选）</label><input type="text" id="amCode" value="${escapeHtml(codeVal)}" placeholder="如：6688"></div>
    <div class="field"><label>${balanceLabel}</label><input type="number" id="amBalance" value="${balanceVal}" placeholder="0.00" step="0.01"></div>
    <div class="field"><label>图标</label><div class="acct-modal-icon-pick" id="amIconPick">${iconHtml}</div>
      <div class="acct-custom-icon-row"><input type="text" id="amCustomIcon" value="${hasPresetIcon?'':iconVal}" placeholder="或输入自定义 emoji/文字" maxlength="4" style="flex:1;"><span class="custom-icon-preview" id="amIconPreview">${escapeHtml(iconVal)}</span></div></div>
    <div class="field"><label>图标背景色</label><div class="acct-modal-color-pick" id="amColorPick">${colorHtml}</div>
      <div class="acct-custom-color-row"><label>自定义</label><input type="color" id="amCustomColor" value="${iconBgVal}" style="width:36px;height:30px;border:none;background:none;cursor:pointer;"></div></div>
    <div class="field switch-row"><span class="lbl">账户类型</span>
      <select id="amType" style="flex:0 0 auto;width:auto;padding:6px 10px;">
        <option value="asset" ${accountType==='asset'?'selected':''}>资产账户</option>
        <option value="liability" ${accountType==='liability'?'selected':''}>负债账户</option>
      </select>
    </div>
    <div class="field switch-row"><span class="lbl">是否计入资产统计</span>
      <div class="switch ${isAsset?'on':''}" id="amAssetSwitch" data-on="${isAsset?1:0}"></div>
    </div>
    <div class="btns"><button class="btn btn-ghost" id="amCancel">取消</button><button class="btn btn-primary" id="amOk">保存</button></div>`;
  mask.classList.add('show');
  document.getElementById('amName').focus();
  document.getElementById('amCancel').onclick = ()=>closeModal();
  document.getElementById('amOk').onclick = ()=>saveAccountFromModal();
  document.getElementById('amAssetSwitch').onclick = ()=>{
    const sw = document.getElementById('amAssetSwitch');
    const on = sw.dataset.on === '1';
    sw.dataset.on = on ? '0' : '1';
    sw.classList.toggle('on', !on);
  };
  // 图标选择(预置)
  document.getElementById('amIconPick').querySelectorAll('span').forEach(sp=>{
    sp.onclick = ()=>{
      document.querySelectorAll('#amIconPick span').forEach(x=>x.classList.remove('active'));
      sp.classList.add('active');
      document.getElementById('amCustomIcon').value = '';
      document.getElementById('amIconPreview').textContent = sp.dataset.ic;
    };
  });
  // 自定义图标输入
  document.getElementById('amCustomIcon').addEventListener('input', e=>{
    const v = e.target.value;
    document.querySelectorAll('#amIconPick span').forEach(x=>x.classList.remove('active'));
    document.getElementById('amIconPreview').textContent = v || '💳';
  });
  // 颜色选择(预置)
  document.getElementById('amColorPick').querySelectorAll('span').forEach(sp=>{
    sp.onclick = ()=>{
      document.querySelectorAll('#amColorPick span').forEach(x=>x.classList.remove('active'));
      sp.classList.add('active');
      document.getElementById('amCustomColor').value = sp.dataset.c;
    };
  });
  // 自定义颜色
  document.getElementById('amCustomColor').addEventListener('input', e=>{
    document.querySelectorAll('#amColorPick span').forEach(x=>x.classList.remove('active'));
  });
}

function closeModal(){ document.getElementById('modalMask').classList.remove('show'); }

async function saveAccountFromModal(){
  const ledgerId = getCurrentLedgerId();
  const editId = document.getElementById('amEditId').value;
  const parentId = document.getElementById('amEditParent').value;
  const name = document.getElementById('amName').value.trim();
  const code = document.getElementById('amCode').value.trim();
  const isAsset = document.getElementById('amAssetSwitch').dataset.on === '1' ? 1 : 0;
  const accountType = document.getElementById('amType').value;
  // 分组(子账户继承父账户，不显示该字段)
  const groupSel = document.getElementById('amGroup');
  const groupId = groupSel ? groupSel.value : '';
  // 图标：优先取自定义输入，其次取预置选中
  const customIcon = document.getElementById('amCustomIcon').value.trim();
  const presetIconEl = document.querySelector('#amIconPick span.active');
  const icon = customIcon || (presetIconEl ? presetIconEl.dataset.ic : '💳');
  // 颜色：优先取预置选中，其次取自定义 color picker
  const presetColorEl = document.querySelector('#amColorPick span.active');
  const iconBg = presetColorEl ? presetColorEl.dataset.c : (document.getElementById('amCustomColor').value || '#4f7cff');
  if(!name){ toast('请输入账户名称'); return; }
  const accts = getAccounts(ledgerId);
  if(editId){
    // 编辑：递归查找目标账户并更新（复用 accts 保证写回）
    const { node } = findAccountById(editId, ledgerId, accts);
    if(!node){ toast('账户不存在'); return; }
    const newBalance = parseFloat(document.getElementById('amBalance').value) || 0;
    node.name = name; node.code = code; node.balance = newBalance;
    node.isAsset = isAsset; node.accountType = accountType;
    if(groupId) node.groupId = groupId;
    node.icon = icon; node.iconBg = iconBg;
    setAccounts(accts, ledgerId);
    toast('已更新');
    closeModal();
    renderAccounts();
  } else {
    const balance = parseFloat(document.getElementById('amBalance').value) || 0;
    if(parentId){
      // 新增子账户：递归查找父账户并追加（复用 accts 保证写回）
      const { node: parent, parent: grandParent } = findAccountById(parentId, ledgerId, accts);
      if(!parent){ toast('父账户不存在'); return; }
      // 校验：父账户必须是一级账户（不能在子账户下再建子账户）
      if(grandParent){ toast('子账户下不能再添加子账户'); return; }
      if(!parent.children) parent.children = [];
      if(parent.children.some(c=>c.name===name)){ toast('同级账户名已存在'); return; }
      parent.children.push({ id:genId(), name, code, balance, isAsset, accountType, groupId:parent.groupId, icon, iconBg, children:[] });
      // 自动展开父账户及其所在分组，让新子账户立即可见
      expandedNodes.add('acct:' + parentId);
      if(parent.groupId) expandedNodes.add('grp:' + parent.groupId);
    } else {
      if(accts.some(a=>a.name===name)){ toast('一级账户名已存在'); return; }
      accts.push({ id:genId(), groupId, name, code, balance, isAsset, accountType, icon, iconBg, children:[] });
      // 自动展开所在分组，让新账户立即可见
      if(groupId) expandedNodes.add('grp:' + groupId);
    }
    setAccounts(accts, ledgerId);
    toast('已添加');
    closeModal();
    renderAccounts();
  }
}

async function deleteAccount(id){
  const ledgerId = getCurrentLedgerId();
  const bills = getBills(ledgerId);
  const accts = getAccounts(ledgerId);
  const { node, list } = findAccountById(id, ledgerId, accts);
  if(!node) return;
  // 递归收集所有子孙账户 ID（用于流水检查）
  const relatedIds = [id];
  function collect(node){ (node.children||[]).forEach(c=>{ relatedIds.push(c.id); collect(c); }); }
  collect(node);
  const related = bills.filter(b=> relatedIds.includes(b.accountId) || relatedIds.includes(b.fromAccountId) || relatedIds.includes(b.toAccountId));
  const childCount = relatedIds.length - 1;
  let msg = `确认删除账户「${node.name}」？`;
  if(related.length>0) msg = `账户「${node.name}」下有 ${related.length} 条流水记录。\n删除后这些流水将丢失且余额无法恢复，建议先导出备份。\n\n确认仍要删除？`;
  else if(childCount>0) msg = `账户「${node.name}」含 ${childCount} 个子账户，将一并删除。\n\n确认删除？`;
  if(!await confirmBox(msg)) return;
  // 从所在列表中移除（list 是 accts 树中的引用，splice 直接生效）
  const idx = list.findIndex(x=>x.id===id);
  if(idx>=0) list.splice(idx,1);
  setAccounts(accts, ledgerId);
  if(related.length>0){
    const remaining = bills.filter(b=> !relatedIds.includes(b.accountId) && !relatedIds.includes(b.fromAccountId) && !relatedIds.includes(b.toAccountId));
    setBills(remaining, ledgerId);
  }
  toast('已删除');
  renderAccounts();
}

/* ==================== 十一(补)、账户分组管理 ==================== */
// 新增/编辑分组弹窗
function openGroupModal(gid){
  const ledgerId = getCurrentLedgerId();
  const groups = getGroups(ledgerId);
  const g = gid ? groups.find(x=>x.id===gid) : null;
  const title = g ? '编辑分组' : '新增分组';
  const nameVal = g ? g.name : '';
  const iconVal = g ? (g.icon||'📁') : '📁';
  const mask = document.getElementById('modalMask');
  const box = document.getElementById('modalBox');
  const groupIcons = ['💵','🏦','💎','📈','⚠️','📁','💰','🏠','🚗','📱','🎁','💼','🎯','📦','🏺','🪙','🐷','🍰','☕','🛒','🎮','📚','💊','🔨','✈️','🚀','🏆','🔒','🔑'];
  const hasPresetIcon = groupIcons.includes(iconVal);
  const iconHtml = groupIcons.map(ic=>`<span class="${ic===iconVal?'active':''}" data-ic="${ic}">${ic}</span>`).join('');
  box.innerHTML = `<h3>${title}</h3>
    <input type="hidden" id="gmId" value="${gid||''}">
    <div class="field"><label>分组名称</label><input type="text" id="gmName" value="${escapeHtml(nameVal)}" placeholder="如：现金账户"></div>
    <div class="field"><label>分组图标</label><div class="acct-modal-icon-pick" id="gmIconPick">${iconHtml}</div>
      <div class="acct-custom-icon-row"><input type="text" id="gmCustomIcon" value="${hasPresetIcon?'':iconVal}" placeholder="或输入自定义 emoji/文字" maxlength="4" style="flex:1;"><span class="custom-icon-preview" id="gmIconPreview">${escapeHtml(iconVal)}</span></div></div>
    <div class="btns"><button class="btn btn-ghost" id="gmCancel">取消</button><button class="btn btn-primary" id="gmOk">保存</button></div>`;
  mask.classList.add('show');
  document.getElementById('gmName').focus();
  document.getElementById('gmCancel').onclick = ()=>closeModal();
  document.getElementById('gmOk').onclick = ()=>saveGroupFromModal();
  document.getElementById('gmIconPick').querySelectorAll('span').forEach(sp=>{
    sp.onclick = ()=>{
      document.querySelectorAll('#gmIconPick span').forEach(x=>x.classList.remove('active'));
      sp.classList.add('active');
      document.getElementById('gmCustomIcon').value = '';
      document.getElementById('gmIconPreview').textContent = sp.dataset.ic;
    };
  });
  // 自定义图标输入
  document.getElementById('gmCustomIcon').addEventListener('input', e=>{
    const v = e.target.value;
    document.querySelectorAll('#gmIconPick span').forEach(x=>x.classList.remove('active'));
    document.getElementById('gmIconPreview').textContent = v || '📁';
  });
}

function saveGroupFromModal(){
  const ledgerId = getCurrentLedgerId();
  const gid = document.getElementById('gmId').value;
  const name = document.getElementById('gmName').value.trim();
  if(!name){ toast('请输入分组名称'); return; }
  // 图标：优先取自定义输入，其次取预置选中
  const customIcon = document.getElementById('gmCustomIcon').value.trim();
  const presetIconEl = document.querySelector('#gmIconPick span.active');
  const icon = customIcon || (presetIconEl ? presetIconEl.dataset.ic : '📁');
  const groups = getGroups(ledgerId);
  if(gid){
    const g = groups.find(x=>x.id===gid);
    if(!g){ toast('分组不存在'); return; }
    if(name!==g.name && groups.some(x=>x.name===name)){ toast('分组名已存在'); return; }
    g.name = name; g.icon = icon;
    setGroups(groups, ledgerId);
    toast('已更新');
  } else {
    if(groups.some(x=>x.name===name)){ toast('分组名已存在'); return; }
    const maxOrder = groups.reduce((m,x)=>Math.max(m, x.order||0), 0);
    groups.push({ id:genId(), name, icon, order:maxOrder+1 });
    setGroups(groups, ledgerId);
    toast('已添加');
  }
  closeModal();
  renderAccounts();
}

async function deleteGroup(gid){
  const ledgerId = getCurrentLedgerId();
  const groups = getGroups(ledgerId);
  const g = groups.find(x=>x.id===gid);
  if(!g) return;
  const accts = getAccounts(ledgerId);
  const cnt = accts.filter(a=>a.groupId===gid).length;
  let msg = `确认删除分组「${g.name}」？`;
  if(cnt>0) msg = `分组「${g.name}」下有 ${cnt} 个账户，删除后这些账户将归入"未分组"。\n\n确认删除？`;
  if(!await confirmBox(msg)) return;
  // 移除分组
  const newGroups = groups.filter(x=>x.id!==gid);
  setGroups(newGroups, ledgerId);
  toast('已删除');
  renderAccounts();
}

// 分组管理弹窗：支持排序(拖拽 + 上移/下移)、编辑、删除、新增
function openGroupManageModal(){
  const ledgerId = getCurrentLedgerId();
  const mask = document.getElementById('modalMask');
  const box = document.getElementById('modalBox');
  box.innerHTML = `<h3>管理分组</h3>
    <p style="font-size:12px;color:var(--text-sub);margin-bottom:10px;">拖拽 ⋮⋮ 调整顺序，或点击 ↑↓ 微调</p>
    <div id="gmList" class="group-manage-list"></div>
    <button class="btn btn-primary" id="gmAddNew" style="width:100%;margin-top:10px;">+ 新增分组</button>
    <div class="btns"><button class="btn btn-ghost" id="gmClose">完成</button></div>`;
  mask.classList.add('show');
  renderGroupManageList();
  document.getElementById('gmAddNew').onclick = ()=>{ closeModal(); openGroupModal(null); };
  document.getElementById('gmClose').onclick = ()=>closeModal();
}

function renderGroupManageList(){
  const ledgerId = getCurrentLedgerId();
  const groups = getGroups(ledgerId);
  // 按 order 排序后展示
  const sorted = [...groups].sort((a,b)=>(a.order||0)-(b.order||0));
  const el = document.getElementById('gmList');
  if(sorted.length===0){
    el.innerHTML = '<div class="empty-tip" style="padding:14px 0;">暂无分组</div>';
    return;
  }
  el.innerHTML = sorted.map((g, idx)=>`
    <div class="group-manage-row" data-gid="${g.id}" draggable="true">
      <span class="gm-drag" title="拖拽排序">⋮⋮</span>
      <span class="gm-icon">${g.icon||'📁'}</span>
      <span class="gm-name">${escapeHtml(g.name)}</span>
      <div class="gm-ops">
        <button class="gm-op ${idx===0?'disabled':''}" data-act="up" title="上移">↑</button>
        <button class="gm-op ${idx===sorted.length-1?'disabled':''}" data-act="down" title="下移">↓</button>
        <button class="gm-op edit" data-act="edit" title="编辑">✏️</button>
        <button class="gm-op del" data-act="del" title="删除">🗑</button>
      </div>
    </div>`).join('');
  // 按钮事件
  el.querySelectorAll('.gm-op').forEach(btn=>{
    btn.onclick = async (e)=>{
      e.stopPropagation();
      if(btn.classList.contains('disabled')) return;
      const row = btn.closest('.group-manage-row');
      const gid = row.dataset.gid;
      const act = btn.dataset.act;
      if(act==='up') moveGroup(gid, -1);
      else if(act==='down') moveGroup(gid, 1);
      else if(act==='edit'){ closeModal(); openGroupModal(gid); }
      else if(act==='del'){ closeModal(); await deleteGroup(gid); openGroupManageModal(); }
    };
  });
  // 拖拽排序(HTML5 Drag and Drop)
  let dragGid = null;
  const rows = el.querySelectorAll('.group-manage-row');
  rows.forEach(row=>{
    row.addEventListener('dragstart', e=>{
      dragGid = row.dataset.gid;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      // 部分 mobile 浏览器需要 setData 才触发 dragover
      try{ e.dataTransfer.setData('text/plain', dragGid); }catch(_){}
    });
    row.addEventListener('dragend', ()=>{
      row.classList.remove('dragging');
      el.querySelectorAll('.group-manage-row').forEach(r=>r.classList.remove('drag-over'));
      dragGid = null;
    });
    row.addEventListener('dragover', e=>{
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if(row.dataset.gid !== dragGid) row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', ()=> row.classList.remove('drag-over'));
    row.addEventListener('drop', e=>{
      e.preventDefault();
      row.classList.remove('drag-over');
      const dropGid = row.dataset.gid;
      if(!dragGid || dragGid === dropGid) return;
      // 按 DOM 顺序提取 gid 数组
      const order = Array.from(el.querySelectorAll('.group-manage-row')).map(r=>r.dataset.gid);
      reorderGroups(order);
      renderGroupManageList();
      if(document.getElementById('page-accounts').classList.contains('active')) renderAccounts();
    });
  });
}

// 按给定 gid 顺序重写所有分组的 order 字段
function reorderGroups(orderedGids){
  const ledgerId = getCurrentLedgerId();
  const groups = getGroups(ledgerId);
  orderedGids.forEach((gid, i)=>{
    const g = groups.find(x=>x.id===gid);
    if(g) g.order = i + 1;
  });
  setGroups(groups, ledgerId);
}

// 移动分组顺序：dir=-1 上移，dir=1 下移
function moveGroup(gid, dir){
  const ledgerId = getCurrentLedgerId();
  const groups = getGroups(ledgerId);
  const sorted = [...groups].sort((a,b)=>(a.order||0)-(b.order||0));
  const idx = sorted.findIndex(g=>g.id===gid);
  if(idx<0) return;
  const target = idx + dir;
  if(target<0 || target>=sorted.length) return;
  // 交换两个分组的 order
  const a = sorted[idx], b = sorted[target];
  const tmpOrder = a.order;
  a.order = b.order;
  b.order = tmpOrder;
  // 写回 groups 数组(保持原引用)
  setGroups(groups, ledgerId);
  renderGroupManageList();
  // 同步刷新账户页(若可见)
  if(document.getElementById('page-accounts').classList.contains('active')) renderAccounts();
}

/* ==================== 十二、账户流水 ==================== */
function openAcctFlow(id){ acctFlowId = id; goPage('acctflow'); }

function renderAcctFlow(){
  const ledgerId = getCurrentLedgerId();
  if(!acctFlowId) return;
  const { node, parent } = findAccountById(acctFlowId, ledgerId);
  if(!node){
    document.getElementById('acctFlowTitle').textContent = '账户已删除';
    document.getElementById('acctFlowBalance').textContent = '';
    document.getElementById('acctFlowList').innerHTML = '<div class="empty-tip">账户不存在</div>';
    return;
  }
  const hasChildren = (node.children||[]).length > 0;
  const isL1 = !parent; // 一级账户才能添加子账户
  const titleEl = document.getElementById('acctFlowTitle');
  // 构建层级路径标题
  let path = escapeHtml(node.name);
  if(parent) path = escapeHtml(parent.name) + ' › ' + path;
  if(hasChildren) path += '（含子账户）';
  if(isL1){
    titleEl.innerHTML = `${path} <button class="flow-sub-btn" id="flowAddSubBtn">+ 添加子账户</button>`;
    document.getElementById('flowAddSubBtn').onclick = ()=> openAcctModal(null, node.id);
  } else {
    titleEl.textContent = path;
  }
  // 余额：递归含所有子账户
  const bal = acctBalance(node);
  document.getElementById('acctFlowBalance').textContent = '当前余额 ¥' + fmtMoney(bal);
  // 流水：递归收集所有子孙账户 ID
  const relatedIds = [acctFlowId];
  function collect(n){ (n.children||[]).forEach(c=>{ relatedIds.push(c.id); collect(c); }); }
  collect(node);
  const bills = getBills(ledgerId);
  const flow = bills.filter(b=> relatedIds.includes(b.accountId) || relatedIds.includes(b.fromAccountId) || relatedIds.includes(b.toAccountId));
  flow.sort((a,b)=> a.date<b.date ? 1 : (a.date>b.date?-1:(b.createdAt-a.createdAt)));
  renderBillItems('acctFlowList', flow, ledgerId);
  if(flow.length===0) document.getElementById('acctFlowList').innerHTML = '<div class="empty-tip">该账户暂无流水记录</div>';
}

/* ==================== 十三、预算管理 ==================== */
function renderBudget(){
  const ledgerId = getCurrentLedgerId();
  const month = monthKey(new Date());
  const budget = getBudget(month, ledgerId);
  const bills = getBills(ledgerId);
  const monthBills = bills.filter(b=>isThisMonth(b.date) && b.type==='expense');
  const totalUsed = monthBills.reduce((s,b)=>s+Number(b.amount),0);
  const totalBudget = budget.total || 0;
  const cats = getCats(ledgerId);
  const totalCard = document.getElementById('budgetTotalCard');
  const pct = totalBudget>0 ? (totalUsed/totalBudget*100).toFixed(1) : 0;
  totalCard.innerHTML = `<div class="lbl">${monthLabel(new Date())} 预算执行</div>
    <div class="val">${fmtMoney(totalUsed)} / ${fmtMoney(totalBudget)}</div>
    <div class="budget-progress"><div class="bar" style="width:${Math.min(100,pct)}%;background:${totalUsed>totalBudget?'var(--expense)':'#fff'};"></div></div>
    <div class="pct">执行进度 ${pct}% ${totalUsed>totalBudget?'· 已超支':''}</div>`;
  const listEl = document.getElementById('budgetList');
  const byCat = {};
  monthBills.forEach(b=>{ const l1 = b.categoryL1 || '其他'; byCat[l1] = (byCat[l1]||0) + Number(b.amount); });
  let html = '';
  cats.expense.forEach(l1=>{
    const used = byCat[l1.name] || 0;
    const bdgt = budget.byCategory[l1.name] || 0;
    if(bdgt > 0 || used > 0){
      const cPct = bdgt>0 ? (used/bdgt*100) : 0;
      const color = used>bdgt && bdgt>0 ? 'var(--expense)' : 'var(--asset)';
      html += `<div class="budget-item">
        <div class="left"><div class="n">${catIcon(l1.name)} ${l1.name}</div>
          <div class="bar-wrap"><div class="bar" style="width:${Math.min(100,cPct)}%;background:${color};"></div></div>
        </div>
        <div class="right"><div class="used" style="color:${color}">¥${fmtMoney(used)}</div><div class="budget">预算 ¥${fmtMoney(bdgt)}</div></div>
      </div>`;
    }
  });
  if(html==='') html = '<div class="empty-tip">暂无预算设置，点"编辑预算"开始</div>';
  listEl.innerHTML = html;
}

function openBudgetModal(){
  const ledgerId = getCurrentLedgerId();
  const month = monthKey(new Date());
  const budget = getBudget(month, ledgerId);
  const cats = getCats(ledgerId);
  const box = document.getElementById('modalBox');
  let fields = cats.expense.map(l1=>`
    <div class="field"><label>${catIcon(l1.name)} ${l1.name}</label>
      <input type="number" data-cat="${escapeHtml(l1.name)}" value="${budget.byCategory[l1.name]||0}" placeholder="0.00" step="0.01"></div>`).join('');
  box.innerHTML = `<h3>编辑 ${monthLabel(new Date())} 预算</h3>
    <div class="field"><label>月度总预算</label><input type="number" id="bmTotal" value="${budget.total||0}" placeholder="0.00" step="0.01"></div>
    ${fields}
    <div class="btns"><button class="btn btn-ghost" id="bmCancel">取消</button><button class="btn btn-primary" id="bmOk">保存</button></div>`;
  document.getElementById('modalMask').classList.add('show');
  document.getElementById('bmCancel').onclick = ()=>closeModal();
  document.getElementById('bmOk').onclick = ()=>{
    const total = parseFloat(document.getElementById('bmTotal').value) || 0;
    const byCategory = {};
    box.querySelectorAll('[data-cat]').forEach(inp=>{ const v = parseFloat(inp.value) || 0; if(v>0) byCategory[inp.dataset.cat] = v; });
    setBudget(month, { total, byCategory }, ledgerId);
    toast('预算已保存');
    closeModal();
    renderBudget();
  };
}

/* ==================== 十四、账本管理 ==================== */
function renderLedgers(){
  const ledgers = getLedgers();
  const currentId = getCurrentLedgerId();
  const el = document.getElementById('ledgerList');
  if(ledgers.length===0){ el.innerHTML = '<div class="empty-tip">暂无账本</div>'; return; }
  let html = '';
  ledgers.forEach(l=>{
    const isCurrent = l.id === currentId;
    html += `<div class="ledger-item ${isCurrent?'active':''}" data-id="${l.id}">
      <span class="name">${l.icon||'📒'} ${escapeHtml(l.name)} ${isCurrent?'<span style="color:var(--primary);font-size:11px;">当前</span>':''}</span>
      <div class="ops">
        <button class="op" data-act="switch">切换</button>
        <button class="op edit" data-act="edit">✏️</button>
        ${l.isDefault?'':`<button class="op del" data-act="del">🗑</button>`}
      </div>
    </div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('[data-act]').forEach(btn=>{
    btn.onclick = ()=>{
      const item = btn.closest('.ledger-item');
      const id = item.dataset.id;
      const act = btn.dataset.act;
      if(act==='switch') switchLedger(id);
      else if(act==='edit') openLedgerModal(id);
      else if(act==='del') deleteLedger(id);
    };
  });
}

function switchLedger(id){
  setCurrentLedgerId(id);
  toast('已切换账本');
  renderLedgerDropdown();
  goPage('home');
}

function openLedgerModal(editId){
  const box = document.getElementById('modalBox');
  let nameVal = '', iconVal = '📒';
  if(editId){
    const l = getLedgers().find(x=>x.id===editId);
    if(!l) return;
    nameVal = l.name; iconVal = l.icon || '📒';
  }
  box.innerHTML = `<h3>${editId?'编辑账本':'新建账本'}</h3>
    <input type="hidden" id="lmEditId" value="${editId||''}">
    <div class="field"><label>账本名称</label><input type="text" id="lmName" value="${escapeHtml(nameVal)}" placeholder="如：家庭账本"></div>
    <div class="field"><label>图标（emoji）</label><input type="text" id="lmIcon" value="${escapeHtml(iconVal)}" placeholder="📒"></div>
    <div class="btns"><button class="btn btn-ghost" id="lmCancel">取消</button><button class="btn btn-primary" id="lmOk">保存</button></div>`;
  document.getElementById('modalMask').classList.add('show');
  document.getElementById('lmName').focus();
  document.getElementById('lmCancel').onclick = ()=>closeModal();
  document.getElementById('lmOk').onclick = ()=>{
    const name = document.getElementById('lmName').value.trim();
    const icon = document.getElementById('lmIcon').value.trim() || '📒';
    if(!name){ toast('请输入账本名称'); return; }
    const ledgers = getLedgers();
    if(editId){
      const l = ledgers.find(x=>x.id===editId);
      if(l){ l.name = name; l.icon = icon; }
    } else {
      ledgers.push({ id:genId(), name, icon, createdAt:Date.now(), isDefault:false });
    }
    setLedgers(ledgers);
    toast(editId?'已更新':'已创建');
    closeModal();
    renderLedgerDropdown();
    renderLedgers();
  };
}

async function deleteLedger(id){
  const ledgers = getLedgers();
  const l = ledgers.find(x=>x.id===id);
  if(!l) return;
  if(l.isDefault){ toast('默认账本不能删除'); return; }
  if(!await confirmBox(`确认删除账本「${l.name}」？\n该账本下的所有账单、分类、账户、预算将一并删除且不可恢复。`)) return;
  // 删除该账本的所有数据
  localStorage.removeItem(dataKey('bills', id));
  localStorage.removeItem(dataKey('categories', id));
  localStorage.removeItem(dataKey('accounts', id));
  localStorage.removeItem(dataKey('budgets', id));
  const newLedgers = ledgers.filter(x=>x.id!==id);
  setLedgers(newLedgers);
  // 如果删除的是当前账本，切回默认
  if(getCurrentLedgerId() === id){
    const s = getSettings();
    s.currentLedgerId = newLedgers[0].id;
    setSettings(s);
  }
  toast('已删除账本');
  renderLedgerDropdown();
  renderLedgers();
  goPage('home');
}

function renderLedgerDropdown(){
  const sel = document.getElementById('ledgerDropdown');
  if(!sel) return; // 账本选择器已从界面移除，跳过渲染
  const ledgers = getLedgers();
  const currentId = getCurrentLedgerId();
  sel.innerHTML = ledgers.map(l=>`<option value="${l.id}" ${l.id===currentId?'selected':''}>${l.icon||'📒'} ${escapeHtml(l.name)}</option>`).join('');
  sel.onchange = ()=>switchLedger(sel.value);
}

/* ==================== 十五、备份 ==================== */
function renderBackup(){
  const ledgerId = getCurrentLedgerId();
  const bills = getBills(ledgerId);
  const cats = getCats(ledgerId);
  const accts = getAccounts(ledgerId);
  const income = bills.filter(b=>b.type==='income').reduce((s,b)=>s+Number(b.amount),0);
  const expense = bills.filter(b=>b.type==='expense').reduce((s,b)=>s+Number(b.amount),0);
  const transferCount = bills.filter(b=>b.type==='transfer').length;
  const dates = bills.map(b=>b.date).sort();
  const dateRange = bills.length>0 ? `${dates[0]} ~ ${dates[dates.length-1]}` : '无';
  const l1Count = cats.income.length + cats.expense.length;
  const l2Count = cats.income.reduce((s,c)=>s+c.children.length,0) + cats.expense.reduce((s,c)=>s+c.children.length,0);
  // 递归统计账户数和资产负债
  let acctCount = 0, totalAssets = 0, totalLiability = 0;
  function walk(a){
    acctCount++;
    const bal = Number(a.balance)||0;
    if(a.accountType==='liability'){ if(a.isAsset) totalLiability += Math.abs(bal); }
    else { if(a.isAsset) totalAssets += bal; }
    (a.children||[]).forEach(walk);
  }
  accts.forEach(walk);
  const ledgers = getLedgers();
  document.getElementById('dataStat').innerHTML = `
    账本数量：<b>${ledgers.length}</b> 个（当前：${ledgers.find(l=>l.id===ledgerId)?.name||'无'}）<br>
    账单总数：<b>${bills.length}</b> 条（含转账 ${transferCount} 条）<br>
    一级分类：<b>${l1Count}</b> 个，二级分类：<b>${l2Count}</b> 个<br>
    账户总数：<b>${acctCount}</b> 个（含多层子账户）<br>
    累计收入：<b style="color:var(--income)">¥${fmtMoney(income)}</b><br>
    累计支出：<b style="color:var(--expense)">¥${fmtMoney(expense)}</b><br>
    资产合计：<b style="color:var(--asset)">¥${fmtMoney(totalAssets)}</b><br>
    负债合计：<b style="color:var(--liability)">¥${fmtMoney(totalLiability)}</b><br>
    净资产：<b style="color:var(--primary)">¥${fmtMoney(totalAssets-totalLiability)}</b><br>
    账单日期范围：<b>${dateRange}</b>
  `;
}

function exportBackup(){
  const ledgers = getLedgers();
  const data = { version:'4.0', exportTime:new Date().toISOString(), ledgers, settings:getSettings(), data:{} };
  ledgers.forEach(l=>{
    data.data[l.id] = {
      categories: getCats(l.id),
      accounts: getAccounts(l.id),
      bills: getBills(l.id),
      budgets: getBudgets(l.id)
    };
  });
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `记账备份_${fmtDate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('已导出备份文件');
}

async function importBackup(file){
  if(!file) return;
  if(!await confirmBox('导入会覆盖当前所有数据，且不可恢复。是否继续？')) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const data = JSON.parse(e.target.result);
      if(!data.ledgers || !data.data) throw new Error('格式不正确');
      setLedgers(data.ledgers);
      Object.keys(data.data).forEach(lid=>{
        const d = data.data[lid];
        if(d.categories) saveData(dataKey('categories', lid), d.categories);
        if(d.accounts) saveData(dataKey('accounts', lid), d.accounts);
        if(d.bills) saveData(dataKey('bills', lid), d.bills);
        if(d.budgets) saveData(dataKey('budgets', lid), d.budgets);
      });
      if(data.settings) setSettings(data.settings);
      if(data.settings && data.settings.theme) applyTheme(data.settings.theme);
      toast('导入成功');
      renderLedgerDropdown();
      goPage('home');
    }catch(err){
      toast('文件格式错误，导入失败');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

async function clearAllBills(){
  const ledgerId = getCurrentLedgerId();
  if(!await confirmBox('确认清空当前账本所有账单记录？\n注意：账户余额不会自动归零，需到账户管理单独调整。')) return;
  setBills([], ledgerId);
  toast('已清空');
  renderBackup();
}

/* ==================== 十六、主题 ==================== */
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme==='dark' ? '☀️' : '🌙';
  const s = getSettings();
  s.theme = theme;
  setSettings(s);
  if(document.getElementById('page-home').classList.contains('active')) renderHome();
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur==='dark' ? 'light' : 'dark');
}

/* ==================== 十七、事件绑定与初始化 ==================== */
function initEvents(){
  document.querySelectorAll('.nav-btn').forEach(btn=>{ btn.addEventListener('click', ()=>goPage(btn.dataset.page)); });
  document.getElementById('backBtn').addEventListener('click', ()=>goPage('accounts'));
  document.getElementById('homeRecentMore').addEventListener('click', ()=>goPage('list'));
  document.getElementById('homeAssetsMore').addEventListener('click', ()=>goPage('accounts'));
  document.getElementById('goReportBtn').addEventListener('click', ()=>goPage('stats'));
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.querySelectorAll('#typeSwitch button').forEach(btn=>{ btn.addEventListener('click', ()=>switchType(btn.dataset.type)); });
  document.querySelectorAll('#homePieToggle button').forEach(btn=>{ btn.addEventListener('click', ()=>{ homeChartType = btn.dataset.type; document.querySelectorAll('#homePieToggle button').forEach(b=>b.classList.toggle('active', b===btn)); renderHome(); }); });
  document.getElementById('tagInput').addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===','){
      e.preventDefault();
      const val = e.target.value.trim().replace(/[,，]/g,'');
      if(val && !currentTags.includes(val)){ currentTags.push(val); renderTags(); }
      e.target.value = '';
    }
  });
  document.getElementById('saveBtn').addEventListener('click', saveBill);
  ['searchInput','filterStart','filterEnd','filterType','filterL1','filterL2','filterAccount','filterMerchant','filterProject'].forEach(id=>{
    const el = document.getElementById(id);
    el.addEventListener('input', renderList);
    el.addEventListener('change', renderList);
  });
  document.getElementById('clearFilter').addEventListener('click', clearFilters);
  ['incomeCatSearch','expenseCatSearch'].forEach(id=>{ document.getElementById(id).addEventListener('input', renderCategories); });
  document.getElementById('addIncomeL1').addEventListener('click', ()=>addL1('income'));
  document.getElementById('addExpenseL1').addEventListener('click', ()=>addL1('expense'));
  ['newIncomeL1','newExpenseL1'].forEach(id=>{ document.getElementById(id).addEventListener('keydown', e=>{ if(e.key==='Enter') addL1(id==='newIncomeL1'?'income':'expense'); }); });
  document.getElementById('addLedgerLink').addEventListener('click', ()=>openLedgerModal(null));
  document.getElementById('editBudgetLink').addEventListener('click', openBudgetModal);
  document.getElementById('exportBtn').addEventListener('click', exportBackup);
  document.getElementById('importBtn').addEventListener('click', ()=>document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', e=>{ importBackup(e.target.files[0]); e.target.value = ''; });
  document.getElementById('clearBtn').addEventListener('click', clearAllBills);
  // 账户页 V5 事件：横幅 + 分组操作
  document.getElementById('acctAddBtn').addEventListener('click', ()=>openAcctModal(null, null));
  document.getElementById('acctEyeBtn').addEventListener('click', ()=>{
    const s = getSettings();
    s.hideAmount = !s.hideAmount;
    setSettings(s);
    renderAccounts();
    // 同步刷新首页
    if(document.getElementById('page-home').classList.contains('active')) renderHome();
  });
  // 横幅更多菜单
  const acctMoreBtn = document.getElementById('acctMoreBtn');
  const acctMoreMenu = document.getElementById('acctMoreMenu');
  acctMoreBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    acctMoreMenu.classList.toggle('show');
  });
  document.addEventListener('click', (e)=>{
    if(!acctMoreMenu.contains(e.target) && e.target !== acctMoreBtn){
      acctMoreMenu.classList.remove('show');
    }
  });
  // 更多菜单项
  acctMoreMenu.querySelectorAll('.item').forEach(it=>{
    it.addEventListener('click', ()=>{
      acctMoreMenu.classList.remove('show');
      const act = it.dataset.act;
      if(act==='sort'){
        // 简单排序：按余额倒序
        const ledgerId = getCurrentLedgerId();
        const accts = getAccounts(ledgerId);
        accts.sort((a,b)=> acctBalance(b) - acctBalance(a));
        setAccounts(accts, ledgerId);
        toast('已按余额排序');
        renderAccounts();
      } else if(act==='manage-groups'){
        // 打开分组管理弹窗(支持排序)
        openGroupManageModal();
      } else if(act==='export'){
        exportBackup();
      }
    });
  });
  // 横幅皮肤切换（圆点）
  document.getElementById('acctBannerDots').addEventListener('click', (e)=>{
    const dot = e.target.closest('.dot');
    if(!dot) return;
    const s = getSettings();
    s.bannerIndex = parseInt(dot.dataset.skin);
    setSettings(s);
    renderAccounts();
  });
  // 横幅左右滑动切换皮肤
  const banner = document.getElementById('acctBanner');
  let touchStartX = 0;
  banner.addEventListener('touchstart', e=>{ touchStartX = e.touches[0].clientX; }, {passive:true});
  banner.addEventListener('touchend', e=>{
    const dx = e.changedTouches[0].clientX - touchStartX;
    if(Math.abs(dx) < 40) return;
    const s = getSettings();
    let idx = s.bannerIndex || 0;
    idx = (idx + (dx<0?1:2)) % 3;
    s.bannerIndex = idx;
    setSettings(s);
    renderAccounts();
  });
  // 统计分析页事件
  document.querySelectorAll('#statTabs button').forEach(btn=>{ btn.addEventListener('click', ()=>{ statTab = btn.dataset.tab; statSubTab = 'category'; delete drillState[statTab]; document.querySelectorAll('#statTabs button').forEach(b=>b.classList.toggle('active', b===btn)); renderStats(); }); });
  document.querySelectorAll('#statQuickTime button').forEach(btn=>{ btn.addEventListener('click', ()=>{ statRange = btn.dataset.range; document.querySelectorAll('#statQuickTime button').forEach(b=>b.classList.toggle('active', b===btn)); renderStats(); }); });
  ['statStart','statEnd'].forEach(id=>{ document.getElementById(id).addEventListener('change', ()=>{ statRange = 'custom'; document.querySelectorAll('#statQuickTime button').forEach(b=>b.classList.remove('active')); renderStats(); }); });
  // 商家/项目建议
  setupSuggest('merchantInput', 'merchantSuggest', 'merchants');
  setupSuggest('projectInput', 'projectSuggest', 'projects');
}

function init(){
  getLedgers();
  getCurrentLedgerId();
  getBills();
  const s = getSettings();
  applyTheme(s.theme || 'light');
  initEvents();
  renderLedgerDropdown();
  document.getElementById('dateInput').value = fmtDate(new Date());
  renderHome();
}

document.addEventListener('DOMContentLoaded', init);
