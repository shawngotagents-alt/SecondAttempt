// ============================================================
//  Grace Community Church — App Logic
//  Front-end demo build. Mock data only — no real backend yet.
//  TODO markers show exactly where to wire in real API calls
//  once authorization / database is ready.
// ============================================================

const CHURCH_NAME = 'Grace Community Church'; // single source of truth for the name

const AVATAR_COLORS = ['#534AB7', '#EF9F27', '#1D9E75', '#D85A30', '#D4537E', '#378ADD'];

// ------------------------------------------------------------
// Mock "current user" / auth state
// TODO: replace with real session/auth (e.g. JWT, cookie session)
// ------------------------------------------------------------
let currentUser = null; // null = logged out

const mockUsers = [
  { name: 'Jane Doe', email: 'jane@example.com', password: 'demo123' },
];

// ------------------------------------------------------------
// Mock data stores
// TODO: replace each of these with GET/POST/DELETE calls to your API
// ------------------------------------------------------------

const events = [
  { id: 1, title: 'Sunday Worship Service', date: '2026-06-21', time: '09:30', type: 'service' },
  { id: 2, title: 'Bible Study: Romans 1–3', date: '2026-06-24', time: '19:00', type: 'study' },
  { id: 3, title: 'Youth Group Game Night', date: '2026-06-26', time: '18:00', type: 'event' },
  { id: 4, title: 'Sunday Worship Service', date: '2026-06-28', time: '09:30', type: 'service' },
  { id: 5, title: 'Prayer & Worship Night', date: '2026-06-30', time: '19:30', type: 'event' },
  { id: 6, title: 'Bible Study: Psalms', date: '2026-07-01', time: '19:00', type: 'study' },
  { id: 7, title: 'Community Food Drive', date: '2026-07-04', time: '10:00', type: 'event' },
];

const sessions = [
  { id: 1, title: 'Book of Romans, Ch. 1–3', leader: 'Pastor James', date: '2026-06-24', time: '19:00', location: 'Fellowship Hall', format: 'In-person', notes: 'Bring your study Bible' },
  { id: 2, title: 'Psalms of Praise', leader: 'Deacon Maria', date: '2026-07-01', time: '10:30', location: 'Zoom', format: 'Online', notes: 'Link sent via email' },
  { id: 3, title: 'Sermon on the Mount', leader: 'Elder Thomas', date: '2026-07-05', time: '18:30', location: 'Room 104', format: 'Hybrid', notes: '' },
];
let nextSessionId = 4;
let sessionFilter = 'all';

const threads = [
  { id: 1, author: 'Pastor James', body: "This Sunday we're starting a new series on the Sermon on the Mount. Come with your questions — we'll be wrestling with some hard teachings together.", time: '2 hours ago', likes: 14, liked: false, pinned: true, replies: [
    { author: 'Maria G.', body: "So excited for this series! Romans really stretched me." },
  ]},
  { id: 2, author: 'Sarah K.', body: "Does anyone have recommendations for a good study Bible for someone newer to faith? Want to get my husband one for his birthday.", time: '5 hours ago', likes: 6, liked: false, pinned: false, replies: [
    { author: 'Tom R.', body: "The NIV Study Bible is a great starting point — clear notes without being overwhelming." },
    { author: 'Maria G.', body: "Seconding that! Also check if the church bookstore has any in stock." },
  ]},
  { id: 3, author: 'David Park', body: "Grateful for this community. Moved here three months ago and the Wednesday study group has truly become family.", time: '1 day ago', likes: 22, liked: false, pinned: false, replies: [] },
];
let nextThreadId = 4;

