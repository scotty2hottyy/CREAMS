// ── Element references 
const accountScreen = document.getElementById("accountScreen");
const lobbyScreen   = document.getElementById("lobbyScreen");
const chatScreen    = document.getElementById("chatScreen");

// Account screen
const loginUser     = document.getElementById("loginUser");
const loginPass     = document.getElementById("loginPass");
const loginBtn      = document.getElementById("loginBtn");
const loginError    = document.getElementById("loginError");
const regUser       = document.getElementById("regUser");
const regPass       = document.getElementById("regPass");
const regPass2      = document.getElementById("regPass2");
const registerBtn   = document.getElementById("registerBtn");
const registerError = document.getElementById("registerError");
const regRandBtn    = document.getElementById("regRandBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const lobbyUsername = document.getElementById("lobbyUsername");
const accountTabs   = document.querySelectorAll(".account-tab");

// Lobby
const nameEl            = document.getElementById("name"); 
const roomEl            = document.getElementById("room");
const joinBtn           = document.getElementById("joinBtn");
const refreshBtn        = document.getElementById("refreshBtn");
const dot               = document.getElementById("dot");
const statusText        = document.getElementById("statusText");
const roomsEl           = document.getElementById("rooms");
const roomsCountEl      = document.getElementById("roomsCount");
const lockToggle        = document.getElementById("lockToggle");
const roomPasswordWrap  = document.getElementById("roomPasswordWrap");
const roomPasswordEl    = document.getElementById("roomPassword");
const createDetails     = document.getElementById("createDetails");

// Friends tabs
const friendInput    = document.getElementById("friendInput");
const addFriendBtn   = document.getElementById("addFriendBtn");
const friendsCountEl = document.getElementById("friendsCount");
const requestsBadge  = document.getElementById("requestsBadge");
const friendsList    = document.getElementById("friendsList");
const requestsList   = document.getElementById("requestsList");
const tabBtns        = document.querySelectorAll(".friends-tab");
const tabPanels      = document.querySelectorAll(".friends-tab-panel");

// Chat
const chatRoomTitle  = document.getElementById("chatRoomTitle");
const chatRoomSub    = document.getElementById("chatRoomSub");
const chatOnlinePill = document.getElementById("chatOnlinePill");
const leaveChatBtn   = document.getElementById("leaveChatBtn");
const messagesEl     = document.getElementById("messages");
const m              = document.getElementById("m");
const sendBtn        = document.getElementById("sendBtn");
const sidebarRooms   = document.getElementById("sidebarRooms");
const sidebarFriends = document.getElementById("sidebarFriends");
const toastContainer = document.getElementById("toastContainer");

// Password modal
const pwModal      = document.getElementById("pwModal");
const pwInput      = document.getElementById("pwInput");
const pwModalSub   = document.getElementById("pwModalSub");
const pwConfirmBtn = document.getElementById("pwConfirmBtn");
const pwCancelBtn  = document.getElementById("pwCancelBtn");

// ── State 

let connected        = false;
let currentRoom      = null;
let onlineNames      = new Set();
let latestRooms      = [];
let loggedInName     = "";
let confirmedFriends = [];
let pendingRequests  = [];

// In-memory account store { username -> password }
const accounts = {};

// ── WebSocket 

const ws = new WebSocket("ws://localhost:6790");

// ── Random name 

const ADJECTIVES = [
  "Swift","Neon","Cosmic","Phantom","Lucky","Blaze","Shadow","Silver",
  "Crystal","Thunder","Turbo","Vivid","Arctic","Golden","Rustic","Quiet",
  "Crimson","Fuzzy","Hyper","Sneaky","Jolly","Mega","Ultra","Sleepy",
  "Bouncy","Radical","Funky","Zappy","Breezy","Glowing",
];
const NOUNS = [
  "Panda","Falcon","Cactus","Walrus","Otter","Penguin","Gecko","Mango",
  "Badger","Koala","Narwhal","Platypus","Quokka","Iguana","Lemur",
  "Capybara","Axolotl","Ferret","Wombat","Toucan","Meerkat","Sloth",
  "Numbat","Bison","Lobster","Manatee","Tapir","Kinkajou","Fossa",
];
function randomName() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}

// ── Screen management 

function showScreen(name) {
  accountScreen.classList.toggle("active", name === "account");
  lobbyScreen.classList.toggle("active",   name === "lobby");
  chatScreen.classList.toggle("active",    name === "chat");
  if (name === "chat") {
    m.disabled       = false;
    sendBtn.disabled = false;
    setTimeout(() => m.focus(), 80);
  }
  if (name === "lobby") refreshFriendsList();
}

