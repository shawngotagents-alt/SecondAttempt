// ============================================================
//  Grace Community Church — App Logic
//  Live backend: Supabase (auth + database).
//  Formspree still sends email notifications alongside writes.
//
//  Tables used (see supabase/schema.sql):
//    profiles, sessions, prayers, threads, replies
//
//  Calendar "events" and "news" are still local arrays for now —
//  they weren't part of this migration. Bible study sessions
//  DO feed into the calendar view (merged at render time).
// ============================================================

const CHURCH_NAME = 'Grace Community Church';

// ------------------------------------------------------------
// Supabase client
// ------------------------------------------------------------
const SUPABASE_URL = 'https://kdbwaowlwjwxrxdpzaxg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0mx8qIQwweVZTu7J9SPoJg_HHzXt-8P';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------
// Formspree — still used as an email notification channel
// alongside real database writes (per your request: both).
// ------------------------------------------------------------
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xpqgaggl';

async function sendToFormspree(payload) {
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      console.error('Formspree submission failed:', data || res.statusText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Formspree network error:', err);
    return false;
  }
}

const AVATAR_COLORS = ['#534AB7', '#EF9F27', '#1D9E75', '#D85A30', '#D4537E', '#378ADD'];

// ------------------------------------------------------------
// Auth state — now backed by a real Supabase session.
// currentUser shape: { id, email, name }  (name comes from profiles table)
// ------------------------------------------------------------
let currentUser = null;
let currentProfile = null; // raw row from `profiles`

// ------------------------------------------------------------
// Local-only data (not yet migrated to Supabase)
// ------------------------------------------------------------

const events = [
  { id: 1, title: 'Sunday Worship Service', date: '2026-06-21', time: '09:30', type: 'service' },
  { id: 2, title: 'Youth Group Game Night', date: '2026-06-26', time: '18:00', type: 'event' },
  { id: 3, title: 'Sunday Worship Service', date: '2026-06-28', time: '09:30', type: 'service' },
  { id: 4, title: 'Prayer & Worship Night', date: '2026-06-30', time: '19:30', type: 'event' },
  { id: 5, title: 'Community Food Drive', date: '2026-07-04', time: '10:00', type: 'event' },
];

