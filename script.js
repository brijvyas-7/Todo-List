const todoList = JSON.parse(localStorage.getItem("todoList")) || [];
let currentEditIndex = null;

// 🔊 Unlock audio once
document.addEventListener("click", () => {
  const audio = document.getElementById("reminderSound");
  audio?.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => {});
}, { once: true });

// ✅ Add Task
function addInput() {
  const name = document.querySelector(".js-array")?.value.trim();
  const time = document.querySelector(".time-todo")?.value;
  const date = document.querySelector(".todo-date")?.value;
  const priority = document.querySelector(".todo-priority")?.value;
  const playerId = localStorage.getItem("playerId");
  const username = localStorage.getItem("username") || "";

  if (!name || !time || !date) return alert("Please fill out all fields.");

  const task = { name, time, date, priority, alerted: false, completed: false, playerId, username };
  todoList.push(task);
  localStorage.setItem("todoList", JSON.stringify(todoList));

  fetch("https://todo-notifier.onrender.com/save-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task)
  }).then(res => res.json())
    .then(res => console.log("✅ Task saved:", res))
    .catch(err => console.error("❌ Backend save failed:", err));

  document.querySelector(".js-array").value = "";
  document.querySelector(".time-todo").value = "";
  document.querySelector(".todo-date").value = "";

  renderHTML();
}

// ✅ Render Tasks
function renderHTML() {
  const container = document.querySelector(".todoAdded");
  container.innerHTML = "";

  todoList.forEach((task, index) => {
    const badgeClass = task.priority === 'High' ? 'bg-danger' :
                      task.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-success';
    const timeLeft = getTimeLeft(task.date, task.time);

    container.innerHTML += `
      <div class="card mb-3">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <h5 class="card-title mb-1 ${task.completed ? 'completed' : ''}">${task.name}</h5>
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
  });
}

// ✅ Helper
function getTimeLeft(date, time) {
  const now = new Date();
  const target = new Date(`${date}T${time}`);
  const diff = target - now;
  if (diff < 0) return "Due";
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / 1000 / 60 / 60));
  return `${hours}h ${minutes}m left`;
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

// ✅ Edit Task
function editTask(index) {
  const task = todoList[index];
  currentEditIndex = index;

  const nameEl = document.getElementById("editTaskName");
  const timeEl = document.getElementById("editTaskTime");
  const dateEl = document.getElementById("editTaskDate");
  const prioEl = document.getElementById("editTaskPriority");

  if (!nameEl || !timeEl || !dateEl || !prioEl) {
    console.warn("❌ Edit inputs not found in DOM");
    return;
  }

  nameEl.value = task.name;
  timeEl.value = task.time;
  dateEl.value = task.date;
  prioEl.value = task.priority;

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

// 🌗 Dark Mode
const darkToggle = document.getElementById("toggleDarkModeSwitch");
const icon = document.querySelector(".slider .icon");
darkToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  icon.textContent = darkToggle.checked ? "☀️" : "🌙";
});

// 🚀 Init
window.onload = () => {
  const savedTheme = localStorage.getItem("darkMode") === "true";
  if (savedTheme) {
    document.body.classList.add("dark-mode");
    darkToggle.checked = true;
    icon.textContent = "☀️";
  } else {
    icon.textContent = "🌙";
  }

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("✅ SW registered:", reg.scope))
      .catch(err => console.warn("❌ SW registration failed:", err));
  }

  renderHTML();
};

// ✅ Username Save
function saveUsername() {
  const input = document.getElementById("usernameInput");
  const value = input?.value.trim();
  if (value) {
    localStorage.setItem("username", value);
    const status = document.getElementById("usernameStatus");
    if (status) status.textContent = `✅ Username: ${value}`;
    input.value = "";
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("notifStatus");
  const toggleBtn = document.getElementById("toggleNotifBtn");

  function updateNotifStatus() {
    if (window.OneSignal) {
      OneSignal.isPushNotificationsEnabled().then(enabled => {
        statusText.textContent = enabled ? "✅ Subscribed" : "❌ Not Subscribed";
        toggleBtn.textContent = enabled ? "🔕 Unsubscribe" : "🔔 Subscribe";
      }).catch(err => {
        console.warn("🔔 OneSignal check failed:", err);
        statusText.textContent = "❌ Error checking status";
      });
    } else {
      statusText.textContent = "❌ OneSignal not loaded";
    }
  }

  toggleBtn.addEventListener("click", () => {
    OneSignal.isPushNotificationsEnabled().then(enabled => {
      if (enabled) {
        OneSignal.setSubscription(false).then(updateNotifStatus);
      } else {
        OneSignal.registerForPushNotifications().then(updateNotifStatus);
      }
    });
  });

  // 🔁 Refresh status when the modal opens
  document.getElementById("notificationModal").addEventListener("show.bs.modal", updateNotifStatus);
});