// ── Status dot 

function setStatus(kind, text) {
  dot.className          = "dot" + (kind ? " " + kind : "");
  statusText.textContent = text;
}

// ── WS helpers 

function requestRooms()       { if (connected) ws.send(JSON.stringify({ type: "list" })); }
function requestPresence()    { if (connected) ws.send(JSON.stringify({ type: "who" })); }
function refreshFriendsList() { if (connected) ws.send(JSON.stringify({ type: "friends_list" })); }

// ── Account screen 

accountTabs.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.atab;
    accountTabs.forEach(b => b.classList.toggle("active", b.dataset.atab === target));
    document.getElementById("atab-login").classList.toggle("visible",    target === "login");
    document.getElementById("atab-register").classList.toggle("visible", target === "register");
    loginError.classList.remove("visible");
    registerError.classList.remove("visible");
  });
});

function showAccountError(el, msg) {
  el.textContent = msg;
  el.classList.add("visible");
}

function completeLogin(username) {
  loggedInName = username;
  if (nameEl) nameEl.value = username;
  lobbyUsername.textContent = username;
  localStorage.setItem("chat_name", username);
  showScreen("lobby");
  if (connected) ws.send(JSON.stringify({ type: "set_name", name: username }));
}

loginBtn.addEventListener("click", () => {
  const user = loginUser.value.trim();
  const pass = loginPass.value;
  loginError.classList.remove("visible");
  if (!user || !pass)    { showAccountError(loginError, "Please fill in all fields."); return; }
  if (!accounts[user])   { showAccountError(loginError, "No account with that username."); return; }
  if (accounts[user] !== pass) { showAccountError(loginError, "Incorrect password."); return; }
  completeLogin(user);
});

registerBtn.addEventListener("click", () => {
  const user  = regUser.value.trim();
  const pass  = regPass.value;
  const pass2 = regPass2.value;
  registerError.classList.remove("visible");
  if (!user || !pass || !pass2) { showAccountError(registerError, "Please fill in all fields."); return; }
  if (user.length < 2)          { showAccountError(registerError, "Username must be at least 2 characters."); return; }
  if (pass.length < 4)          { showAccountError(registerError, "Password must be at least 4 characters."); return; }
  if (pass !== pass2)           { showAccountError(registerError, "Passwords do not match."); return; }
  if (accounts[user])           { showAccountError(registerError, "That username is already taken locally."); return; }
  accounts[user] = pass;
  completeLogin(user);
});

logoutBtn.addEventListener("click", () => {
  loggedInName = "";
  nameEl.value = "";
  localStorage.removeItem("chat_name");
  loginUser.value = ""; loginPass.value = "";
  regUser.value = ""; regPass.value = ""; regPass2.value = "";
  loginError.classList.remove("visible");
  registerError.classList.remove("visible");
  showScreen("account");
});

loginUser.addEventListener("keydown",  e => { if (e.key === "Enter") loginPass.focus(); });
loginPass.addEventListener("keydown",  e => { if (e.key === "Enter") loginBtn.click(); });
regUser.addEventListener("keydown",    e => { if (e.key === "Enter") regPass.focus(); });
regPass.addEventListener("keydown",    e => { if (e.key === "Enter") regPass2.focus(); });
regPass2.addEventListener("keydown",   e => { if (e.key === "Enter") registerBtn.click(); });
regRandBtn.addEventListener("click",   () => { regUser.value = randomName(); regUser.focus(); });

// ── Lobby tab switching 

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === target));
    tabPanels.forEach(p => p.classList.toggle("active", p.id === "tab" + capitalize(target)));
  });
});

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Friends rendering 