const news = [
  { id: 1, title: 'Building Fund Reaches 75% of Goal', excerpt: 'Thanks to the incredible generosity of our church family, we have officially reached 75% of our building fund goal. Here is what comes next.', date: 'June 18, 2026', img: 'https://images.pexels.com/photos/8468459/pexels-photo-8468459.jpeg?auto=compress&cs=tinysrgb&w=900', featured: true },
  { id: 2, title: 'Summer Youth Camp Registration Open', excerpt: 'Sign up your students for a week of worship, adventure, and community this July.', date: 'June 15, 2026', img: 'https://images.pexels.com/photos/8617835/pexels-photo-8617835.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { id: 3, title: 'New Volunteer Orientation This Saturday', excerpt: 'Curious about serving on Sunday mornings? Join us for a short orientation and tour.', date: 'June 12, 2026', img: 'https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { id: 4, title: 'Food Pantry Restocked for the Season', excerpt: 'Thank you to everyone who donated during our spring drive — our shelves are full heading into summer.', date: 'June 8, 2026', img: 'https://images.pexels.com/photos/6646883/pexels-photo-6646883.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

// ------------------------------------------------------------
// Live data caches — populated from Supabase, re-fetched after writes
// ------------------------------------------------------------
let sessions = [];
let prayers = [];
let threads = [];

let sessionFilter = 'all';

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

function showAuthStatus(msg, isError) {
  const el = document.getElementById('authStatusMsg');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = isError ? 'var(--red-bg)' : 'var(--purple-50)';
  el.style.color = isError ? 'var(--red-text)' : 'var(--purple-900)';
}
function clearAuthStatus() {
  document.getElementById('authStatusMsg').style.display = 'none';
}

// ============================================================
// Auth — real Supabase Auth (email+password and magic link)
// Email confirmation is required (configured in Supabase dashboard:
// Authentication → Providers → Email → Confirm email = ON).
// ============================================================

function openAuthModal(tab) {
  clearAuthStatus();
  document.getElementById('authModal').classList.add('open');
  switchAuthTab(tab || 'login');
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('open');
}
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  clearAuthStatus();
  document.getElementById('loginTab').classList.toggle('active', isLogin);
  document.getElementById('signupTab').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('signupForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('authModalTitle').textContent = isLogin ? 'Welcome back' : 'Create your account';
  document.getElementById('authModalFoot').textContent = isLogin
    ? "Haven't confirmed your email yet? Check your inbox for the link."
    : "You'll need to confirm your email before logging in.";
}

document.getElementById('openLogin').addEventListener('click', () => openAuthModal('login'));
document.getElementById('openSignup').addEventListener('click', () => openAuthModal('signup'));
document.getElementById('authModal').addEventListener('click', (e) => {
  if (e.target.id === 'authModal') closeAuthModal();
});

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginSubmitBtn');

  if (!email || !password) {
    showAuthStatus('Enter your email and password.', true);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';
  clearAuthStatus();

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Log in';

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  closeAuthModal();
  await loadCurrentUser();
  showToast(`Welcome back, ${currentUser.name}!`);
  await refreshAllLiveData();
}

async function sendMagicLink() {
  const email = document.getElementById('loginEmail').value.trim();
  const btn = document.getElementById('magicLinkBtn');

  if (!email) {
    showAuthStatus('Enter your email above first, then tap this.', true);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending...';

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  });

  btn.disabled = false;
  btn.textContent = 'Email me a login link';

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }
  showAuthStatus(`Check ${email} for a login link.`, false);
}

async function signup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = document.getElementById('signupSubmitBtn');

  if (!name || !email || !password) {
    showAuthStatus('Please fill in all fields.', true);
    return;
  }
  if (password.length < 6) {
    showAuthStatus('Password must be at least 6 characters.', true);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';
  clearAuthStatus();

  // display_name is passed as user metadata, picked up by the
  // handle_new_user() trigger in schema.sql to populate `profiles`.
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: window.location.href,
    },
  });

  btn.disabled = false;
  btn.textContent = 'Create account';

  if (error) {
    showAuthStatus(error.message, true);
    return;
  }

  if (data.session) {
    // email confirmation is OFF in the Supabase project (shouldn't happen
    // given your settings, but handled just in case)
    closeAuthModal();
    await loadCurrentUser();
    showToast(`Welcome to ${CHURCH_NAME}, ${name}!`);
  } else {
    showAuthStatus(`Almost there — check ${email} to confirm your account before logging in.`, false);
  }
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  updateAuthUI();
  goToPage('home');
  showToast('Logged out.');
}

async function loadCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    currentUser = null;
    currentProfile = null;
    updateAuthUI();
    return;
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  currentProfile = profile;
  currentUser = {
    id: user.id,
    email: user.email,
    name: profile ? profile.display_name : (user.email ? user.email.split('@')[0] : 'Member'),
  };
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

    const myThreads = threads.filter((t) => t.author_id === currentUser.id).length;
    const myPrayers = prayers.filter((p) => p.submitted_by === currentUser.id).length;
    document.getElementById('profileThreadCount').textContent = myThreads;
    document.getElementById('profilePrayerCount').textContent = myPrayers;
  } else {
    loggedOut.style.display = 'flex';
    loggedIn.style.display = 'none';
  }
}

document.getElementById('openProfile').addEventListener('click', () => goToPage('profile'));