const news = [
  { id: 1, title: 'Building Fund Reaches 75% of Goal', excerpt: 'Thanks to the incredible generosity of our church family, we have officially reached 75% of our building fund goal. Here is what comes next.', date: 'June 18, 2026', img: 'https://images.pexels.com/photos/8468459/pexels-photo-8468459.jpeg?auto=compress&cs=tinysrgb&w=900', featured: true },
  { id: 2, title: 'Summer Youth Camp Registration Open', excerpt: 'Sign up your students for a week of worship, adventure, and community this July.', date: 'June 15, 2026', img: 'https://images.pexels.com/photos/8617835/pexels-photo-8617835.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { id: 3, title: 'New Volunteer Orientation This Saturday', excerpt: 'Curious about serving on Sunday mornings? Join us for a short orientation and tour.', date: 'June 12, 2026', img: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { id: 4, title: 'Food Pantry Restocked for the Season', excerpt: 'Thank you to everyone who donated during our spring drive — our shelves are full heading into summer.', date: 'June 8, 2026', img: 'https://images.pexels.com/photos/6646883/pexels-photo-6646883.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

const prayers = [
  { id: 1, name: 'Anonymous', text: 'Please pray for my mother as she recovers from surgery this week. She is in good spirits but the road ahead is long.', count: 18, prayed: false, answered: false },
  { id: 2, name: 'Michael T.', text: 'Pray for wisdom as I navigate a difficult decision at work. I want to honor God in how I handle this.', count: 9, prayed: false, answered: false },
  { id: 3, name: 'Anonymous', text: 'Praying for peace in our home — my family has been going through a hard season lately.', count: 24, prayed: false, answered: false },
  { id: 4, name: 'Linda P.', text: 'Update: my son\'s test results came back clear! Praise God. Thank you all for praying.', count: 41, prayed: false, answered: true },
  { id: 5, name: 'Anonymous', text: 'Please keep our missionaries overseas in your prayers — pray for safety and open hearts.', count: 13, prayed: false, answered: false },
];
let nextPrayerId = 6;

// ============================================================
// Navigation
// ============================================================

function goToPage(page) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  const matchingTab = document.querySelector(`.tab-btn[data-page="${page}"]`);
  if (matchingTab) matchingTab.classList.add('active');

  document.getElementById('tabs').classList.remove('mobile-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => goToPage(btn.dataset.page));
});

document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('tabs').classList.toggle('mobile-open');
});

// ============================================================
// Toast
// ============================================================

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ============================================================
// Auth (mock)
// TODO: replace with real backend auth — hash passwords server-side,
// never store plaintext, issue a real session token / cookie.
// ============================================================

function openAuthModal(tab) {
  document.getElementById('authModal').classList.add('open');
  switchAuthTab(tab || 'login');
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginTab').classList.toggle('active', isLogin);
  document.getElementById('signupTab').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('signupForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('authModalTitle').textContent = isLogin ? 'Welcome back' : 'Create your account';
}

document.getElementById('openLogin').addEventListener('click', () => openAuthModal('login'));
document.getElementById('openSignup').addEventListener('click', () => openAuthModal('signup'));
document.getElementById('authModal').addEventListener('click', (e) => {
  if (e.target.id === 'authModal') closeAuthModal();
});

function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showToast('Enter your email and password.');
    return;
  }

  // TODO: replace with POST /api/auth/login
  let user = mockUsers.find((u) => u.email === email && u.password === password);
  if (!user) {
    // demo convenience: auto-create a session for any email/password so testing is frictionless
    user = { name: email.split('@')[0], email, password };
    mockUsers.push(user);
  }
  setCurrentUser(user);
  closeAuthModal();
  showToast(`Welcome back, ${user.name}!`);
}

function signup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name || !email || !password) {
    showToast('Please fill in all fields.');
    return;
  }

  // TODO: replace with POST /api/auth/signup
  const user = { name, email, password };
  mockUsers.push(user);
  setCurrentUser(user);
  closeAuthModal();
  showToast(`Welcome to ${CHURCH_NAME}, ${name}!`);
}

function logout() {
  currentUser = null;
  updateAuthUI();
  goToPage('home');
  showToast('Logged out.');
}