function renderFriends() {
  friendsCountEl.textContent = String(confirmedFriends.length);
  chatOnlinePill.textContent = `${onlineNames.size} online`;

  if (pendingRequests.length > 0) {
    requestsBadge.textContent   = String(pendingRequests.length);
    requestsBadge.style.display = "";
    requestsBadge.className     = "badge alert";
  } else {
    requestsBadge.style.display = "none";
  }

  // Friends tab
  friendsList.innerHTML = "";
  if (confirmedFriends.length === 0) {
    friendsList.innerHTML = '<p class="empty-state">No friends yet. Send a request above!</p>';
  }
  for (const f of confirmedFriends) {
    const row  = document.createElement("div");
    row.className = "friend-row";

    const left = document.createElement("div");
    left.className = "friend-left";

    const pill = document.createElement("span");
    if      (f.status === "in_room")  pill.className = "pill on";
    else if (f.status === "in_lobby") pill.className = "pill lobby";
    else                               pill.className = "pill";

    const info = document.createElement("div");
    info.className = "friend-info";

    const nm = document.createElement("div");
    nm.className   = "friend-name";
    nm.textContent = f.name;
    info.appendChild(nm);

    const sub = document.createElement("div");
    sub.className = "friend-room";
    if      (f.status === "in_room")  { sub.textContent = `📍 ${f.room}`; }
    else if (f.status === "in_lobby") { sub.style.color = "var(--accent)"; sub.textContent = "🏠 In lobby"; }
    else                               { sub.style.color = "var(--muted)";  sub.textContent = "Offline"; }
    info.appendChild(sub);

    left.appendChild(pill);
    left.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "friend-actions";

    if (f.status === "in_room" && f.room && f.room !== currentRoom) {
      const jumpBtn = document.createElement("button");
      jumpBtn.className   = "secondary";
      jumpBtn.textContent = "Join";
      jumpBtn.addEventListener("click", () => joinRoom(f.room));
      actions.appendChild(jumpBtn);
    }

    row.appendChild(left);
    row.appendChild(actions);
    friendsList.appendChild(row);
  }

  // Requests tab
  requestsList.innerHTML = "";
  if (pendingRequests.length === 0) {
    requestsList.innerHTML = '<p class="empty-state">No pending friend requests.</p>';
  }
  for (const from of pendingRequests) {
    const row = document.createElement("div");
    row.className = "friend-row";

    const left = document.createElement("div");
    left.className = "friend-left";
    const nm = document.createElement("div");
    nm.className   = "friend-name";
    nm.textContent = from;
    left.appendChild(nm);

    const actions = document.createElement("div");
    actions.className = "friend-actions";

    const acceptBtn = document.createElement("button");
    acceptBtn.className   = "success";
    acceptBtn.textContent = "Accept";
    acceptBtn.addEventListener("click", () => respondToRequest(from, true));

    const declineBtn = document.createElement("button");
    declineBtn.className   = "danger";
    declineBtn.textContent = "Decline";
    declineBtn.addEventListener("click", () => respondToRequest(from, false));

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    row.appendChild(left);
    row.appendChild(actions);
    requestsList.appendChild(row);
  }

  // Sidebar
  sidebarFriends.innerHTML = "";
  for (const f of confirmedFriends) {
    const sf = document.createElement("div");
    sf.className = "sidebar-friend";

    const sp = document.createElement("span");
    if      (f.status === "in_room")  sp.className = "pill on";
    else if (f.status === "in_lobby") sp.className = "pill lobby";
    else                               sp.className = "pill";

    const si = document.createElement("div");
    si.className = "sidebar-friend-info";

    const sn = document.createElement("div");
    sn.className   = "sidebar-friend-name";
    sn.textContent = f.name;
    si.appendChild(sn);

    const sr = document.createElement("div");
    sr.className = "sidebar-friend-room";
    if      (f.status === "in_room")  { sr.textContent = `📍 ${f.room}`; }
    else if (f.status === "in_lobby") { sr.style.color = "var(--accent)"; sr.textContent = "🏠 In lobby"; }
    if (sr.textContent) si.appendChild(sr);

    sf.appendChild(sp);
    sf.appendChild(si);
    sidebarFriends.appendChild(sf);
  }
}

// ── Friend actions 

function sendFriendRequest() {
  const to = friendInput.value.trim();
  if (!to || !connected) return;
  ws.send(JSON.stringify({ type: "friend_request", to }));
  friendInput.value = "";
}

function respondToRequest(fromName, accepted) {
  ws.send(JSON.stringify({ type: "friend_response", from: fromName, accepted }));
  pendingRequests = pendingRequests.filter(r => r !== fromName);
  renderFriends();
}

