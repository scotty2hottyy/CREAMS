// ═══════════════════════════════════════════════════════════════
//  MessageFactory — builds message and UI DOM elements
//  Factory Pattern: one place responsible for creating all
//  message-related DOM structures
// ═══════════════════════════════════════════════════════════════
class MessageFactory {
  /** Build a chat or system message element. */
  static createMessage({ type, name, text, isMe = false }) {
    const div = document.createElement("div");
    div.className = "msg"
      + (type === "system" ? " system" : "")
      + (isMe ? " me" : "");

    const meta = document.createElement("div");
    meta.className   = "meta";
    const time       = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    meta.textContent = type === "system" ? `${time} • system` : `${time} • ${name}`;

    const body = document.createElement("div");
    body.textContent = text ?? "";

    div.appendChild(meta);
    div.appendChild(body);
    return div;
  }

  /** Build an image message element. */
  static createImageMessage({ name, dataUrl, isMe }) {
    const div = document.createElement("div");
    div.className = "msg" + (isMe ? " me" : "");

    const meta = document.createElement("div");
    meta.className   = "meta";
    const time       = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    meta.textContent = `${time} • ${name}`;

    const img = document.createElement("img");
    img.src                = dataUrl;
    img.alt                = "pasted image";
    img.style.maxWidth     = "100%";
    img.style.borderRadius = "12px";
    img.style.border       = "1px solid rgba(255,255,255,.10)";
    img.style.display      = "block";

    div.appendChild(meta);
    div.appendChild(img);
    return div;
  }

  /** Build a room button for the lobby list. */
  static createRoomButton(r, currentRoom, onClick) {
    const btn = document.createElement("button");
    btn.className = "roomBtn" + (r.name === currentRoom ? " active" : "");
    btn.type      = "button";

    const left       = document.createElement("span");
    left.textContent = (r.locked ? "🔒 " : "") + r.name;

    const badge       = document.createElement("span");
    badge.className   = "badge";
    badge.textContent = String(r.count);

    btn.appendChild(left);
    btn.appendChild(badge);
    btn.addEventListener("click", onClick);
    return btn;
  }

  /** Build a sidebar room entry. */
  static createSidebarRoom(r, currentRoom, onClick) {
    const div     = document.createElement("div");
    div.className = "sidebar-room" + (r.name === currentRoom ? " active" : "");

    const label       = document.createElement("span");
    label.textContent = (r.locked ? "🔒 " : "") + r.name;

    const badge       = document.createElement("span");
    badge.className   = "badge";
    badge.textContent = String(r.count);

    div.appendChild(label);
    div.appendChild(badge);
    div.addEventListener("click", onClick);
    return div;
  }

  /** Build a friend row for the friends list. */
  static createFriendRow(f, currentRoom, onJoin) {
    const row     = document.createElement("div");
    row.className = "friend-row";

    const left     = document.createElement("div");
    left.className = "friend-left";

    const pill     = document.createElement("span");
    pill.className = MessageFactory._pillClass(f.status);

    const info     = document.createElement("div");
    info.className = "friend-info";

    const nm       = document.createElement("div");
    nm.className   = "friend-name";
    nm.textContent = f.name;
    info.appendChild(nm);

    const sub     = document.createElement("div");
    sub.className = "friend-room";
    if      (f.status === "in_room")  { sub.textContent = `📍 ${f.room}`; }
    else if (f.status === "in_lobby") { sub.style.color = "var(--accent)"; sub.textContent = "🏠 In lobby"; }
    else                               { sub.style.color = "var(--muted)";  sub.textContent = "Offline"; }
    info.appendChild(sub);

    left.appendChild(pill);
    left.appendChild(info);

    const actions     = document.createElement("div");
    actions.className = "friend-actions";

    if (f.status === "in_room" && f.room && f.room !== currentRoom) {
      const joinBtn       = document.createElement("button");
      joinBtn.className   = "secondary";
      joinBtn.textContent = "Join";
      joinBtn.addEventListener("click", () => onJoin(f.room));
      actions.appendChild(joinBtn);
    }

    row.appendChild(left);
    row.appendChild(actions);
    return row;
  }

