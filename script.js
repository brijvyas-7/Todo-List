// ✅ Save and load todo list
const todoList = JSON.parse(localStorage.getItem("todoList")) || [];
let currentEditIndex = null;

// 🔊 Unlock audio on first user interaction
if (typeof window !== 'undefined') {
  document.addEventListener("click", () => {
    const audio = document.getElementById("reminderSound");
    if (audio) {
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    }
  }, { once: true });
}

function addInput() {
  const name = document.querySelector(".js-array").value.trim();
  const time = document.querySelector(".time-todo").value;
  const date = document.querySelector(".todo-date").value;
  const priority = document.querySelector(".todo-priority").value;
  const playerId = localStorage.getItem("playerId") || null;
  const username = localStorage.getItem("username") || "";

  if (!name || !time || !date) return alert("Please fill out all fields.");

  const task = { name, time, date, priority, alerted: false, completed: false, playerId, username, _justAdded: true };
  todoList.push(task);
  localStorage.setItem("todoList", JSON.stringify(todoList));

  fetch("https://todo-notifier.onrender.com/save-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task)
  })
    .then(res => res.json())
    .then(data => console.log("✅ Task saved to Firestore:", data))
    .catch(err => console.error("❌ Backend save failed:", err));

  document.querySelector(".js-array").value = "";
  document.querySelector(".time-todo").value = "";
  document.querySelector(".todo-date").value = "";

  renderHTML();
}

function renderHTML() {
  const container = document.querySelector(".todoAdded");
  container.innerHTML = "";
  todoList.forEach((task, index) => {
    const badgeClass = task.priority === "High" ? "bg-danger" : task.priority === "Medium" ? "bg-warning text-dark" : "bg-success";
    const timeLeft = getTimeLeft(task.date, task.time);

    const cardId = `task-${index}`;
    const isNew = task._justAdded;

    container.innerHTML += `
      <div class="card mb-3 animate__animated ${isNew ? 'animate__fadeInUp' : ''}" id="${cardId}">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <h5 class="card-title mb-1 ${task.completed ? "completed" : ""}">${task.name}</h5>
            <span class="badge ${badgeClass}">${task.priority}</span><br>
            <small class="task-meta">⏰ ${task.time} | 📅 ${task.date}</small><br>
            <span class="countdown">⏳ ${timeLeft}</span>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-success" onclick="toggleComplete(${index})">✔️</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="editTask(${index})">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteTodo(${index})">🗑</button>
          </div>
        </div>
      </div>`;

    if (isNew) {
      setTimeout(() => {
        const el = document.getElementById(cardId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        delete task._justAdded;
        localStorage.setItem("todoList", JSON.stringify(todoList));
      }, 300);
    }
  });
}

function getTimeLeft(date, time) {
  const now = new Date();
  const target = new Date(`${date}T${time}`);
  const diff = target - now;
  if (diff < 0) return "Due";
  const mins = Math.floor((diff / 1000 / 60) % 60);
  const hrs = Math.floor(diff / 1000 / 60 / 60);
  return `${hrs}h ${mins}m left`;
}

function toggleComplete(index) {
  todoList[index].completed = !todoList[index].completed;
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
}

function deleteTodo(index) {
  todoList.splice(index, 1);
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
}

function editTask(index) {
  currentEditIndex = index;
  const task = todoList[index];
  document.getElementById("editTaskName").value = task.name;
  document.getElementById("editTaskTime").value = task.time;
  document.getElementById("editTaskDate").value = task.date;
  document.getElementById("editTaskPriority").value = task.priority;
  new bootstrap.Modal(document.getElementById("editModal")).show();
}

function saveEdit() {
  if (currentEditIndex === null) return;
  const task = todoList[currentEditIndex];
  task.name = document.getElementById("editTaskName").value;
  task.time = document.getElementById("editTaskTime").value;
  task.date = document.getElementById("editTaskDate").value;
  task.priority = document.getElementById("editTaskPriority").value;
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
  bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
}

function saveUsername() {
  const name = document.getElementById("usernameInput").value.trim();
  if (name) {
    localStorage.setItem("username", name);
    document.getElementById("usernameStatus").textContent = `Saved as: ${name}`;
    bootstrap.Modal.getInstance(document.getElementById("usernameModal")).hide();
  }
}

window.onload = () => {
  renderHTML();

  const savedDark = localStorage.getItem("darkMode") === "true";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const enableDark = savedDark || (!localStorage.getItem("darkMode") && prefersDark);

  if (enableDark) {
    document.body.classList.add("dark-mode");
    document.getElementById("toggleDarkModeSwitch").checked = true;
    document.querySelector(".slider .icon").textContent = "☀️";
  } else {
    document.querySelector(".slider .icon").textContent = "🌙";
  }

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("✅ SW registered:", reg.scope))
      .catch(err => console.warn("❌ SW failed:", err));
  }

  const statusText = document.getElementById("notifStatus");
  const toggleBtn = document.getElementById("toggleNotifBtn");

  function updateNotifStatus() {
    if (window.OneSignal && OneSignal.isPushNotificationsEnabled) {
      OneSignal.isPushNotificationsEnabled().then(enabled => {
        statusText.textContent = enabled ? "✅ Subscribed" : "❌ Not Subscribed";
        toggleBtn.textContent = enabled ? "🔕 Unsubscribe" : "🔔 Subscribe";
      }).catch(() => {
        statusText.textContent = "❌ Error";
      });
    }
  }

  if (toggleBtn && statusText) {
    toggleBtn.addEventListener("click", () => {
      OneSignal.isPushNotificationsEnabled().then(enabled => {
        if (enabled) {
          OneSignal.setSubscription(false).then(updateNotifStatus);
        } else {
          OneSignal.registerForPushNotifications().then(updateNotifStatus);
        }
      });
    });
    const notifModal = document.getElementById("notificationModal");
    if (notifModal) {
      notifModal.addEventListener("show.bs.modal", updateNotifStatus);
    }
  }
};