function showFriendRequestToast(fromName) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-title">👋 Friend request</div>
    <div class="toast-body"><strong>${fromName}</strong> wants to be your friend.</div>
    <div class="toast-actions">
      <button class="success" id="toastAccept">Accept</button>
      <button class="danger"  id="toastDecline">Decline</button>
    </div>`;
  toastContainer.appendChild(toast);
  toast.querySelector("#toastAccept").addEventListener("click",  () => { respondToRequest(fromName, true);  toast.remove(); });
  toast.querySelector("#toastDecline").addEventListener("click", () => { respondToRequest(fromName, false); toast.remove(); });
  setTimeout(() => toast.remove(), 15000);
}

// ── Room rendering 

function renderRooms(list) {
  latestRooms              = list;
  roomsCountEl.textContent = String(list.length);
  roomsEl.innerHTML        = "";

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className   = "empty-state";
    empty.textContent = "No rooms yet. Create one below!";
    roomsEl.appendChild(empty);
  }

  for (const r of list) {
    const btn = document.createElement("button");
    btn.className = "roomBtn" + (r.name === currentRoom ? " active" : "");
    btn.type = "button";

    const left = document.createElement("span");
    left.textContent = (r.locked ? "🔒 " : "") + r.name;

    const badge = document.createElement("span");
    badge.className   = "badge";
    badge.textContent = String(r.count);

    btn.appendChild(left);
    btn.appendChild(badge);
    btn.addEventListener("click", () => {
      if (r.locked && r.name !== currentRoom) openPasswordModal(r.name);
      else joinRoom(r.name);
    });
    roomsEl.appendChild(btn);
  }

  renderSidebarRooms(list);
}

function renderSidebarRooms(list) {
  sidebarRooms.innerHTML = "";
  for (const r of list) {
    const div = document.createElement("div");
    div.className = "sidebar-room" + (r.name === currentRoom ? " active" : "");

    const label = document.createElement("span");
    label.textContent = (r.locked ? "🔒 " : "") + r.name;

    const badge = document.createElement("span");
    badge.className   = "badge";
    badge.textContent = String(r.count);

    div.appendChild(label);
    div.appendChild(badge);
    div.addEventListener("click", () => {
      if (r.locked && r.name !== currentRoom) openPasswordModal(r.name);
      else joinRoom(r.name);
    });
    sidebarRooms.appendChild(div);
  }
}

// ── Message rendering 

function addMessage({ type, room, name, text, isMe = false }) {
  const div = document.createElement("div");
  div.className = "msg" + (type === "system" ? " system" : "") + (isMe ? " me" : "");

  const meta = document.createElement("div");
  meta.className = "meta";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  meta.textContent = type === "system" ? `${time} • system` : `${time} • ${name}`;

  const body = document.createElement("div");
  body.textContent = text ?? "";

  div.appendChild(meta);
  div.appendChild(body);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addImageMessage({ name, dataUrl, isMe }) {
  const div = document.createElement("div");
  div.className = "msg" + (isMe ? " me" : "");

  const meta = document.createElement("div");
  meta.className = "meta";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  meta.textContent = `${time} • ${name}`;

  const img = document.createElement("img");
  img.src               = dataUrl;
  img.alt               = "pasted image";
  img.style.maxWidth    = "100%";
  img.style.borderRadius = "12px";
  img.style.border      = "1px solid rgba(255,255,255,.10)";
  img.style.display     = "block";

  div.appendChild(meta);
  div.appendChild(img);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ── Join / leave 

function joinRoom(roomOverride = null, passwordOverride = null) {
  if (!connected) { alert("Not connected to server yet."); return; }

  const name = loggedInName || nameEl.value.trim() || "Anonymous";
  const room = (roomOverride ?? roomEl.value ?? "").trim();
  if (!room) { roomEl.focus(); return; }

  const msg = { type: "join", name, room };
  if (passwordOverride) msg.password = passwordOverride;
  if (!roomOverride && lockToggle.checked && roomPasswordEl.value.trim()) {
    msg.roomPassword = roomPasswordEl.value.trim();
    msg.password     = roomPasswordEl.value.trim();
  }

  ws.send(JSON.stringify(msg));

  currentRoom               = room;
  chatRoomTitle.textContent = room;
  chatRoomSub.textContent   = `Signed in as ${name}`;
  messagesEl.innerHTML      = "";
  addMessage({ type: "system", text: `Joined ${room}` });

  lockToggle.checked             = false;
  roomPasswordEl.value           = "";
  roomPasswordWrap.style.display = "none";
  createDetails.removeAttribute("open");

  requestRooms();
  refreshFriendsList();
  showScreen("chat");
}

function leaveChat() {
  currentRoom      = null;
  m.disabled       = true;
  sendBtn.disabled = true;
  showScreen("lobby");
  requestRooms();
  refreshFriendsList();
}

// ── Send message 

function sendMsg() {
  if (!connected || !currentRoom) return;
  const text = m.value.trim();
  if (!text) return;
  const name = loggedInName || nameEl.value.trim() || "Anonymous";
  ws.send(JSON.stringify({ type: "chat", name, text }));
  m.value = "";
  m.focus();
}

// ── WebSocket events 

ws.onopen = () => {
  connected = true;
  setStatus("good", "Connected");
  requestRooms();
  requestPresence();
  if (loggedInName) ws.send(JSON.stringify({ type: "set_name", name: loggedInName }));
};

ws.onclose = () => {
  connected = false;
  setStatus("bad", "Disconnected");
  onlineNames = new Set();
  renderFriends();
};

ws.onerror = () => setStatus("bad", "Connection error");

ws.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);

    if (data.type === "rooms")    { renderRooms(data.rooms || []); return; }
    if (data.type === "presence") { onlineNames = new Set((data.online || []).map(String)); chatOnlinePill.textContent = `${onlineNames.size} online`; return; }

    if (data.type === "system") {
      if (data.text?.toLowerCase().includes("incorrect password")) { showScreen("lobby"); currentRoom = null; }
      addMessage({ type: "system", text: data.text || "" });
      requestRooms();
      return;
    }

    if (data.type === "chat") {
      const myName = loggedInName || nameEl.value.trim() || "Anonymous";
      const isMe   = data.room === currentRoom && (data.name || "") === myName;
      addMessage({ type: "chat", room: data.room, name: data.name, text: data.text, isMe });
      return;
    }

    if (data.type === "image") {
      const myName = loggedInName || nameEl.value.trim() || "Anonymous";
      const isMe   = data.room === currentRoom && (data.name || "") === myName;
      addImageMessage({ name: data.name, dataUrl: data.dataUrl, isMe });
      return;
    }

    if (data.type === "name_confirmed") { refreshFriendsList(); return; }
    if (data.type === "name_rejected")  {
      showScreen("account");
      showAccountError(registerError, data.reason || "Username already in use on server.");
      loggedInName = "";
      return;
    }

    if (data.type === "friends_list")   { confirmedFriends = data.friends || []; pendingRequests = data.requests || []; renderFriends(); return; }
    if (data.type === "friend_request") { if (!pendingRequests.includes(data.from)) pendingRequests.push(data.from); renderFriends(); showFriendRequestToast(data.from); return; }
    if (data.type === "friend_accepted") {
      refreshFriendsList();
      const msg = data.room ? `✅ You and ${data.friend} are now friends! They're in ${data.room}.` : `✅ You and ${data.friend} are now friends!`;
      addMessage({ type: "system", text: msg });
      return;
    }

    addMessage({ type: "system", text: e.data });
  } catch {
    addMessage({ type: "system", text: e.data });
  }
};