  /** Build a friend request row. */
  static createRequestRow(fromName, onAccept, onDecline) {
    const row     = document.createElement("div");
    row.className = "friend-row";

    const left     = document.createElement("div");
    left.className = "friend-left";
    const nm       = document.createElement("div");
    nm.className   = "friend-name";
    nm.textContent = fromName;
    left.appendChild(nm);

    const actions     = document.createElement("div");
    actions.className = "friend-actions";

    const acceptBtn       = document.createElement("button");
    acceptBtn.className   = "success";
    acceptBtn.textContent = "Accept";
    acceptBtn.addEventListener("click", onAccept);

    const declineBtn       = document.createElement("button");
    declineBtn.className   = "danger";
    declineBtn.textContent = "Decline";
    declineBtn.addEventListener("click", onDecline);

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    row.appendChild(left);
    row.appendChild(actions);
    return row;
  }

  /** Build a sidebar friend entry. */
  static createSidebarFriend(f) {
    const sf     = document.createElement("div");
    sf.className = "sidebar-friend";

    const sp     = document.createElement("span");
    sp.className = MessageFactory._pillClass(f.status);

    const si     = document.createElement("div");
    si.className = "sidebar-friend-info";

    const sn       = document.createElement("div");
    sn.className   = "sidebar-friend-name";
    sn.textContent = f.name;
    si.appendChild(sn);

    const sr     = document.createElement("div");
    sr.className = "sidebar-friend-room";
    if      (f.status === "in_room")  { sr.textContent = `📍 ${f.room}`; }
    else if (f.status === "in_lobby") { sr.style.color = "var(--accent)"; sr.textContent = "🏠 In lobby"; }
    if (sr.textContent) si.appendChild(sr);

    sf.appendChild(sp);
    sf.appendChild(si);
    return sf;
  }

  // Private helper — shared pill CSS class logic
  static _pillClass(status) {
    if (status === "in_room")  return "pill on";
    if (status === "in_lobby") return "pill lobby";
    return "pill";
  }
}

// ═══════════════════════════════════════════════════════════════
//  ScreenManager — controls which screen is visible
//  Singleton Pattern: only one ScreenManager should ever exist
// ═══════════════════════════════════════════════════════════════
class ScreenManager {
  constructor() {
    if (ScreenManager._instance) return ScreenManager._instance;
    ScreenManager._instance = this;

    this.screens = {
      account: document.getElementById("accountScreen"),
      lobby:   document.getElementById("lobbyScreen"),
      chat:    document.getElementById("chatScreen"),
    };
    this.messageInput = document.getElementById("m");
    this.sendBtn      = document.getElementById("sendBtn");
  }

  static getInstance() {
    if (!ScreenManager._instance) new ScreenManager();
    return ScreenManager._instance;
  }

  show(name, { onLobby } = {}) {
    Object.entries(this.screens).forEach(([key, el]) => {
      el.classList.toggle("active", key === name);
    });
    if (name === "chat") {
      this.messageInput.disabled = false;
      this.sendBtn.disabled      = false;
      setTimeout(() => this.messageInput.focus(), 80);
    }
    if (name === "lobby" && onLobby) onLobby();
  }
}
ScreenManager._instance = null;

// ═══════════════════════════════════════════════════════════════
//  AccountManager — registration, login, logout
// ═══════════════════════════════════════════════════════════════
class AccountManager {
  constructor(screenManager, onLogin) {
    this.screenManager = screenManager;
    this.onLogin       = onLogin;
    this.accounts      = {};

    this._bindElements();
    this._bindEvents();
  }