async function saveProfile() {
  if (!currentUser) return;
  const newName = document.getElementById('settingsName').value.trim();
  if (!newName) { showToast('Display name cannot be empty.'); return; }

  const { error } = await sb
    .from('profiles')
    .update({ display_name: newName })
    .eq('id', currentUser.id);

  if (error) {
    showToast('Could not update profile: ' + error.message);
    return;
  }

  currentUser.name = newName;
  updateAuthUI();
  showToast('Profile updated.');
  // Note: email changes require sb.auth.updateUser({ email }) and a
  // re-confirmation step — left out here since you didn't ask for that yet.
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
// Calendar  (local "events" + live "sessions" merged for display)
// ============================================================

let calMonth = 5;
let calYear = 2026;

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function allCalendarItems() {
  const sessionEvents = sessions.map((s) => ({
    id: 'session-' + s.id,
    title: s.title,
    date: s.session_date,
    time: s.session_time,
    type: 'study',
  }));
  return [...events, ...sessionEvents];
}

function eventsOnDate(dateStr) {
  return allCalendarItems().filter((e) => e.date === dateStr);
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

  for (let i = firstDay - 1; i >= 0; i--) {
    grid.appendChild(makeDayCell(daysInPrevMonth - i, true));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.appendChild(makeDayCell(d, false, dateStr === todayStr, eventsOnDate(dateStr)));
  }
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
  const upcoming = allCalendarItems()
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
  const upcoming = allCalendarItems().filter((e) => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

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
// Bible Study Scheduler — live Supabase table `sessions`
// ============================================================

function getBadgeClass(format) {
  if (format === 'Online') return 'badge-gold';
  if (format === 'Hybrid') return 'badge-green';
  return 'badge-purple';
}

async function loadSessions() {
  const { data, error } = await sb
    .from('sessions')
    .select('*')
    .order('session_date', { ascending: true });

  if (error) {
    console.error('Failed to load sessions:', error.message);
    return;
  }
  sessions = data;
}

function renderSessions() {
  const list = document.getElementById('session-list');
  const visible = sessions
    .filter((s) => sessionFilter === 'all' || s.format === sessionFilter)
    .sort((a, b) => a.session_date.localeCompare(b.session_date));

  if (!visible.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📖</div><h4>No sessions yet</h4><p>Add one using the form.</p></div>`;
    return;
  }

  list.innerHTML = visible.map((s) => `
    <div class="session-item">
      <div class="session-info">
        <div class="session-title">${s.title}</div>
        <div class="session-meta">
          <span>${formatDate(s.session_date)}${s.session_time ? ' · ' + formatTime(s.session_time) : ''}</span>
          <span>${s.location || ''}</span>
        </div>
        <div class="session-tags">
          <span class="badge ${getBadgeClass(s.format)}">${s.format}</span>
          <span style="font-size:0.78rem;color:var(--text-secondary)">${s.leader}</span>
        </div>
        ${s.notes ? `<div class="session-notes">${s.notes}</div>` : ''}
      </div>
      ${currentUser && currentUser.id === s.created_by ? `<button class="icon-btn" onclick="deleteSession(${s.id})">✕</button>` : ''}
    </div>
  `).join('');
}

async function addSession() {
  if (!requireLogin('schedule a Bible study session')) return;

  const title = document.getElementById('inp-title').value.trim();
  const leader = document.getElementById('inp-leader').value.trim();
  const date = document.getElementById('inp-date').value;
  const time = document.getElementById('inp-time').value;
  const location = document.getElementById('inp-location').value.trim();
  const format = document.getElementById('inp-format').value;
  const notes = document.getElementById('inp-notes').value.trim();
  const submitBtn = document.getElementById('sessionSubmitBtn');

  if (!title || !leader || !date) {
    showToast('Please fill in the title, leader, and date.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding...';

  const { error } = await sb.from('sessions').insert({
    title,
    leader,
    session_date: date,
    session_time: time || null,
    location: location || null,
    format,
    notes: notes || null,
    created_by: currentUser.id,
  });

  if (error) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add session';
    showToast('Could not add session: ' + error.message);
    return;
  }

  await loadSessions();
  renderSessions();
  renderCalendar();
  renderHomeUpcoming();

  // Email notification, in parallel with the DB write already completed above
  const emailed = await sendToFormspree({
    _subject: `New Bible Study Scheduled: ${title}`,
    form_type: 'Bible Study Session Scheduled',
    title,
    leader,
    date,
    time: time || 'Not specified',
    location: location || 'Not specified',
    format,
    notes: notes || 'None',
    scheduled_by: `${currentUser.name} (${currentUser.email})`,
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Add session';

  ['inp-title','inp-leader','inp-date','inp-time','inp-location','inp-notes'].forEach((id) => {
    document.getElementById(id).value = '';
  });

  showToast(emailed
    ? 'Bible study session added.'
    : 'Session added — but the email notification failed to send.');
}

async function deleteSession(id) {
  const { error } = await sb.from('sessions').delete().eq('id', id);
  if (error) { showToast('Could not delete session: ' + error.message); return; }
  await loadSessions();
  renderSessions();
  renderCalendar();
  renderHomeUpcoming();
}

function setFilter(val, btn) {
  sessionFilter = val;
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderSessions();
}

// ============================================================
// Discussion Board — live Supabase tables `threads` + `replies`
// ============================================================

async function loadThreads() {
  const { data: threadRows, error: threadErr } = await sb
    .from('threads')
    .select('*, profiles(display_name)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (threadErr) {
    console.error('Failed to load threads:', threadErr.message);
    return;
  }

  const { data: replyRows, error: replyErr } = await sb
    .from('replies')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: true });

  if (replyErr) {
    console.error('Failed to load replies:', replyErr.message);
  }

  threads = threadRows.map((t) => ({
    ...t,
    author_name: t.profiles ? t.profiles.display_name : 'Church Member',
    replies: (replyRows || [])
      .filter((r) => r.thread_id === t.id)
      .map((r) => ({ ...r, author_name: r.profiles ? r.profiles.display_name : 'Church Member' })),
  }));
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function renderThreads() {
  const list = document.getElementById('threadList');

  if (!threads.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💬</div><h4>No posts yet</h4><p>Be the first to start a conversation.</p></div>`;
    return;
  }

  list.innerHTML = threads.map((t) => {
    const color = getAvatarColor(t.author_name);
    return `
      <div class="thread-card">
        <div class="thread-top">
          <div class="avatar" style="background:${color}">${getInitials(t.author_name)}</div>
          <div>
            <div class="thread-author">${t.author_name} ${t.is_pinned ? '<span class="badge badge-gold pinned-tag">📌 Pinned</span>' : ''}</div>
            <div class="thread-meta">${timeAgo(t.created_at)}</div>
          </div>
        </div>
        <div class="thread-body">${escapeHtml(t.body)}</div>
        <div class="thread-actions">
          <button class="thread-action" onclick="toggleLike(${t.id}, ${t.likes})">🤍 ${t.likes}</button>
          <button class="thread-action" onclick="toggleReplies(${t.id})">💬 ${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'}</button>
        </div>
        <div class="thread-replies" id="replies-${t.id}">
          ${t.replies.map((r) => `
            <div class="reply-item">
              <div class="avatar" style="background:${getAvatarColor(r.author_name)}">${getInitials(r.author_name)}</div>
              <div class="reply-body"><span class="reply-author">${r.author_name}</span><br>${escapeHtml(r.body)}</div>
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function postThread() {
  if (!requireLogin('post to the discussion board')) return;
  const input = document.getElementById('threadInput');
  const body = input.value.trim();
  if (!body) { showToast('Write something before posting.'); return; }

  const { error } = await sb.from('threads').insert({
    author_id: currentUser.id,
    body,
  });

  if (error) { showToast('Could not post: ' + error.message); return; }

  input.value = '';
  await loadThreads();
  renderThreads();
  showToast('Posted to the discussion board.');
}

async function postReply(threadId) {
  if (!requireLogin('reply')) return;
  const input = document.getElementById(`replyInput-${threadId}`);
  const body = input.value.trim();
  if (!body) return;

  const { error } = await sb.from('replies').insert({
    thread_id: threadId,
    author_id: currentUser.id,
    body,
  });

  if (error) { showToast('Could not post reply: ' + error.message); return; }

  await loadThreads();
  renderThreads();
  document.getElementById(`replies-${threadId}`).classList.add('open');
}

async function toggleLike(id, currentLikes) {
  if (!requireLogin('like a post')) return;
  // Note: this is a simple increment, not a per-user like toggle —
  // tracking *who* liked what would need a separate `thread_likes` table.
  const { error } = await sb.from('threads').update({ likes: currentLikes + 1 }).eq('id', id);
  if (error) { showToast('Could not like post: ' + error.message); return; }
  await loadThreads();
  renderThreads();
}

function toggleReplies(id) {
  document.getElementById(`replies-${id}`).classList.toggle('open');
}

// ============================================================
// News & Events (local data — unchanged)
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
// Prayer Wall — live Supabase table `prayers`
// Open submission (logged in or not), per your earlier instructions.
// ============================================================

async function loadPrayers() {
  const { data, error } = await sb
    .from('prayers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load prayers:', error.message);
    return;
  }
  prayers = data;
}

function renderPrayers() {
  const grid = document.getElementById('prayerGrid');
  if (!prayers.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🙏</div><h4>No requests yet</h4><p>Be the first to share one.</p></div>`;
    return;
  }

  grid.innerHTML = prayers.map((p) => `
    <div class="prayer-card ${p.is_answered ? 'answered' : ''}">
      <div class="prayer-card-head">
        <span class="prayer-name">${p.display_name}</span>
        ${p.is_answered ? '<span class="badge badge-green">Answered</span>' : ''}
      </div>
      <div class="prayer-body">${escapeHtml(p.body)}</div>
      <div class="prayer-foot">
        <button class="prayer-count-btn" onclick="togglePrayed(${p.id}, ${p.prayer_count})">🙏 ${p.prayer_count} praying</button>
      </div>
    </div>
  `).join('');
}

async function submitPrayer() {
  const anon = document.getElementById('prayerAnon').checked;
  const nameInput = document.getElementById('prayerName').value.trim();
  const text = document.getElementById('prayerText').value.trim();
  const submitBtn = document.getElementById('prayerSubmitBtn');

  if (!text) { showToast('Please share your prayer request.'); return; }
  if (!anon && !nameInput) { showToast('Add your name, or check "submit anonymously."'); return; }

  const displayName = anon ? 'Anonymous' : nameInput;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const { error } = await sb.from('prayers').insert({
    display_name: displayName,
    is_anonymous: anon,
    body: text,
    submitted_by: currentUser ? currentUser.id : null,
  });

  if (error) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit prayer request';
    showToast('Could not submit: ' + error.message);
    return;
  }

  await loadPrayers();
  renderPrayers();

  const emailed = await sendToFormspree({
    _subject: `New Prayer Request${anon ? ' (Anonymous)' : ' from ' + nameInput}`,
    form_type: 'Prayer Request',
    name: anon ? 'Anonymous (name withheld by request)' : nameInput,
    submitted_anonymously: anon ? 'Yes' : 'No',
    message: text,
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit prayer request';

  document.getElementById('prayerName').value = '';
  document.getElementById('prayerText').value = '';
  document.getElementById('prayerAnon').checked = false;

  showToast(emailed
    ? 'Your prayer request was submitted.'
    : 'Added to the wall — but the email notification failed to send.');
}

async function togglePrayed(id, currentCount) {
  const { error } = await sb.from('prayers').update({ prayer_count: currentCount + 1 }).eq('id', id);
  if (error) { showToast('Could not update: ' + error.message); return; }
  await loadPrayers();
  renderPrayers();
}

// ============================================================
// Init
// ============================================================

async function refreshAllLiveData() {
  await Promise.all([loadSessions(), loadThreads(), loadPrayers()]);
  renderSessions();
  renderThreads();
  renderPrayers();
  renderCalendar();
  renderHomeUpcoming();
  updateAuthUI(); // re-run so profile post/prayer counts reflect fresh data
}

document.getElementById('inp-date').value = new Date().toISOString().slice(0, 10);

// Keep the UI in sync with auth state changes (login, logout, magic-link
// redirect landing, token refresh) wherever they originate.
sb.auth.onAuthStateChange((_event, _session) => {
  loadCurrentUser();
});

(async function init() {
  renderNews(); // local data, no fetch needed
  await loadCurrentUser();
  await refreshAllLiveData();
})();