function setCurrentUser(user) {
  currentUser = user;
  updateAuthUI();
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function getAvatarColor(name) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function updateAuthUI() {
  const loggedOut = document.getElementById('loggedOutActions');
  const loggedIn = document.getElementById('loggedInActions');

  if (currentUser) {
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'block';
    document.getElementById('navAvatar').textContent = getInitials(currentUser.name);
    document.getElementById('navName').textContent = currentUser.name.split(' ')[0];

    document.getElementById('profileAvatarLg').textContent = getInitials(currentUser.name);
    document.getElementById('profileNameLg').textContent = currentUser.name;
    document.getElementById('profileEmailLg').textContent = currentUser.email;
    document.getElementById('settingsName').value = currentUser.name;
    document.getElementById('settingsEmail').value = currentUser.email;

    const myThreads = threads.filter((t) => t.author === currentUser.name).length;
    const myPrayers = prayers.filter((p) => p.name === currentUser.name).length;
    document.getElementById('profileThreadCount').textContent = myThreads;
    document.getElementById('profilePrayerCount').textContent = myPrayers;
  } else {
    loggedOut.style.display = 'flex';
    loggedIn.style.display = 'none';
  }
}

document.getElementById('openProfile').addEventListener('click', () => goToPage('profile'));

function saveProfile() {
  if (!currentUser) return;
  currentUser.name = document.getElementById('settingsName').value.trim() || currentUser.name;
  currentUser.email = document.getElementById('settingsEmail').value.trim() || currentUser.email;
  // TODO: replace with PATCH /api/users/:id
  updateAuthUI();
  showToast('Profile updated.');
}

function requireLogin(actionLabel) {
  if (!currentUser) {
    showToast(`Log in to ${actionLabel}.`);
    openAuthModal('login');
    return false;
  }
  return true;
}

// ============================================================
// Calendar
// ============================================================

let calMonth = 5; // June = 5 (0-indexed) — matches current demo date context
let calYear = 2026;

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function eventsOnDate(dateStr) {
  return events.filter((e) => e.date === dateStr);
}

function renderCalendar() {
  document.getElementById('calMonthLabel').textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  DOW.forEach((d) => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  // leading muted days
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.appendChild(makeDayCell(daysInPrevMonth - i, true));
  }
  // current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.appendChild(makeDayCell(d, false, dateStr === todayStr, eventsOnDate(dateStr)));
  }
  // trailing muted days to fill the grid to a multiple of 7
  const totalCells = firstDay + daysInMonth;
  const trailing = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= trailing; d++) {
    grid.appendChild(makeDayCell(d, true));
  }

  renderCalSideList();
}

function makeDayCell(num, muted, isToday, dayEvents) {
  const cell = document.createElement('div');
  cell.className = 'cal-day' + (muted ? ' muted' : '') + (isToday ? ' today' : '');
  const numEl = document.createElement('div');
  numEl.className = 'cal-day-num';
  numEl.textContent = num;
  cell.appendChild(numEl);

  if (dayEvents && dayEvents.length) {
    const dots = document.createElement('div');
    dots.className = 'cal-day-dots';
    dayEvents.forEach((e) => {
      const dot = document.createElement('span');
      dot.className = 'cal-dot ' + (e.type === 'study' ? 'gold' : e.type === 'service' ? 'purple' : 'green');
      dots.appendChild(dot);
    });
    cell.appendChild(dots);
  }
  return cell;
}

function renderCalSideList() {
  const list = document.getElementById('calSideList');
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  if (!upcoming.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗓</div><p>No upcoming events.</p></div>`;
    return;
  }

  list.innerHTML = upcoming.map((e) => {
    const dt = new Date(e.date + 'T00:00:00');
    return `
      <div class="cal-event-item">
        <div class="cal-event-date">
          <div class="d">${dt.getDate()}</div>
          <div class="m">${MONTH_NAMES[dt.getMonth()].slice(0, 3)}</div>
        </div>
        <div class="cal-event-info">
          <div class="t">${e.title}</div>
          <div class="s">${formatTime(e.time)}</div>
        </div>
      </div>`;
  }).join('');
}

function renderHomeUpcoming() {
  const list = document.getElementById('homeUpcomingList');
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

  if (!upcoming.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗓</div><p>Nothing scheduled yet.</p></div>`;
    return;
  }

  list.innerHTML = upcoming.map((e) => {
    const dt = new Date(e.date + 'T00:00:00');
    return `
      <div class="cal-event-item">
        <div class="cal-event-date">
          <div class="d">${dt.getDate()}</div>
          <div class="m">${MONTH_NAMES[dt.getMonth()].slice(0, 3)}</div>
        </div>
        <div class="cal-event-info">
          <div class="t">${e.title}</div>
          <div class="s">${formatTime(e.time)} · ${e.type === 'study' ? 'Bible Study' : e.type === 'service' ? 'Worship Service' : 'Event'}</div>
        </div>
      </div>`;
  }).join('');
}