  _bindElements() {
    this.loginUser     = document.getElementById("loginUser");
    this.loginPass     = document.getElementById("loginPass");
    this.loginBtn      = document.getElementById("loginBtn");
    this.loginError    = document.getElementById("loginError");
    this.regUser       = document.getElementById("regUser");
    this.regPass       = document.getElementById("regPass");
    this.regPass2      = document.getElementById("regPass2");
    this.registerBtn   = document.getElementById("registerBtn");
    this.registerError = document.getElementById("registerError");
    this.regRandBtn    = document.getElementById("regRandBtn");
    this.logoutBtn     = document.getElementById("logoutBtn");
    this.lobbyUsername = document.getElementById("lobbyUsername");
    this.tabs          = document.querySelectorAll(".account-tab");
  }

  _bindEvents() {
    this.tabs.forEach(btn => btn.addEventListener("click", () => this._switchTab(btn.dataset.atab)));
    this.loginBtn.addEventListener("click",    () => this._login());
    this.loginUser.addEventListener("keydown", e => { if (e.key === "Enter") this.loginPass.focus(); });
    this.loginPass.addEventListener("keydown", e => { if (e.key === "Enter") this._login(); });
    this.registerBtn.addEventListener("click", () => this._register());
    this.regUser.addEventListener("keydown",   e => { if (e.key === "Enter") this.regPass.focus(); });
    this.regPass.addEventListener("keydown",   e => { if (e.key === "Enter") this.regPass2.focus(); });
    this.regPass2.addEventListener("keydown",  e => { if (e.key === "Enter") this._register(); });
    this.regRandBtn.addEventListener("click",  () => { this.regUser.value = NameGenerator.random(); this.regUser.focus(); });
    this.logoutBtn.addEventListener("click",   () => this.logout());
  }

  _switchTab(target) {
    this.tabs.forEach(b => b.classList.toggle("active", b.dataset.atab === target));
    document.getElementById("atab-login").classList.toggle("visible",    target === "login");
    document.getElementById("atab-register").classList.toggle("visible", target === "register");
    this._clearErrors();
  }

  _clearErrors() {
    this.loginError.classList.remove("visible");
    this.registerError.classList.remove("visible");
  }

  _showError(el, msg) {
    el.textContent = msg;
    el.classList.add("visible");
  }

  _login() {
    const user = this.loginUser.value.trim();
    const pass = this.loginPass.value;
    this._clearErrors();
    if (!user || !pass)               return this._showError(this.loginError, "Please fill in all fields.");
    if (!this.accounts[user])         return this._showError(this.loginError, "No account with that username.");
    if (this.accounts[user] !== pass) return this._showError(this.loginError, "Incorrect password.");
    this._completeLogin(user);
  }

  _register() {
    const user  = this.regUser.value.trim();
    const pass  = this.regPass.value;
    const pass2 = this.regPass2.value;
    this._clearErrors();
    if (!user || !pass || !pass2) return this._showError(this.registerError, "Please fill in all fields.");
    if (user.length < 2)          return this._showError(this.registerError, "Username must be at least 2 characters.");
    if (pass.length < 4)          return this._showError(this.registerError, "Password must be at least 4 characters.");
    if (pass !== pass2)           return this._showError(this.registerError, "Passwords do not match.");
    if (this.accounts[user])      return this._showError(this.registerError, "That username is already taken.");
    this.accounts[user] = pass;
    this._completeLogin(user);
  }

  _completeLogin(username) {
    this.lobbyUsername.textContent = username;
    localStorage.setItem("chat_name", username);
    this.screenManager.show("lobby");
    this.onLogin(username);
  }

  showServerError(msg) {
    this._showError(this.registerError, msg);
    this.screenManager.show("account");
  }

  logout() {
    localStorage.removeItem("chat_name");
    this.loginUser.value = ""; this.loginPass.value = "";
    this.regUser.value   = ""; this.regPass.value = ""; this.regPass2.value = "";
    this._clearErrors();
    this.screenManager.show("account");
  }
}