// ── Password modal 

let pendingLockedRoom = null;

function openPasswordModal(roomName) {
  pendingLockedRoom      = roomName;
  pwModalSub.textContent = `Enter the password to join "${roomName}".`;
  pwInput.value          = "";
  pwModal.classList.add("open");
  setTimeout(() => pwInput.focus(), 50);
}
function closePasswordModal() {
  pwModal.classList.remove("open");
  pendingLockedRoom = null;
  pwInput.value     = "";
}

pwCancelBtn.addEventListener("click", closePasswordModal);
pwModal.addEventListener("click", e => { if (e.target === pwModal) closePasswordModal(); });
pwInput.addEventListener("keydown", e => { if (e.key === "Enter") pwConfirmBtn.click(); });
pwConfirmBtn.addEventListener("click", () => {
  if (!pendingLockedRoom) return;
  joinRoom(pendingLockedRoom, pwInput.value);
  closePasswordModal();
});

// ── Lock toggle 

lockToggle.addEventListener("change", () => {
  roomPasswordWrap.style.display = lockToggle.checked ? "block" : "none";
  if (!lockToggle.checked) roomPasswordEl.value = "";
});

// ── Main event listeners 

joinBtn.addEventListener("click",      () => joinRoom());
refreshBtn.addEventListener("click",   requestRooms);
sendBtn.addEventListener("click",      sendMsg);
leaveChatBtn.addEventListener("click", leaveChat);
addFriendBtn.addEventListener("click", sendFriendRequest);

m.addEventListener("keydown",           e => { if (e.key === "Enter") sendMsg(); });
roomEl.addEventListener("keydown",      e => { if (e.key === "Enter") joinRoom(); });
friendInput.addEventListener("keydown", e => { if (e.key === "Enter") addFriendBtn.click(); });

// ── Paste image 

document.addEventListener("paste", event => {
  if (!currentRoom || m.disabled) return;
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type?.startsWith("image/")) {
      const file = item.getAsFile();
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const name = loggedInName || nameEl.value.trim() || "Anonymous";
        ws.send(JSON.stringify({ type: "image", name, mime: file.type, dataUrl: reader.result }));
      };
      reader.readAsDataURL(file);
      event.preventDefault();
      break;
    }
  }
});