document.getElementById('calPrev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}
function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ============================================================
// Bible Study Scheduler
// ============================================================

function getBadgeClass(format) {
  if (format === 'Online') return 'badge-gold';
  if (format === 'Hybrid') return 'badge-green';
  return 'badge-purple';
}

function renderSessions() {
  const list = document.getElementById('session-list');
  const visible = sessions
    .filter((s) => sessionFilter === 'all' || s.format === sessionFilter)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!visible.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📖</div><h4>No sessions yet</h4><p>Add one using the form.</p></div>`;
    return;
  }

  list.innerHTML = visible.map((s) => `
    <div class="session-item">
      <div class="session-info">
        <div class="session-title">${s.title}</div>
        <div class="session-meta">
          <span>${formatDate(s.date)}${s.time ? ' · ' + formatTime(s.time) : ''}</span>
          <span>${s.location}</span>
        </div>
        <div class="session-tags">
          <span class="badge ${getBadgeClass(s.format)}">${s.format}</span>
          <span style="font-size:0.78rem;color:var(--text-secondary)">${s.leader}</span>
        </div>
        ${s.notes ? `<div class="session-notes">${s.notes}</div>` : ''}
      </div>
      <button class="icon-btn" onclick="deleteSession(${s.id})">✕</button>
    </div>
  `).join('');
}

function addSession() {
  if (!requireLogin('schedule a Bible study session')) return;

  const title = document.getElementById('inp-title').value.trim();
  const leader = document.getElementById('inp-leader').value.trim();
  const date = document.getElementById('inp-date').value;
  const time = document.getElementById('inp-time').value;
  const location = document.getElementById('inp-location').value.trim();
  const format = document.getElementById('inp-format').value;
  const notes = document.getElementById('inp-notes').value.trim();

  if (!title || !leader || !date) {
    showToast('Please fill in the title, leader, and date.');
    return;
  }

  // TODO: replace with POST /api/sessions
  sessions.push({ id: nextSessionId++, title, leader, date, time, location, format, notes });
  events.push({ id: 1000 + nextSessionId, title, date, time, type: 'study' });

  ['inp-title','inp-leader','inp-date','inp-time','inp-location','inp-notes'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  renderSessions();
  renderCalendar();
  renderHomeUpcoming();
  showToast('Bible study session added.');
}

function deleteSession(id) {
  // TODO: replace with DELETE /api/sessions/:id
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx > -1) sessions.splice(idx, 1);
  renderSessions();
}

function setFilter(val, btn) {
  sessionFilter = val;
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderSessions();
}

// ============================================================
// Discussion Board
// ============================================================

function renderThreads() {
  const list = document.getElementById('threadList');
  const sorted = [...threads].sort((a, b) => (b.pinned - a.pinned));

  list.innerHTML = sorted.map((t) => {
    const color = getAvatarColor(t.author);
    return `
      <div class="thread-card">
        <div class="thread-top">
          <div class="avatar" style="background:${color}">${getInitials(t.author)}</div>
          <div>
            <div class="thread-author">${t.author} ${t.pinned ? '<span class="badge badge-gold pinned-tag">📌 Pinned</span>' : ''}</div>
            <div class="thread-meta">${t.time}</div>
          </div>
        </div>
        <div class="thread-body">${t.body}</div>
        <div class="thread-actions">
          <button class="thread-action ${t.liked ? 'liked' : ''}" onclick="toggleLike(${t.id})">🤍 ${t.likes}</button>
          <button class="thread-action" onclick="toggleReplies(${t.id})">💬 ${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'}</button>
        </div>
        <div class="thread-replies" id="replies-${t.id}">
          ${t.replies.map((r) => `
            <div class="reply-item">
              <div class="avatar" style="background:${getAvatarColor(r.author)}">${getInitials(r.author)}</div>
              <div class="reply-body"><span class="reply-author">${r.author}</span><br>${r.body}</div>
            </div>
          `).join('')}
          ${currentUser ? `
            <div class="field" style="margin-top:0.6rem">
              <input type="text" id="replyInput-${t.id}" placeholder="Write a reply..." />
            </div>
            <button class="btn btn-ghost btn-sm" onclick="postReply(${t.id})">Reply</button>
          ` : `<p style="font-size:0.78rem;color:var(--text-muted)">Log in to reply.</p>`}
        </div>
      </div>
    `;
  }).join('');
}

function postThread() {
  if (!requireLogin('post to the discussion board')) return;
  const input = document.getElementById('threadInput');
  const body = input.value.trim();
  if (!body) { showToast('Write something before posting.'); return; }

  // TODO: replace with POST /api/threads
  threads.unshift({ id: nextThreadId++, author: currentUser.name, body, time: 'Just now', likes: 0, liked: false, pinned: false, replies: [] });
  input.value = '';
  renderThreads();
  showToast('Posted to the discussion board.');
}

function postReply(threadId) {
  const input = document.getElementById(`replyInput-${threadId}`);
  const body = input.value.trim();
  if (!body) return;
  const thread = threads.find((t) => t.id === threadId);
  // TODO: replace with POST /api/threads/:id/replies
  thread.replies.push({ author: currentUser.name, body });
  renderThreads();
  document.getElementById(`replies-${threadId}`).classList.add('open');
}

function toggleLike(id) {
  if (!requireLogin('like a post')) return;
  const t = threads.find((t) => t.id === id);
  t.liked = !t.liked;
  t.likes += t.liked ? 1 : -1;
  renderThreads();
}

function toggleReplies(id) {
  document.getElementById(`replies-${id}`).classList.toggle('open');
}

// ============================================================
// News & Events
// ============================================================

function renderNews() {
  const featured = news.find((n) => n.featured);
  const rest = news.filter((n) => !n.featured);

  document.getElementById('newsFeatured').innerHTML = `
    <div class="news-featured-img"><img src="${featured.img}" alt="${featured.title}" /></div>
    <div class="news-featured-body">
      <div class="news-date-line">${featured.date}</div>
      <h3>${featured.title}</h3>
      <p>${featured.excerpt}</p>
      <span class="badge badge-gold">Featured</span>
    </div>
  `;

  document.getElementById('newsGrid').innerHTML = rest.map((n) => `
    <div class="news-card">
      <div class="news-card-img"><img src="${n.img}" alt="${n.title}" /></div>
      <div class="news-card-body">
        <div class="news-date-line">${n.date}</div>
        <h4>${n.title}</h4>
        <p>${n.excerpt}</p>
      </div>
    </div>
  `).join('');
}

// ============================================================
// Prayer Wall
// ============================================================

function renderPrayers() {
  const grid = document.getElementById('prayerGrid');
  if (!prayers.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🙏</div><h4>No requests yet</h4><p>Be the first to share one.</p></div>`;
    return;
  }

  grid.innerHTML = prayers.map((p) => `
    <div class="prayer-card ${p.answered ? 'answered' : ''}">
      <div class="prayer-card-head">
        <span class="prayer-name">${p.name}</span>
        ${p.answered ? '<span class="badge badge-green">Answered</span>' : ''}
      </div>
      <div class="prayer-body">${p.text}</div>
      <div class="prayer-foot">
        <button class="prayer-count-btn ${p.prayed ? 'prayed' : ''}" onclick="togglePrayed(${p.id})">🙏 ${p.count} praying</button>
      </div>
    </div>
  `).join('');
}

function submitPrayer() {
  const anon = document.getElementById('prayerAnon').checked;
  const nameInput = document.getElementById('prayerName').value.trim();
  const text = document.getElementById('prayerText').value.trim();

  if (!text) { showToast('Please share your prayer request.'); return; }
  if (!anon && !nameInput) { showToast('Add your name, or check "submit anonymously."'); return; }

  // TODO: replace with POST /api/prayers
  prayers.unshift({
    id: nextPrayerId++,
    name: anon ? 'Anonymous' : nameInput,
    text,
    count: 0,
    prayed: false,
    answered: false,
  });

  document.getElementById('prayerName').value = '';
  document.getElementById('prayerText').value = '';
  document.getElementById('prayerAnon').checked = false;
  renderPrayers();
  showToast('Your prayer request was submitted.');
}

function togglePrayed(id) {
  const p = prayers.find((p) => p.id === id);
  p.prayed = !p.prayed;
  p.count += p.prayed ? 1 : -1;
  renderPrayers();
}

// ============================================================
// Init
// ============================================================

document.getElementById('inp-date').value = new Date().toISOString().slice(0, 10);

renderCalendar();
renderHomeUpcoming();
renderSessions();
renderThreads();
renderNews();
renderPrayers();
updateAuthUI();