// ═══════════════════════════════════════════════════════════════
//  NameGenerator — random username utility (static-only class)
// ═══════════════════════════════════════════════════════════════
class NameGenerator {
  static ADJECTIVES = [
    "Swift","Neon","Cosmic","Phantom","Lucky","Blaze","Shadow","Silver",
    "Crystal","Thunder","Turbo","Vivid","Arctic","Golden","Rustic","Quiet",
    "Crimson","Fuzzy","Hyper","Sneaky","Jolly","Mega","Ultra","Sleepy",
    "Bouncy","Radical","Funky","Zappy","Breezy","Glowing",
  ];
  static NOUNS = [
    "Panda","Falcon","Cactus","Walrus","Otter","Penguin","Gecko","Mango",
    "Badger","Koala","Narwhal","Platypus","Quokka","Iguana","Lemur",
    "Capybara","Axolotl","Ferret","Wombat","Toucan","Meerkat","Sloth",
    "Numbat","Bison","Lobster","Manatee","Tapir","Kinkajou","Fossa",
  ];

  static random() {
    const adj  = this.ADJECTIVES[Math.floor(Math.random() * this.ADJECTIVES.length)];
    const noun = this.NOUNS[Math.floor(Math.random() * this.NOUNS.length)];
    const num  = Math.floor(Math.random() * 90) + 10;
    return `${adj}${noun}${num}`;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MessageRenderer — appends messages to the chat panel
//  Uses MessageFactory to create elements — no DOM building here
// ═══════════════════════════════════════════════════════════════
class MessageRenderer {
  constructor() {
    this.messagesEl = document.getElementById("messages");
  }

  addMessage(props)      { this._append(MessageFactory.createMessage(props)); }
  addImageMessage(props) { this._append(MessageFactory.createImageMessage(props)); }
  clear()                { this.messagesEl.innerHTML = ""; }

  _append(el) {
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}

// ═══════════════════════════════════════════════════════════════
//  FriendManager — friend list, requests, toasts
//  Uses MessageFactory to create all friend-related DOM elements
// ═══════════════════════════════════════════════════════════════
class FriendManager {
  constructor(onJoinRoom) {
    this.onJoinRoom       = onJoinRoom;
    this.confirmedFriends = [];
    this.pendingRequests  = [];
    this.currentRoom      = null;

    this._bindElements();
    this._bindEvents();
  }

  _bindElements() {
    this.friendInput    = document.getElementById("friendInput");
    this.addFriendBtn   = document.getElementById("addFriendBtn");
    this.friendsCountEl = document.getElementById("friendsCount");
    this.requestsBadge  = document.getElementById("requestsBadge");
    this.friendsList    = document.getElementById("friendsList");
    this.requestsList   = document.getElementById("requestsList");
    this.sidebarFriends = document.getElementById("sidebarFriends");
    this.chatOnlinePill = document.getElementById("chatOnlinePill");
    this.toastContainer = document.getElementById("toastContainer");
    this.tabBtns        = document.querySelectorAll(".friends-tab");
    this.tabPanels      = document.querySelectorAll(".friends-tab-panel");
  }

  _bindEvents() {
    this.tabBtns.forEach(btn => btn.addEventListener("click", () => this._switchTab(btn.dataset.tab)));
    this.addFriendBtn.addEventListener("click",  () => this.onSendRequest?.());
    this.friendInput.addEventListener("keydown", e => { if (e.key === "Enter") this.addFriendBtn.click(); });
  }

  _switchTab(target) {
    this.tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === target));
    this.tabPanels.forEach(p => p.classList.toggle("active", p.id === "tab" + this._cap(target)));
  }

  _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  update({ friends, requests, onlineCount } = {}) {
    if (friends  !== undefined) this.confirmedFriends = friends;
    if (requests !== undefined) this.pendingRequests  = requests;
    this._render(onlineCount);
  }

  _render(onlineCount) {
    if (onlineCount !== undefined) this.chatOnlinePill.textContent = `${onlineCount} online`;
    this.friendsCountEl.textContent = String(this.confirmedFriends.length);

    if (this.pendingRequests.length > 0) {
      this.requestsBadge.textContent   = String(this.pendingRequests.length);
      this.requestsBadge.style.display = "";
      this.requestsBadge.className     = "badge alert";
    } else {
      this.requestsBadge.style.display = "none";
    }

    this._renderFriendsList();
    this._renderRequestsList();
    this._renderSidebar();
  }

  _renderFriendsList() {
    this.friendsList.innerHTML = "";
    if (this.confirmedFriends.length === 0) {
      this.friendsList.innerHTML = '<p class="empty-state">No friends yet. Send a request above!</p>';
      return;
    }
    // Uses MessageFactory — FriendManager doesn't build DOM itself
    for (const f of this.confirmedFriends) {
      this.friendsList.appendChild(
        MessageFactory.createFriendRow(f, this.currentRoom, (room) => this.onJoinRoom(room))
      );
    }
  }

  _renderRequestsList() {
    this.requestsList.innerHTML = "";
    if (this.pendingRequests.length === 0) {
      this.requestsList.innerHTML = '<p class="empty-state">No pending friend requests.</p>';
      return;
    }
    for (const from of this.pendingRequests) {
      this.requestsList.appendChild(
        MessageFactory.createRequestRow(
          from,
          () => this.onRespond?.(from, true),
          () => this.onRespond?.(from, false),
        )
      );
    }
  }

  _renderSidebar() {
    this.sidebarFriends.innerHTML = "";
    for (const f of this.confirmedFriends) {
      this.sidebarFriends.appendChild(MessageFactory.createSidebarFriend(f));
    }
  }

  addIncomingRequest(fromName) {
    if (!this.pendingRequests.includes(fromName)) this.pendingRequests.push(fromName);
    this._render();
    this._showToast(fromName);
  }

  removeRequest(fromName) {
    this.pendingRequests = this.pendingRequests.filter(r => r !== fromName);
    this._render();
  }

  _showToast(fromName) {
    const toast     = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <div class="toast-title">👋 Friend request</div>
      <div class="toast-body"><strong>${fromName}</strong> wants to be your friend.</div>
      <div class="toast-actions">
        <button class="success" id="toastAccept">Accept</button>
        <button class="danger"  id="toastDecline">Decline</button>
      </div>`;
    this.toastContainer.appendChild(toast);
    toast.querySelector("#toastAccept").addEventListener("click",  () => { this.onRespond?.(fromName, true);  toast.remove(); });
    toast.querySelector("#toastDecline").addEventListener("click", () => { this.onRespond?.(fromName, false); toast.remove(); });
    setTimeout(() => toast.remove(), 15000);
  }

  getFriendInput()    { return this.friendInput.value.trim(); }
  clearFriendInput()  { this.friendInput.value = ""; }
  setCurrentRoom(r)   { this.currentRoom = r; }
}

// ═══════════════════════════════════════════════════════════════
//  RoomManager — room list, sidebar, password modal
//  Uses MessageFactory to build room button and sidebar elements
// ═══════════════════════════════════════════════════════════════
class RoomManager {
  constructor(onJoinRoom) {
    this.onJoinRoom  = onJoinRoom;
    this.currentRoom = null;
    this._pendingRoom = null;

    this._bindElements();
    this._bindEvents();
  }

  _bindElements() {
    this.roomsEl       = document.getElementById("rooms");
    this.roomsCountEl  = document.getElementById("roomsCount");
    this.sidebarRooms  = document.getElementById("sidebarRooms");
    this.roomEl        = document.getElementById("room");
    this.joinBtn       = document.getElementById("joinBtn");
    this.refreshBtn    = document.getElementById("refreshBtn");
    this.lockToggle    = document.getElementById("lockToggle");
    this.roomPwWrap    = document.getElementById("roomPasswordWrap");
    this.roomPwEl      = document.getElementById("roomPassword");
    this.createDetails = document.getElementById("createDetails");
    this.pwModal       = document.getElementById("pwModal");
    this.pwInput       = document.getElementById("pwInput");
    this.pwModalSub    = document.getElementById("pwModalSub");
    this.pwConfirmBtn  = document.getElementById("pwConfirmBtn");
    this.pwCancelBtn   = document.getElementById("pwCancelBtn");
  }

  _bindEvents() {
    this.joinBtn.addEventListener("click",    () => this.onJoinRoom());
    this.roomEl.addEventListener("keydown",   e => { if (e.key === "Enter") this.onJoinRoom(); });
    this.refreshBtn.addEventListener("click", () => this.onRefresh?.());

    this.lockToggle.addEventListener("change", () => {
      this.roomPwWrap.style.display = this.lockToggle.checked ? "block" : "none";
      if (!this.lockToggle.checked) this.roomPwEl.value = "";
    });

    this.pwCancelBtn.addEventListener("click",  () => this._closeModal());
    this.pwModal.addEventListener("click",      e => { if (e.target === this.pwModal) this._closeModal(); });
    this.pwInput.addEventListener("keydown",    e => { if (e.key === "Enter") this.pwConfirmBtn.click(); });
    this.pwConfirmBtn.addEventListener("click", () => {
      if (!this._pendingRoom) return;
      this.onJoinRoom(this._pendingRoom, this.pwInput.value);
      this._closeModal();
    });
  }

  render(list) {
    this.roomsCountEl.textContent = String(list.length);
    this.roomsEl.innerHTML        = "";

    if (list.length === 0) {
      const empty       = document.createElement("div");
      empty.className   = "empty-state";
      empty.textContent = "No rooms yet. Create one below!";
      this.roomsEl.appendChild(empty);
    }

    for (const r of list) {
      // Uses MessageFactory — RoomManager doesn't build DOM itself
      this.roomsEl.appendChild(
        MessageFactory.createRoomButton(r, this.currentRoom, () => {
          if (r.locked && r.name !== this.currentRoom) this._openModal(r.name);
          else this.onJoinRoom(r.name);
        })
      );
    }

    this._renderSidebar(list);
  }

  _renderSidebar(list) {
    this.sidebarRooms.innerHTML = "";
    for (const r of list) {
      this.sidebarRooms.appendChild(
        MessageFactory.createSidebarRoom(r, this.currentRoom, () => {
          if (r.locked && r.name !== this.currentRoom) this._openModal(r.name);
          else this.onJoinRoom(r.name);
        })
      );
    }
  }

  _openModal(roomName) {
    this._pendingRoom           = roomName;
    this.pwModalSub.textContent = `Enter the password to join "${roomName}".`;
    this.pwInput.value          = "";
    this.pwModal.classList.add("open");
    setTimeout(() => this.pwInput.focus(), 50);
  }

  _closeModal() {
    this.pwModal.classList.remove("open");
    this._pendingRoom  = null;
    this.pwInput.value = "";
  }

  resetCreateForm() {
    this.lockToggle.checked       = false;
    this.roomPwEl.value           = "";
    this.roomPwWrap.style.display = "none";
    this.createDetails.removeAttribute("open");
  }

  getRoomInput()    { return this.roomEl.value.trim(); }
  getLockPassword() { return this.lockToggle.checked ? this.roomPwEl.value.trim() : ""; }
  setCurrentRoom(r) { this.currentRoom = r; }
}

// ═══════════════════════════════════════════════════════════════
//  ChatApp — main application controller
//  Singleton Pattern: only one ChatApp instance can ever exist
//  Wires all managers together and owns the WebSocket connection
// ═══════════════════════════════════════════════════════════════
class ChatApp {
  constructor() {
    // Singleton enforcement
    if (ChatApp._instance) return ChatApp._instance;
    ChatApp._instance = this;

    this.connected   = false;
    this.currentRoom = null;
    this.username    = "";

    // Direct DOM refs owned by ChatApp
    this.nameEl        = document.getElementById("name");
    this.dot           = document.getElementById("dot");
    this.statusText    = document.getElementById("statusText");
    this.m             = document.getElementById("m");
    this.sendBtn       = document.getElementById("sendBtn");
    this.leaveChatBtn  = document.getElementById("leaveChatBtn");
    this.chatRoomTitle = document.getElementById("chatRoomTitle");
    this.chatRoomSub   = document.getElementById("chatRoomSub");

    // Instantiate all managers
    this.screenManager   = ScreenManager.getInstance();
    this.messageRenderer = new MessageRenderer();

    this.friendManager = new FriendManager((room) => this.joinRoom(room));
    this.friendManager.onSendRequest = () => this._sendFriendRequest();
    this.friendManager.onRespond     = (from, accepted) => this._respondToFriendRequest(from, accepted);

    this.roomManager           = new RoomManager((room, pw) => this.joinRoom(room, pw));
    this.roomManager.onRefresh = () => this._send({ type: "list" });

    this.accountManager = new AccountManager(
      this.screenManager,
      (username) => this._onLogin(username)
    );

    // WebSocket
    this.ws = new WebSocket("wss://monologue-astronaut-headrest.ngrok-free.dev");
    this._bindWebSocket();

    // Chat controls
    this.sendBtn.addEventListener("click",      () => this._sendMessage());
    this.leaveChatBtn.addEventListener("click", () => this._leaveChat());
    this.m.addEventListener("keydown",          e => { if (e.key === "Enter") this._sendMessage(); });

    // Paste image
    document.addEventListener("paste", e => this._handlePaste(e));
  }

  static getInstance() {
    if (!ChatApp._instance) new ChatApp();
    return ChatApp._instance;
  }

  // ── Login ───────────────────────────────────────────────────

  _onLogin(username) {
    this.username = username;
    if (this.nameEl) this.nameEl.value = username;
    if (this.connected) this._send({ type: "set_name", name: username });
  }

  // ── WebSocket ───────────────────────────────────────────────

  _send(payload) {
    if (this.connected) this.ws.send(JSON.stringify(payload));
  }

  _bindWebSocket() {
    this.ws.onopen = () => {
      this.connected = true;
      this._setStatus("good", "Connected");
      this._send({ type: "list" });
      this._send({ type: "who" });
      if (this.username) this._send({ type: "set_name", name: this.username });
    };

    this.ws.onclose = () => {
      this.connected = false;
      this._setStatus("bad", "Disconnected");
      this.friendManager.update({ onlineCount: 0 });
    };

    this.ws.onerror = () => this._setStatus("bad", "Connection error");

    this.ws.onmessage = (e) => {
      try   { this._handleMessage(JSON.parse(e.data)); }
      catch { this.messageRenderer.addMessage({ type: "system", text: e.data }); }
    };
  }

  _handleMessage(data) {
    switch (data.type) {

      case "rooms":
        this.roomManager.render(data.rooms || []);
        break;

      case "presence":
        this.friendManager.update({ onlineCount: (data.online || []).length });
        break;

      case "system":
        if (data.text?.toLowerCase().includes("incorrect password")) {
          this.screenManager.show("lobby");
          this.currentRoom = null;
        }
        this.messageRenderer.addMessage({ type: "system", text: data.text || "" });
        this._send({ type: "list" });
        break;

      case "chat": {
        const isMe = data.room === this.currentRoom && data.name === this.username;
        this.messageRenderer.addMessage({ type: "chat", room: data.room, name: data.name, text: data.text, isMe });
        break;
      }

      case "image": {
        const isMe = data.room === this.currentRoom && data.name === this.username;
        this.messageRenderer.addImageMessage({ name: data.name, dataUrl: data.dataUrl, isMe });
        break;
      }

      case "name_confirmed":
        this._send({ type: "friends_list" });
        break;

      case "name_rejected":
        this.accountManager.showServerError(data.reason || "Username already in use on server.");
        this.username = "";
        break;

      case "friends_list":
        this.friendManager.update({ friends: data.friends || [], requests: data.requests || [] });
        break;

      case "friend_request":
        this.friendManager.addIncomingRequest(data.from);
        break;

      case "friend_accepted":
        this._send({ type: "friends_list" });
        this.messageRenderer.addMessage({
          type: "system",
          text: data.room
            ? `✅ You and ${data.friend} are now friends! They're in ${data.room}.`
            : `✅ You and ${data.friend} are now friends!`,
        });
        break;

      default:
        this.messageRenderer.addMessage({ type: "system", text: JSON.stringify(data) });
    }
  }

  // ── Room actions ────────────────────────────────────────────

  joinRoom(roomOverride = null, passwordOverride = null) {
    if (!this.connected) { alert("Not connected to server yet."); return; }

    const name = this.username || "Anonymous";
    const room = (roomOverride ?? this.roomManager.getRoomInput() ?? "").trim();
    if (!room) return;

    const msg = { type: "join", name, room };
    if (passwordOverride) msg.password = passwordOverride;
    const lockPw = this.roomManager.getLockPassword();
    if (!roomOverride && lockPw) { msg.roomPassword = lockPw; msg.password = lockPw; }

    this._send(msg);

    this.currentRoom = room;
    this.roomManager.setCurrentRoom(room);
    this.friendManager.setCurrentRoom(room);
    this.chatRoomTitle.textContent = room;
    this.chatRoomSub.textContent   = `Signed in as ${name}`;

    this.messageRenderer.clear();
    this.messageRenderer.addMessage({ type: "system", text: `Joined ${room}` });

    this.roomManager.resetCreateForm();
    this._send({ type: "list" });
    this._send({ type: "friends_list" });

    this.screenManager.show("chat");
  }

  _leaveChat() {
    this.currentRoom = null;
    this.roomManager.setCurrentRoom(null);
    this.friendManager.setCurrentRoom(null);
    this.m.disabled       = true;
    this.sendBtn.disabled = true;
    this.screenManager.show("lobby", {
      onLobby: () => {
        this._send({ type: "list" });
        this._send({ type: "friends_list" });
      }
    });
  }

  // ── Messaging ───────────────────────────────────────────────

  _sendMessage() {
    if (!this.connected || !this.currentRoom) return;
    const text = this.m.value.trim();
    if (!text) return;
    this._send({ type: "chat", name: this.username || "Anonymous", text });
    this.m.value = "";
    this.m.focus();
  }

  // ── Friends ─────────────────────────────────────────────────

  _sendFriendRequest() {
    const to = this.friendManager.getFriendInput();
    if (!to) return;
    this._send({ type: "friend_request", to });
    this.friendManager.clearFriendInput();
  }

  _respondToFriendRequest(fromName, accepted) {
    this._send({ type: "friend_response", from: fromName, accepted });
    this.friendManager.removeRequest(fromName);
  }

  // ── Status ──────────────────────────────────────────────────

  _setStatus(kind, text) {
    this.dot.className          = "dot" + (kind ? " " + kind : "");
    this.statusText.textContent = text;
  }

  // ── Paste image ─────────────────────────────────────────────

  _handlePaste(event) {
    if (!this.currentRoom || this.m.disabled) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type?.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          this._send({ type: "image", name: this.username || "Anonymous", mime: file.type, dataUrl: reader.result });
        };
        reader.readAsDataURL(file);
        event.preventDefault();
        break;
      }
    }
  }
}
ChatApp._instance = null;

// ── Boot ──────────────────────────────────────────────────────
// Singleton getInstance() used here — never call new ChatApp() directly
const app = ChatApp.getInstance();
